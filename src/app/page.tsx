import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Workspace } from "@/components/Workspace";
import { StethoscopeBackdrop } from "@/components/StethoscopeBackdrop";

/**
 * Single screen. The workspace is the product, so on desktop the page is
 * pinned to the viewport and never scrolls — anything long lives inside a
 * panel's own scroll area. Below `lg` the columns stack and the page is
 * allowed to scroll, since three panels cannot share one phone screen.
 */
export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <div aria-hidden className="texture-paper" />
      <div aria-hidden className="texture-grain" />
      <StethoscopeBackdrop />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <SiteHeader />
        <Hero />
        <Workspace />

        <footer
          className="shrink-0 border-t px-5 py-2.5 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-[10.5px]" style={{ color: "var(--text-dim)" }}>
            Research prototype · synthetic sample data · not for clinical use ·
            stethoscope by{" "}
            <a
              href="https://www.vecteezy.com"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Vecteezy.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
