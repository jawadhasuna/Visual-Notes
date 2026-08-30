/**
 * Map an extracted VisualNoteDoc onto the shape the chart renders.
 *
 * The document is the contract; the chart is a view of it. Keeping them apart
 * means the schema can carry things the chart does not draw yet — labs,
 * allergies, ambiguity flags — without the renderer having to know.
 *
 * Two things become dynamic here that were hardcoded for the demo: the lane
 * set (only lanes that actually have findings are drawn, in canonical order)
 * and the shift list (real admissions are not four shifts long).
 */

import lanesData from "../../schema/lanes.json";
import type { LaneId, VisualNote } from "./demo.ts";

type Cited = { note_id: number; char_start: number; char_end: number; evidence: string };

type Doc = {
  header?: {
    admission?: { lines?: string[] };
    allergies?: { substance: string; reaction?: string | null; severity?: string }[];
  };
  shifts?: { index: number; note_id: number; label?: string }[];
  findings?: {
    lane: string;
    shift: number;
    finding: string;
    intervention?: string | null;
    orders?: string | null;
    route?: string | null;
    provenance?: Cited;
  }[];
  outcome?: { lines?: string[] };
};

const ORDER = lanesData.lanes as string[];
const COLOR = lanesData.laneColor as Record<string, string>;
const ABBR = lanesData.laneAbbr as Record<string, string>;
const LABEL = lanesData.laneLabel as Record<string, string>;

export function toVisualNote(doc: Doc): VisualNote {
  const findings = doc.findings ?? [];

  // Only draw lanes that carry something, but keep canonical order so two
  // charts of different patients still read the same way left to right.
  const present = new Set(findings.map((f) => f.lane));
  const lanes = ORDER.filter((id) => present.has(id)).map((id) => ({
    id: id as LaneId,
    label: LABEL[id] ?? id,
    abbr: ABBR[id] ?? id.toUpperCase(),
    color: COLOR[id] ?? "#8A97A8",
  }));

  const shifts = (doc.shifts ?? [])
    .map((s) => s.index)
    .sort((a, b) => a - b);
  // Fall back to whatever shifts the findings reference, in case the model
  // omitted the shift list but still cited notes.
  const shiftList = shifts.length
    ? shifts
    : [...new Set(findings.map((f) => f.shift))].sort((a, b) => a - b);

  return {
    admission: doc.header?.admission?.lines?.slice(0, 5) ?? ["Admission"],
    outcome: doc.outcome?.lines?.slice(0, 5) ?? ["Outcome"],
    lanes,
    shifts: shiftList,
    nodes: findings.map((f) => ({
      lane: f.lane as LaneId,
      shift: f.shift,
      finding: f.finding,
      intervention: f.intervention ?? undefined,
      orders: f.orders ?? undefined,
      route: (f.route ?? null) as VisualNote["nodes"][number]["route"],
      evidence: f.provenance?.evidence,
    })),
    allergies: (doc.header?.allergies ?? []).map((a) =>
      a.reaction ? `${a.substance} — ${a.reaction}` : a.substance,
    ),
  };
}
