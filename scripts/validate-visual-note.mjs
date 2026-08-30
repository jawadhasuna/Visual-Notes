/**
 * Validate a Visual Note document.
 *
 * Two independent gates, both of which must pass:
 *
 *   1. SHAPE  — JSON Schema. Are the fields present, typed and in the frozen
 *               lane set?
 *   2. TRUTH  — grounding. Does every cited span actually say what the document
 *               claims it says?
 *
 * Shape alone is not enough. A model can emit perfectly valid JSON full of
 * invented findings; only the second gate catches that.
 *
 *   node scripts/validate-visual-note.mjs <doc.json> [notes.txt]
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [docPath, notesPath] = process.argv.slice(2);

if (!docPath) {
  console.error("usage: node scripts/validate-visual-note.mjs <doc.json> [notes.txt]");
  process.exit(2);
}

const schema = JSON.parse(readFileSync(join(root, "schema/visual-note.schema.json"), "utf8"));
const doc = JSON.parse(readFileSync(docPath, "utf8"));

/* ------------------------------------------------------------ gate 1: shape */

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const shapeOk = validate(doc);

console.log(`\n  Visual Note validation — ${doc.case_id ?? "(no case_id)"}\n`);
console.log(`  1. SHAPE   ${shapeOk ? "PASS" : "FAIL"}`);
if (!shapeOk) {
  for (const err of validate.errors.slice(0, 15)) {
    console.log(`       ${err.instancePath || "/"} ${err.message}`);
  }
}

/* ------------------------------------------------------------ gate 2: truth */

function loadNotes(text) {
  const notes = {};
  const re = /START_OF_RECORD=[^|]+\|\|\|\|(\d+)\|\|\|\|\n([\s\S]*?)\n\|\|\|\|END_OF_RECORD/g;
  for (const m of text.matchAll(re)) notes[Number(m[1])] = m[2];
  return notes;
}

let notes = null;
if (notesPath) {
  notes = loadNotes(readFileSync(notesPath, "utf8"));
} else {
  // Fall back to the sample bundled with the app.
  const demo = readFileSync(join(root, "src/lib/demo.ts"), "utf8");
  const m = demo.match(/export const SAMPLE_NOTE = `([\s\S]*?)`;/);
  if (m) notes = loadNotes(m[1]);
}

let groundOk = true;
let checked = 0;

if (!notes) {
  console.log("  2. TRUTH   SKIPPED (no source notes given)");
} else {
  const failures = [];
  const check = (p, path) => {
    if (!p) return;
    checked++;
    const body = notes[p.note_id];
    if (body === undefined) {
      failures.push(`${path}: note ${p.note_id} not found in source`);
      return;
    }
    const slice = body.slice(p.char_start, p.char_end);
    if (slice !== p.evidence) {
      failures.push(
        `${path}: evidence does not match source\n` +
          `       claimed: ${JSON.stringify(p.evidence)}\n` +
          `       actual : ${JSON.stringify(slice)}`,
      );
    }
  };

  const h = doc.header ?? {};
  (h.allergies ?? []).forEach((a, i) => check(a.provenance, `header.allergies[${i}]`));
  (h.past_medical_history ?? []).forEach((x, i) => check(x.provenance, `header.past_medical_history[${i}]`));
  (h.code_status ?? []).forEach((c, i) => check(c.provenance, `header.code_status[${i}]`));
  check(h.admission?.provenance, "header.admission");
  check(h.demographics?.provenance, "header.demographics");
  check(doc.outcome?.provenance, "outcome");
  (doc.findings ?? []).forEach((fd, i) => {
    check(fd.provenance, `findings[${i}] ${fd.id}`);
    (fd.labs ?? []).forEach((l, j) => check(l.provenance, `findings[${i}].labs[${j}] ${l.name}`));
  });

  groundOk = failures.length === 0;
  console.log(`  2. TRUTH   ${groundOk ? "PASS" : "FAIL"}  (${checked} spans re-read from source)`);
  for (const f of failures.slice(0, 10)) console.log(`       ${f}`);
}

/* ------------------------------------------------------------------ report */

const lanes = new Set((doc.findings ?? []).map((f) => f.lane));
const flagged = (doc.findings ?? []).flatMap((f) => f.ambiguous_terms ?? []);
console.log("");
console.log(`     findings          ${(doc.findings ?? []).length}`);
console.log(`     lanes used        ${lanes.size}  (${[...lanes].join(", ")})`);
console.log(`     coverage          ${((doc.coverage?.ratio ?? 0) * 100).toFixed(0)}%`);
console.log(`     allergies         ${(doc.header?.allergies ?? []).length}`);
console.log(`     ambiguous flags   ${flagged.length}${flagged.length ? " (need human review)" : ""}`);

const ok = shapeOk && groundOk;
console.log(`\n  ${ok ? "OK — safe to render" : "REJECTED — must not be rendered"}\n`);
process.exit(ok ? 0 : 1);
