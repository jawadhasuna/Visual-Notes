/**
 * Extraction: notes in, verified Visual Note document out.
 *
 * The important design decision here was forced by testing, not theory.
 *
 * The schema wants char_start/char_end on every citation. The obvious approach
 * is to ask the model for them — and it does not work. In the first real run
 * against gemini-3.7-flash the model copied the evidence text perfectly but got
 * the offsets wrong: it cited "Discharged home with oral antibiotics and
 * follow-up with PCP" at the wrong position in a 158-character note. Language
 * models have no character-level positional sense; asking them to count is
 * asking for a coin flip.
 *
 * So the model is asked only for what it can actually do — quote the source
 * verbatim — and the offsets are computed here with indexOf. This is strictly
 * better than trusting the model:
 *
 *   - offsets are always correct, because they are derived not asserted;
 *   - a fabricated quote has nowhere to hide, since text that is not in the
 *     note cannot be located and the finding is rejected.
 *
 * The grounding guarantee is unchanged. Only the arithmetic moved to the one
 * party that can do it reliably.
 */

// Explicit .ts extension so Node's native TypeScript loader can resolve this
// when the scripts import it. Next's bundler handles it either way, which
// keeps the scripts and the app on one implementation.
import { toVertexSchema } from "./vertexSchema.ts";

type JsonSchema = Record<string, unknown>;

/**
 * The model-facing schema: the strict schema translated to OpenAPI, with
 * char_start/char_end removed so the model is never asked to count.
 */
export function buildModelSchema(strict: JsonSchema): JsonSchema {
  const vertex = toVertexSchema(strict) as JsonSchema;

  const strip = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(strip);
    if (!node || typeof node !== "object") return;
    const obj = node as JsonSchema;

    const props = obj.properties as JsonSchema | undefined;
    if (props?.note_id && props?.evidence) {
      delete props.char_start;
      delete props.char_end;
      if (Array.isArray(obj.required)) {
        obj.required = (obj.required as string[]).filter(
          (r) => r !== "char_start" && r !== "char_end",
        );
      }
    }
    for (const v of Object.values(obj)) strip(v);
  };

  strip(vertex);
  return vertex;
}

/**
 * Split an admission into extraction units.
 *
 * Measured behaviour, not a guess: extraction density collapses as the input
 * grows. Across five real cases, findings per note ran 8.0 (2 notes), 1.13
 * (15), 0.52 (33), 0.20 (50), 0.21 (97). Given a whole long admission the
 * model writes a summary instead of an extraction, even at temperature 0.
 *
 * Short admissions are left whole because they already extract well; only
 * longer ones are chunked, which keeps the cost close to single-call
 * extraction while fixing the collapse.
 */
