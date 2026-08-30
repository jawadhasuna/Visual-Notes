/**
 * Verify Vertex AI access before building anything on top of it.
 *
 * Checks three things, in order, and stops at the first failure:
 *
 *   1. Are Application Default Credentials present?
 *   2. Does the model answer at all?
 *   3. Does it honour a JSON Schema shaped like ours — nested object,
 *      enum, nullable field? Google's structured output supports a SUBSET
 *      of JSON Schema, and those three are exactly what the docs warn to
 *      test. Better to find out now than halfway through the extractor.
 *
 * Model ids and regional availability move around, so this tries a few
 * combinations and reports which one actually worked.
 *
 *   node scripts/check-vertex.mjs [--project ID] [--model ID]
 */

import { execSync as execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : fallback;
};

const PROJECT = arg("project", process.env.GOOGLE_CLOUD_PROJECT || "gifted-plateau-l224x");
const MODELS = arg("model") ? [arg("model")] : ["gemini-3.7-flash", "gemini-3-7-flash"];
const LOCATIONS = ["global", "us-central1"];

/* ------------------------------------------------------------- 1. creds -- */

let token;
try {
  // shell:true is required on Windows, where gcloud is a .cmd batch file that
  // execFileSync cannot invoke directly.
  token = execFileSync("gcloud auth application-default print-access-token", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!token) throw new Error("empty token");
} catch {
  console.error(`
  No Application Default Credentials found.

  Run this once, then re-run this script:

      gcloud auth application-default login
      gcloud auth application-default set-quota-project ${PROJECT}
`);
  process.exit(1);
}
console.log(`\n  1. credentials   OK  (project ${PROJECT})`);

/* -------------------------------------------------- 2 + 3. model + schema -- */

// Deliberately shaped like the real thing: nested object, enum, nullable.
const probeSchema = {
  type: "object",
  properties: {
    lane: { type: "string", enum: ["resp", "cv", "neuro", "gi", "gu"] },
    finding: { type: "string" },
    // Vertex follows OpenAPI, not raw JSON Schema: union types like
    // ["string","null"] are rejected — nullability is a separate flag.
    route: { type: "string", nullable: true, enum: ["IV", "PO", "O2"] },
    provenance: {
      type: "object",
      properties: {
        note_id: { type: "integer" },
        evidence: { type: "string" },
      },
      required: ["note_id", "evidence"],
    },
  },
  required: ["lane", "finding", "provenance"],
};

const prompt =
  'From this nursing note, return one finding as JSON.\n\n' +
  'Note 1: "Patient more short of breath overnight. Placed on BiPAP with ' +
  'improved work of breathing."\n\n' +
  "Set provenance.evidence to the exact words you took the finding from.";

async function attempt(location, model) {
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : `${location}-aiplatform.googleapis.com`;
  const url =
    `https://${host}/v1/projects/${PROJECT}/locations/${location}` +
    `/publishers/google/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: probeSchema,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      msg = JSON.parse(text).error?.message ?? msg;
    } catch {}
    return { ok: false, status: res.status, msg };
  }
  return { ok: true, body: JSON.parse(text) };
}

let worked = null;
const tried = [];

for (const location of LOCATIONS) {
  for (const model of MODELS) {
    const r = await attempt(location, model);
    if (r.ok) {
      worked = { location, model, body: r.body };
      break;
    }
    tried.push(`${location} / ${model}  ->  ${r.status} ${r.msg.split("\n")[0].slice(0, 110)}`);
  }
  if (worked) break;
}

if (!worked) {
  console.log("  2. model call    FAILED\n");
  for (const t of tried) console.log(`       ${t}`);
  console.log(`
  If every attempt says the model was not found, open Model Garden and copy
  the exact model id from the Gemini 3.7 Flash card, then:

      node scripts/check-vertex.mjs --model <exact-id>
`);
  process.exit(1);
}

console.log(`  2. model call    OK  (${worked.model} @ ${worked.location})`);

/* ----------------------------------------------------------- 3. schema -- */

const raw = worked.body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
let parsed = null;
try {
  parsed = JSON.parse(raw);
} catch {}

const problems = [];
if (!parsed) problems.push("response was not valid JSON");
else {
  if (!["resp", "cv", "neuro", "gi", "gu"].includes(parsed.lane)) {
    problems.push(`enum not honoured: lane = ${JSON.stringify(parsed.lane)}`);
  }
  if (!parsed.provenance || typeof parsed.provenance.note_id !== "number") {
    problems.push("nested object missing or wrong type");
  }
  if (!("route" in parsed)) problems.push("nullable field absent (may be acceptable)");
}

console.log(`  3. json schema   ${problems.length ? "PARTIAL" : "OK"}  (enum, nested object, nullable)`);
for (const p of problems) console.log(`       - ${p}`);

console.log("\n  model returned:");
console.log(
  (raw || "(empty)")
    .split("\n")
    .map((l) => `     ${l}`)
    .join("\n"),
);

const usage = worked.body.usageMetadata;
if (usage) {
  console.log(
    `\n  tokens: ${usage.promptTokenCount} in, ${usage.candidatesTokenCount} out`,
  );
}

console.log(`
  Ready. Use these in .env.local:

      GOOGLE_CLOUD_PROJECT=${PROJECT}
      VERTEX_LOCATION=${worked.location}
      VERTEX_MODEL=${worked.model}
`);
