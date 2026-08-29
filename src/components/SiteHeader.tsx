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
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-8 px-5">
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

      </div>
    </header>
  );
}
