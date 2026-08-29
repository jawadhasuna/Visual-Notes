"use client";

const STEPS = [
  {
    n: "01",
    title: "Segment",
    body: "Notes split on record boundaries, then on the nurse's own section headers — NEURO, RESP, CV, GI, GU, ID, ENDO. Deterministic, no model involved.",
  },
  {
    n: "02",
    title: "Extract",
    body: "Each segment is mapped to a frozen body-system schema. The lane taxonomy is fixed for every case, so two charts are always comparable.",
  },
  {
    n: "03",
    title: "Ground",
    body: "Every extracted fact carries the note id and character offsets of the text it came from, and is byte-checked against the source. Unverifiable items never reach the chart.",
  },
  {
    n: "04",
    title: "Cover",
    body: "Sentences with no linked fact are fed back for a second pass. Retention stops being a judgement call and becomes a measured percentage.",
  },
  {
    n: "05",
    title: "Render",
    body: "Validated JSON is drawn as a swim-lane trajectory. Same input, same chart — the renderer is deterministic and diff-testable.",
  },
];

export function MethodSection() {
  return (
    <section id="method" className="mx-auto w-full max-w-[1500px] px-5 py-24">
      <div className="mb-12 max-w-2xl">
        <p
          className="font-mono text-[10px] font-bold tracking-[0.24em] uppercase"
          style={{ color: "var(--color-teal-600)" }}
        >
          Method
        </p>
        <h2
          className="font-display mt-2 text-3xl font-extrabold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          Nothing on the chart without a receipt
        </h2>
        <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          The pipeline is built so that a fabricated finding is structurally
          impossible rather than merely unlikely, and so that &ldquo;did we lose
          anything?&rdquo; has a number for an answer.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((s) => (
          <li key={s.n} className="panel flex flex-col p-5">
            <span
              className="font-mono text-[11px] font-bold tracking-[0.2em]"
              style={{ color: "var(--color-teal-500)" }}
            >
              {s.n}
            </span>
            <h3
              className="font-display mt-2 text-lg font-bold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {s.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ResearchSection() {
  return (
    <section id="research" className="border-y" style={{ background: "var(--surface-2)" }}>
      <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-5 py-20 lg:grid-cols-2">
        <div>
          <p
            className="font-mono text-[10px] font-bold tracking-[0.24em] uppercase"
            style={{ color: "var(--color-teal-600)" }}
          >
            Research
          </p>
          <h2
            className="font-display mt-2 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Visual versus written nursing notes
          </h2>
          <p className="mt-4 text-[13.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            Forty-one registered critical-care nurses reviewed the same patient
            admission twice — first as conventional written SOAP notes, then as a
            structured visual note — rating perceived workload on the raw
            NASA&#8209;TLX after each condition.
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            Total workload fell from 54.95 to 30.68, a mean reduction of 24.27
            points. All six subscales improved, with the largest effects in
            frustration and temporal demand. As a fixed-order pilot on a single
            case, the result is preliminary — order effects cannot be ruled out.
          </p>
          <p className="mt-5 text-[12px]" style={{ color: "var(--text-dim)" }}>
            Zaidi M, Tanguay A, Zaidi N, Sial Q, Gazarian PK, Thakral M, Walfre F,
            Dykes PC. <em>JMIR Nursing</em> (preprint 102954).
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div
            className="border-b px-5 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--text-dim)" }}
            >
              NASA-TLX · written → visual
            </h3>
          </div>
          <div className="space-y-3.5 p-5">
            {[
              { k: "Mental demand", w: 12.17, v: 6.73, max: 13 },
              { k: "Physical demand", w: 4.95, v: 2.54, max: 13 },
              { k: "Temporal demand", w: 9.59, v: 4.83, max: 13 },
              { k: "Performance", w: 7.34, v: 5.95, max: 13 },
              { k: "Effort", w: 10.78, v: 6.15, max: 13 },
              { k: "Frustration", w: 10.12, v: 4.49, max: 13 },
            ].map((r) => (
              <div key={r.k}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                    {r.k}
                  </span>
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text-dim)" }}>
                    {r.w.toFixed(2)} → {r.v.toFixed(2)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                  style={{ background: "color-mix(in oklab, var(--text) 7%, transparent)" }}
                >
                  <div
                    className="relative h-full rounded-full"
                    style={{
                      width: `${(r.w / r.max) * 100}%`,
                      background: "color-mix(in oklab, var(--color-navy-600) 45%, transparent)",
                    }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${(r.v / r.w) * 100}%`,
                        background:
                          "linear-gradient(90deg, var(--color-teal-600), var(--color-teal-400))",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div
              className="flex items-center gap-4 border-t pt-3 font-mono text-[9.5px] tracking-wider uppercase"
              style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-4 rounded-sm"
                  style={{ background: "color-mix(in oklab, var(--color-navy-600) 45%, transparent)" }}
                />
                written
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-4 rounded-sm"
                  style={{ background: "var(--color-teal-500)" }}
                />
                visual
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
