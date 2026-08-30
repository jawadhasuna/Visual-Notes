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

export function buildPrompt(notes: Record<number, string>, caseId: string): string {
  const block = Object.entries(notes)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([id, body]) => `--- NOTE ${id} ---\n${body}`)
    .join("\n\n");

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
in a lane. Never omit an allergy. An empty allergies array means nothing was
documented; it does not mean the patient has none.

COVERAGE
Count clinical sentences you accounted for and list any you did not in
coverage.uncovered. Do not silently drop content.

case_id is "${caseId}". schema_version is "1.0.0". One shift per note, in order.

${block}`;
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
export function resolveProvenance(
  doc: any,
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

  const fix = (p: any, path: string): boolean => {
    if (!p || typeof p.evidence !== "string" || typeof p.note_id !== "number") {
      rejected.push({ path, note_id: p?.note_id ?? -1, evidence: p?.evidence ?? "", reason: "malformed provenance" });
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
    p.char_start = span[0];
    p.char_end = span[1];
    // Store the real slice, so evidence always equals the source byte for byte.
    p.evidence = body.slice(span[0], span[1]);
    resolved++;
    return true;
  };

  if (Array.isArray(doc.findings)) {
    doc.findings = doc.findings.filter((f: any, i: number) => {
      const ok = fix(f.provenance, `findings[${i}] ${f.id ?? ""}`);
      if (ok && Array.isArray(f.labs)) {
        f.labs = f.labs.filter((l: any, j: number) =>
          fix(l.provenance, `findings[${i}].labs[${j}] ${l.name ?? ""}`),
        );
      }
      return ok;
    });
  }

  const h = doc.header ?? {};
  for (const key of ["allergies", "past_medical_history", "code_status"] as const) {
    if (Array.isArray(h[key])) {
      h[key] = h[key].filter((x: any, i: number) => fix(x.provenance, `header.${key}[${i}]`));
    }
  }
  if (h.admission?.provenance) fix(h.admission.provenance, "header.admission");
  if (h.demographics?.provenance) {
    if (!fix(h.demographics.provenance, "header.demographics")) delete h.demographics.provenance;
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
