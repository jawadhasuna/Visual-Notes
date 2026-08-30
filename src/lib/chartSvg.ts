/**
 * Render a VisualNote as native SVG.
 *
 * Not a DOM screenshot. This browser taints a canvas the moment an SVG
 * containing <foreignObject> is drawn to it, which blocks the usual
 * clone-the-DOM-and-rasterise trick outright — plain SVG rasterises fine, so
 * the chart is drawn with real SVG primitives instead.
 *
 * That also buys determinism: the same JSON produces byte-identical output
 * every time, which is what the study asks for from the rendering step.
 *
 * Colours are read back out of the live document, so the export matches
 * whatever the page is actually showing.
 */

import { SHIFTS, type LaneNode, type VisualNote } from "./demo";

const LANE_W = 196;
const GAP_X = 10;
const PAD = 18;
const CARD_PAD = 10;
const BAR_W = 3;

const FINDING = { size: 12, lh: 15, weight: 600 };
const INTERV = { size: 11, lh: 14 };
const ORDERS = { size: 9, lh: 12 };

const ROUTE_TONE: Record<string, string> = {
  IV: "#c0392b",
  GTT: "#7d3cc4",
  PO: "#2f6fd0",
  NEB: "#1f8a52",
  O2: "#0e7c86",
  NIV: "#0e7c86",
};

export type Theme = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  navy: string;
  teal: string;
  sans: string;
  mono: string;
};

