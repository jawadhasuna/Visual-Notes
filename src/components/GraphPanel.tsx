"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Lane, LaneNode, VisualNote } from "@/lib/demo";
import {
  LAYOUT,
  ROUTE_TONE,
  buildColumns,
  buildRows,
  cardHeadlines,
  cellKey,
  isLive,
  routeWires,
  routesOf,
  rowPads,
  type Box,
  type Column,
  type Geometry,
  type Group,
  type Route,
  type Wire,
} from "@/lib/chartLayout";

/*
 * The chart: white, short version first, and no wider than the page.
 *
 * One row per shift, in order, each named in bold, so a shift 3 card is always
 * on the third row. Lanes share the width instead of scrolling sideways. A lane
 * keeps its full share until its last card; after that it narrows to a thin
 * rail that carries its line on to the outcome, and the lanes still reporting
 * take over the room, closing in toward the middle as the admission goes on.
 *
 * The lines are drawn once the page has laid out, from where the cards
 * actually landed, so they follow the lanes as they move. Row stripes are
 * drawn beneath them.
 *
 * A card shows each finding's headline; opening it shows the full finding,
 * what was done and the orders. Which cards are open is held by the
 * workspace, so a downloaded image shows the chart exactly as it is open here.
 */

/** The cards that are open, by cardKey. */
export type OpenCards = ReadonlySet<string>;

type Overlay = { wires: Wire[]; stripes: Box[]; rules: Box[] };

/** A colour mixed toward white: fills and lines on the white chart. */
const tint = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, #ffffff)`;
/** A lane colour dark enough to read as text on white. */
const ink = (color: string) => `color-mix(in oklab, ${color} 72%, #000000)`;

/** A live lane's cell shares the row; a finished lane's is a thin rail. */
const cellStyle = (live: boolean): CSSProperties =>
  live
    ? { flex: "1 1 0", minWidth: LAYOUT.cardMin, maxWidth: LAYOUT.cardMax }
    : { flex: `0 0 ${LAYOUT.railW}px` };

const TERMINUS = {
  start: { fill: "#e8f1fb", stroke: "#9dbbe0" },
  end: { fill: "#e2f5e6", stroke: "#8fd19e" },
};

/** Read where everything landed and route the lines through it. */
function measureChart(el: HTMLElement, columns: Column[]): Overlay | null {
  const base = el.getBoundingClientRect();
  const box = (node: Element): Box => {
    const r = node.getBoundingClientRect();
    return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
  };
  const admission = el.querySelector('[data-terminus="start"]');
  const outcome = el.querySelector('[data-terminus="end"]');
  if (!admission || !outcome) return null;

  const byKey = (attr: string) => {
    const map = new Map<string, Box>();
    el.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((n) => {
      map.set(n.getAttribute(`data-${attr}`) ?? "", box(n));
    });
    return map;
  };
  const rowEls = [...el.querySelectorAll<HTMLElement>("[data-row]")];
  const rowBoxes = rowEls.map(box);

  const geometry: Geometry = {
    admission: box(admission),
    outcome: box(outcome),
    heads: byKey("head"),
    rows: rowEls.map((n, i) => ({
      shift: Number(n.dataset.row),
      y: rowBoxes[i].y,
      h: rowBoxes[i].h,
      pad: Number(n.dataset.pad),
    })),
    cells: byKey("cell"),
    cards: byKey("card"),
  };

  return {
    wires: routeWires(geometry, columns),
    stripes: rowBoxes.filter((_, i) => i % 2 === 1),
    rules: rowBoxes.map((b) => ({ ...b, h: 1 })),
  };
}

