/**
 * Server-side Vertex AI client.
 *
 * Authentication is Application Default Credentials, so nothing secret lives
 * in this repo: locally that resolves to the developer's gcloud login, and on
 * a deployed host to the attached service account. Same code either way.
 *
 * Server-only — never import from a client component.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleAuth } from "google-auth-library";
import Ajv2020 from "ajv/dist/2020.js";
import { buildModelSchema, buildPrompt, resolveProvenance, type ResolveResult } from "./extract.ts";

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? "";
const LOCATION = process.env.VERTEX_LOCATION ?? "global";
const MODEL = process.env.VERTEX_MODEL ?? "gemini-3.7-flash";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/** Loaded once — the schema is a build artefact, not per-request state. */
let cached: { strict: Record<string, unknown>; model: Record<string, unknown> } | null = null;
function schemas() {
  if (!cached) {
    const strict = JSON.parse(
      readFileSync(join(process.cwd(), "schema/visual-note.schema.json"), "utf8"),
    );
    cached = { strict, model: buildModelSchema(strict) };
  }
  return cached;
}

export type ExtractionResult = {
  doc: Record<string, unknown>;
  shapeOk: boolean;
  shapeErrors: string[];
  resolve: ResolveResult;
  usage: { promptTokens: number; outputTokens: number };
  elapsedMs: number;
};

export class VertexError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function extractVisualNote(
  notes: Record<number, string>,
  caseId: string,
): Promise<ExtractionResult> {
  if (!PROJECT) {
    throw new VertexError(
      "GOOGLE_CLOUD_PROJECT is not set. Add it to .env.local (see npm run check:vertex).",
      500,
    );
  }

  const { strict, model } = schemas();
  const token = await auth.getAccessToken();
  if (!token) {
    throw new VertexError(
      "No Google credentials. Run: gcloud auth application-default login",
      401,
    );
  }

  const host =
    LOCATION === "global"
      ? "aiplatform.googleapis.com"
      : `${LOCATION}-aiplatform.googleapis.com`;
  const url =
    `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}` +
    `/publishers/google/models/${MODEL}:generateContent`;

  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(notes, caseId) }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: model,
        maxOutputTokens: 32768,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 400);
    try {
      msg = JSON.parse(text).error?.message ?? msg;
    } catch {}
    throw new VertexError(msg, res.status);
  }

  const body = JSON.parse(text);
  const finish = body.candidates?.[0]?.finishReason;
  const raw = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (finish === "MAX_TOKENS") {
    throw new VertexError(
      "The model ran out of output tokens before finishing the document. " +
        "This case likely needs to be split across several requests.",
      502,
    );
  }

  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new VertexError("The model did not return valid JSON.", 502);
  }

  // Derive the character offsets the model cannot compute, and drop anything
  // whose quote is not actually in the source.
  const resolve = resolveProvenance(doc, notes);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(strict);
  const shapeOk = Boolean(validate(doc));

  return {
    doc,
    shapeOk,
    shapeErrors: (validate.errors ?? [])
      .slice(0, 20)
      .map((e) => `${e.instancePath || "/"} ${e.message}`),
    resolve,
    usage: {
      promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    },
    elapsedMs: Date.now() - started,
  };
}
