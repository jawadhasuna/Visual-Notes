"use client";

import { useId } from "react";

/**
 * New England CareFlow mark — an interlocked "N" + "C" monogram.
 *
 * The navy N and the seagreen C overlap at the N's right stem; the C weaves
 * back over it at the lower junction, and a node accent marks the upper one.
 *
 * This is a hand-built vector recreation. If the official artwork exists as
 * .svg / .ai / .eps, replace the paths inside <g id="mark-art"> and every
 * other part of the site keeps working unchanged.
 */
export function Mark({
  className = "",
  title = "New England CareFlow",
}: {
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const navyGrad = `n-${uid}`;
  const tealGrad = `c-${uid}`;

  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={navyGrad} x1="52" y1="66" x2="132" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--mark-navy-1)" />
          <stop offset="100%" stopColor="var(--mark-navy-2)" />
        </linearGradient>
        <linearGradient id={tealGrad} x1="112" y1="82" x2="200" y2="176" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--mark-teal-1)" />
          <stop offset="100%" stopColor="var(--mark-teal-2)" />
        </linearGradient>
      </defs>

      <g id="mark-art" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Seagreen C — drawn first, so it passes beneath the N */}
        <path
          d="M182.4 94.4 A46 46 0 1 0 182.4 161.6"
          stroke={`url(#${tealGrad})`}
          strokeWidth="26"
        />

        {/* Navy N — surface-coloured casing lifts it clear of the C */}
        <path d="M59 180 V80 L119 172 V76" stroke="var(--surface)" strokeWidth="40" />
        <path d="M59 180 V80 L119 172 V76" stroke={`url(#${navyGrad})`} strokeWidth="26" />

        {/* Weave: the C crosses back over the N at the lower junction */}
        <path
          d="M126.6 167 A46 46 0 0 1 112 152.4"
          stroke="var(--surface)"
          strokeWidth="40"
        />
        <path
          d="M126.6 167 A46 46 0 0 1 112 152.4"
          stroke={`url(#${tealGrad})`}
          strokeWidth="26"
        />

        {/* Junction node — where the two lanes meet */}
        <circle cx="119" cy="95" r="10" fill="var(--surface)" />
        <circle cx="119" cy="95" r="5.5" fill="var(--mark-teal-2)" />
      </g>
    </svg>
  );
}

/** Full lockup: mark + company name, as used in the site header. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Mark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className="font-display text-[0.94rem] font-extrabold tracking-[0.045em] uppercase"
          style={{ color: "var(--text)" }}
        >
          New England CareFlow
        </span>
        <span
          className="mt-1 font-sans text-[0.62rem] font-medium tracking-[0.22em] uppercase"
          style={{ color: "var(--text-dim)" }}
        >
          Clinical Visualization
        </span>
      </span>
    </span>
  );
}
