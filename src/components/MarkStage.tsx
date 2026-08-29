"use client";

import { Mark } from "./Logo";

/** Faces stacked along Z. More layers = smoother edge, at ~1 div each. */
const DEPTH_LAYERS = 16;
const LAYER_STEP = 1.4;

/**
 * Hero mark: an extruded 3D tile carrying the corporate stethoscope mark.
 * It rests, then every 5s snaps a fast 360° revolve on its own Y axis —
 * the stacked faces show real thickness as it turns — and finishes with a
 * shine racing around the border.
 */
export function MarkStage({ size = 176 }: { size?: number }) {
  const depth = DEPTH_LAYERS * LAYER_STEP;

  return (
    <div
      className="mark-stage relative grid place-items-center"
      style={{ width: size * 1.6, height: size * 1.6 }}
    >
      {/* Ambient glow bed */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--color-teal-500) 30%, transparent), color-mix(in oklab, var(--color-navy-600) 16%, transparent) 45%, transparent 72%)",
        }}
      />

      {/* Counter-rotating instrument rings */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="orbit-ring pointer-events-none absolute inset-0 h-full w-full opacity-45"
      >
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="var(--color-teal-400)"
          strokeWidth="0.6"
          strokeDasharray="2 12"
          opacity="0.75"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="orbit-ring-rev pointer-events-none absolute inset-0 h-full w-full opacity-35"
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

      {/* The revolving extruded tile */}
      <div className="mark-spinner relative" style={{ width: size, height: size }}>
        <div
          className="mark-solid relative h-full w-full rounded-[26%]"
          style={{ transform: `translateZ(${-depth / 2}px)` }}
        >
          {/* Extrusion body — deepest first so the front face paints last */}
          {Array.from({ length: DEPTH_LAYERS }, (_, i) => {
            const t = i / (DEPTH_LAYERS - 1); // 0 = front, 1 = back
            return (
              <span
                key={i}
                aria-hidden
                className="mark-face"
                style={{
                  transform: `translateZ(${-i * LAYER_STEP}px)`,
                  background: `color-mix(in oklab, var(--mark-plate) ${Math.round(
                    100 - t * 62,
                  )}%, #052c52)`,
                  border: i === 0 ? "1px solid var(--mark-plate-border)" : "none",
                }}
              />
            );
          })}

          {/* Front face — artwork, sheen, shine ring */}
          <div
            className="absolute inset-0 grid place-items-center rounded-[26%]"
            style={{
              transform: `translateZ(${LAYER_STEP}px)`,
              background:
                "linear-gradient(155deg, #ffffff 0%, var(--mark-plate) 60%, #e4eef3 100%)",
              border: "1px solid var(--mark-plate-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <Mark className="w-[72%]" />
            <span aria-hidden className="mark-sheen rounded-[26%]" />
            <span aria-hidden className="mark-ring rounded-[26%]" />
          </div>
        </div>

        {/* Contact shadow, kept flat on the page rather than in the 3D space */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-6 w-[78%] -translate-x-1/2 rounded-[50%] blur-lg"
          style={{ background: "rgba(2,16,31,0.38)" }}
        />
      </div>
    </div>
  );
}
