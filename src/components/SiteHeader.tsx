"use client";

import { Wordmark } from "./Logo";
import { COMPANY_SITE } from "@/lib/links";

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
        borderColor: "var(--header-border)",
        background: "var(--header-bg)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-8 px-5">
        {/* The company lockup goes back to the company's main site. On phones
            the navigation below is hidden, so this is the way back there. */}
        <a
          href={COMPANY_SITE}
          aria-label="New England CareFlow: back to the main website"
          className="rounded-md transition-opacity hover:opacity-80"
        >
          <Wordmark />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[12.5px] font-bold transition-colors hover:opacity-70"
              style={{ color: "var(--header-nav)" }}
            >
              {n.label}
            </a>
          ))}

        </nav>
      </div>
    </header>
  );
}
