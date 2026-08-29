"use client";

import Image from "next/image";
import steth from "../../public/brand/stethoscope.png";

/**
 * Stethoscope backdrop — the brand instrument, revolving slowly on its own
 * axis behind the hero content.
 *
 * Deliberately quiet: low opacity, long 26s easing, and a blur that keeps it
 * behind the type rather than competing with it. Purely decorative, so it is
 * hidden from assistive tech and frozen under prefers-reduced-motion.
 */
export function StethoscopeBackdrop() {
  return (
    <div
      aria-hidden
      className="steth-stage pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <div
        className="absolute top-1/2 left-1/2 h-[min(120vh,940px)] w-[min(120vh,940px)] -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: "var(--steth-opacity)" }}
      >
        <div className="steth-revolve relative h-full w-full">
          <Image
            src={steth}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 90vw, 940px"
            className="object-contain"
            style={{ filter: "blur(0.4px) saturate(1.1)" }}
          />
        </div>
      </div>
    </div>
  );
}