export function planChunks(
  notes: Record<number, string>,
  { whole = 10, size = 4 } = {},
): number[][] {
  const ids = Object.keys(notes).map(Number).sort((a, b) => a - b);
  if (ids.length <= whole) return [ids];
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

export function buildPrompt(
  notes: Record<number, string>,
  caseId: string,
  chunk?: { index: number; total: number; noteIds: number[] },
): string {
  const ids = chunk ? chunk.noteIds : Object.keys(notes).map(Number).sort((a, b) => a - b);
  const block = ids.map((id) => `--- NOTE ${id} ---\n${notes[id]}`).join("\n\n");

  const scope = chunk
    ? `This is part ${chunk.index + 1} of ${chunk.total} of one admission. Extract ONLY
from the notes shown below — later parts cover the rest. Do not summarise across
the admission and do not invent shifts you cannot see. Give admission lines only
if this part contains the admission note, and outcome lines only if it contains
the final note; otherwise use a single short placeholder.

`
    : "";

  return `You are converting ICU nursing notes into a structured Visual Note.

CITATIONS
Every provenance.evidence must be copied VERBATIM from the note it cites —
character for character, including any typos, capitalisation and abbreviations
exactly as written. Do not paraphrase, tidy or normalise the quote. Quote the
shortest span that supports the finding. Do not report character positions;
they are computed separately.

LANES
Use only the lanes in the schema. Never invent one. Where a nurse has labelled
a section (RESP:, CV:, GI:, GU:, ID:, ENDO:, NEURO:, SKIN:) trust that label.

AMBIGUOUS ABBREVIATIONS
Some abbreviations mean different things depending on the lane. Resolve them
from context and record the resolution in ambiguous_terms:
  BS  - bowel sounds in GI, breath sounds in Resp, blood sugar in Endo
  PT  - usually "patient"; prothrombin time in a Heme context
  MS  - morphine sulfate as a drug; mental status as an assessment
  CA  - calcium, cancer, or cardiac arrest
  DC  - discontinued or discharged

SAFETY
Allergies, past medical history and code status belong in the header block, not
in a lane. Never omit an allergy.

NKDA means "no known drug allergies" — it is the ABSENCE of an allergy. Never
put NKDA, NKA or "none" in the substance field. Record it as one entry with
status "nkda" and substance "none documented". Record a real allergy with
status "documented", its substance, and its reaction and severity when stated
(anaphylaxis is severity "anaphylaxis", not "unknown").

An empty allergies array means nothing was documented; it does not assert the
patient has no allergies.

COVERAGE
Count clinical sentences you accounted for and list any you did not in
coverage.uncovered. Do not silently drop content.

DENSITY
Extract every distinct clinical observation, not a summary. A busy ICU shift
usually yields several findings across different body systems. Do not collapse
a whole shift into one line.

case_id is "${caseId}". schema_version is "1.0.0". The shift index for a note is
its note number.

${scope}${block}`;
}

export type ResolveResult = {
  resolved: number;
  rejected: { path: string; note_id: number; evidence: string; reason: string }[];
};

/**
 * Fill in char_start/char_end by locating each evidence string in its note.
 *
 * Anything that cannot be located is a finding the source does not support, so
 * it is removed rather than rendered. Whitespace is normalised before matching
 * because models reflow line breaks inside quotes; the stored evidence is
 * always the real source slice, never the model's version of it.
 */
/** Loose shapes: the model's output is untrusted until this pass verifies it. */
type LooseProvenance = {
  note_id?: unknown;
  evidence?: unknown;
  char_start?: number;
  char_end?: number;
};
type LooseCited = { provenance?: LooseProvenance };
type LooseDoc = {
  findings?: (LooseCited & { id?: string; labs?: (LooseCited & { name?: string })[] })[];
  header?: Record<string, unknown> & {
    admission?: LooseCited;
    demographics?: LooseCited;
  };
  outcome?: LooseCited;
};

export function resolveProvenance(
  doc: LooseDoc,
  notes: Record<number, string>,
): ResolveResult {
  const rejected: ResolveResult["rejected"] = [];
  let resolved = 0;

  const locate = (body: string, quote: string): [number, number] | null => {
    const direct = body.indexOf(quote);
    if (direct !== -1) return [direct, direct + quote.length];

    // Retry against whitespace-collapsed text, then map back to real offsets.
    const collapsed: number[] = [];
    let flat = "";
    for (let i = 0; i < body.length; i++) {
      const ch = /\s/.test(body[i]) ? " " : body[i];
      if (ch === " " && flat.endsWith(" ")) continue;
      collapsed.push(i);
      flat += ch;
    }
    const needle = quote.replace(/\s+/g, " ").trim();
    const at = flat.indexOf(needle);
    if (at === -1) return null;
    const start = collapsed[at];
    const end = collapsed[Math.min(at + needle.length - 1, collapsed.length - 1)] + 1;
    return [start, end];
  };

  const fix = (p: LooseProvenance | undefined, path: string): boolean => {
    if (!p || typeof p.evidence !== "string" || typeof p.note_id !== "number") {
      rejected.push({
        path,
        note_id: typeof p?.note_id === "number" ? p.note_id : -1,
        evidence: typeof p?.evidence === "string" ? p.evidence : "",
        reason: "malformed provenance",
      });
      return false;
    }
    const body = notes[p.note_id];
    if (body === undefined) {
      rejected.push({ path, note_id: p.note_id, evidence: p.evidence, reason: "note does not exist" });
      return false;
    }
    const span = locate(body, p.evidence);
    if (!span) {
      rejected.push({ path, note_id: p.note_id, evidence: p.evidence, reason: "quote not found in note" });
      return false;
    }
    const prov = p as { char_start: number; char_end: number; evidence: string };
    prov.char_start = span[0];
    prov.char_end = span[1];
    // Store the real slice, so evidence always equals the source byte for byte.
    prov.evidence = body.slice(span[0], span[1]);
    resolved++;
    return true;
  };

  if (Array.isArray(doc.findings)) {
    doc.findings = doc.findings.filter((f, i) => {
      const ok = fix(f.provenance, `findings[${i}] ${f.id ?? ""}`);
      if (ok && Array.isArray(f.labs)) {
        f.labs = f.labs.filter((l, j) =>
          fix(l.provenance, `findings[${i}].labs[${j}] ${l.name ?? ""}`),
        );
      }
      return ok;
    });
  }

  const h = doc.header;
  if (h) {
    for (const key of ["allergies", "past_medical_history", "code_status"] as const) {
      const list = h[key];
      if (Array.isArray(list)) {
        h[key] = (list as LooseCited[]).filter((x, i) =>
          fix(x.provenance, `header.${key}[${i}]`),
        );
      }
    }
    if (h.admission?.provenance) fix(h.admission.provenance, "header.admission");
    if (h.demographics?.provenance) {
      if (!fix(h.demographics.provenance, "header.demographics")) {
        delete h.demographics.provenance;
      }
    }
  }
  if (doc.outcome?.provenance) {
    if (!fix(doc.outcome.provenance, "outcome")) delete doc.outcome.provenance;
  }

  return { resolved, rejected };
}

/** Split a raw corpus block into { note_id: body }. */
export function parseNotes(raw: string): Record<number, string> {
  const notes: Record<number, string> = {};
  const re = /START_OF_RECORD=[^|]*\|\|\|\|(\d+)\|\|\|\|\n?([\s\S]*?)\n?\|\|\|\|END_OF_RECORD/g;
  for (const m of raw.matchAll(re)) notes[Number(m[1])] = m[2];
  return notes;
}
