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
   * Front-end preview of the pipeline. The real implementation will call the
   * extraction API and stream these same stages back.
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
    <section
      id="workspace"
      className="relative mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 px-5 pb-4"
    >
      <div className="grid min-h-0 w-full flex-1 gap-4 xl:grid-cols-[minmax(290px,0.78fr)_196px_minmax(0,2.1fr)]">
        {/* Input */}
        <div className="panel flex min-h-[420px] flex-col overflow-hidden xl:min-h-0">
          <NotesInput
            value={notes}
            onChange={setNotes}
            onLoadSample={() => setNotes(SAMPLE_NOTE)}
            disabled={state === "running"}
          />
        </div>

        {/* Conversion */}
        <div className="panel panel-inset flex min-h-[300px] flex-col overflow-hidden xl:min-h-0">
          <ConversionStage
            state={state}
            step={step}
            canRun={notes.trim().length > 0}
            onRun={run}
            onReset={reset}
          />
        </div>

        {/* Output */}
        <div className="panel flex min-h-[460px] flex-col overflow-hidden xl:min-h-0">
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5"
            style={{ borderColor: "var(--border)" }}
          >
            <h2
              className="font-display text-[13px] font-bold tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Visual note
            </h2>
            {result && (
              <span
                className="rounded-md px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase"
                style={{
                  color: "var(--color-teal-400)",
                  background: "color-mix(in oklab, var(--color-teal-500) 13%, transparent)",
                }}
              >
                synthetic case 001
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <GraphPanel result={result} />
          </div>
        </div>
      </div>
    </section>
  );
}
