/**
 * Prove the real schema survives translation and that Vertex accepts it.
 *
 * Runs the actual translator the app uses — no second implementation to drift.
 * Three steps: translate, lint the result for anything Vertex rejects, then
 * send it on a real generation call and validate what comes back against the
 * ORIGINAL strict schema plus a grounding check.
 *
 *   node scripts/check-schema.ts
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { toVertexSchema, findVertexProblems } from "../src/lib/vertexSchema.ts";
import { buildModelSchema, buildPrompt, resolveProvenance, parseNotes } from "../src/lib/extract.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = JSON.parse(readFileSync(join(root, "schema/visual-note.schema.json"), "utf8"));

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "gifted-plateau-l224x";
const LOCATION = process.env.VERTEX_LOCATION || "global";
const MODEL = process.env.VERTEX_MODEL || "gemini-3.7-flash";

/* ------------------------------------------------------------ 1. translate */

const vertexSchema = buildModelSchema(strict);
const problems = findVertexProblems(vertexSchema);

console.log("\n  1. translate     " + (problems.length ? "PROBLEMS" : "OK"));
for (const p of problems.slice(0, 12)) console.log(`       ${p}`);

const countUnions = (n: unknown): number => {
  if (Array.isArray(n)) return n.reduce<number>((a, x) => a + countUnions(x), 0);
  if (!n || typeof n !== "object") return 0;
  const o = n as Record<string, unknown>;
  let c = Array.isArray(o.type) ? 1 : 0;
  for (const v of Object.values(o)) c += countUnions(v);
  return c;
};
console.log(`       union types before: ${countUnions(strict)}   after: ${countUnions(vertexSchema)}`);

if (problems.length) process.exit(1);

/* ---------------------------------------------------------- 2. real call -- */

const notes: Record<number, string> = {};
const demo = readFileSync(join(root, "src/lib/demo.ts"), "utf8");
const sample = /export const SAMPLE_NOTE = `([\s\S]*?)`;/.exec(demo)![1];
for (const m of sample.matchAll(
  /START_OF_RECORD=[^|]+\|\|\|\|(\d+)\|\|\|\|\n([\s\S]*?)\n\|\|\|\|END_OF_RECORD/g,
)) {
  notes[Number(m[1])] = m[2];
}

const noteBlock = Object.entries(notes)
  .map(([id, body]) => `--- NOTE ${id} ---\n${body}`)
  .join("\n\n");

const prompt = buildPrompt(notes, "synthetic_case_001");

const token = execSync("gcloud auth application-default print-access-token", {
  encoding: "utf8",
}).trim();

const host = LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
const url = `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

const started = Date.now();
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: vertexSchema,
      maxOutputTokens: 32768,
    },
  }),
});

const text = await res.text();
if (!res.ok) {
  console.log("  2. vertex call   FAILED");
  let msg = text.slice(0, 500);
  try {
    msg = JSON.parse(text).error?.message ?? msg;
  } catch {}
  console.log(`       ${msg.split("\n").slice(0, 4).join("\n       ")}`);
  process.exit(1);
}

const body = JSON.parse(text);
const raw = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
console.log(
  `  2. vertex call   OK  (${((Date.now() - started) / 1000).toFixed(1)}s, ` +
    `${body.usageMetadata?.promptTokenCount} in / ${body.usageMetadata?.candidatesTokenCount} out)`,
);

/* ------------------------------------------------- 3. validate the output - */

let doc: Record<string, unknown> | null = null;
try {
  doc = JSON.parse(raw);
} catch {
  console.log("  3. validate      FAILED — response was not valid JSON");
  process.exit(1);
}

const { resolved, rejected } = resolveProvenance(doc, notes);
console.log(`  3. resolve       ${resolved} spans located, ${rejected.length} rejected`);
for (const r of rejected.slice(0, 6)) {
  console.log(`       ${r.path}: ${r.reason}`);
  console.log(`         ${JSON.stringify(r.evidence.slice(0, 70))}`);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(strict);
const shapeOk = validate(doc);
console.log(`  4. shape         ${shapeOk ? "PASS" : "FAIL"}`);
if (!shapeOk) {
  for (const e of validate.errors!.slice(0, 10)) {
    console.log(`       ${e.instancePath || "/"} ${e.message}`);
  }
}

type Prov = { note_id: number; char_start: number; char_end: number; evidence: string };
const failures: string[] = [];
let checked = 0;
const check = (p: Prov | undefined, path: string) => {
  if (!p) return;
  checked++;
  const b = notes[p.note_id];
  if (b === undefined) return failures.push(`${path}: note ${p.note_id} not found`);
  if (b.slice(p.char_start, p.char_end) !== p.evidence) {
    failures.push(
      `${path}\n         claimed: ${JSON.stringify(p.evidence.slice(0, 60))}` +
        `\n         actual : ${JSON.stringify(b.slice(p.char_start, p.char_end).slice(0, 60))}`,
    );
  }
};

const d = doc as any;
(d.findings ?? []).forEach((f: any, i: number) => check(f.provenance, `findings[${i}] ${f.id}`));
(d.header?.allergies ?? []).forEach((a: any, i: number) => check(a.provenance, `allergies[${i}]`));
check(d.header?.admission?.provenance, "admission");
check(d.outcome?.provenance, "outcome");

console.log(`  5. grounding     ${failures.length ? "FAIL" : "PASS"}  (${checked} spans re-read)`);
for (const f of failures.slice(0, 6)) console.log(`       ${f}`);

console.log(`
     findings   ${(d.findings ?? []).length}
     lanes      ${[...new Set((d.findings ?? []).map((f: any) => f.lane))].join(", ")}
     coverage   ${((d.coverage?.ratio ?? 0) * 100).toFixed(0)}%
     verbatim   ${checked - failures.length}/${checked} spans matched the source
`);
