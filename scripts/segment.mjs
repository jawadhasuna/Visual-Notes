/**
 * Stage 1 of the pipeline: deterministic segmentation.
 *
 * Splits the corpus into cases, cases into notes, and notes into
 * body-system segments using the section headers nurses write themselves.
 * No model, no API, no cost, no variance — the same input always produces the
 * same output.
 *
 * The point is to shrink the job the LLM has to do. Every character filed into
 * a lane here is a character the model cannot misfile later.
 *
 *   node scripts/segment.mjs <all_cases.txt> [--out DIR] [--case N] [--verbose]
 *
 * The corpus path is an argument on purpose: credentialed source text must
 * stay outside this repository.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lanes = JSON.parse(readFileSync(join(root, "schema/lanes.json"), "utf8"));

const argv = process.argv.slice(2);
const corpusPath = argv.find((a) => !a.startsWith("--"));
const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const onlyCase = argv.includes("--case") ? Number(argv[argv.indexOf("--case") + 1]) : null;
const verbose = argv.includes("--verbose");

if (!corpusPath) {
  console.error("usage: node scripts/segment.mjs <all_cases.txt> [--out DIR] [--case N] [--verbose]");
  process.exit(2);
}

/* ------------------------------------------------------------------ parse -- */

const raw = readFileSync(corpusPath, "utf8");
const cases = new Map();
const RECORD = /START_OF_RECORD=(\d+)\|\|\|\|(\d+)\|\|\|\|\n?([\s\S]*?)\n?\|\|\|\|END_OF_RECORD/g;
for (const m of raw.matchAll(RECORD)) {
  const [, caseId, noteId, body] = m;
  if (!cases.has(caseId)) cases.set(caseId, []);
  cases.get(caseId).push({ note_id: Number(noteId), body });
}

/* -------------------------------------------------------------- segmenter -- */

// A header is a short label at the start of a line, followed by a colon.
// Anchored to line starts because that is how the corpus writes them; matching
// mid-sentence would shred prose containing a stray colon.
const HEADER = /^[ \t]*([A-Za-z][A-Za-z/&. -]{0,24}?)[ \t]*:[ \t]*/gm;

function classify(label) {
  const key = label.toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
  if (lanes.headerAliases[key]) return { kind: "lane", lane: lanes.headerAliases[key], key };
  if (lanes.headerFields?.[key]) {
    return { kind: "header_field", field: lanes.headerFields[key], key };
  }
  if (lanes.ambiguousHeaders[key]) {
    return { kind: "ambiguous", candidates: lanes.ambiguousHeaders[key], key };
  }
  if (lanes.soapHeaders.includes(key)) return { kind: "soap", key };
  if (lanes.noteTitles?.includes(key)) return { kind: "boilerplate", key };
  return { kind: "unknown", key };
}

/**
 * Segment one note.
 *
 * Offsets are kept relative to the note body so they drop straight into the
 * schema's provenance fields without further arithmetic.
 */
function segmentNote(note) {
  const { body } = note;
  const heads = [];
  HEADER.lastIndex = 0;
  for (const m of body.matchAll(HEADER)) {
    heads.push({ label: m[1], at: m.index, textStart: m.index + m[0].length });
  }

  const segments = [];
  if (heads.length === 0 || heads[0].at > 0) {
    const end = heads.length ? heads[0].at : body.length;
    const text = body.slice(0, end);
    if (text.trim()) {
      segments.push({ kind: "preamble", label: null, char_start: 0, char_end: end, text });
    }
  }

  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].at : body.length;
    const info = classify(h.label);
    segments.push({
      ...info,
      label: h.label.trim(),
      char_start: h.textStart,
      char_end: end,
      text: body.slice(h.textStart, end),
    });
  });

  return { note_id: note.note_id, length: body.length, segments };
}

/* ----------------------------------------------------------------- report -- */

const perCase = [];
const unknownHeaders = new Map();
const ambiguousHits = new Map();
const laneChars = Object.fromEntries(lanes.lanes.map((l) => [l, 0]));
let totalChars = 0, laneTotal = 0, soapTotal = 0, unlabeledTotal = 0, headerFieldTotal = 0, boilerplateTotal = 0;
const headerFieldHits = new Map();
let notesWithLanes = 0, totalNotes = 0;

