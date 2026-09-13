/**
 * Render a VisualNote as native SVG, laid out like the chart on the page.
 *
 * Not a DOM screenshot. This browser taints a canvas the moment an SVG
 * containing <foreignObject> is drawn to it, which blocks the usual
 * clone-the-DOM-and-rasterise trick outright — plain SVG rasterises fine, so
 * the chart is drawn with real SVG primitives instead.
 *
 * That also buys determinism: the same JSON produces byte-identical output
 * every time, which is what the study asks for from the rendering step.
 *
 * Sizes, the rule that narrows a finished lane to a rail, and every line's
 * route come from chartLayout, the same place the page gets them, and a card
 * that is open on the page is drawn open here, so the download is the chart
 * the page shows.
 */

import type { Lane, LaneNode, VisualNote } from "./demo";
import {
  LAYOUT,
  ROUTE_TONE,
  buildColumns,
  buildRows,
  cardHeadlines,
  cellKey,
  isLive,
  placeCells,
  routeWires,
  routesOf,
  rowPads,
  type Box,
  type Group,
  type Route,
} from "./chartLayout";

/* ------------------------------------------------------------- geometry --- */

const PAD = 18;
const HEADER_H = 26;

// Inside a card: the colour bar, then text inset from both edges.
const BAR_W = 3;
const TEXT_X = 14;
const TEXT_R = 8;
const PILL_H = 13;

const HEAD = { size: 12, lh: 16, weight: 600 };
const FIND = { size: 11.5, lh: 15, weight: 600 };
const INTERV = { size: 11, lh: 14 };
const ORDERS = { size: 8.5, lh: 11.5 };

/** The chart is always white, so its palette is fixed rather than read from the page. */
const INK = {
  bg: "#ffffff",
  text: "#0b1b28",
  textDim: "#52697a",
  stripe: "#f5f8fa",
  rule: "#e3eaef",
  intervention: "#1f5fb4",
  legendFill: "#f4f8fa",
  legendStroke: "#d5e1e8",
  start: { fill: "#e8f1fb", stroke: "#9dbbe0" },
  end: { fill: "#e2f5e6", stroke: "#8fd19e" },
};

/** The page's fonts, so the image is set in the same type. */
export type Theme = { sans: string; display: string; mono: string };

function familyOf(cssVar: string, fallback: string): string {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;font-family:${cssVar}`;
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || fallback;
  probe.remove();
  return family;
}

export function readTheme(): Theme {
  return {
    sans: familyOf("var(--font-sans)", "system-ui, sans-serif"),
    display: familyOf("var(--font-display)", "system-ui, sans-serif"),
    mono: familyOf("var(--font-mono)", "ui-monospace, monospace"),
  };
}

/** Resolve a CSS colour expression to a concrete value the image can carry. */
function resolve(expr: string): string {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;background:${expr}`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

function mix(color: string, pct: number, onto: string): string {
  return resolve(`color-mix(in oklab, ${color} ${pct}%, ${onto})`);
}

/* ---------------------------------------------------------------- text ---- */

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 6;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function wrap(text: string, font: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, font) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function textEl(
  lines: string[],
  x: number,
  y: number,
  opts: { size: number; lh: number; fill: string; font: string; weight?: number; italic?: boolean },
): string {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * opts.lh}" font-family="${esc(opts.font)}" ` +
        `font-size="${opts.size}" font-weight="${opts.weight ?? 400}" ` +
        `${opts.italic ? 'font-style="italic" ' : ""}fill="${opts.fill}">${esc(l)}</text>`,
    )
    .join("");
}

/* ------------------------------------------------------------ primitives --- */

function pillWidth(route: string, theme: Theme): number {
  return measure(route, `700 9px ${theme.mono}`) + 12;
}

