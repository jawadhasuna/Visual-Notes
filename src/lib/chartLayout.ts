/**
 * What the chart draws, how big it is, and where its lines run, decided once
 * for both renderers.
 *
 * The page and the downloaded image read their rows, cards, sizes and line
 * routes from here, so the image cannot drift from what the page shows.
 */

import type { Lane, LaneNode, VisualNote } from "./demo";
import { shorten } from "./headline";

export const ROUTE_TONE: Record<string, string> = {
  IV: "#c0392b",
  GTT: "#7d3cc4",
  PO: "#2f6fd0",
  NEB: "#1f8a52",
  O2: "#0e7c86",
  NIV: "#0e7c86",
};

export type Route = NonNullable<LaneNode["route"]>;

/** One card: a lane's findings at one shift. */
export type Group = { key: string; shift: number; nodes: LaneNode[] };

/** One lane: its cards by shift, and the shifts of its first and last card. */
export type Column = { lane: Lane; groups: Map<number, Group>; first: number; last: number };

export const cardKey = (lane: string, shift: number) => `${lane}-${shift}`;
export const cellKey = (lane: string, shift: number) => `${lane}:${shift}`;

/** Sizes both renderers share. */
export const LAYOUT = {
  /** The shift-label column. */
  labelW: 76,
  /** Between two lanes. */
  gap: 8,
  /** A lane with nothing more to report: a thin rail that carries its line on. */
  railW: 10,
  /** Cards share the width but stay between these; below the minimum the chart scrolls, which only a phone needs. */
  cardMin: 72,
  cardMax: 280,
  /** Room above a card for the arrow into it. */
  arrowH: 18,
  /** The same room where lanes close in, so the lines bend gently rather than jog. */
  bendH: 36,
  belowCard: 8,
  rowMin: 34,
  /** Room for the lines fanning out of the admission and into the outcome. */
  linkGap: 44,
  /** The admission and outcome boxes. */
  boxMax: 760,
} as const;

/** Each lane's findings, gathered into one card per shift. */
export function buildColumns(result: VisualNote): Column[] {
  return result.lanes.map((lane) => {
    const groups = new Map<number, Group>();
    for (const node of result.nodes) {
      if (node.lane !== lane.id) continue;
      const group = groups.get(node.shift);
      if (group) group.nodes.push(node);
      else groups.set(node.shift, { key: cardKey(lane.id, node.shift), shift: node.shift, nodes: [node] });
    }
    const shifts = [...groups.keys()];
    return { lane, groups, first: Math.min(...shifts), last: Math.max(...shifts) };
  });
}

/**
 * The shifts drawn as rows: every shift up to the last one with a finding.
 * Later shifts are left off rather than drawn empty, because while a long
 * admission is still streaming in, or after a run is cut short, an empty row
 * would read as "nothing happened" when those notes were simply not read.
 */
export function buildRows(result: VisualNote): number[] {
  if (!result.nodes.length) return [];
  const last = Math.max(...result.nodes.map((n) => n.shift));
  const all = new Set([...result.shifts, ...result.nodes.map((n) => n.shift)]);
  return [...all].filter((s) => s <= last).sort((a, b) => a - b);
}

/** Older results and the built-in demo carry no headline; cut one from the finding. */
export const headlineOf = (node: LaneNode) => node.headline ?? shorten(node.finding);

/** A card's headlines, each said once: the first three are shown, the rest counted. */
export function cardHeadlines(group: Group): { all: string[]; shown: string[]; more: number } {
  const all = [...new Set(group.nodes.map(headlineOf))];
  return { all, shown: all.slice(0, 3), more: Math.max(0, all.length - 3) };
}

/** Every route used by a set of findings, each once. */
export function routesOf(nodes: LaneNode[]): Route[] {
  return [...new Set(nodes.map((n) => n.route).filter((r): r is Route => Boolean(r)))];
}

/* ------------------------------------------------------------- converge --- */

/**
 * A lane is live from the top of the chart down to its last card. After that
 * it narrows to a rail, and the lanes still reporting share the room it gave
 * up, closing in toward the middle as the admission goes on.
 */
export const isLive = (column: Column, shift: number) => shift <= column.last;

/** Room above each row's cards: more where the lanes close in. */
export function rowPads(columns: Column[], rows: number[]): number[] {
  return rows.map((shift, r) => {
    if (r === 0) return LAYOUT.arrowH;
    const prev = rows[r - 1];
    return columns.some((c) => isLive(c, prev) !== isLive(c, shift)) ? LAYOUT.bendH : LAYOUT.arrowH;
  });
}

/**
 * Where each lane sits across a row of the given width: live lanes share it
 * equally within the card limits, rails are thin, and the whole row is
 * centred. The page gets the same result from flexbox; the image uses this.
 */
