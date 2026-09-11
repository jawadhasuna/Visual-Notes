"use client";

import { useId } from "react";

/**
 * Hero mark for Visual Notes: the product icon built as a solid object.
 *
 * It is the same artwork as the site icon (app/icon.svg) -- a note page whose
 * rows are body-system lanes, on a navy tile -- split into its parts so each
 * can sit at its own depth:
 *
 *   - the tile is a slab, stacked copies receding along Z so it has a real
 *     edge rather than being a flat card;
 *   - the page is lifted clear of the tile with its own paper edge, so the
 *     sheet visibly stands off the slab beneath it.
 *
 * It does not revolve: it holds still at a slight turn, and only the glare
 * sweep moves, on the same 7s clock the company mark used.
 */

const PAGE =
  "M148 84H328L392 148V400Q392 428 364 428H148Q120 428 120 400V112Q120 84 148 84Z";
const FOLD = "M328 84L392 148H352Q328 148 328 124Z";

const TILE_LAYERS = 14; // slab thickness, as stacked copies
const TILE_STEP = 1.3;
const PAGE_LAYERS = 6; // how far the page stands proud of the tile
const PAGE_STEP = 1.5;

function Tile() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`vn-tile-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0A3A66" />
          <stop offset="1" stopColor="#012850" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#vn-tile-${id})`} />
    </svg>
  );
}

/** One slice of the page's edge: its outline in a single flat colour. */
function PageEdge({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden>
      <path d={PAGE} fill={color} />
    </svg>
  );
}

/** The printed face of the page: fold, title line and three lanes. */
function PageFace() {
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden>
      <path d={PAGE} fill="#FFFFFF" />
      <path d={FOLD} fill="#BFE6E7" />
      <line x1="164" y1="152" x2="268" y2="152" stroke="#012850" strokeWidth="20" strokeLinecap="round" />

      {/* each lane: a navy body-system label, then finding cards along the shifts */}
      <rect x="156" y="200" width="40" height="44" rx="10" fill="#012850" />
      <rect x="212" y="200" width="60" height="44" rx="12" fill="#01ACAF" />
      <rect x="284" y="200" width="68" height="44" rx="12" fill="#7FD3D5" />

      <rect x="156" y="264" width="40" height="44" rx="10" fill="#012850" />
      <rect x="248" y="264" width="104" height="44" rx="12" fill="#01ACAF" />

      <rect x="156" y="328" width="40" height="44" rx="10" fill="#012850" />
      <rect x="212" y="328" width="60" height="44" rx="12" fill="#7FD3D5" />
      <rect x="284" y="328" width="68" height="44" rx="12" fill="#01ACAF" />
    </svg>
  );
}

/**
 * Specular sweep across the whole mark, once every 7s. It is masked to the
 * tile's silhouette, which contains the page, so the light
 * crosses slab and paper as one surface rather than stopping at an edge.
 */
function Glare() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden>
      <defs>
        <mask id={`vn-glare-mask-${id}`} style={{ maskType: "alpha" }}>
          <rect width="512" height="512" rx="116" fill="#fff" />
        </mask>
        <linearGradient id={`vn-glare-grad-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g mask={`url(#vn-glare-mask-${id})`}>
        {/* the band starts clear of the tile's left edge and is thrown past
            its right edge; both ends are fully transparent anyway */}
        <g transform="rotate(-16 256 256)">
          <rect
            className="note-glare-band"
            x="-180"
            y="-200"
            width="120"
            height="912"
            fill={`url(#vn-glare-grad-${id})`}
          />
        </g>
      </g>
    </svg>
  );
}

export function NoteStage({ size = 320 }: { size?: number }) {
  const side = Math.round(size * 0.62);

  const pageFaceZ = (PAGE_LAYERS + 1) * PAGE_STEP;
  const front = pageFaceZ + 0.5;
  const back = -TILE_LAYERS * TILE_STEP;
  // tilt about the solid's own middle, not about the tile's front face
  const centre = -(front + back) / 2;

  return (
    <div
      className="mark-stage relative grid place-items-center"
      style={{ width: size, height: size * 0.8 }}
    >
      {/* Held at a fixed turn rather than revolving. Face-on, the slab's edge
          and the page's lift are invisible, so this tilt is what makes the
          depth read while the mark stays still. */}
      <div
        className="relative"
        role="img"
        aria-label="Visual Notes"
        style={{
          width: side,
          height: side,
          transformStyle: "preserve-3d",
          transform: "rotateY(-22deg) rotateX(10deg)",
        }}
      >
        <div className="mark-solid relative h-full w-full" style={{ transform: `translateZ(${centre}px)` }}>
          {/* slab side wall: copies receding into shadow */}
          {Array.from({ length: TILE_LAYERS }, (_, i) => {
            const t = i / (TILE_LAYERS - 1);
            return (
              <span
                key={`tile-${i}`}
                aria-hidden
                className="mark-face"
                style={{
                  transform: `translateZ(${-(i + 1) * TILE_STEP}px)`,
                  filter: `brightness(${(0.9 - t * 0.5).toFixed(3)})`,
                }}
              >
                <Tile />
              </span>
            );
          })}

          {/* slab face, casting the shadow that makes it read as solid */}
          <span className="mark-face mark-front">
            <Tile />
          </span>

          {/* paper edge: lighter where it meets the face, greyer toward the slab */}
          {Array.from({ length: PAGE_LAYERS }, (_, j) => {
            const t = j / (PAGE_LAYERS - 1); // 0 = next to the tile, 1 = under the face
            const shade = Math.round(158 + t * 72); // #9E.. -> #E6..
            return (
              <span
                key={`page-${j}`}
                aria-hidden
                className="mark-face"
                style={{ transform: `translateZ(${(j + 1) * PAGE_STEP}px)` }}
              >
                <PageEdge color={`rgb(${shade - 8}, ${shade + 6}, ${Math.min(255, shade + 14)})`} />
              </span>
            );
          })}

          {/* the printed page, lifted, with a soft shadow on the slab beneath */}
          <span
            className="mark-face"
            style={{
              transform: `translateZ(${pageFaceZ}px)`,
              filter: "drop-shadow(0 3px 4px rgba(1, 16, 32, 0.35))",
            }}
          >
            <PageFace />
          </span>

          <span className="mark-face" style={{ transform: `translateZ(${front}px)` }}>
            <Glare />
          </span>
        </div>
      </div>
    </div>
  );
}
