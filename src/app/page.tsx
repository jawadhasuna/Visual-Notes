import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Workspace } from "@/components/Workspace";
import { MethodSection, ResearchSection } from "@/components/MethodSection";
import { Mark } from "@/components/Logo";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Workspace />
        <MethodSection />
        <ResearchSection />
      </main>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Mark className="h-8 w-8" />
            <div>
              <p
                className="font-display text-[12.5px] font-extrabold tracking-[0.045em] uppercase"
                style={{ color: "var(--text)" }}
              >
                New England CareFlow LLC
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
                Research and prototype development · not clinical decision support
              </p>
            </div>
          </div>
          <p
            className="max-w-md text-[10.5px] leading-relaxed"
            style={{ color: "var(--text-dim)" }}
          >
            Sample content shown here is synthetic and published for illustration
            only. No credentialed patient data is stored in or served from this
            application.
          </p>
        </div>
      </footer>
    </>
  );
}
