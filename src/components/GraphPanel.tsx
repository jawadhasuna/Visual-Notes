"use client";

import { SHIFTS, type LaneNode, type VisualNote } from "@/lib/demo";

function RoutePill({ route }: { route: LaneNode["route"] }) {
  if (!route) return null;
  const tone: Record<string, string> = {
    IV: "#c0392b",
    GTT: "#7d3cc4",
    PO: "#2f6fd0",
    NEB: "#1f8a52",
    O2: "#0e7c86",
    NIV: "#0e7c86",
  };
  const c = tone[route] ?? "var(--text-dim)";
  return (
    <span
      className="rounded px-1.5 py-px font-mono text-[9px] font-bold tracking-wider"
      style={{ color: c, background: `color-mix(in oklab, ${c} 13%, transparent)` }}
    >
      {route}
    </span>
  );
}

function NodeCard({ node, color, index }: { node: LaneNode; color: string; index: number }) {
  return (
    <article
      className="node-in relative flex w-full flex-col rounded-lg border p-2.5 text-left"
      style={{
        animationDelay: `${index * 55}ms`,
        borderColor: `color-mix(in oklab, ${color} 38%, transparent)`,
        background: `color-mix(in oklab, ${color} 9%, var(--surface))`,
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-[3px] rounded-l-lg"
        style={{ background: color }}
      />
      <p className="pl-1.5 text-[11.5px] leading-snug font-semibold" style={{ color: "var(--text)" }}>
        {node.finding}
      </p>
      {node.intervention && (
        <p
          className="mt-1.5 rounded px-1.5 py-1 text-[10.5px] leading-snug italic"
          style={{ background: "color-mix(in oklab, var(--text) 5%, transparent)", color: "var(--text-dim)" }}
        >
          {node.intervention}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 pl-1.5">
        <span
          className="truncate font-mono text-[8.5px] tracking-wider uppercase"
          style={{ color: "var(--text-dim)" }}
        >
          {node.orders}
        </span>
        <RoutePill route={node.route} />
      </div>
    </article>
  );
}

function Terminus({
  lines,
  tone,
  label,
}: {
  lines: string[];
  tone: "start" | "end";
  label: string;
}) {
  const bg =
    tone === "start"
      ? "color-mix(in oklab, var(--color-navy-600) 12%, var(--surface))"
      : "color-mix(in oklab, var(--color-teal-500) 14%, var(--surface))";
  const bd =
    tone === "start"
      ? "color-mix(in oklab, var(--color-navy-600) 40%, transparent)"
      : "color-mix(in oklab, var(--color-teal-500) 42%, transparent)";
  return (
    <div
      className="rise rounded-xl border px-4 py-3 text-center"
      style={{ background: bg, borderColor: bd }}
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

export function GraphPanel({ result }: { result: VisualNote | null }) {
  if (!result) return <EmptyGraph />;

  return (
    <div className="scroll-slim overflow-x-auto p-4">
      <div className="min-w-[660px] space-y-3">
        <Terminus lines={result.admission} tone="start" label="Admission" />

        {/* Lane headers */}
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${result.lanes.length}, minmax(132px, 1fr))` }}
        >
          {result.lanes.map((lane) => (
            <div
              key={lane.id}
              className="rise flex items-center gap-1.5 rounded-md px-2 py-1.5"
              style={{ background: `color-mix(in oklab, ${lane.color} 14%, transparent)` }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: lane.color }} />
              <span
                className="truncate font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase"
                style={{ color: lane.color }}
              >
                {lane.abbr}
              </span>
            </div>
          ))}
        </div>

        {/* Lane × shift matrix.
            One grid, filled shift by shift, so every cell in a shift shares a
            row. Lanes cannot drift out of step: an absent finding still
            occupies its cell, and each row is as tall as its tallest card. */}
        <div
          className="grid gap-x-2.5"
          style={{
            gridTemplateColumns: `repeat(${result.lanes.length}, minmax(132px, 1fr))`,
            gridAutoRows: "minmax(104px, auto)",
          }}
        >
          {SHIFTS.map((shift, rowIndex) =>
            result.lanes.map((lane) => {
              const node = result.nodes.find(
                (n) => n.lane === lane.id && n.shift === shift,
              );
              return (
                <div
                  key={`${lane.id}-${shift}`}
                  className="relative flex items-stretch py-1.5"
                >
                  {/* lane spine — continuous because the cells abut */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                    style={{
                      background: `color-mix(in oklab, ${lane.color} 38%, transparent)`,
                    }}
                  />
                  <div className="relative flex w-full">
                    {node ? (
                      <NodeCard node={node} color={lane.color} index={rowIndex} />
                    ) : (
                      <div className="grid w-full place-items-center">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: `color-mix(in oklab, ${lane.color} 55%, transparent)`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            }),
          )}
        </div>

        <Terminus lines={result.outcome} tone="end" label="Outcome" />

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border px-3 py-2"
          style={{ background: "var(--surface-2)" }}
        >
          <span
            className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            Lanes
          </span>
          {result.lanes.map((lane) => (
            <span key={lane.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: lane.color }} />
              <span className="text-[10.5px]" style={{ color: "var(--text-dim)" }}>
                {lane.label}
              </span>
            </span>
          ))}
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