export function placeCells(live: boolean[], width: number): { x: number; w: number }[] {
  const n = live.length;
  const k = live.filter(Boolean).length;
  const gaps = Math.max(0, n - 1) * LAYOUT.gap;
  const rails = (n - k) * LAYOUT.railW;
  const w = k ? Math.max(LAYOUT.cardMin, Math.min(LAYOUT.cardMax, (width - rails - gaps) / k)) : 0;
  let x = (width - (k * w + rails + gaps)) / 2;
  return live.map((isLiveCell) => {
    const cell = { x, w: isLiveCell ? w : LAYOUT.railW };
    x += cell.w + LAYOUT.gap;
    return cell;
  });
}

/* ---------------------------------------------------------------- lines --- */

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

/** Where everything landed, in one coordinate space. */
export type Geometry = {
  admission: Box;
  outcome: Box;
  heads: Map<string, Box>;
  rows: { shift: number; y: number; h: number; pad: number }[];
  /** By cellKey: every lane has a cell in every row, live or rail. */
  cells: Map<string, Box>;
  /** By cardKey. */
  cards: Map<string, Box>;
};

/** One drawn line: its path, whether it is dashed, and the arrowhead at its end. */
export type Wire = { lane: string; d: string; dashed: boolean; arrow: string };

const round = (v: number) => Math.round(v * 10) / 10;

/**
 * A path through points. Where two points differ sideways it bends with
 * vertical ends, so a line always leaves and enters a card straight.
 */
function path(points: Pt[], straightLast = false): string {
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (Math.abs(a.x - b.x) < 0.5 || (straightLast && i === points.length - 1)) {
      d += ` L${round(b.x)} ${round(b.y)}`;
    } else {
      const mid = round((a.y + b.y) / 2);
      d += ` C${round(a.x)} ${mid} ${round(b.x)} ${mid} ${round(b.x)} ${round(b.y)}`;
    }
  }
  return d;
}

/** An open arrowhead at `tip`, pointing away from `from`. */
function arrowHead(tip: Pt, from: Pt): string {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip.x - ux * 5;
  const by = tip.y - uy * 5;
  const px = -uy * 3.5;
  const py = ux * 3.5;
  return (
    `M${round(bx + px)} ${round(by + py)} L${round(tip.x)} ${round(tip.y)} ` +
    `L${round(bx - px)} ${round(by - py)}`
  );
}

/**
 * Every lane's line: fanning out of the admission to its header, dashed down
 * to its first card, solid between cards, then dashed down its rail and into
 * the outcome, where all the lanes meet.
 *
 * A lane that moves over between two rows runs straight to the top of the
 * new row and bends across in the room above that row's cards, where there
 * is nothing for the line to pass behind.
 */
export function routeWires(g: Geometry, columns: Column[]): Wire[] {
  const wires: Wire[] = [];
  const n = columns.length;
  const spread = (box: Box, i: number) => box.x + (box.w * (i + 1)) / (n + 1);
  const lastRow = g.rows[g.rows.length - 1];

  columns.forEach((column, i) => {
    const lane = column.lane.id;
    const head = g.heads.get(lane);
    if (!head) return;

    const fan = { x: spread(g.admission, i), y: g.admission.y + g.admission.h };
    const headTop = { x: head.x + head.w / 2, y: head.y };
    wires.push({ lane, d: path([fan, headTop], true), dashed: true, arrow: arrowHead(headTop, fan) });

    let x = headTop.x;
    let points: Pt[] = [{ x, y: head.y + head.h }];
    let started = false;

    for (const row of g.rows) {
      const cell = g.cells.get(cellKey(lane, row.shift));
      if (!cell) continue;
      const cx = cell.x + cell.w / 2;
      if (Math.abs(cx - x) > 0.5) {
        points.push({ x, y: row.y }, { x: cx, y: row.y + row.pad });
        x = cx;
      }

      const card = g.cards.get(cardKey(lane, row.shift));
      if (!card) continue;
      const tip = { x, y: card.y };
      const prev = points[points.length - 1];
      if (Math.abs(prev.x - tip.x) > 0.5 || Math.abs(prev.y - tip.y) > 0.5) points.push(tip);
      wires.push({ lane, d: path(points), dashed: !started, arrow: arrowHead(tip, { x, y: tip.y - 10 }) });
      started = true;
      points = [{ x, y: card.y + card.h }];
    }

    if (lastRow) points.push({ x, y: lastRow.y + lastRow.h });
    const from = points[points.length - 1];
    const end = { x: spread(g.outcome, i), y: g.outcome.y };
    points.push(end);
    wires.push({ lane, d: path(points, true), dashed: true, arrow: arrowHead(end, from) });
  });

  return wires;
}
