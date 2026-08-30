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
      <g id={`mark-art-${uid}`}>
        {/* Seagreen — upper binaural arc */}
        <path
          fill="var(--mark-teal)"
          d="M 415.499 353.408 C 405.899 355.508 394.999 360.208 386.599 365.908 C 379.099 370.908 367.189 380.362 367.189 382.662 C 367.189 383.362 369.998 386.349 373.398 390.649 L 379.251 397.235 L 384.063 391.55 C 395.763 375.85 415.499 369.108 435.099 370.008 C 443.199 370.408 445.699 371.008 451.699 373.708 C 455.599 375.508 460.499 378.708 462.599 380.908 C 467.399 385.808 471.799 387.408 476.499 385.808 C 482.799 383.708 485.699 377.408 482.699 372.208 C 479.399 366.408 467.099 358.808 454.499 354.808 C 445.199 351.808 425.699 351.108 415.499 353.408"
        />

        {/* Navy — the stem and shoulder of the N */}
        <path
          fill="var(--mark-navy)"
          d="M 307.199 355.908 C 295.099 357.681 278.705 364.868 272.105 375.144 C 270.645 377.417 270.141 378.529 268.641 381.729 L 267.499 388.308 L 267.199 425.308 C 266.899 467.208 266.899 467.608 274.299 471.208 C 277.599 472.808 278.799 472.908 281.999 471.908 C 284.099 471.308 286.999 469.408 288.399 467.708 L 290.999 464.608 L 290.999 427.708 C 290.999 386.508 290.999 386.808 297.799 380.608 C 306.899 372.408 322.699 371.708 332.499 379.208 C 334.299 380.608 341.999 389.408 349.399 398.808 C 356.899 408.108 368.072 423.596 370.03 421.26 C 371.122 419.957 379.46 421.875 379.46 419.175 C 379.46 415.275 375.651 409.26 379.851 409.26 C 381.751 409.26 385.208 411.196 385.508 410.596 C 386.208 409.396 358.399 376.408 350.799 369.108 C 339.299 358.308 323.499 353.508 307.199 355.908"
        />

        {/* Seagreen — tubing sweeping down into the chest piece */}
        <path
          fill="var(--mark-teal)"
          d="M 309.594 393.435 C 306.14 396.435 305.053 399.735 306.435 403.535 C 307.916 407.435 336.936 443.835 347.399 454.735 C 360.724 468.835 374.444 477.235 392.015 482.135 C 402.773 485.135 426.858 485.335 437.717 482.535 C 454.102 478.335 469.402 469.735 478.976 459.535 C 483.912 454.235 484.503 452.935 484.207 448.435 C 483.912 444.935 478.68 440.935 474.238 440.935 C 470.783 440.935 469.697 441.635 464.169 447.235 C 456.865 454.635 448.179 460.035 437.815 463.635 C 427.944 467.035 411.855 467.935 401.688 465.535 C 392.607 463.335 380.466 457.235 373.162 451.235 C 366.647 445.935 358.75 436.635 358.75 434.435 C 358.75 433.635 360.231 431.235 362.106 429.235 C 364.969 425.835 368.621 419.935 368.621 418.535 C 368.621 418.235 366.153 419.735 362.995 421.935 C 353.518 428.735 353.717 428.835 335.653 406.135 C 329.829 398.935 324.203 392.435 323.216 391.935 C 319.662 390.035 312.753 390.735 309.594 393.435"
        />

        {/* Navy — where the N crosses back over the tubing */}
        <path
          fill="var(--mark-navy)"
          d="M 379.821 406.317 C 378.443 407.717 375.377 408.217 376.558 410.717 C 379.019 415.717 374.216 417.602 367.818 417.602 C 363.684 417.602 368.796 423.717 377.36 433.717 C 387.499 445.517 395.078 451.817 403.544 455.317 C 408.958 457.617 411.911 458.117 421.164 458.517 C 431.007 458.917 433.173 458.617 440.457 456.317 C 453.745 452.117 469.333 439.138 467.758 434.138 C 466.971 431.538 459.061 434.017 456.403 435.817 C 445.083 443.117 435.24 445.717 425.593 443.717 C 414.175 441.317 407.973 436.517 393.208 418.717 C 386.81 411.017 381.593 404.717 381.494 404.717 C 381.494 404.717 376.874 403.859 375.988 404.759"
        />
      </g>

      {glare && (
        <>
          <defs>
            {/* The mark's own silhouette masks the sweep, so the highlight
                only ever appears on the artwork — never on the background. */}
            <mask id={`glare-mask-${uid}`}>
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
