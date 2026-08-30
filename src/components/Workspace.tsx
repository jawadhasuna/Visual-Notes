"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotesInput } from "./NotesInput";
import {
  ConversionStage,
  PIPELINE_STEPS,
  type RunState,
  type RunProgress,
} from "./ConversionStage";
import { GraphPanel } from "./GraphPanel";
import { SAMPLE_NOTE, type VisualNote } from "@/lib/demo";
import { downloadChartPng } from "@/lib/exportImage";

export function Workspace() {
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<RunState>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<VisualNote | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    spansResolved: number;
    spansRejected: number;
    coverage: number | null;
    elapsedMs: number;
    caseId: string;
  } | null>(null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /**
   * Real extraction, read as a stream.
   *
   * A long admission is extracted in parts, and each part that lands replaces
   * the chart with a larger one — so the trajectory builds in view instead of
   * appearing after several minutes of spinner. A part that fails is recorded
   * as a warning and the rest of the admission still completes.
   *
   * The timer-driven stage labels remain only for short cases, which arrive in
   * a single call and have no observable intermediate state.
   */
  const run = useCallback(async () => {
    clearTimers();
    setResult(null);
    setError(null);
    setReport(null);
    setProgress(null);
    setWarnings([]);
    setStep(0);
    setState("running");

    PIPELINE_STEPS.forEach((_, i) => {
      if (i > 0) timers.current.push(setTimeout(() => setStep(i), i * 2600));
    });

    let ranges: [number, number][] = [];
    let done = 0;
    let findings = 0;
    let fatal: string | null = null;
    // The chart frames carry these; the done event carries only the tallies.
    let charted = false;
    let caseId = "";
    let coverage: number | null = null;
    const failures: string[] = [];

    const apply = (event: Record<string, unknown>) => {
      switch (event.type) {
        case "plan": {
          clearTimers();
          ranges = (event.ranges ?? []) as [number, number][];
          if (ranges.length > 1) {
            setProgress({
              chunksDone: 0,
              chunksTotal: ranges.length,
              findings: 0,
              from: ranges[0][0],
              to: ranges[0][1],
            });
          }
          break;
        }
        case "chunk": {
          done += 1;
          findings += Number(event.findings ?? 0);
          const next = ranges[Math.min(done, ranges.length - 1)] ?? [0, 0];
          if (ranges.length > 1) {
            setProgress({
              chunksDone: done,
              chunksTotal: ranges.length,
              findings,
              from: next[0],
              to: next[1],
            });
          }
          break;
        }
        case "chart": {
          setResult(event.chart as VisualNote);
          charted = true;
          caseId = String(event.caseId ?? caseId);
          coverage = (event.coverage as number | null) ?? coverage;
          break;
        }
        case "done": {
          setReport({
            spansResolved: Number(event.spansResolved ?? 0),
            spansRejected: Number(event.spansRejected ?? 0),
            coverage,
            elapsedMs: Number(event.elapsedMs ?? 0),
            caseId,
          });
          break;
        }
        case "error": {
          // A per-part failure is survivable; a fatal one is not.
          if (event.fatal) fatal = String(event.message);
          else failures.push(String(event.message));
          break;
        }
      }
    };

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok || !res.body) {
        clearTimers();
        const data = await res.json().catch(() => ({}));
        setError(
          [data.error, ...(data.details ?? [])].filter(Boolean).join("\n").slice(0, 600) ||
            "Extraction failed.",
        );
        setState("idle");
        return;
      }

      // NDJSON: parse line by line, keeping the partial tail for the next read.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            apply(JSON.parse(line));
          } catch {
            // A truncated frame is not worth failing the run over.
          }
        }
      }
      if (buffer.trim()) {
        try {
          apply(JSON.parse(buffer));
        } catch {}
      }

      clearTimers();
      setWarnings(failures);

      // Every part failing is a failed run, not a ready chart — the shell the
      // server still emits must not be presented as a result.
      if (fatal || !charted || (ranges.length > 0 && failures.length === ranges.length)) {
        setResult(null);
        setWarnings([]);
        setError(fatal ?? (failures.join(" · ") || "Extraction produced nothing."));
        setState("idle");
        return;
      }

      setStep(PIPELINE_STEPS.length - 1);
      setState("done");
    } catch (err) {
      clearTimers();
      setError(err instanceof Error ? err.message : "Extraction failed.");
      setState("idle");
    }
  }, [clearTimers, notes]);

  const saveImage = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    try {
      await downloadChartPng(result, "visual-note.png");
    } catch (err) {
      console.error("Chart export failed", err);
    } finally {
      setSaving(false);
    }
  }, [result]);

  const reset = useCallback(() => {
    clearTimers();
    setState("idle");
    setStep(0);
    setResult(null);
    setError(null);
    setReport(null);
    setProgress(null);
    setWarnings([]);
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
              error={error}
              report={report}
              progress={progress}
              warnings={warnings}
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
                  {report?.caseId ?? "case"}
                </span>
              )}
              <button
                onClick={saveImage}
                disabled={!result || saving}
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
                {saving ? "Saving…" : "Download image"}
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