function pill(route: string, x: number, y: number, theme: Theme): string {
  const tone = ROUTE_TONE[route] ?? INK.textDim;
  const w = pillWidth(route, theme);
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${PILL_H}" rx="3" fill="${mix(tone, 12, INK.bg)}"/>` +
    `<text x="${x + w / 2}" y="${y + 9.5}" text-anchor="middle" font-family="${esc(theme.mono)}" ` +
    `font-size="9" font-weight="700" fill="${tone}">${esc(route)}</text>`
  );
}

/* ---------------------------------------------------------------- cards --- */

type DetailPlan = {
  finding: string[];
  interv: string[];
  orders: string[];
  route: LaneNode["route"];
  height: number;
};

type CardPlan = {
  headlines: string[][];
  more: number;
  routes: Route[];
  /** Height of the card closed: header, headlines, padding. */
  closed: number;
  /** One entry per finding when the card is open; empty when closed. */
  details: DetailPlan[];
  height: number;
};

function planCard(group: Group, isOpen: boolean, theme: Theme, width: number): CardPlan {
  // The image may fall back to a system font a little wider than the page's,
  // so text is wrapped a few pixels short of the card edge.
  const textW = width - TEXT_X - TEXT_R - 4;
  const { shown, more } = cardHeadlines(group);
  const headlines = shown.map((h) => wrap(h, `${HEAD.weight} ${HEAD.size}px ${theme.sans}`, textW));
  const lineCount = headlines.reduce((a, l) => a + l.length, 0);
  const closed =
    8 + 14 + 4 + lineCount * HEAD.lh + (headlines.length - 1) * 2 + (more ? 14 : 0) + 8;

  const details: DetailPlan[] = [];
  let height = closed;
  if (isOpen) {
    const fFont = `${FIND.weight} ${FIND.size}px ${theme.sans}`;
    const iFont = `italic ${INTERV.size}px ${theme.sans}`;
    const oFont = `${ORDERS.size}px ${theme.mono}`;
    height += 1 + 10;
    group.nodes.forEach((node, i) => {
      const routeW = node.route ? pillWidth(node.route, theme) + 6 : 0;
      const finding = wrap(node.finding, fFont, textW);
      const interv = node.intervention ? wrap(node.intervention, iFont, textW) : [];
      const orders = node.orders ? wrap(node.orders.toUpperCase(), oFont, textW - routeW) : [];
      let h = finding.length * FIND.lh;
      if (interv.length) h += 4 + interv.length * INTERV.lh;
      if (orders.length || node.route) {
        h += 4 + Math.max(orders.length * ORDERS.lh, node.route ? PILL_H : 0);
      }
      details.push({ finding, interv, orders, route: node.route, height: h });
      height += h + (i > 0 ? 10 : 0);
    });
    height += 10;
  }

  return { headlines, more, routes: routesOf(group.nodes), closed, details, height };
}

