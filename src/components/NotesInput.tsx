"use client";

export function NotesInput({
  value,
  onChange,
  onLoadSample,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onLoadSample: () => void;
  disabled?: boolean;
}) {
  const noteCount = (value.match(/START_OF_RECORD/g) ?? []).length;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0">
          <h2 className="font-display text-[13px] font-bold tracking-wide" style={{ color: "var(--text)" }}>
            Written notes
          </h2>
          <p className="mt-0.5 text-[11px] whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
            One admission · narrative SOAP notes
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onLoadSample}
            disabled={disabled}
            className="rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--color-teal-600)" }}
          >
            Load sample
          </button>
          <button
            onClick={() => onChange("")}
            disabled={disabled || !value}
            className="rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Field */}
      <div className="relative min-h-0 flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
          placeholder={
            "Paste nursing notes here…\n\nSTART_OF_RECORD=case_001||||1||||\n68 yo female admitted from ED with acute shortness of breath…\n||||END_OF_RECORD"
          }
          className="scroll-slim h-full w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[12px] leading-[1.7] outline-none disabled:opacity-60"
          style={{ color: "var(--text)" }}
        />
        {/* focus accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-teal-400), transparent)",
            opacity: value ? 0.8 : 0,
            transition: "opacity .3s",
          }}
        />
      </div>

      {/* Footer meter */}
      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-2.5 font-mono text-[10px]"
        style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        <span className="flex items-center gap-3">
          <span>{noteCount || "—"} notes</span>
          <span aria-hidden>·</span>
          <span>{words.toLocaleString()} words</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: value ? "var(--color-teal-500)" : "var(--color-mist-400)" }}
          />
          {value ? "ready" : "awaiting input"}
        </span>
      </div>
    </div>
  );
}
