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
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
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
        {/* Input */}
        <div className="panel h-[360px] overflow-hidden">
          <NotesInput
            value={notes}
            onChange={setNotes}
            onLoadSample={() => setNotes(SAMPLE_NOTE)}
            disabled={state === "running"}
          />
        </div>

        {/* Conversion */}
        <div className="panel panel-inset overflow-hidden">
          <ConversionStage
            state={state}
            step={step}
            canRun={notes.trim().length > 0}
            onRun={run}
            onReset={reset}
          />
        </div>

        {/* Output */}
        <div className="panel h-[720px] overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3"
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
          </div>
          <div className="h-[calc(720px-61px)]">
            <GraphPanel result={result} />
          </div>
        </div>
      </div>
    </section>
  );
}
