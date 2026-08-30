"use client";

import { MarkStage } from "./MarkStage";
import { StethoscopeBackdrop } from "./StethoscopeBackdrop";

const STATS = [
  { value: "44.2%", label: "lower perceived workload" },
  { value: "41", label: "critical-care nurses" },
  { value: "P<.001", label: "across all six subscales" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* supplied plaster sheet + seamless grain */}
      <div aria-hidden className="texture-paper" />
      <div aria-hidden className="texture-grain" />

      {/* soft brand wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% -8%, color-mix(in oklab, var(--color-teal-400) 18%, transparent), transparent 70%)",
        }}
      />

      <StethoscopeBackdrop />

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col items-center px-5 pt-16 pb-20 text-center">
        <MarkStage size={320} />

        <p
          className="text-extruded font-mono mt-3 text-[17px] font-extrabold tracking-[0.26em] uppercase"
          style={{ color: "var(--color-teal-400)" }}
        >
          New England CareFlow LLC
        </p>

        <h1
          className="font-display mt-4 text-6xl leading-[0.95] font-extrabold tracking-[-0.03em] sm:text-7xl"
          style={{ color: "var(--text)" }}
        >
          Visual{" "}
          <span
            style={{
              background:
                "linear-gradient(115deg, var(--color-navy-600) 10%, var(--color-teal-500) 65%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Notes
          </span>
        </h1>

        <p
          className="mt-5 max-w-xl text-[15px] leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          Narrative critical-care nursing documentation, restructured into a
          source-verifiable body-system chart — so the patient&nbsp;story reads
          at a glance instead of being reassembled from paragraphs.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#workspace"
            className="rounded-lg px-6 py-3 text-[13px] font-bold tracking-wide text-white transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, var(--color-navy-700), var(--color-teal-600))",
              boxShadow: "0 14px 34px -16px rgba(0,143,139,0.9)",
            }}
          >
            Open the workspace
          </a>
          <a
            href="#method"
            className="rounded-lg border px-6 py-3 text-[13px] font-bold tracking-wide transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            How it works
          </a>
        </div>

        {/* Study headline numbers */}
        <dl className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="panel px-3 py-4"
              style={{ background: "color-mix(in oklab, var(--surface) 88%, transparent)" }}
            >
              <dt
                className="font-display text-2xl font-extrabold tracking-tight"
                style={{ color: "var(--color-teal-600)" }}
              >
                {s.value}
              </dt>
              <dd
                className="mt-1 text-[11px] leading-snug"
                style={{ color: "var(--text-dim)" }}
              >
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[10.5px]" style={{ color: "var(--text-dim)" }}>
          Pilot within-subject study, NASA-TLX · Zaidi et al., JMIR Nursing
        </p>
      </div>
    </section>
  );
}