function RoutePill({ route }: { route: LaneNode["route"] }) {
  if (!route) return null;
  const c = ROUTE_TONE[route] ?? "var(--text-dim)";
  return (
    <span
      className="rounded px-1.5 py-px font-mono text-[9px] font-bold tracking-wider"
      style={{ color: c, background: tint(c, 12) }}
    >
      {route}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0 transition-transform"
      style={{ color: "var(--text-dim)", transform: open ? "rotate(180deg)" : undefined }}
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LaneHeader({ lane }: { lane: Lane }) {
  return (
    <div
      data-head={lane.id}
      className="rise flex items-center gap-1.5 rounded-md px-2 py-1.5"
      title={lane.label}
      style={{ background: tint(lane.color, 20) }}
    >
      <span aria-hidden className="text-[15px] leading-none">
        {lane.emoji}
      </span>
      <span
        className="truncate font-mono text-[10px] font-bold tracking-[0.14em] uppercase"
        style={{ color: ink(lane.color) }}
      >
        {lane.abbr}
      </span>
    </div>
  );
}

/** Everything the card holds for one finding, shown once the card is opened. */
function Detail({ node }: { node: LaneNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11.5px] leading-snug font-semibold" style={{ color: "var(--text)" }}>
        {node.finding}
      </p>
      {node.intervention && (
        <p className="text-[11px] leading-snug italic" style={{ color: "var(--field-intervention)" }}>
          {node.intervention}
        </p>
      )}
      {(node.orders || node.route) && (
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-mono text-[8.5px] tracking-wider break-words uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            {node.orders}
          </span>
          <RoutePill route={node.route} />
        </div>
      )}
    </div>
  );
}

function NodeCard({
  lane,
  group,
  index,
  isOpen,
  onToggle,
  showLane = false,
}: {
  lane: Lane;
  group: Group;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  /** Name the lane on the card, for the phone layout, which has no column headers. */
  showLane?: boolean;
}) {
  const { color } = lane;
  const { all, shown, more } = cardHeadlines(group);
  const routes = routesOf(group.nodes);
  const detailId = `detail-${group.key}`;

  return (
    <article
      data-card={group.key}
      className="node-in relative overflow-hidden rounded-lg border"
      style={{
        animationDelay: `${Math.min(index, 14) * 40}ms`,
        borderColor: tint(color, 55),
        background: tint(color, 16),
      }}
    >
      <span aria-hidden className="absolute top-0 left-0 h-full w-[3px]" style={{ background: color }} />

      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailId}
        aria-label={`${lane.label}, shift ${group.shift}: ${all.join("; ")}`}
        onClick={onToggle}
        className="block w-full cursor-pointer py-2 pr-2 pl-3.5 text-left"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-[12px] leading-none">
              {lane.emoji}
            </span>
            {showLane && (
              <span
                aria-hidden
                className="font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase"
                style={{ color: ink(color) }}
              >
                {lane.abbr}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            {routes.map((r) => (
              <RoutePill key={r} route={r} />
            ))}
            <Chevron open={isOpen} />
          </span>
        </span>
        <span className="mt-1 block space-y-0.5">
          {shown.map((h) => (
            <span
              key={h}
              className="block text-[12px] leading-snug font-semibold"
              style={{ color: "var(--text)" }}
            >
              {h}
            </span>
          ))}
          {more > 0 && (
            <span className="block text-[10.5px]" style={{ color: "var(--text-dim)" }}>
              +{more} more
            </span>
          )}
        </span>
      </button>

      <div
        id={detailId}
        hidden={!isOpen}
        className="rise space-y-2.5 border-t py-2.5 pr-2.5 pl-3.5"
        style={{ borderColor: tint(color, 45) }}
      >
        {group.nodes.map((node, i) => (
          <Detail key={i} node={node} />
        ))}
      </div>
    </article>
  );
}

function Terminus({ lines, tone, label }: { lines: string[]; tone: "start" | "end"; label: string }) {
  return (
    <div
      data-terminus={tone}
      className="rise mx-auto rounded-xl border px-4 py-3 text-center"
      style={{ maxWidth: LAYOUT.boxMax, background: TERMINUS[tone].fill, borderColor: TERMINUS[tone].stroke }}
    >
      <p
        className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </p>
      <div className="mt-1.5 space-y-0.5">
        {lines.map((l) => (
          <p key={l} className="text-[12px] leading-snug font-medium" style={{ color: "var(--text)" }}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function LegendLabel({ children }: { children: string }) {
  return (
    <span
      className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase"
      style={{ color: "var(--text-dim)" }}
    >
      {children}
    </span>
  );
}

function Legend({ lanes, routes }: { lanes: Lane[]; routes: Route[] }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border px-3 py-2"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <LegendLabel>Lanes</LegendLabel>
      {lanes.map((lane) => (
        <span
          key={lane.id}
          className="flex items-center gap-1.5 text-[10.5px]"
          style={{ color: "var(--text-dim)" }}
        >
          <span className="h-2 w-2 rounded-sm" style={{ background: lane.color }} />
          <span aria-hidden className="text-[12px] leading-none">
            {lane.emoji}
          </span>
          {lane.label}
        </span>
      ))}
      {routes.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          <LegendLabel>Routes</LegendLabel>
          {routes.map((r) => (
            <RoutePill key={r} route={r} />
          ))}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--text-dim)" }}>
        <span aria-hidden className="inline-block h-3 w-0" style={{ borderLeft: "1.5px dashed var(--text-dim)" }} />
        before the first and after the last update
      </span>
    </div>
  );
}

/** Narrowest the column layout can go: every lane at its minimum card width. */
const chartMinWidth = (lanes: number) => LAYOUT.labelW + lanes * (LAYOUT.cardMin + LAYOUT.gap) + 32;

/** The page's own side padding and the panel border around the chart. */
const PAGE_CHROME = 42;

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function Toolbar({ everyOpen, onAll }: { everyOpen: boolean; onAll: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11.5px]" style={{ color: "var(--text-dim)" }}>
        Short version first. Open any card for the full detail.
      </p>
      <button
        type="button"
        onClick={onAll}
        className="print-hide rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--border)", color: "var(--text)", background: "#ffffff" }}
      >
        {everyOpen ? "Collapse all" : "Expand all"}
      </button>
    </div>
  );
}

/**
 * The phone layout. A phone cannot fit the lanes side by side, so the shifts
 * run one under another down a timeline, each with its cards stacked and
 * every card naming its lane. Same rows, cards and open state as the columns.
 */
function StackedChart({
  result,
  columns,
  rows,
  open,
  onToggle,
  toolbar,
}: {
  result: VisualNote;
  columns: Column[];
  rows: number[];
  open: OpenCards;
  onToggle: (key: string) => void;
  toolbar: ReactNode;
}) {
  return (
    <div className="chart-light p-3">
      {toolbar}
      <Terminus lines={result.admission} tone="start" label="Admission" />

      <ol className="mt-4 ml-2 border-l-2 pt-1 pl-4" style={{ borderColor: "var(--chart-rule)" }}>
        {rows.map((shift) => {
          const here = columns.flatMap((column) => {
            const group = column.groups.get(shift);
            return group ? [{ column, group }] : [];
          });
          return (
            <li key={shift} className="relative pb-4">
              <span
                aria-hidden
                className="absolute top-0 -left-[23px] h-3 w-3 rounded-full border-2"
                style={{ background: "#ffffff", borderColor: here.length ? "var(--text)" : "var(--chart-rule)" }}
              />
              <h4
                className="font-display text-[13px] leading-none font-extrabold tracking-[0.06em] uppercase"
                style={{ color: here.length ? "var(--text)" : "var(--text-dim)" }}
              >
                Shift {shift}
              </h4>
              {here.length > 0 && (
                <div className="mt-2 space-y-2">
                  {here.map(({ column, group }, i) => (
                    <NodeCard
                      key={group.key}
                      lane={column.lane}
                      group={group}
                      index={i}
                      isOpen={open.has(group.key)}
                      onToggle={() => onToggle(group.key)}
                      showLane
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Terminus lines={result.outcome} tone="end" label="Outcome" />
      <div className="mt-3">
        <Legend lanes={result.lanes} routes={routesOf(result.nodes)} />
      </div>
    </div>
  );
}

export function GraphPanel({
  result,
  open,
  onOpenChange,
}: {
  result: VisualNote | null;
  open: OpenCards;
  onOpenChange: Dispatch<SetStateAction<OpenCards>>;
}) {
  const columns = useMemo(() => (result ? buildColumns(result) : []), [result]);
  const rows = useMemo(() => (result ? buildRows(result) : []), [result]);
  const pads = useMemo(() => rowPads(columns, rows), [columns, rows]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  // A screen too narrow for the lanes at their narrowest gets the stacked
  // phone layout instead of a chart that has to scroll sideways.
  const viewport = useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 0);
  const stacked = viewport > 0 && viewport - PAGE_CHROME < chartMinWidth(columns.length);

  // Lines follow the cards, so they are routed after layout, and again
  // whenever the chart changes size, a card opens, or an entrance ends.
  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el || !result) return;
    let frame = 0;
    let timer = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      setOverlay(measureChart(el, columns));
    };
    // Normally on the next frame. The timer covers a page that is not being
    // painted, such as a background tab, where frames wait until it is shown.
    const measure = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = requestAnimationFrame(run);
      timer = window.setTimeout(run, 150);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("animationend", measure);
    return () => {
      observer.disconnect();
      el.removeEventListener("animationend", measure);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [result, columns, open, stacked]);

  if (!result) return <EmptyGraph />;

  const keys = columns.flatMap((c) => [...c.groups.values()].map((g) => g.key));
  const everyOpen = keys.length > 0 && keys.every((k) => open.has(k));
  const colorOf = new Map<string, string>(columns.map((c) => [c.lane.id, c.lane.color]));

  const toggle = (key: string) =>
    onOpenChange((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toolbar = (
    <Toolbar everyOpen={everyOpen} onAll={() => onOpenChange(everyOpen ? new Set() : new Set(keys))} />
  );

  if (stacked) {
    return (
      <StackedChart
        result={result}
        columns={columns}
        rows={rows}
        open={open}
        onToggle={toggle}
        toolbar={toolbar}
      />
    );
  }

  return (
    <div className="chart-light scroll-slim overflow-x-auto">
      <div ref={chartRef} className="relative p-4" style={{ minWidth: chartMinWidth(columns.length) }}>
        {/* Sized by the chart, not by the last measurement, so lines routed
            for a wider window can never push the page into scrolling. */}
        {overlay && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
            {overlay.stripes.map((s, i) => (
              <rect key={`s${i}`} x={s.x} y={s.y} width={s.w} height={s.h} fill="var(--chart-stripe)" />
            ))}
            {overlay.rules.map((s, i) => (
              <rect key={`r${i}`} x={s.x} y={s.y} width={s.w} height={1} fill="var(--chart-rule)" />
            ))}
            {overlay.wires.map((w, i) => {
              const color = tint(colorOf.get(w.lane) ?? "#8a97a8", 65);
              return (
                <g key={i} fill="none" stroke={color} strokeWidth={1.5}>
                  <path d={w.d} strokeDasharray={w.dashed ? "4 3" : undefined} />
                  <path d={w.arrow} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            })}
          </svg>
        )}

        <div className="relative">
          {toolbar}

          <Terminus lines={result.admission} tone="start" label="Admission" />
          <div style={{ height: LAYOUT.linkGap }} />

          <div className="flex pb-1">
            <div className="shrink-0" style={{ width: LAYOUT.labelW }} />
            <div className="flex min-w-0 flex-1 justify-center" style={{ gap: LAYOUT.gap }}>
              {columns.map((column) => (
                <div key={column.lane.id} className="min-w-0" style={cellStyle(true)}>
                  <LaneHeader lane={column.lane} />
                </div>
              ))}
            </div>
          </div>

          {rows.map((shift, r) => {
            const pad = pads[r];
            const hasCards = columns.some((c) => c.groups.has(shift));
            return (
              <div
                key={shift}
                data-row={shift}
                data-pad={pad}
                className="flex"
                style={{ minHeight: LAYOUT.rowMin }}
              >
                <div
                  className="shrink-0 pl-1.5"
                  style={{ width: LAYOUT.labelW, paddingTop: hasCards ? pad + 9 : 10 }}
                >
                  <span
                    className="font-display block text-[12.5px] leading-none font-extrabold tracking-[0.06em] whitespace-nowrap uppercase"
                    style={{ color: hasCards ? "var(--text)" : "var(--text-dim)" }}
                  >
                    Shift {shift}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-center" style={{ gap: LAYOUT.gap }}>
                  {columns.map((column) => {
                    const group = column.groups.get(shift);
                    return (
                      <div
                        key={column.lane.id}
                        data-cell={cellKey(column.lane.id, shift)}
                        className="min-w-0"
                        style={{
                          ...cellStyle(isLive(column, shift)),
                          paddingTop: group ? pad : 0,
                          paddingBottom: group ? LAYOUT.belowCard : 0,
                        }}
                      >
                        {group && (
                          <NodeCard
                            lane={column.lane}
                            group={group}
                            index={r}
                            isOpen={open.has(group.key)}
                            onToggle={() => toggle(group.key)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ height: LAYOUT.linkGap }} />
          <Terminus lines={result.outcome} tone="end" label="Outcome" />

          <div className="mt-3">
            <Legend lanes={result.lanes} routes={routesOf(result.nodes)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-[280px] text-center">
        <svg
          viewBox="0 0 120 120"
          className="mx-auto h-24 w-24 opacity-30"
          fill="none"
          stroke="var(--text-dim)"
          strokeWidth="2"
        >
          <rect x="10" y="14" width="30" height="18" rx="4" />
          <rect x="45" y="14" width="30" height="18" rx="4" />
          <rect x="80" y="14" width="30" height="18" rx="4" />
          <rect x="10" y="52" width="30" height="18" rx="4" strokeDasharray="4 4" />
          <rect x="45" y="52" width="30" height="18" rx="4" />
          <rect x="80" y="52" width="30" height="18" rx="4" strokeDasharray="4 4" />
          <rect x="45" y="90" width="30" height="18" rx="4" />
          <path d="M25 32v20M60 32v20M95 32v20M60 70v20" strokeDasharray="3 4" />
        </svg>
        <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text)" }}>
          No visual note yet
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Paste a series of nursing notes on the left and run the conversion. The
          body-system chart renders here.
        </p>
      </div>
    </div>
  );
}
