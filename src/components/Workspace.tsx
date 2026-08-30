"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotesInput } from "./NotesInput";
import { ConversionStage, PIPELINE_STEPS, type RunState } from "./ConversionStage";
import { GraphPanel } from "./GraphPanel";
import { DEMO_RESULT, SAMPLE_NOTE, type VisualNote } from "@/lib/demo";

export function Workspace() {
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<RunState>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<VisualNote | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /**
   * Front-end preview of the pipeline. The real implementation will call
   * the extraction API and stream these same stages back.
   */
  const run = useCallback(() => {
    clearTimers();
    setResult(null);
    setStep(0);
    setState("running");

    PIPELINE_STEPS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStep(i), i * 620));
    });
    timers.current.push(
      setTimeout(() => {
        setResult(DEMO_RESULT);
        setState("done");
      }, PIPELINE_STEPS.length * 620 + 260),
    );
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setState("idle");
    setStep(0);
    setResult(null);
  }, [clearTimers]);

  return (
    <section id="workspace" className="mx-auto w-full max-w-[1500px] px-5 pb-24">
      <header className="print-hide mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="font-mono text-[10px] font-bold tracking-[0.24em] uppercase"
            style={{ color: "var(--color-teal-600)" }}
          >
            Workspace
          </p>
          <h2
            className="font-display mt-1.5 text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Notes in, chart out
          </h2>
        </div>
        <p className="max-w-md text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Narrative shift notes are segmented by body system, extracted to a
          schema, checked for coverage, then drawn as a swim-lane trajectory.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {/* Notes and conversion share a row; the chart gets its own full width */}
        <div className="print-hide grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="panel h-[360px] overflow-hidden">
            <NotesInput
              value={notes}
              onChange={setNotes}
              onLoadSample={() => setNotes(SAMPLE_NOTE)}
              disabled={state === "running"}
            />
          </div>

          <div className="panel panel-inset overflow-hidden">
            <ConversionStage
              state={state}
              step={step}
              canRun={notes.trim().length > 0}
              onRun={run}
              onReset={reset}
            />
          </div>
        </div>

        {/* Output — grows to whatever height the chart needs, never scrolls */}
        <div id="print-chart" className="panel overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h2
                className="font-display text-[13px] font-bold tracking-wide"
                style={{ color: "var(--text)" }}
              >
                Visual note
              </h2>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
                Body-system lanes across the admission
              </p>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <span
                  className="rounded-md px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase"
                  style={{
                    color: "var(--color-teal-600)",
                    background: "color-mix(in oklab, var(--color-teal-500) 13%, transparent)",
                  }}
                >
                  synthetic case 001
                </span>
              )}
              <button
                onClick={() => window.print()}
                disabled={!result}
                className="print-hide flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-navy-700), var(--color-teal-600))",
                }}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M8 10.5 4.5 7l1-1L7.25 7.75V1.5h1.5v6.25L10.5 6l1 1L8 10.5Z" />
                  <path d="M2.5 11v2.5h11V11H15v3a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 1 14v-3h1.5Z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
          <div>
            <GraphPanel result={result} />
          </div>
        </div>
      </div>
    </section>
  );
}