for (const [caseId, notes] of cases) {
  if (onlyCase !== null && Number(caseId) !== onlyCase) continue;

  const segmented = notes.map(segmentNote);
  let cChars = 0, cLane = 0;

  for (const n of segmented) {
    totalNotes++;
    cChars += n.length;
    totalChars += n.length;
    let hasLane = false;
    for (const s of n.segments) {
      const len = s.char_end - s.char_start;
      if (s.kind === "lane") {
        laneChars[s.lane] += len; laneTotal += len; cLane += len; hasLane = true;
      } else if (s.kind === "soap") {
        soapTotal += len;
      } else if (s.kind === "boilerplate") {
        boilerplateTotal += len;
      } else if (s.kind === "header_field") {
        headerFieldTotal += len;
        headerFieldHits.set(s.field, (headerFieldHits.get(s.field) ?? 0) + 1);
      } else if (s.kind === "ambiguous") {
        ambiguousHits.set(s.key, (ambiguousHits.get(s.key) ?? 0) + 1);
        unlabeledTotal += len;
      } else {
        if (s.kind === "unknown") {
          unknownHeaders.set(s.key, (unknownHeaders.get(s.key) ?? 0) + 1);
        }
        unlabeledTotal += len;
      }
    }
    if (hasLane) notesWithLanes++;
  }

  perCase.push({
    case_id: caseId,
    notes: segmented.length,
    chars: cChars,
    lane_chars: cLane,
    structured_pct: cChars ? +((cLane / cChars) * 100).toFixed(1) : 0,
    segmented,
  });
}

if (outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  for (const c of perCase) {
    writeFileSync(join(outDir, `case-${c.case_id}.json`), JSON.stringify(c, null, 1) + "\n");
  }
  console.log(`wrote ${perCase.length} files to ${outDir}\n`);
}

const pct = (n) => `${((n / totalChars) * 100).toFixed(1)}%`;

console.log("  Deterministic segmentation — no model involved\n");
console.log(`  cases                ${perCase.length}`);
console.log(`  notes                ${totalNotes}`);
console.log(`  characters           ${totalChars.toLocaleString()}`);
console.log("");
console.log(`  filed into a lane    ${pct(laneTotal)}   <- free structure, zero model error`);
console.log(`  SOAP sections        ${pct(soapTotal)}   (S/O/A/P — structure, not a body system)`);
console.log(`  header fields        ${pct(headerFieldTotal)}   (allergies, PMH, labs — go to the header block)`);
console.log(`  note-title boilerplate ${pct(boilerplateTotal)} ("see flowsheet" — nothing to extract)`);
console.log(`  unlabelled prose     ${pct(unlabeledTotal)}   <- what the LLM actually has to classify`);
console.log("");
console.log(`  notes with >=1 lane  ${notesWithLanes} of ${totalNotes}  (${((notesWithLanes / totalNotes) * 100).toFixed(0)}%)`);

console.log("\n  Characters per lane, deterministically assigned:");
Object.entries(laneChars)
  .sort((a, b) => b[1] - a[1])
  .forEach(([lane, n]) => {
    if (!n) return;
    const bar = "#".repeat(Math.max(1, Math.round((n / laneTotal) * 42)));
    console.log(`    ${lane.padEnd(9)}${String(n).padStart(8)}  ${bar}`);
  });

if (headerFieldHits.size) {
  console.log("\n  Header-block fields found:");
  for (const [k, v] of [...headerFieldHits].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(22)}${String(v).padStart(5)} notes`);
  }
}

if (ambiguousHits.size) {
  console.log("\n  Held back for human review (not guessed):");
  for (const [k, v] of [...ambiguousHits].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(10)}${String(v).padStart(5)}   ${lanes.ambiguousWhy[k] ?? ""}`);
  }
}

const unknownTop = [...unknownHeaders].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 15);
if (unknownTop.length) {
  console.log("\n  Unrecognised headers seen 15+ times — candidates for schema/lanes.json:");
  for (const [k, v] of unknownTop.slice(0, 18)) {
    console.log(`    ${String(v).padStart(5)}  ${k}`);
  }
}

if (verbose) {
  const worst = [...perCase].sort((a, b) => a.structured_pct - b.structured_pct).slice(0, 8);
  console.log("\n  Least structured cases (most work left for the model):");
  for (const c of worst) {
    console.log(`    case ${c.case_id.padEnd(5)} ${String(c.structured_pct).padStart(5)}%  ${c.notes} notes, ${c.chars} chars`);
  }
}

console.log("");
