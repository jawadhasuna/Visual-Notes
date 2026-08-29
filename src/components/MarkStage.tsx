"use client";

import { Mark } from "./Logo";

/**
 * Hero mark: rests, then every 5s snaps a fast 360° spin on its own Y axis
 * and finishes with a shine racing around the plate border.
 *
 * Real 3D transforms on vector art — stays crisp at any size, ~0 payload,
 * and honours prefers-reduced-motion.
 */
export function MarkStage({ size = 168 }: { size?: number }) {
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
            "radial-gradient(circle at 50% 45%, rgba(0,174,169,0.30), rgba(20,80,127,0.16) 45%, transparent 72%)",
        }}
      />

      {/* Slow counter-rotating orbit rings — clinical instrumentation feel */}
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

      {/* The spinning plate */}
      <div className="mark-spinner relative" style={{ width: size, height: size }}>
        <div
          className="relative grid h-full w-full place-items-center rounded-[28%]"
          style={{
            background:
              "linear-gradient(155deg, var(--surface) 0%, var(--surface-2) 100%)",
            border: "1px solid var(--border)",
            boxShadow:
              "0 18px 48px -20px rgba(7,32,58,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          <Mark className="h-[68%] w-[68%]" />
          <span aria-hidden className="mark-sheen rounded-[28%]" />
          <span aria-hidden className="mark-ring rounded-[28%]" />
        </div>
      </div>
    </div>
  );
}
