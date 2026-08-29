"use client";

import { Mark } from "./Logo";

/** Copies of the artwork stacked along Z to give the strokes real depth. */
const DEPTH_LAYERS = 20;
const LAYER_STEP = 1.1;

/**
 * Hero mark: the corporate artwork extruded in 3D — no plate, no card, just
 * the mark itself with thickness. It rests, then every 5s snaps a fast 360°
 * revolve on its own Y axis.
 *
 * Brand navy is dark, so a soft feathered bloom sits behind the mark to give
 * the N something to read against without putting a hard edge anywhere.
 */
export function MarkStage({ size = 300 }: { size?: number }) {
  return (
    <div
      className="mark-stage relative grid place-items-center"
      style={{ width: size, height: size * 0.8 }}
    >
      {/* Feathered bloom — the light the navy reads against */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 1.02,
          height: size * 0.66,
          background:
            "radial-gradient(ellipse, rgba(126,214,222,0.30) 0%, rgba(86,178,206,0.20) 34%, rgba(12,86,140,0.14) 56%, transparent 76%)",
          filter: "blur(20px)",
        }}
      />

      {/* Counter-rotating instrument rings */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="orbit-ring pointer-events-none absolute top-1/2 left-1/2 h-[132%] w-[132%] -translate-x-1/2 -translate-y-1/2 opacity-40"
      >
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="var(--color-teal-400)"
          strokeWidth="0.6"
          strokeDasharray="2 12"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="orbit-ring-rev pointer-events-none absolute top-1/2 left-1/2 h-[114%] w-[114%] -translate-x-1/2 -translate-y-1/2 opacity-30"
      >
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="var(--color-navy-500)"
          strokeWidth="0.7"
          strokeDasharray="24 16"
        />
      </svg>

      {/* The revolving extruded artwork */}
      <div
        className="mark-spinner relative"
        style={{ width: size * 0.72, height: size * 0.44 }}
      >
        <div
          className="mark-solid relative h-full w-full"
          style={{
            transform: `translateZ(${(-DEPTH_LAYERS * LAYER_STEP) / 2}px)`,
          }}
        >
          {/* Extrusion body, deepest first so the lit face paints last */}
          {Array.from({ length: DEPTH_LAYERS }, (_, i) => {
            const t = i / (DEPTH_LAYERS - 1); // 0 = face, 1 = deepest
            return (
              <span
                key={i}
                aria-hidden
                className="mark-face"
                style={{
                  transform: `translateZ(${-i * LAYER_STEP}px)`,
                  filter: `brightness(${(1 - t * 0.7).toFixed(3)}) saturate(${(
                    1 - t * 0.3
                  ).toFixed(3)})`,
                }}
              >
                <Mark className="h-full w-full" />
              </span>
            );
          })}

          {/* Lit front face */}
          <span
            className="mark-face mark-gleam"
            style={{ transform: `translateZ(${LAYER_STEP}px)` }}
          >
            <Mark className="h-full w-full" />
          </span>
        </div>
      </div>
    </div>
  );
}
