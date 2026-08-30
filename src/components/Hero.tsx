"use client";

import { MarkStage } from "./MarkStage";

/** Compact masthead: mark, title, one line of explanation. Nothing else. */
export function Hero() {
  return (
    <section className="relative shrink-0 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% -10%, color-mix(in oklab, var(--color-teal-400) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col items-center px-5 pt-3 pb-4 text-center">
        <MarkStage size={168} />

        <h1
          className="font-display -mt-1 text-4xl leading-none font-extrabold tracking-[-0.03em]"
          style={{ color: "var(--text)" }}
        >
          Visual{" "}
          <span
            style={{
              background:
                "linear-gradient(115deg, var(--color-navy-500) 5%, var(--color-teal-400) 70%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Notes
          </span>
        </h1>

        <p className="mt-2 text-[13px]" style={{ color: "var(--text-dim)" }}>
          Nursing notes in, body-system chart out.
        </p>
      </div>
    </section>
  );
}
