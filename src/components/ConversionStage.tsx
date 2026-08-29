"use client";

import { Mark } from "./Logo";

export type RunState = "idle" | "running" | "done";

export const PIPELINE_STEPS = [
  "Segmenting notes",
  "Classifying body systems",
  "Extracting findings",
  "Grounding to source spans",
  "Coverage check",
  "Rendering chart",
] as const;

export function ConversionStage({
  state,
  step,
  canRun,
  onRun,
  onReset,
}: {
  state: RunState;
  step: number;
  canRun: boolean;
  onRun: () => void;
  onReset: () => void;
}) {
  const running = state === "running";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-2 py-6">
      {/* Flow trace: notes → core → chart */}
      <svg viewBox="0 0 40 120" className="h-16 w-10 shrink-0" aria-hidden>
        <line
          x1="20"
          y1="0"
          x2="20"
          y2="120"
          stroke="var(--border)"
          strokeWidth="2"
        />
        {running && (
          <line
            x1="20"
            y1="0"
            x2="20"
            y2="120"
            stroke="var(--color-teal-500)"
            strokeWidth="2"
            className="flow-line"
          />
        )}
      </svg>

      {/* Core */}
      <div className="relative grid h-28 w-28 place-items-center">
        <svg
          viewBox="0 0 120 120"
          className={`absolute inset-0 h-full w-full ${running ? "orbit-ring" : ""}`}
          aria-hidden
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={running ? "var(--color-teal-400)" : "var(--border)"}
            strokeWidth="2"
            strokeDasharray={running ? "10 14" : "3 6"}
            opacity={running ? 0.95 : 0.6}
          />
        </svg>
        <svg
          viewBox="0 0 120 120"
          className={`absolute inset-0 h-full w-full ${running ? "orbit-ring-rev" : ""}`}
          aria-hidden
        >
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke={running ? "var(--color-navy-500)" : "var(--border)"}
            strokeWidth="1.5"
            strokeDasharray="4 10"
            opacity={running ? 0.8 : 0.4}
          />
        </svg>

        <div
          className="grid h-16 w-16 place-items-center rounded-2xl transition-all duration-500"
          style={{
            background: "var(--mark-plate)",
            border: "1px solid var(--mark-plate-border)",
            boxShadow: running
              ? "0 0 0 6px color-mix(in oklab, var(--color-teal-500) 12%, transparent), 0 12px 30px -14px rgba(0,174,169,0.7)"
              : "0 6px 18px -12px rgba(7,32,58,0.5)",
          }}
        >
          <Mark className={`w-10 transition-opacity ${running ? "opacity-100" : "opacity-45"}`} />
        </div>
      </div>

      {/* Status */}
      <div className="min-h-[74px] w-full max-w-[190px] text-center">
        {state === "idle" && (
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            Ready to convert. Paste a case, then run the pipeline.
          </p>
        )}

        {running && (
          <div className="space-y-2">
            <p
              key={step}
              className="rise font-mono text-[10.5px] font-bold tracking-[0.13em] uppercase"
              style={{ color: "var(--color-teal-600)" }}
            >
              {PIPELINE_STEPS[Math.min(step, PIPELINE_STEPS.length - 1)]}
            </p>
            <div
              className="h-1 w-full overflow-hidden rounded-full"
              style={{ background: "var(--surface-2)" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${((step + 1) / PIPELINE_STEPS.length) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--color-navy-600), var(--color-teal-400))",
                }}
              />
            </div>
            <p className="font-mono text-[9.5px]" style={{ color: "var(--text-dim)" }}>
              step {Math.min(step + 1, PIPELINE_STEPS.length)} of {PIPELINE_STEPS.length}
            </p>
          </div>
        )}

        {state === "done" && (
          <div className="rise space-y-1.5">
            <p
              className="font-mono text-[10.5px] font-bold tracking-[0.13em] uppercase"
              style={{ color: "var(--color-teal-600)" }}
            >
              Chart ready
            </p>
            <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              5 lanes · 16 findings · every item linked to its source span
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      {state === "done" ? (
        <button
          onClick={onReset}
          className="rounded-lg border px-4 py-2 text-[12px] font-semibold transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
        >
          Run again
        </button>
      ) : (
        <button
          onClick={onRun}
          disabled={!canRun || running}
          className="group relative rounded-lg px-5 py-2.5 text-[12.5px] font-bold tracking-wide text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--color-navy-700), var(--color-teal-600))",
            boxShadow: "0 10px 24px -12px rgba(0,143,139,0.85)",
          }}
        >
          {running ? "Converting…" : "Convert to visual note"}
        </button>
      )}

      <svg viewBox="0 0 40 120" className="h-16 w-10 shrink-0" aria-hidden>
        <line x1="20" y1="0" x2="20" y2="120" stroke="var(--border)" strokeWidth="2" />
        {running && (
          <line
            x1="20"
            y1="0"
            x2="20"
            y2="120"
            stroke="var(--color-teal-500)"
            strokeWidth="2"
            className="flow-line"
          />
        )}
      </svg>
    </div>
  );
}
