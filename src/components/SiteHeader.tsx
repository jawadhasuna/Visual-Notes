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

          {/* Outlined so it reads as leaving this site, not as another section.
              The border colour is set inline, like the site's other outlined
              buttons: the site-wide default border colour overrides any border
              colour given as a class, which left a faint line on the white bar.
              The "color:" hints on the text and hover classes are needed
              because Tailwind cannot tell a colour from a size when handed a
              bare CSS variable. Keep class-like examples out of comments here:
              Tailwind scans comments too, and one broke the stylesheet. */}
          <a
            href={COMPANY_SITE}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold text-[color:var(--header-nav)] transition-colors hover:bg-[color:var(--header-nav)] hover:text-white"
            style={{ borderColor: "var(--header-nav)" }}
          >
            Main website
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 11 11 5M6 5h5v5" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
