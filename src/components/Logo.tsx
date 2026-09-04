"use client";

import { useId } from "react";

/**
 * New England CareFlow mark — the official corporate artwork.
 *
 * A stethoscope drawn so its binaural and tubing form the "N": navy stem and
 * shoulder, seagreen tubing sweeping into the chest piece.
 *
 * Fills are driven from CSS custom properties (brand navy #052C52, seagreen
 * #04ACAF) so the artwork itself is never edited to suit a background.
 */
export function Mark({
  className = "",
  title = "New England CareFlow",
  glare = false,
}: {
  className?: string;
  title?: string;
  /** Sweep a specular band across the artwork, timed to the hero revolve. */
  glare?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="265.1 350 221.2 136.6"
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The artwork is used exactly as supplied; this translation moves it
          into the coordinate space the glare sweep and viewBox were tuned
          for, rather than redrawing the outlines to fit. */}
      <g id={`mark-art-${uid}`} transform="translate(217.999 312.808)">
        {/* Seagreen — upper binaural arc */}
        <path
          fill="var(--mark-teal)"
          d="M197.5 40.6c-9.6 2.1-20.5 6.8-28.9 12.5-7.5 5-17.6 14.8-17.6 17.1 0 .7 2.9 4.7 6.3 9l6.3 7.6 4.8-6.5c11.7-15.7 29.1-24 48.7-23.1 8.1.4 10.6 1 16.6 3.7 3.9 1.8 8.8 5 10.9 7.2 4.8 4.9 9.2 6.5 13.9 4.9 6.3-2.1 9.2-8.4 6.2-13.6-3.3-5.8-15.6-13.4-28.2-17.4-9.3-3-28.8-3.7-39-1.4"
        />

        {/* Navy — the stem and shoulder of the N */}
        <path
          fill="var(--mark-navy)"
          d="M89.2 43.1C77.1 44.9 64.6 51.6 58 60c-1.7 2.1-4.3 6.5-5.8 9.7l-2.7 5.8-.3 37c-.3 41.9-.3 42.3 7.1 45.9 3.3 1.6 4.5 1.7 7.7.7 2.1-.6 5-2.5 6.4-4.2l2.6-3.1v-36.9c0-41.2 0-40.9 6.8-47.1 9.1-8.2 24.9-8.9 34.7-1.4 1.8 1.4 9.5 10.2 16.9 19.6 7.5 9.3 14 17 14.4 17 1.7 0 3.2-2.5 3.2-5.2 0-3.9 3.2-6.8 7.4-6.8 1.9 0 3.8-.4 4.1-1 .7-1.2-20.1-26.4-27.7-33.7-11.5-10.8-27.3-15.6-43.6-13.2"
        />

        {/* Seagreen — tubing sweeping down into the chest piece */}
        <path
          fill="var(--mark-teal)"
          d="M91.2 78.5c-3.5 3-4.6 6.3-3.2 10.1 1.5 3.9 30.9 40.3 41.5 51.2 13.5 14.1 27.4 22.5 45.2 27.4 10.9 3 35.3 3.2 46.3.4 16.6-4.2 32.1-12.8 41.8-23 5-5.3 5.6-6.6 5.3-11.1-.3-3.5-5.6-7.5-10.1-7.5-3.5 0-4.6.7-10.2 6.3-7.4 7.4-16.2 12.8-26.7 16.4-10 3.4-26.3 4.3-36.6 1.9-9.2-2.2-21.5-8.3-28.9-14.3-6.6-5.3-14.6-14.6-14.6-16.8 0-.8 1.5-3.2 3.4-5.2 2.9-3.4 6.6-9.3 6.6-10.7 0-.3-2.5 1.2-5.7 3.4-9.6 6.8-9.4 6.9-27.7-15.8C111.7 84 106 77.5 105 77c-3.6-1.9-10.6-1.2-13.8 1.5"
        />

        {/* Navy — where the N crosses back over the tubing */}
        <path
          fill="var(--mark-navy)"
          d="M163.8 90.6c-1.4 1.4-1.4 1.9-.2 4.4 2.5 5-1.6 10-8.1 10-4.2 0-2.9 3 5.8 13 10.3 11.8 18 18.1 26.6 21.6 5.5 2.3 8.5 2.8 17.9 3.2 10 .4 12.2.1 19.6-2.2 13.5-4.2 25.7-13.6 24.1-18.6-.8-2.6-5.2-3.7-7.9-1.9-11.5 7.3-21.5 9.9-31.3 7.9-11.6-2.4-17.9-7.2-32.9-25-6.5-7.7-11.8-14-11.9-14 0 0-.8.7-1.7 1.6"
        />
      </g>

      {glare && (
        <>
          <defs>
            {/* The mark's own silhouette masks the sweep, so the highlight
                only ever appears on the artwork — never on the background. */}
            <mask id={`glare-mask-${uid}`} style={{ maskType: "alpha" }}>
              <use href={`#mark-art-${uid}`} fill="#fff" />
            </mask>
            <linearGradient id={`glare-grad-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="45%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g mask={`url(#glare-mask-${uid})`}>
            <g transform="rotate(-16 375 418)">
              <rect
                className="mark-glare-band"
                x="180"
                y="300"
                width="54"
                height="240"
                fill={`url(#glare-grad-${uid})`}
              />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/** Full lockup: mark + company name, as used in the site header. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Mark className="w-10 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.94rem] font-extrabold tracking-[0.045em] uppercase">
          <span style={{ color: "var(--wordmark-blue)" }}>New England</span>{" "}
          <span style={{ color: "var(--wordmark-teal)" }}>CareFlow</span>
        </span>
        <span
          className="mt-1 font-sans text-[0.62rem] font-medium tracking-[0.22em] uppercase"
          style={{ color: "#ffffff" }}
        >
          Clinical Visualization
        </span>
      </span>
    </span>
  );
}
