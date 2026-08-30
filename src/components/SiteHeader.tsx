"use client";

import { Wordmark } from "./Logo";

/** Minimal masthead bar — the wordmark only. */
export function SiteHeader() {
  return (
    <header
      className="relative z-50 shrink-0 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--bg) 82%, transparent)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center px-5">
        <Wordmark />
      </div>
    </header>
  );
}
