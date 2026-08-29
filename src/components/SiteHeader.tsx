"use client";

import { Wordmark } from "./Logo";

const NAV = [
  { href: "#workspace", label: "Workspace" },
  { href: "#method", label: "Method" },
  { href: "#research", label: "Research" },
];

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--bg) 82%, transparent)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-6 px-5">
        <Wordmark />

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[12.5px] font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--text-dim)" }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <a
          href="https://github.com/jawadhasuna/Visual-Notes"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          <span className="hidden sm:inline">Repository</span>
        </a>
      </div>
    </header>
  );
}
