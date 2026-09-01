/**
 * Walk one case through the pipeline, saving the data at every stage.
 *
 * This exists to document the system with real numbers instead of drawings of
 * what we imagine it does. Each stage writes a file, so the manual can show
 * the actual input and the actual output of every step.
 *
 *   node scripts/trace.ts [--out DIR]
 *
 * Uses the study's published synthetic case, so the output is safe to put in
 * a document — no credentialed patient text is involved.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import {
  buildModelSchema,
  buildPrompt,
  planChunks,
  parseNotes,
  resolveProvenance,
} from "../src/lib/extract.ts";
import { emptyDoc, mergeChunk, finaliseDoc, type PartialDoc } from "../src/lib/merge.ts";
import { toVisualNote } from "../src/lib/toVisualNote.ts";
import { SAMPLE_NOTE } from "../src/lib/demo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : join(root, "trace");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const save = (name: string, data: unknown) => {
  const body = typeof data === "string" ? data : JSON.stringify(data, null, 1);
  writeFileSync(join(outDir, name), body + "\n");
  console.log(`  saved ${name.padEnd(28)} ${body.length.toLocaleString()} chars`);
};

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? "gifted-plateau-l224x";
const LOCATION = process.env.VERTEX_LOCATION ?? "global";
const MODEL = process.env.VERTEX_MODEL ?? "gemini-3.7-flash";
const caseId = "synthetic_case_001";

console.log("\n  tracing one case through every stage\n");

/* -- stage 1: the raw text as pasted ------------------------------------- */
save("01-raw-input.txt", SAMPLE_NOTE);

/* -- stage 2: split into shifts ------------------------------------------ */
const notes = parseNotes(SAMPLE_NOTE);
save("02-parsed-notes.json", notes);

/* -- stage 3: decide how many parts -------------------------------------- */
const chunks = planChunks(notes);
save("03-chunk-plan.json", {
  noteCount: Object.keys(notes).length,
  rule: "10 or fewer notes: one part. More: four notes per part.",
  parts: chunks.length,
  chunks,
});

/* -- stage 4: the letter we send ----------------------------------------- */
const prompt = buildPrompt(notes, caseId);
save("04-prompt.txt", prompt);

/* -- stage 5: the blank form the model must fill in ---------------------- */
const strict = JSON.parse(readFileSync(join(root, "schema/visual-note.schema.json"), "utf8"));
const modelSchema = buildModelSchema(strict);
save("05-model-schema.json", modelSchema);

/* -- stage 6: what the model sent back, untouched ------------------------ */
const token = execSync("gcloud auth application-default print-access-token", {
  encoding: "utf8",
}).trim();
const host =
  LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
const url =
  `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}` +
  `/publishers/google/models/${MODEL}:generateContent`;

const started = Date.now();
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: modelSchema,
      maxOutputTokens: 32768,
    },
  }),
});
const body = JSON.parse(await res.text());
const elapsedMs = Date.now() - started;
const raw = JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
save("06-model-raw-output.json", raw);
save("06b-usage.json", {
  elapsedMs,
  promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
  outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
  costUsd:
    ((body.usageMetadata?.promptTokenCount ?? 0) / 1e6) * 0.75 +
    ((body.usageMetadata?.candidatesTokenCount ?? 0) / 1e6) * 3.75,
});

/* -- stage 7: the quote check -------------------------------------------- */
// Deep copy first, so the "before" is preserved for the manual: the resolver
// edits the document in place.
const beforeCheck = structuredClone(raw);
const resolve = resolveProvenance(raw, notes);
save("07-after-quote-check.json", raw);
save("07b-quote-check-report.json", {
  quotesChecked: resolve.resolved + resolve.rejected.length,
  accepted: resolve.resolved,
  rejected: resolve.rejected.length,
  rejectedDetail: resolve.rejected,
  findingsBefore: (beforeCheck as { findings?: unknown[] }).findings?.length ?? 0,
  findingsAfter: (raw as { findings?: unknown[] }).findings?.length ?? 0,
});

/* -- stage 8: prove the check works by tampering ------------------------- */
// A finding whose quote is not in the note must not survive. This is the
// claim the whole design rests on, so it is tested rather than asserted.
const tampered = structuredClone(raw) as PartialDoc;
const fake = structuredClone(tampered.findings![0]);
fake.provenance!.evidence = "patient given 40mg furosemide IV for pulmonary oedema";
fake.id = "FAKE";
tampered.findings!.push(fake);
const tamperResult = resolveProvenance(tampered, notes);
save("08-tamper-test.json", {
  what: "We added an invented finding with a quote that is not in the notes.",
  invented: fake.provenance!.evidence,
  findingsSubmitted: (raw as { findings?: unknown[] }).findings!.length + 1,
  findingsSurvived: tampered.findings!.length,
  rejected: tamperResult.rejected,
  verdict:
    tampered.findings!.every((f) => f.id !== "FAKE")
      ? "REJECTED — the invented finding did not reach the chart."
      : "SURVIVED — the check failed.",
});

/* -- stage 9: join the parts and tidy ------------------------------------ */
const target = emptyDoc(caseId) as PartialDoc;
mergeChunk(target, raw as PartialDoc, { isFirst: true, isLast: true });
finaliseDoc(target, notes);
save("09-merged-record.json", target);

/* -- stage 10: the form check -------------------------------------------- */
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(strict);
const shapeOk = Boolean(validate(target));
save("10-form-check.json", {
  passed: shapeOk,
  errors: (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`),
});

/* -- stage 11: what the screen draws ------------------------------------- */
const chart = toVisualNote(target as Parameters<typeof toVisualNote>[0]);
save("11-chart-data.json", chart);

console.log(`
  input      ${Object.keys(notes).length} shifts, ${SAMPLE_NOTE.length} characters
  parts      ${chunks.length}
  quotes     ${resolve.resolved} accepted, ${resolve.rejected.length} rejected
  findings   ${(raw as { findings?: unknown[] }).findings?.length ?? 0}
  form check ${shapeOk ? "passed" : "FAILED"}
  tamper     ${tampered.findings!.every((f) => f.id !== "FAKE") ? "invented finding rejected" : "CHECK FAILED"}
  time       ${(elapsedMs / 1000).toFixed(1)}s

  files in ${outDir}
`);
