/**
 * Server-side Vertex AI client.
 *
 * Authentication has to work in two places that offer different things.
 *
 * Locally there is a gcloud login, so Application Default Credentials resolve
 * on their own and nothing needs configuring. On a serverless host there is no
 * gcloud and no metadata server, so ADC finds nothing and every request fails
 * with "no credentials" — which is exactly what a first deploy does. There the
 * credentials arrive as a service-account key held in an environment variable
 * and injected by the host at runtime.
 *
 * Preferring the environment variable when it is present means the same code
 * runs in both places, and the key itself never touches the repository.
 *
 * Server-only — never import from a client component.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleAuth } from "google-auth-library";
import Ajv2020 from "ajv/dist/2020.js";
import { buildModelSchema, buildPrompt, resolveProvenance, planChunks, type ResolveResult } from "./extract.ts";
import { emptyDoc, mergeChunk, finaliseDoc, type PartialDoc } from "./merge.ts";

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? "";
const LOCATION = process.env.VERTEX_LOCATION ?? "global";
const MODEL = process.env.VERTEX_MODEL ?? "gemini-3.7-flash";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

/**
 * Build the auth client once, from a service-account key when the host supplies
 * one and from the ambient gcloud login otherwise.
 *
 * A malformed key is reported here rather than as a confusing 401 later: it is
 * the single most likely thing to be wrong after pasting a long JSON blob into
 * a settings box.
 */
function makeAuth(): GoogleAuth {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!inline) return new GoogleAuth({ scopes: SCOPES });

  let credentials: { client_email?: string; private_key?: string; project_id?: string };
  try {
    credentials = JSON.parse(inline);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is set but is not valid JSON. Paste the whole " +
        "key file, starting with { and ending with }.",
    );
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email or private_key. " +
        "Use the JSON key file, not the key id.",
    );
  }
  // Some settings UIs turn the escaped newlines in the private key into literal
  // backslash-n, which makes the signature fail with an opaque error.
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

  return new GoogleAuth({
    credentials,
    scopes: SCOPES,
    projectId: credentials.project_id ?? PROJECT,
  });
}

let authClient: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!authClient) authClient = makeAuth();
  return authClient;
}

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

/**
 * The fix differs by environment, so the message has to as well: telling someone
 * on a serverless host to run a gcloud command sends them somewhere they cannot
 * go, which is what the first version of this did.
 */
const CREDENTIAL_HELP = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ? "Google rejected the service-account key. Check that the key is valid and " +
    "that the account has the Vertex AI User role on this project."
  : process.env.VERCEL
    ? "No Google credentials on the server. Add GOOGLE_SERVICE_ACCOUNT_KEY to " +
      "the project's environment variables and redeploy."
    : "No Google credentials. Run: gcloud auth application-default login";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call the model, retrying only what is worth retrying.
 *
 * Chunked extraction fires several requests in quick succession, which makes
 * 429 RESOURCE_EXHAUSTED an ordinary event rather than an outage — a whole
 * admission was lost to one in testing. Backoff is exponential, and only
 * transient statuses are retried; a 400 will fail identically next time.
 */
async function callModelWithRetry(
  notes: Record<number, string>,
  caseId: string,
  chunk?: { index: number; total: number; noteIds: number[] },
  attempts = 4,
): Promise<{ doc: PartialDoc; promptTokens: number; outputTokens: number }> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callModel(notes, caseId, chunk);
    } catch (err) {
      last = err;
      const status = err instanceof VertexError ? err.status : 0;
      if (status !== 429 && status !== 503 && status !== 500) throw err;
      if (i === attempts - 1) break;
      await sleep(2000 * 2 ** i);
    }
  }
  throw last;
}