/** Resolve a CSS colour expression (var(), color-mix(), …) to a concrete value. */
function resolve(expr: string): string {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;background:${expr}`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

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
    bg: resolve("var(--bg)"),
    surface: resolve("var(--surface)"),
    surface2: resolve("var(--surface-2)"),
    border: resolve("var(--border)"),
    text: resolve("var(--text)"),
    textDim: resolve("var(--text-dim)"),
    navy: resolve("var(--color-navy-600)"),
    teal: resolve("var(--color-teal-500)"),
    sans: familyOf("var(--font-sans)", "system-ui, sans-serif"),
    mono: familyOf("var(--font-mono)", "ui-monospace, monospace"),
  };
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

/* --------------------------------------------------------------- layout --- */

type CardPlan = {
  finding: string[];
  interv: string[];
  orders: string;
  route: LaneNode["route"];
  height: number;
};

function planCard(node: LaneNode, theme: Theme): CardPlan {
  const inner = LANE_W - CARD_PAD * 2 - BAR_W - 4;
  const fFont = `${FINDING.weight} ${FINDING.size}px ${theme.sans}`;
  const iFont = `italic ${INTERV.size}px ${theme.sans}`;

  const finding = wrap(node.finding, fFont, inner);
  const interv = node.intervention ? wrap(node.intervention, iFont, inner - 10) : [];

  let h = CARD_PAD + finding.length * FINDING.lh;
  if (interv.length) h += 8 + 6 + interv.length * INTERV.lh + 6;
  h += 8 + ORDERS.lh + CARD_PAD;
  return { finding, interv, orders: node.orders ?? "", route: node.route, height: h };
}

function terminus(
  lines: string[],
  label: string,
  x: number,
  y: number,
  width: number,
  accent: string,
  theme: Theme,
): { svg: string; height: number } {
  const font = `500 12.5px ${theme.sans}`;
  const wrapped = lines.flatMap((l) => wrap(l, font, width - 40));
  const h = 14 + 12 + wrapped.length * 16 + 14;
  const svg =
    `<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="12" ` +
    `fill="${mix(accent, 13, theme.surface)}" stroke="${mix(accent, 42, "transparent")}"/>` +
    textEl([label.toUpperCase()], x + width / 2, y + 20, {
      size: 9, lh: 11, fill: theme.textDim, font: theme.mono, weight: 700,
    }).replace(/<text /g, '<text text-anchor="middle" ') +
    wrapped
      .map(
        (l, i) =>
          `<text x="${x + width / 2}" y="${y + 38 + i * 16}" text-anchor="middle" ` +
          `font-family="${esc(theme.sans)}" font-size="12.5" font-weight="500" ` +
          `fill="${theme.text}">${esc(l)}</text>`,
      )
      .join("");
  return { svg, height: h };
}

/* ---------------------------------------------------------------- build --- */

export function renderChartSvg(result: VisualNote, theme: Theme): string {
  const lanes = result.lanes;
  const width = PAD * 2 + lanes.length * LANE_W + (lanes.length - 1) * GAP_X;
  const colX = (i: number) => PAD + i * (LANE_W + GAP_X);

  const parts: string[] = [];
  let y = PAD;

  // Admission
  const adm = terminus(result.admission, "Admission", PAD, y, width - PAD * 2, theme.navy, theme);
  parts.push(adm.svg);
  y += adm.height + 14;

  // Lane headers
  lanes.forEach((lane, i) => {
    parts.push(
      `<rect x="${colX(i)}" y="${y}" width="${LANE_W}" height="26" rx="6" ` +
        `fill="${mix(lane.color, 14, "transparent")}"/>` +
        `<circle cx="${colX(i) + 12}" cy="${y + 13}" r="4" fill="${lane.color}"/>` +
        `<text x="${colX(i) + 24}" y="${y + 17}" font-family="${esc(theme.mono)}" ` +
        `font-size="10" font-weight="700" letter-spacing="1.4" fill="${lane.color}">` +
        `${esc(lane.abbr.toUpperCase())}</text>`,
    );
  });
  y += 26 + 10;

  // Lane spines run the full height of the matrix; drawn first, behind cards.
  const matrixTop = y;
  const rowPlans = SHIFTS.map((shift) =>
    lanes.map((lane) => {
      const node = result.nodes.find((n) => n.lane === lane.id && n.shift === shift);
      return node ? planCard(node, theme) : null;
    }),
  );
  const rowHeights = rowPlans.map((row) =>
    Math.max(96, ...row.map((c) => (c ? c.height : 0))),
  );
  const matrixHeight = rowHeights.reduce((a, b) => a + b + 12, 0);

  lanes.forEach((lane, i) => {
    parts.push(
      `<rect x="${colX(i) + LANE_W / 2 - 0.5}" y="${matrixTop}" width="1" ` +
        `height="${matrixHeight}" fill="${mix(lane.color, 38, "transparent")}"/>`,
    );
  });

  // Cards
  rowPlans.forEach((row, r) => {
    const rowH = rowHeights[r];
    row.forEach((plan, i) => {
      const x = colX(i);
      const lane = lanes[i];
      if (!plan) {
        parts.push(
          `<circle cx="${x + LANE_W / 2}" cy="${y + rowH / 2}" r="3" ` +
            `fill="${mix(lane.color, 55, "transparent")}"/>`,
        );
        return;
      }
      parts.push(
        `<rect x="${x}" y="${y}" width="${LANE_W}" height="${rowH}" rx="9" ` +
          `fill="${mix(lane.color, 9, theme.surface)}" ` +
          `stroke="${mix(lane.color, 38, "transparent")}"/>` +
          `<path d="M${x + 9} ${y} h-${9 - BAR_W} a9 9 0 0 0 -9 9 v${rowH - 18} ` +
          `a9 9 0 0 0 9 9 h${9 - BAR_W} z" fill="${lane.color}"/>`,
      );

      let ty = y + CARD_PAD + FINDING.size;
      parts.push(
        textEl(plan.finding, x + CARD_PAD + BAR_W + 3, ty, {
          size: FINDING.size, lh: FINDING.lh, fill: theme.text,
          font: theme.sans, weight: FINDING.weight,
        }),
      );
      ty += (plan.finding.length - 1) * FINDING.lh;

      if (plan.interv.length) {
        const boxY = ty + 8;
        const boxH = plan.interv.length * INTERV.lh + 10;
        parts.push(
          `<rect x="${x + CARD_PAD + BAR_W}" y="${boxY}" ` +
            `width="${LANE_W - CARD_PAD * 2 - BAR_W}" height="${boxH}" rx="4" ` +
            `fill="${mix(theme.text, 5, "transparent")}"/>` +
            textEl(plan.interv, x + CARD_PAD + BAR_W + 6, boxY + INTERV.size + 4, {
              size: INTERV.size, lh: INTERV.lh, fill: theme.textDim,
              font: theme.sans, italic: true,
            }),
        );
        ty = boxY + boxH;
      }

      const footY = y + rowH - CARD_PAD - 2;
      const routeW = plan.route ? 26 : 0;
      const ordersFont = `${ORDERS.size}px ${theme.mono}`;
      let orders = plan.orders.toUpperCase();
      const maxOrders = LANE_W - CARD_PAD * 2 - BAR_W - routeW - 8;
      while (orders && measure(orders, ordersFont) > maxOrders) {
        orders = orders.slice(0, -2);
      }
      if (orders !== plan.orders.toUpperCase() && orders) orders += "…";
      parts.push(
        `<text x="${x + CARD_PAD + BAR_W + 3}" y="${footY}" font-family="${esc(theme.mono)}" ` +
          `font-size="${ORDERS.size}" letter-spacing="0.6" fill="${theme.textDim}">` +
          `${esc(orders)}</text>`,
      );
      if (plan.route) {
        const tone = ROUTE_TONE[plan.route] ?? theme.textDim;
        parts.push(
          `<rect x="${x + LANE_W - CARD_PAD - routeW}" y="${footY - 9}" width="${routeW}" ` +
            `height="13" rx="3" fill="${mix(tone, 16, "transparent")}"/>` +
            `<text x="${x + LANE_W - CARD_PAD - routeW / 2}" y="${footY}" ` +
            `text-anchor="middle" font-family="${esc(theme.mono)}" font-size="8.5" ` +
            `font-weight="700" fill="${tone}">${esc(plan.route)}</text>`,
        );
      }
    });
    y += rowH + 12;
  });

  y += 2;
  const out = terminus(result.outcome, "Outcome", PAD, y, width - PAD * 2, theme.teal, theme);
  parts.push(out.svg);
  y += out.height + 14;

  // Legend
  const legendH = 30;
  parts.push(
    `<rect x="${PAD}" y="${y}" width="${width - PAD * 2}" height="${legendH}" rx="8" ` +
      `fill="${theme.surface2}" stroke="${theme.border}"/>`,
  );
  let lx = PAD + 12;
  parts.push(
    `<text x="${lx}" y="${y + 19}" font-family="${esc(theme.mono)}" font-size="9" ` +
      `font-weight="700" letter-spacing="1.6" fill="${theme.textDim}">LANES</text>`,
  );
  lx += 52;
  lanes.forEach((lane) => {
    const label = lane.label;
    parts.push(
      `<rect x="${lx}" y="${y + 11}" width="8" height="8" rx="2" fill="${lane.color}"/>` +
        `<text x="${lx + 13}" y="${y + 18}" font-family="${esc(theme.sans)}" font-size="10.5" ` +
        `fill="${theme.textDim}">${esc(label)}</text>`,
    );
    lx += 13 + measure(label, `10.5px ${theme.sans}`) + 20;
  });
  y += legendH + PAD;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" ` +
    `viewBox="0 0 ${width} ${y}">` +
    `<rect width="${width}" height="${y}" fill="${theme.bg}"/>` +
    parts.join("") +
    `</svg>`
  );
}
