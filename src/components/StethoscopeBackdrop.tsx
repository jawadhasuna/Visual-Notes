"use client";

import steth from "../../public/brand/stethoscope.png";

/** Copies stacked along Z so the instrument has thickness as it turns. */
const DEPTH_LAYERS = 12;
const LAYER_STEP = 5;

/**
 * Stethoscope backdrop — the brand instrument, extruded and revolving slowly
 * on its own axis behind the hero content.
 *
 * Every layer is the same 26KB asset, so the depth costs one request and no
 * extra bytes. Purely decorative: hidden from assistive tech, and frozen
 * under prefers-reduced-motion.
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
        <div className="steth-revolve mark-solid relative h-full w-full">
          {/* Side wall */}
          {Array.from({ length: DEPTH_LAYERS }, (_, i) => {
            const t = i / (DEPTH_LAYERS - 1);
            return (
              <div
                key={i}
                className="steth-layer"
                style={{
                  transform: `translateZ(${-i * LAYER_STEP}px)`,
                  filter: `brightness(${(1 - t * 0.55).toFixed(3)}) saturate(${(
                    1 - t * 0.25
                  ).toFixed(3)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={steth.src} alt="" draggable={false} />
              </div>
            );
          })}

          {/* Front face */}
          <div className="steth-layer" style={{ transform: `translateZ(${LAYER_STEP}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={steth.src} alt="" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
