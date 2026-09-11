"use client";

/**
 * Hero mark for Visual Notes: the note page from the product icon, built as a
 * solid object -- a sheet with real thickness, lanes printed on its face.
 *
 * It is the page from the site icon (app/icon.svg) without the navy tile
 * behind it. The drawing is cropped to the page's own bounds, so the sheet
 * fills the stage rather than sitting at half size inside an empty square.
 *
 * Depth comes from copies of the page's outline stacked along Z behind the
 * printed face, shading darker toward the back: the paper's edge. It holds
 * still at a fixed turn -- face-on, that edge would be invisible -- and does
 * not animate.
 */

const PAGE =
  "M148 84H328L392 148V400Q392 428 364 428H148Q120 428 120 400V112Q120 84 148 84Z";
const FOLD = "M328 84L392 148H352Q328 148 328 124Z";

/** The page's bounds in the icon's 512 grid, with a little margin. */
const VIEW = { x: 112, y: 76, w: 288, h: 360 };
const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

const EDGE_LAYERS = 10; // the sheet's thickness, as stacked outlines
const EDGE_STEP = 1.5;

/** One slice of the paper's edge: the page outline in a single flat colour. */
function PageEdge({ color }: { color: string }) {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full" aria-hidden>
      <path d={PAGE} fill={color} />
    </svg>
  );
}

/** The printed face of the page: fold, title line and three lanes. */
function PageFace() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full" aria-hidden>
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

export function NoteStage({ size = 320 }: { size?: number }) {
  const height = Math.round(size * 0.72);
  const width = Math.round((height * VIEW.w) / VIEW.h);
  // tilt about the sheet's own middle rather than about its printed face
  const centre = (EDGE_LAYERS * EDGE_STEP) / 2;

  return (
    <div
      className="mark-stage relative grid place-items-center"
      style={{ width: size, height: size * 0.8 }}
    >
      {/* Held at a fixed turn rather than revolving: face-on, the paper's edge
          is invisible, so this tilt is what makes the depth read. */}
      <div
        className="relative"
        role="img"
        aria-label="Visual Notes"
        style={{
          width,
          height,
          transformStyle: "preserve-3d",
          transform: "rotateY(-22deg) rotateX(10deg)",
        }}
      >
        <div className="mark-solid relative h-full w-full" style={{ transform: `translateZ(${centre}px)` }}>
          {/* paper edge: light just behind the face, shading toward the back */}
          {Array.from({ length: EDGE_LAYERS }, (_, i) => {
            const t = i / (EDGE_LAYERS - 1); // 0 = just behind the face, 1 = back
            const shade = Math.round(226 - t * 80);
            const isBack = i === EDGE_LAYERS - 1;
            return (
              <span
                key={i}
                aria-hidden
                className="mark-face"
                style={{
                  transform: `translateZ(${-(i + 1) * EDGE_STEP}px)`,
                  // the back of the sheet casts the shadow that grounds it
                  filter: isBack ? "drop-shadow(0 14px 22px rgba(0, 6, 14, 0.55))" : undefined,
                }}
              >
                <PageEdge color={`rgb(${shade - 8}, ${shade + 6}, ${Math.min(255, shade + 14)})`} />
              </span>
            );
          })}

          {/* the printed face */}
          <span className="mark-face">
            <PageFace />
          </span>
        </div>
      </div>
    </div>
  );
}
