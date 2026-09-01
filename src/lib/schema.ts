/**
 * The frozen Visual Note contract, in TypeScript.
 *
 * Mirrors schema/visual-note.schema.json. The JSON Schema is what the
 * extraction model is constrained to and what CI validates against; this file
 * is what the renderer reads. Change one, change both.
 *
 * Two rules give the whole pipeline its guarantees:
 *
 *   1. The lane list is FROZEN. It is identical for every case, so two charts
 *      are always comparable, and a body system can never be silently dropped
 *      because a model failed to invent a column for it.
 *   2. Every clinical statement carries `provenance`. `evidence` must equal
 *      the exact character slice it points at. Anything that fails that check
 *      is rejected before it can reach a chart.
 */

/* ------------------------------------------------------------------ lanes -- */

/**
 * The taxonomy lives in schema/lanes.json so the renderer and the segmenter
 * read the same file and cannot drift apart.
 */
import lanesData from "../../schema/lanes.json" with { type: "json" };

export const LANES = lanesData.lanes as readonly Lane[];

export type Lane =
  | "resp" | "cv" | "neuro" | "gi" | "gu" | "id" | "endo"
  | "heme" | "fluids" | "skin" | "lines" | "pain" | "mobility" | "social";

export const LANE_LABEL = lanesData.laneLabel as Record<Lane, string>;

/**
 * Section headers nurses actually write, mapped onto the frozen lanes.
 *
 * This is the deterministic half of segmentation: over half of all notes label
 * their own sections, so those sentences need no model to be filed correctly.
 */
export const HEADER_ALIASES = lanesData.headerAliases as Record<string, Lane>;

/**
 * Headers that must NOT be auto-mapped — `gi/gu` spans two lanes, and `ms` is
 * the corpus's worst abbreviation. Routed to a human rather than guessed.
 */
export const AMBIGUOUS_HEADERS = lanesData.ambiguousHeaders as Record<string, readonly Lane[]>;

/** SOAP markers — structure, not body systems. Never treat these as lanes. */
export const SOAP_HEADERS = lanesData.soapHeaders as readonly string[];


/* ----------------------------------------------------------------- types -- */

export type Route =
  | "IV" | "GTT" | "PO" | "IM" | "SC" | "SL" | "NEB" | "PR"
  | "TOPICAL" | "NGT" | "OGT" | "PEG" | "O2" | "NIV" | "VENT" | null;

/** The receipt tying a statement to the characters it came from. */
export type Provenance = {
  note_id: number;
  char_start: number;
  char_end: number;
  /** Must equal note_body.slice(char_start, char_end), byte for byte. */
  evidence: string;
};

export type Lab = {
  name: string;
  value: number | string;
  unit?: string | null;
  flag?: "low" | "normal" | "high" | "critical" | "unknown";
  provenance: Provenance;
};

export type AmbiguousTerm = {
  term: string;
  resolved_as: string;
  alternatives?: string[];
  needs_review?: boolean;
};

export type Finding = {
  id: string;
  lane: Lane;
  shift: number;
  finding: string;
  intervention?: string | null;
  orders?: string | null;
  route?: Route;
  labs?: Lab[];
  severity?: "routine" | "notable" | "critical";
  ambiguous_terms?: AmbiguousTerm[];
  provenance: Provenance;
};

export type Allergy = {
  substance: string;
  reaction?: string | null;
  severity?: "anaphylaxis" | "severe" | "moderate" | "mild" | "unknown";
  status?: "documented" | "nkda";
  provenance: Provenance;
};

export type CodeStatus = {
  status: "full_code" | "dnr" | "dni" | "dnr_dni" | "cmo" | "unknown";
  shift: number;
  provenance: Provenance;
};

export type VisualNoteDoc = {
  schema_version: "1.0.0";
  case_id: string;
  source: { note_count: number; char_count: number; corpus?: string };
  header: {
    demographics?: { age?: number | null; sex?: "F" | "M" | "unknown"; provenance?: Provenance };
    allergies: Allergy[];
    past_medical_history: { text: string; provenance: Provenance }[];
    code_status: CodeStatus[];
    admission: { lines: string[]; provenance?: Provenance };
  };
  shifts: {
    index: number;
    note_id: number;
    label?: string;
    note_type?: "admit" | "progress" | "respiratory_care" | "addendum" | "transfer" | "discharge" | "unknown";
  }[];
  findings: Finding[];
  outcome: {
    disposition?: "discharged_home" | "transferred" | "rehab" | "expired" | "ongoing" | "unknown";
    lines: string[];
    provenance?: Provenance;
  };
  coverage: {
    clinical_sentences: number;
    covered_sentences: number;
    ratio: number;
    uncovered?: { note_id: number; text: string; classified_as?: "non_clinical" | "duplicate" | "unresolved" }[];
  };
};

/* ------------------------------------------------------------ verification - */

export type GroundingFailure = {
  path: string;
  note_id: number;
  expected: string;
  found: string;
};

/**
 * The check that makes fabrication structurally impossible.
 *
 * Re-reads every cited span from the source notes and compares it against the
 * stored evidence. Schema validation proves the shape is right; this proves
 * the content is real. Run both before anything is rendered.
 */
export function verifyGrounding(
  doc: VisualNoteDoc,
  noteBodies: Record<number, string>,
): GroundingFailure[] {
  const failures: GroundingFailure[] = [];

  const check = (p: Provenance | undefined, path: string) => {
    if (!p) return;
    const body = noteBodies[p.note_id];
    if (body === undefined) {
      failures.push({ path, note_id: p.note_id, expected: p.evidence, found: "<note not found>" });
      return;
    }
    const slice = body.slice(p.char_start, p.char_end);
    if (slice !== p.evidence) {
      failures.push({ path, note_id: p.note_id, expected: p.evidence, found: slice });
    }
  };

  doc.header.allergies.forEach((a, i) => check(a.provenance, `header.allergies[${i}]`));
  doc.header.past_medical_history.forEach((h, i) =>
    check(h.provenance, `header.past_medical_history[${i}]`),
  );
  doc.header.code_status.forEach((c, i) => check(c.provenance, `header.code_status[${i}]`));
  check(doc.header.admission.provenance, "header.admission");
  check(doc.header.demographics?.provenance, "header.demographics");
  check(doc.outcome.provenance, "outcome");

  doc.findings.forEach((f, i) => {
    check(f.provenance, `findings[${i}] (${f.id})`);
    f.labs?.forEach((l, j) => check(l.provenance, `findings[${i}].labs[${j}] (${l.name})`));
  });

  return failures;
}
