"use client";

import { Mark } from "./Logo";

/** Copies of the artwork stacked along Z to give the strokes real depth. */
const DEPTH_LAYERS = 16;
const LAYER_STEP = 1.25;

/**
 * Hero mark: the corporate artwork extruded into a solid — no plate, no glow,
 * just the mark with real thickness.
 *
 * It sits turned slightly off-axis so the extruded side wall is visible at
 * rest, then every 5s snaps a fast 360° revolve on its own Y axis and settles
 * back to that resting angle.
 */
export function MarkStage({ size = 320 }: { size?: number }) {
  return (
    <div
      className="mark-stage relative grid place-items-center"
      style={{ width: size, height: size * 0.8 }}
    >
      <div
        className="mark-spinner relative"
        style={{ width: size * 0.74, height: size * 0.455 }}
      >
        <div
          className="mark-solid relative h-full w-full"
          style={{
            transform: `translateZ(${(-DEPTH_LAYERS * LAYER_STEP) / 2}px)`,
          }}
        >
          {/* Side wall: copies receding along Z, falling off into shadow */}
          {Array.from({ length: DEPTH_LAYERS }, (_, i) => {
            const t = i / (DEPTH_LAYERS - 1); // 0 = just behind the face, 1 = deepest
            return (
              <span
                key={i}
                aria-hidden
                className="mark-face"
                style={{
                  transform: `translateZ(${-i * LAYER_STEP}px)`,
                  filter: `brightness(${(1 - t * 0.46).toFixed(3)}) saturate(${(
                    1 - t * 0.18
                  ).toFixed(3)})`,
                }}
              >
                <Mark className="h-full w-full" />
              </span>
            );
          })}

          {/* Front face, in true brand colour */}
          <span
            className="mark-face mark-front"
            style={{ transform: `translateZ(${LAYER_STEP}px)` }}
          >
            <Mark className="h-full w-full" glare />
          </span>
        </div>
      </div>
    </div>
  );
}
