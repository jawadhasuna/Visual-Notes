/**
 * Merge chunked extractions back into one document.
 *
 * Header facts cannot be read from the first chunk alone: in a real 97-note
 * case the code status changed to DNR at shift 91, three quarters of the way
 * through the admission. So allergies, history and code status accumulate
 * across every chunk, deduplicated on what they actually say.
 *
 * Admission lines come from the chunk containing the first note and outcome
 * lines from the chunk containing the last, because those are the only chunks
 * that can see them.
 */

type Prov = { note_id: number; char_start: number; char_end: number; evidence: string };
type Cited = { provenance?: Prov };

export type PartialDoc = {
  header?: {
    demographics?: Cited & { age?: number | null; sex?: string };
    allergies?: (Cited & { substance?: string; status?: string })[];
    past_medical_history?: (Cited & { text?: string })[];
    code_status?: (Cited & { status?: string; shift?: number })[];
    admission?: { lines?: string[] } & Cited;
  };
  shifts?: { index: number; note_id: number; label?: string }[];
  findings?: (Cited & { id?: string; lane?: string; shift?: number; finding?: string })[];
  source?: { note_count: number; char_count: number; corpus?: string };
  outcome?: { lines?: string[]; disposition?: string } & Cited;
  coverage?: { clinical_sentences?: number; covered_sentences?: number; ratio?: number };
};

export function emptyDoc(caseId: string): PartialDoc & { case_id: string; schema_version: string } {
  return {
    case_id: caseId,
    schema_version: "1.0.0",
    header: { allergies: [], past_medical_history: [], code_status: [], admission: { lines: [] } },
    shifts: [],
    findings: [],
    outcome: { lines: [] },
    coverage: { clinical_sentences: 0, covered_sentences: 0, ratio: 0 },
  };
}

const key = (o: unknown, ...fields: string[]) =>
  fields
    .map((f) => String((o as Record<string, unknown>)?.[f] ?? "").trim().toLowerCase())
    .join("|");

function mergeList<T>(into: T[], from: T[] | undefined, ...fields: string[]) {
  if (!Array.isArray(from)) return;
  const seen = new Set(into.map((x) => key(x, ...fields)));
  for (const item of from) {
    const k = key(item, ...fields);
    if (seen.has(k)) continue;
    seen.add(k);
    into.push(item);
  }
}

/** Fold one chunk's result into the accumulating document. */
export function mergeChunk(
  target: PartialDoc,
  chunk: PartialDoc,
  opts: { isFirst: boolean; isLast: boolean },
) {
  const th = (target.header ??= {});
  const ch = chunk.header ?? {};

  // Allergies are deduplicated on substance so a repeat mention across chunks
  // does not become a second allergy.
  mergeList((th.allergies ??= []), ch.allergies, "substance", "status");
  mergeList((th.past_medical_history ??= []), ch.past_medical_history, "text");
  // Code status is a series, not a fact: keep every distinct status per shift.
  mergeList((th.code_status ??= []), ch.code_status, "status", "shift");

  if (!th.demographics && ch.demographics) th.demographics = ch.demographics;

  if (opts.isFirst && ch.admission?.lines?.length) {
    th.admission = ch.admission;
  }
  if (opts.isLast && chunk.outcome?.lines?.length) {
    target.outcome = chunk.outcome;
  }

  mergeList((target.shifts ??= []), chunk.shifts, "index");
  (target.findings ??= []).push(...(chunk.findings ?? []));

  const tc = (target.coverage ??= { clinical_sentences: 0, covered_sentences: 0, ratio: 0 });
  tc.clinical_sentences = (tc.clinical_sentences ?? 0) + (chunk.coverage?.clinical_sentences ?? 0);
  tc.covered_sentences = (tc.covered_sentences ?? 0) + (chunk.coverage?.covered_sentences ?? 0);
}

/**
 * Tidy the accumulated document so it can satisfy the strict schema.
 *
 * Finding ids must be unique across chunks, shifts must be present and in
 * order, and the terminus boxes need something in them even when the model
 * left a placeholder.
 */
export function finaliseDoc(
  doc: PartialDoc,
  notes: Record<number, string>,
): void {
  const ids = Object.keys(notes).map(Number).sort((a, b) => a - b);

  doc.shifts = ids.map((noteId, i) => {
    const existing = doc.shifts?.find((s) => s.note_id === noteId || s.index === noteId);
    return { index: noteId, note_id: noteId, label: existing?.label ?? `Shift ${i + 1}` };
  });

  // Facts about the input, so they are counted here rather than asked of the
  // model — it cannot see the whole admission once the notes are chunked.
  doc.source = {
    note_count: ids.length,
    char_count: ids.reduce((a, id) => a + notes[id].length, 0),
    corpus: doc.source?.corpus ?? "physionet-deid-nursing",
  };

  const used = new Set<string>();
  for (const f of doc.findings ?? []) {
    const base = `${f.lane ?? "x"}-${f.shift ?? 0}`;
    let n = 1;
    let id = `${base}-${n}`;
    while (used.has(id)) id = `${base}-${++n}`;
    used.add(id);
    f.id = id;

    // The headline is a card label, capped by the schema. The untruncated
    // clinical text survives in provenance.evidence, which is the record of
    // what the note actually said.
    if (f.finding && f.finding.length > 160) {
      f.finding = f.finding.slice(0, 159).trimEnd() + "…";
    }
  }

  const h = (doc.header ??= {});
  const admissionLines = h.admission?.lines?.length ? h.admission.lines.slice(0, 5) : ["Admission"];
  h.admission = { ...h.admission, lines: admissionLines };

  const outcomeLines = doc.outcome?.lines?.length ? doc.outcome.lines.slice(0, 5) : ["Ongoing"];
  doc.outcome = { ...doc.outcome, lines: outcomeLines };

  const c = (doc.coverage ??= { clinical_sentences: 0, covered_sentences: 0, ratio: 0 });
  c.ratio = c.clinical_sentences ? (c.covered_sentences ?? 0) / c.clinical_sentences : 0;
  c.ratio = Math.min(1, Math.max(0, c.ratio));
}
