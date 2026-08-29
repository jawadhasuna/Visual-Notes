"use client";

/**
 * New England CareFlow mark — the official corporate artwork.
 *
 * A stethoscope drawn so its binaural and tubing form the "N": navy
 * earpieces and stem, seagreen tubing sweeping into the chest piece.
 *
 * Paths are the company vector (brand navy #052C52, seagreen #04ACAF),
 * with the fills driven from CSS custom properties so the navy can lighten
 * on dark ground without changing the artwork.
 */
export function Mark({
  className = "",
  title = "New England CareFlow",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="11.5 12.76 224.43 137.39"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="mark-art">
        {/* Seagreen — tubing sweeping right into the chest piece */}
        <path
          fill="var(--mark-teal)"
          transform="translate(67,52)"
          d="M0 0 C5.314 2.053 7.823 4.844 11.188 9.375 C12.14 10.633 13.094 11.89 14.051 13.145 C14.535 13.783 15.019 14.422 15.518 15.081 C17.887 18.148 20.373 21.102 22.875 24.062 C23.739 25.085 24.602 26.107 25.492 27.16 C32.378 34.958 32.378 34.958 35.75 35.188 C39.741 33.729 42.77 31.539 46.145 28.984 C46.451 28.822 46.451 28.822 48 28 C49 31 49 31 48.109 32.938 C47.885 33.278 47.885 33.278 46.75 35 C46.312 35.681 45.873 36.361 45.422 37.062 C44 39 44 39 41 42 C40.82 46.599 41.973 49.397 44.812 52.875 C58.105 66.815 76.057 75.809 95.356 76.35 C113.863 76.526 130.376 71.187 143.895 58.121 C144.589 57.421 145.284 56.721 146 56 C151.923 50.22 151.923 50.22 156.062 49.375 C159.811 50.172 162.043 51.58 165 54 C167.347 58.694 167.411 60.021 166 65 C156.255 80.403 135.831 89.408 118.812 93.895 C93.616 99.429 66.547 94.652 44.848 81.02 C31.612 71.719 21.087 60.106 11.229 47.386 C8.065 43.313 4.793 39.356 1.438 35.438 C-0.377 33.294 -2.19 31.148 -4 29 C-4.95 27.882 -5.9 26.765 -6.879 25.613 C-15.729 14.774 -15.729 14.774 -15 7 C-11.47 0.856 -6.846 -0.59 0 0 Z"
        />

        {/* Navy — the left binaural forming the stem of the N */}
        <path
          fill="var(--mark-navy)"
          transform="translate(87,25)"
          d="M0 0 C0.791 0.423 1.583 0.846 2.398 1.281 C13.127 7.756 20.974 17.932 28.473 27.754 C30.613 30.503 32.823 33.07 35.188 35.625 C38 39 38 39 38 43 C35.347 43.428 32.676 43.757 30 44 C28 46 28 46 27.625 49.5 C27.419 50.655 27.213 51.81 27 53 C26.34 53.33 26.34 53.33 23 55 C20.366 52.42 18.244 49.908 16 47 C15.148 45.921 14.296 44.842 13.418 43.73 C11.532 41.341 9.652 38.946 7.777 36.547 C-7.707 16.759 -7.707 16.759 -17 14 C-25.998 13.003 -33.57 13.519 -41 19 C-44.707 22.532 -47.912 25.814 -48.125 31.085 C-48.125 32.413 -48.125 33.741 -48.126 35.108 C-48.128 35.84 -48.13 36.572 -48.132 37.326 C-48.136 38.919 -48.138 40.511 -48.138 42.103 C-48.142 45.49 -48.163 48.876 -48.183 52.263 C-48.221 58.571 -48.253 64.879 -48.25 71.187 C-48.25 75.572 -48.273 79.957 -48.312 84.343 C-48.323 86.012 -48.324 87.682 -48.317 89.352 C-48.307 91.693 -48.328 94.033 -48.356 96.374 C-48.36 97.705 -48.364 99.036 -48.367 100.407 C-49.152 104.863 -50.836 106.835 -54 110 C-57.702 111.851 -61.959 111.465 -66 111 C-69.981 108.678 -70.906 107.188 -73 103 C-73.267 99.822 -73.267 99.822 -73.291 96.019 C-73.303 94.594 -73.316 93.168 -73.329 91.699 C-73.332 90.142 -73.334 88.585 -73.336 87.027 C-73.342 85.423 -73.349 83.818 -73.356 82.214 C-73.368 78.847 -73.372 75.48 -73.371 72.114 C-73.37 67.825 -73.398 63.538 -73.432 59.25 C-73.455 55.933 -73.458 52.615 -73.457 49.297 C-73.46 47.718 -73.468 46.139 -73.484 44.56 C-73.609 30.559 -71.3 19.752 -62 9 C-45.957 -6.297 -19.707 -10.677 0 0 Z"
        />

        {/* Seagreen — the upper right binaural arc */}
        <path
          fill="var(--mark-teal)"
          transform="translate(210,21)"
          d="M0 0 C1.017 0.458 2.034 0.915 3.082 1.387 C9.515 4.599 17.68 9.36 21 16 C21.894 22.703 21.894 22.703 19.719 25.859 C16.694 28.747 14.338 29.916 10.25 30.938 C4.71 29.716 1.875 26.963 -2.32 23.262 C-5.728 20.385 -8.917 18.76 -13 17 C-13.846 16.608 -14.691 16.216 -15.562 15.812 C-28.717 11.428 -42.499 13.878 -55 19 C-64.373 23.698 -72.604 30.505 -77.812 39.688 C-78.534 40.781 -79.256 41.874 -80 43 C-84.191 40.905 -85.742 39.222 -88.625 35.625 C-89.401 34.669 -90.177 33.712 -90.977 32.727 C-93 30 -93 30 -95 26 C-88.607 13.237 -73.499 5.399 -61 0 C-59.869 -0.509 -58.739 -1.018 -57.574 -1.543 C-40.053 -8.262 -17.064 -7.801 0 0 Z"
        />

        {/* Navy — the inner shoulder where tubing meets the stem */}
        <path
          fill="var(--mark-navy)"
          transform="translate(130,66)"
          d="M0 0 C2.125 1.688 2.125 1.688 5 5 C5.331 5.36 5.331 5.36 7.008 7.184 C11.029 11.562 14.859 16.037 18.562 20.688 C26.458 30.356 35.647 37.894 48.559 39.273 C58.15 39.612 66.49 37.173 74.375 31.625 C77 30 77 30 80.812 29.938 C84 31 84 31 85.188 33.25 C84.933 36.978 83.478 38.242 81 41 C67.119 52.67 51.056 55.554 33.469 54.282 C15.066 52.178 1.883 36.875 -9.25 23.48 C-11 21 -11 21 -12 17 C-10.199 16.059 -10.199 16.059 -7.688 15.438 C-3.203 14.304 -3.203 14.304 -1 11 C-0.624 7.243 -0.836 6.246 -3 3 C-2.01 2.01 -1.02 1.02 0 0 Z"
        />
      </g>
    </svg>
  );
}

/**
 * The mark on its light plate.
 *
 * Brand navy is a dark colour, so it needs light ground to read. Rather than
 * recolouring the artwork on dark themes, the mark keeps its true navy and
 * carries this plate with it wherever the background may be dark.
 */
export function MarkChip({
  className = "",
  markClassName = "w-9",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-lg px-2 py-1.5 ${className}`}
      style={{
        background: "var(--mark-plate)",
        border: "1px solid var(--mark-plate-border)",
      }}
    >
      <Mark className={markClassName} />
    </span>
  );
}

/** Full lockup: mark + company name, as used in the site header. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <MarkChip markClassName="w-8" />
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