async function callModel(
  notes: Record<number, string>,
  caseId: string,
  chunk?: { index: number; total: number; noteIds: number[] },
): Promise<{ doc: PartialDoc; promptTokens: number; outputTokens: number }> {
  const { model } = schemas();
  const token = await getAuth().getAccessToken();
  if (!token) {
    throw new VertexError(CREDENTIAL_HELP, 401);
  }

  const host =
    LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
  const url =
    `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}` +
    `/publishers/google/models/${MODEL}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(notes, caseId, chunk) }] }],
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
  if (body.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new VertexError("The model ran out of output tokens on this chunk.", 502);
  }
  let doc: PartialDoc;
  try {
    doc = JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  } catch {
    throw new VertexError("The model did not return valid JSON.", 502);
  }
  return {
    doc,
    promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

export type StreamEvent =
  // ranges lets the client name the part now in flight, not just the one
  // that finished — the plan is fixed before the first call.
  | { type: "plan"; chunks: number; notes: number; caseId: string; ranges: [number, number][] }
  | { type: "chunk"; index: number; total: number; firstNote: number; lastNote: number; findings: number; spansResolved: number; spansRejected: number }
  | { type: "doc"; doc: Record<string, unknown> }
  | { type: "done"; shapeOk: boolean; shapeErrors: string[]; spansResolved: number; spansRejected: number; usage: { promptTokens: number; outputTokens: number }; elapsedMs: number }
  | { type: "error"; message: string };

/**
 * Extract chunk by chunk, emitting the document as it grows.
 *
 * Long admissions are the reason this exists: a single call over 97 notes
 * returns a summary, and the user stares at a spinner for ten minutes. Here
 * each chunk lands as it completes, so the chart builds in view and a failure
 * halfway through still leaves everything before it.
 */
export async function* extractStreaming(
  notes: Record<number, string>,
  caseId: string,
): AsyncGenerator<StreamEvent> {
  if (!PROJECT) {
    yield { type: "error", message: "GOOGLE_CLOUD_PROJECT is not set. See npm run check:vertex." };
    return;
  }

  const started = Date.now();
  const chunks = planChunks(notes);
  const target = emptyDoc(caseId) as PartialDoc;
  let resolvedTotal = 0;
  let rejectedTotal = 0;
  let promptTokens = 0;
  let outputTokens = 0;

  yield {
    type: "plan",
    chunks: chunks.length,
    notes: Object.keys(notes).length,
    caseId,
    ranges: chunks.map((c) => [c[0], c[c.length - 1]] as [number, number]),
  };

  for (let i = 0; i < chunks.length; i++) {
    const noteIds = chunks[i];

    // The full note map is passed through so provenance can resolve against
    // the whole admission; the prompt renders only this chunk's notes.
    try {
      const { doc, promptTokens: pt, outputTokens: ot } = await callModelWithRetry(
        notes,
        caseId,
        chunks.length > 1 ? { index: i, total: chunks.length, noteIds } : undefined,
      );
      promptTokens += pt;
      outputTokens += ot;

      // Resolve against the whole admission, not just this chunk, so a quote
      // that drifts into a neighbouring note is still located rather than lost.
      const resolve = resolveProvenance(doc, notes);
      resolvedTotal += resolve.resolved;
      rejectedTotal += resolve.rejected.length;

      mergeChunk(target, doc, { isFirst: i === 0, isLast: i === chunks.length - 1 });

      yield {
        type: "chunk",
        index: i,
        total: chunks.length,
        firstNote: noteIds[0],
        lastNote: noteIds[noteIds.length - 1],
        findings: doc.findings?.length ?? 0,
        spansResolved: resolve.resolved,
        spansRejected: resolve.rejected.length,
      };

      const snapshot = structuredClone(target);
      finaliseDoc(snapshot, notes);
      yield { type: "doc", doc: snapshot as Record<string, unknown> };
    } catch (err) {
      // One bad chunk should not discard the rest of the admission.
      yield {
        type: "error",
        message: `Part ${i + 1} of ${chunks.length} failed: ${
          err instanceof Error ? err.message.slice(0, 200) : "unknown error"
        }`,
      };
    }
  }

  finaliseDoc(target, notes);
  const { strict } = schemas();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(strict);
  const shapeOk = Boolean(validate(target));

  yield { type: "doc", doc: target as Record<string, unknown> };
  yield {
    type: "done",
    shapeOk,
    shapeErrors: (validate.errors ?? []).slice(0, 12).map((e) => `${e.instancePath || "/"} ${e.message}`),
    spansResolved: resolvedTotal,
    spansRejected: rejectedTotal,
    usage: { promptTokens, outputTokens },
    elapsedMs: Date.now() - started,
  };
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
  const token = await getAuth().getAccessToken();
  if (!token) {
    throw new VertexError(CREDENTIAL_HELP, 401);
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