function drawCard(b: Box, lane: Lane, plan: CardPlan, theme: Theme, clipId: string): string {
  const { x, y, w } = b;
  const h = plan.height;
  const tx = x + TEXT_X;
  const out: string[] = [];

  // Body, then the lane-colour bar clipped to the card's rounded corners.
  out.push(
    `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/></clipPath>` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="8" ` +
      `fill="${mix(lane.color, 16, INK.bg)}" stroke="${mix(lane.color, 55, INK.bg)}"/>` +
      `<rect x="${x}" y="${y}" width="${BAR_W}" height="${h}" fill="${lane.color}" clip-path="url(#${clipId})"/>`,
  );

  // Header: the lane's emoji on the left, route tags on the right.
  out.push(`<text x="${tx}" y="${y + 19}" font-size="12">${esc(lane.emoji)}</text>`);
  let px = x + w - TEXT_R;
  for (const route of [...plan.routes].reverse()) {
    px -= pillWidth(route, theme);
    out.push(pill(route, px, y + 8, theme));
    px -= 4;
  }

  // Headlines.
  let baseline = y + 8 + 14 + 4 + HEAD.size - 1;
  for (const lines of plan.headlines) {
    out.push(
      textEl(lines, tx, baseline, {
        size: HEAD.size, lh: HEAD.lh, fill: INK.text, font: theme.sans, weight: HEAD.weight,
      }),
    );
    baseline += lines.length * HEAD.lh + 2;
  }
  if (plan.more) {
    out.push(
      textEl([`+${plan.more} more`], tx, baseline, {
        size: 10.5, lh: 14, fill: INK.textDim, font: theme.sans,
      }),
    );
  }

  // Open: a rule, then each finding in full.
  if (plan.details.length) {
    let top = y + plan.closed;
    out.push(
      `<rect x="${x + BAR_W}" y="${top}" width="${w - BAR_W}" height="1" ` +
        `fill="${mix(lane.color, 45, INK.bg)}"/>`,
    );
    top += 1 + 10;
    plan.details.forEach((d, i) => {
      if (i > 0) top += 10;
      out.push(
        textEl(d.finding, tx, top + FIND.size - 1, {
          size: FIND.size, lh: FIND.lh, fill: INK.text, font: theme.sans, weight: FIND.weight,
        }),
      );
      let cursor = top + d.finding.length * FIND.lh;
      if (d.interv.length) {
        cursor += 4;
        out.push(
          textEl(d.interv, tx, cursor + INTERV.size - 1, {
            size: INTERV.size, lh: INTERV.lh, fill: INK.intervention, font: theme.sans, italic: true,
          }),
        );
        cursor += d.interv.length * INTERV.lh;
      }
      if (d.orders.length || d.route) {
        cursor += 4;
        if (d.orders.length) {
          out.push(
            textEl(d.orders, tx, cursor + ORDERS.size, {
              size: ORDERS.size, lh: ORDERS.lh, fill: INK.textDim, font: theme.mono,
            }),
          );
        }
        if (d.route) {
          out.push(pill(d.route, x + w - TEXT_R - pillWidth(d.route, theme), cursor, theme));
        }
      }
      top += d.height;
    });
  }

  return out.join("");
}

/* ------------------------------------------------------- page furniture --- */

function terminus(
  lines: string[],
  label: string,
  b: { x: number; y: number; w: number },
  tone: "start" | "end",
  theme: Theme,
): { svg: string; height: number } {
  const font = `500 12px ${theme.sans}`;
  const wrapped = lines.flatMap((l) => wrap(l, font, b.w - 40));
  const h = 14 + 12 + wrapped.length * 16 + 14;
  const cx = b.x + b.w / 2;
  const svg =
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${h}" rx="12" ` +
    `fill="${INK[tone].fill}" stroke="${INK[tone].stroke}"/>` +
    `<text x="${cx}" y="${b.y + 20}" text-anchor="middle" font-family="${esc(theme.mono)}" ` +
    `font-size="9" font-weight="700" letter-spacing="1.8" fill="${INK.textDim}">${esc(label.toUpperCase())}</text>` +
    wrapped
      .map(
        (l, i) =>
          `<text x="${cx}" y="${b.y + 38 + i * 16}" text-anchor="middle" ` +
          `font-family="${esc(theme.sans)}" font-size="12" font-weight="500" ` +
          `fill="${INK.text}">${esc(l)}</text>`,
      )
      .join("");
  return { svg, height: h };
}

/** The key, flowed onto as many lines as the chart's width needs. */
function legend(result: VisualNote, x: number, y: number, width: number, theme: Theme) {
  type Item = { w: number; draw: (ix: number, mid: number) => string };
  const itemFont = `10.5px ${theme.sans}`;
  const small = (text: string, ix: number, mid: number) =>
    `<text x="${ix}" y="${mid + 3.5}" font-family="${esc(theme.sans)}" font-size="10.5" ` +
    `fill="${INK.textDim}">${esc(text)}</text>`;
  const heading = (text: string): Item => ({
    w: measure(text, `700 9px ${theme.mono}`) + text.length * 1.6,
    draw: (ix, mid) =>
      `<text x="${ix}" y="${mid + 3}" font-family="${esc(theme.mono)}" font-size="9" ` +
      `font-weight="700" letter-spacing="1.6" fill="${INK.textDim}">${esc(text)}</text>`,
  });

  const items: Item[] = [heading("LANES")];
  for (const lane of result.lanes) {
    items.push({
      w: 31 + measure(lane.label, itemFont),
      draw: (ix, mid) =>
        `<rect x="${ix}" y="${mid - 4}" width="8" height="8" rx="2" fill="${lane.color}"/>` +
        `<text x="${ix + 13}" y="${mid + 4.5}" font-size="12">${esc(lane.emoji)}</text>` +
        small(lane.label, ix + 31, mid),
    });
  }
  const routes = routesOf(result.nodes);
  if (routes.length) {
    items.push(heading("ROUTES"));
    for (const route of routes) {
      items.push({ w: pillWidth(route, theme), draw: (ix, mid) => pill(route, ix, mid - PILL_H / 2, theme) });
    }
  }
  const note = "before the first and after the last update";
  items.push({
    w: 8 + measure(note, itemFont),
    draw: (ix, mid) =>
      `<line x1="${ix + 1}" y1="${mid - 6}" x2="${ix + 1}" y2="${mid + 6}" stroke="${INK.textDim}" ` +
      `stroke-width="1.5" stroke-dasharray="3 3"/>` +
      small(note, ix + 8, mid),
  });

  const PAD_X = 12;
  const PAD_Y = 6;
  const LINE_H = 20;
  const GAP = 14;
  const placed: { item: Item; ix: number; line: number }[] = [];
  let ix = x + PAD_X;
  let line = 0;
  for (const item of items) {
    if (ix > x + PAD_X && ix + item.w > x + width - PAD_X) {
      line += 1;
      ix = x + PAD_X;
    }
    placed.push({ item, ix, line });
    ix += item.w + GAP;
  }

  const height = PAD_Y * 2 + (line + 1) * LINE_H;
  const svg =
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" ` +
    `fill="${INK.legendFill}" stroke="${INK.legendStroke}"/>` +
    placed.map((p) => p.item.draw(p.ix, y + PAD_Y + p.line * LINE_H + LINE_H / 2)).join("");
  return { svg, height };
}

/* ---------------------------------------------------------------- build --- */

export function renderChartSvg(
  result: VisualNote,
  theme: Theme,
  open: ReadonlySet<string> = new Set(),
): string {
  const columns = buildColumns(result);
  const rows = buildRows(result);
  const pads = rowPads(columns, rows);

  // Wide enough for every lane at a comfortable card width, within reason.
  const laneArea = Math.min(1500, Math.max(760, columns.length * 165));
  const contentW = LAYOUT.labelW + laneArea;
  const width = PAD * 2 + contentW;
  const areaX = PAD + LAYOUT.labelW;
  const place = (live: boolean[]) =>
    placeCells(live, laneArea).map((c) => ({ x: areaX + c.x, w: c.w }));

  const boxW = Math.min(contentW, LAYOUT.boxMax);
  const boxX = PAD + (contentW - boxW) / 2;

  const back: string[] = [];
  const front: string[] = [];
  const heads = new Map<string, Box>();
  const cells = new Map<string, Box>();
  const cards = new Map<string, Box>();
  const geoRows: { shift: number; y: number; h: number; pad: number }[] = [];
  let clips = 0;
  let y = PAD;

  const adm = terminus(result.admission, "Admission", { x: boxX, y, w: boxW }, "start", theme);
  front.push(adm.svg);
  const admission = { x: boxX, y, w: boxW, h: adm.height };
  y += adm.height + LAYOUT.linkGap;

  // Lane headers, one per lane, all live at the top.
  place(columns.map(() => true)).forEach((cell, i) => {
    const { lane } = columns[i];
    heads.set(lane.id, { x: cell.x, y, w: cell.w, h: HEADER_H });
    front.push(
      `<rect x="${cell.x}" y="${y}" width="${cell.w}" height="${HEADER_H}" rx="6" ` +
        `fill="${mix(lane.color, 20, INK.bg)}"/>` +
        `<text x="${cell.x + 8}" y="${y + 18}" font-size="14">${esc(lane.emoji)}</text>` +
        `<text x="${cell.x + 29}" y="${y + 17}" font-family="${esc(theme.mono)}" ` +
        `font-size="10" font-weight="700" letter-spacing="1.4" fill="${mix(lane.color, 72, "#000000")}">` +
        `${esc(lane.abbr.toUpperCase())}</text>`,
    );
  });
  y += HEADER_H + 4;

  // One row per shift, as tall as its tallest card.
  rows.forEach((shift, r) => {
    const placed = place(columns.map((c) => isLive(c, shift)));
    const pad = pads[r];
    const plans = columns.map((c, i) => {
      const group = c.groups.get(shift);
      return group ? { group, plan: planCard(group, open.has(group.key), theme, placed[i].w) } : null;
    });
    const hasCards = plans.some(Boolean);
    const rowH = Math.max(
      LAYOUT.rowMin,
      ...plans.map((p) => (p ? pad + p.plan.height + LAYOUT.belowCard : 0)),
    );

    if (r % 2) back.push(`<rect x="${PAD}" y="${y}" width="${contentW}" height="${rowH}" fill="${INK.stripe}"/>`);
    back.push(`<rect x="${PAD}" y="${y}" width="${contentW}" height="1" fill="${INK.rule}"/>`);
    front.push(
      `<text x="${PAD + 6}" y="${y + (hasCards ? pad + 9 : 10) + 10}" font-family="${esc(theme.display)}" ` +
        `font-size="12.5" font-weight="800" letter-spacing="0.75" ` +
        `fill="${hasCards ? INK.text : INK.textDim}">SHIFT ${shift}</text>`,
    );

    columns.forEach((column, i) => {
      cells.set(cellKey(column.lane.id, shift), { x: placed[i].x, y, w: placed[i].w, h: rowH });
      const p = plans[i];
      if (!p) return;
      const card = { x: placed[i].x, y: y + pad, w: placed[i].w, h: p.plan.height };
      cards.set(p.group.key, card);
      front.push(drawCard(card, column.lane, p.plan, theme, `card${clips++}`));
    });

    geoRows.push({ shift, y, h: rowH, pad });
    y += rowH;
  });

  y += LAYOUT.linkGap;
  const out = terminus(result.outcome, "Outcome", { x: boxX, y, w: boxW }, "end", theme);
  front.push(out.svg);
  const outcome = { x: boxX, y, w: boxW, h: out.height };
  y += out.height + 12;

  const key = legend(result, PAD, y, contentW, theme);
  front.push(key.svg);
  y += key.height + PAD;

  // Lines last in the maths but beneath the cards on the page.
  const colorOf = new Map<string, string>(columns.map((c) => [c.lane.id, c.lane.color]));
  const wires = routeWires({ admission, outcome, heads, rows: geoRows, cells, cards }, columns).map((w) => {
    const color = mix(colorOf.get(w.lane) ?? "#8a97a8", 65, INK.bg);
    return (
      `<path d="${w.d}" fill="none" stroke="${color}" stroke-width="1.5"` +
      `${w.dashed ? ' stroke-dasharray="4 3"' : ""}/>` +
      `<path d="${w.arrow}" fill="none" stroke="${color}" stroke-width="1.5" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>`
    );
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" ` +
    `viewBox="0 0 ${width} ${y}">` +
    `<rect width="${width}" height="${y}" fill="${INK.bg}"/>` +
    back.join("") +
    wires.join("") +
    front.join("") +
    `</svg>`
  );
}
