/**
 * Generate the worked example that ships with the schema.
 *
 * Offsets are computed from the note text rather than typed by hand, so the
 * example is guaranteed to pass the grounding check — which is the point of
 * shipping it: it proves the contract is satisfiable, not just well formed.
 *
 * Uses the SYNTHETIC case published in the study's appendix. No credentialed
 * PhysioNet text belongs in this repository.
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Pull the sample straight out of demo.ts so the two can never drift apart.
const demo = readFileSync(join(root, "src/lib/demo.ts"), "utf8");
const sample = demo.match(/export const SAMPLE_NOTE = `([\s\S]*?)`;/)[1];

const notes = {};
for (const m of sample.matchAll(
  /START_OF_RECORD=[^|]+\|\|\|\|(\d+)\|\|\|\|\n([\s\S]*?)\n\|\|\|\|END_OF_RECORD/g,
)) {
  notes[Number(m[1])] = m[2];
}

/** Locate a phrase and return provenance for it. Throws if it is not there. */
function cite(noteId, phrase) {
  const body = notes[noteId];
  if (body === undefined) throw new Error(`note ${noteId} missing`);
  const start = body.indexOf(phrase);
  if (start === -1) throw new Error(`phrase not found in note ${noteId}: "${phrase}"`);
  return { note_id: noteId, char_start: start, char_end: start + phrase.length, evidence: phrase };
}

const f = (id, lane, shift, finding, intervention, orders, route, noteId, phrase, extra = {}) => ({
  id, lane, shift, finding,
  ...(intervention ? { intervention } : {}),
  ...(orders ? { orders } : {}),
  ...(route !== undefined ? { route } : {}),
  ...extra,
  provenance: cite(noteId, phrase),
});

const doc = {
  schema_version: "1.0.0",
  case_id: "synthetic_case_001",
  source: {
    note_count: Object.keys(notes).length,
    char_count: Object.values(notes).reduce((a, b) => a + b.length, 0),
    corpus: "study-appendix-synthetic",
  },

  header: {
    demographics: { age: 68, sex: "F", provenance: cite(1, "68 yo female admitted from ED") },
    // Nothing documented in this synthetic note. An empty array is an honest
    // "not recorded" — it is not the same as asserting no allergies exist.
    allergies: [],
    past_medical_history: [],
    code_status: [],
    admission: {
      lines: [
        "68F admitted from ED",
        "Acute SOB, fever, hypotension",
        "CXR: right lower lobe pneumonia",
      ],
      provenance: cite(1, "acute shortness of breath, fever, and low blood pressure"),
    },
  },

  shifts: [
    { index: 1, note_id: 1, label: "Shift 1", note_type: "admit" },
    { index: 2, note_id: 2, label: "Shift 2", note_type: "progress" },
    { index: 3, note_id: 3, label: "Shift 3", note_type: "progress" },
    { index: 4, note_id: 4, label: "Shift 4", note_type: "discharge" },
  ],

  findings: [
    f("resp-1-1", "resp", 1, "Acute shortness of breath; RLL pneumonia on CXR",
      "Oxygen by face mask", "FACE MASK O2, CXR", "O2",
      1, "CXR concerning for RLL pneumonia", { severity: "notable" }),
    f("resp-2-1", "resp", 2, "More tachypnoeic; rising oxygen requirement",
      "BiPAP started, work of breathing improved", "NON-INVASIVE VENTILATION", "NIV",
      2, "Placed on BiPAP with improved work of breathing", { severity: "notable" }),
    f("resp-3-1", "resp", 3, "Tolerated transition off BiPAP",
      "Weaned to nasal cannula", "NASAL CANNULA", "O2",
      3, "tolerated transition from BiPAP to nasal cannula"),
    f("resp-4-1", "resp", 4, "Stable on room air; denies shortness of breath",
      "Supplemental oxygen discontinued", "ROOM AIR", null,
      4, "stable on room air, denies shortness of breath"),

    f("cv-1-1", "cv", 1, "Hypotension on admission",
      "IV fluids and low-dose norepinephrine", "IV FLUIDS, NOREPINEPHRINE GTT", "GTT",
      1, "low-dose norepinephrine", { severity: "critical" }),
    f("cv-2-1", "cv", 2, "Blood pressure improved after fluid resuscitation",
      "Norepinephrine weaned off", "PRESSOR DISCONTINUED", "GTT",
      2, "BP improved after fluids and norepinephrine was weaned off"),

    f("neuro-1-1", "neuro", 1, "Anxious; follows commands",
      "Reassurance and orientation", "NEURO CHECKS", null,
      1, "Patient anxious but follows commands"),
    f("neuro-3-1", "neuro", 3, "Ambulated to chair with assistance",
      "Mobility as tolerated; eating small amounts", "OUT OF BED, DIET ADVANCED", null,
      3, "Ambulated to chair with assistance"),
    f("neuro-4-1", "neuro", 4, "Ambulating with walker; tolerating diet",
      "Discharge mobility plan", "PT/OT, DISCHARGE PLANNING", null,
      4, "tolerating diet, ambulating with walker"),

    f("id-1-1", "id", 1, "Febrile; right lower lobe pneumonia",
      "Ceftriaxone and azithromycin started", "CEFTRIAXONE IV, AZITHROMYCIN IV", "IV",
      1, "ceftriaxone, azithromycin", { severity: "notable" }),
    f("id-2-1", "id", 2, "Remains febrile", "Antibiotics continued", "ANTIBIOTICS IV", "IV",
      2, "Patient remains febrile"),
    f("id-3-1", "id", 3, "Afebrile this shift", "Antibiotics continued", "ANTIBIOTICS IV", "IV",
      3, "Afebrile this shift"),
    f("id-4-1", "id", 4, "Afebrile; infection resolving",
      "Transitioned to oral antibiotics", "ORAL ANTIBIOTICS", "PO",
      4, "Discharged home with oral antibiotics"),

    f("gu-1-1", "gu", 1, "Foley catheter placed",
      "Hourly urine output monitoring", "FOLEY CATHETER, STRICT I&O", null,
      1, "Foley placed"),
    f("gu-2-1", "gu", 2, "Urine output adequate", "Continue intake and output", "STRICT I&O", null,
      2, "Urine output adequate"),
    f("gu-3-1", "gu", 3, "Foley removed", "Voiding trial", "FOLEY DISCONTINUED", null,
      3, "Foley removed"),
  ],

  outcome: {
    disposition: "discharged_home",
    lines: [
      "Discharged home",
      "Stable on room air, tolerating diet",
      "Oral antibiotics, PCP follow-up",
    ],
    provenance: cite(4, "Discharged home with oral antibiotics and follow-up with PCP"),
  },

  coverage: {
    clinical_sentences: 17,
    covered_sentences: 16,
    ratio: 0.94,
    uncovered: [
      { note_id: 3, text: "Eating small amounts.", classified_as: "duplicate" },
    ],
  },
};

const out = join(root, "schema/example-synthetic-case-001.json");
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
console.log(`wrote ${out}`);
console.log(`  ${doc.findings.length} findings across ${doc.shifts.length} shifts`);
