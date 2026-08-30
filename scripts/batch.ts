/**
 * Run extraction across the corpus and report what actually happened.
 *
 * This is the measurement step. Until it runs, "it works" is an impression
 * formed from one synthetic case; afterwards it is a number with a denominator.
 *
 *   node scripts/batch.ts <all_cases.txt> [--limit N] [--case N] [--out DIR]
 *                         [--concurrency N] [--resume]
 *
 * Costs real money — roughly $2 for the full 163 cases on gemini-3.7-flash —
 * so it prints an estimate and waits before starting. Results are written per
 * case so an interrupted run can be resumed rather than repaid for.
 *
 * The corpus path is an argument: credentialed text stays out of this repo,
 * and --out defaults to a gitignored directory.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { buildModelSchema, buildPrompt, resolveProvenance } from "../src/lib/extract.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n: string, d?: string) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 ? argv[i + 1] : d;
};

const corpusPath = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
const outDir = flag("out", join(root, "segmented/batch"))!;
const limit = Number(flag("limit", "0"));
const onlyCase = flag("case");
const concurrency = Math.max(1, Number(flag("concurrency", "3")));
const resume = argv.includes("--resume");

if (!corpusPath) {
  console.error("usage: node scripts/batch.ts <all_cases.txt> [--limit N] [--case N] [--out DIR] [--concurrency N] [--resume]");
  process.exit(2);
}

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? "gifted-plateau-l224x";
const LOCATION = process.env.VERTEX_LOCATION ?? "global";
const MODEL = process.env.VERTEX_MODEL ?? "gemini-3.7-flash";

/* ------------------------------------------------------------------ setup -- */

const strict = JSON.parse(readFileSync(join(root, "schema/visual-note.schema.json"), "utf8"));
const modelSchema = buildModelSchema(strict);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(strict);

const raw = readFileSync(corpusPath, "utf8");
const cases = new Map<string, Record<number, string>>();
for (const m of raw.matchAll(
  /START_OF_RECORD=(\d+)\|\|\|\|(\d+)\|\|\|\|\n?([\s\S]*?)\n?\|\|\|\|END_OF_RECORD/g,
)) {
  const [, caseId, noteId, body] = m;
  if (!cases.has(caseId)) cases.set(caseId, {});
  cases.get(caseId)![Number(noteId)] = body;
}

let ids = [...cases.keys()];
if (onlyCase) ids = ids.filter((c) => c === onlyCase);
if (limit) ids = ids.slice(0, limit);

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const done = new Set(
  resume ? readdirSync(outDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/^case-|\.json$/g, "")) : [],
);
const todo = ids.filter((c) => !done.has(c));

const totalChars = todo.reduce(
  (a, c) => a + Object.values(cases.get(c)!).reduce((x, b) => x + b.length, 0),
  0,
);
const estIn = Math.round(totalChars / 4) + todo.length * 1200; // notes + prompt
const estOut = Math.round(estIn * 0.5);
const estCost = (estIn / 1e6) * 0.75 + (estOut / 1e6) * 3.75;

console.log(`
  Corpus      ${corpusPath}
  Cases       ${todo.length} to run${done.size ? `  (${done.size} already done, skipping)` : ""}
  Model       ${MODEL} @ ${LOCATION}
  Estimate    ~${(estIn / 1000).toFixed(0)}k in / ~${(estOut / 1000).toFixed(0)}k out  ->  about $${estCost.toFixed(2)}
  Output      ${outDir}

  Starting in 5s — Ctrl+C to abort.
`);
await new Promise((r) => setTimeout(r, 5000));

/* -------------------------------------------------------------------- run -- */

const token = execSync("gcloud auth application-default print-access-token", {
  encoding: "utf8",
}).trim();
const host = LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
const url = `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

type Row = {
  case_id: string;
  notes: number;
  ok: boolean;
  reason?: string;
  findings: number;
  lanes: string[];
  spans_resolved: number;
  spans_rejected: number;
  shape_ok: boolean;
  coverage: number | null;
  allergies: number;
  ambiguous_flags: number;
  tokens_in: number;
  tokens_out: number;
  ms: number;
};

async function runCase(caseId: string): Promise<Row> {
  const notes = cases.get(caseId)!;
  const started = Date.now();
  const base: Row = {
    case_id: caseId, notes: Object.keys(notes).length, ok: false, findings: 0, lanes: [],
    spans_resolved: 0, spans_rejected: 0, shape_ok: false, coverage: null, allergies: 0,
    ambiguous_flags: 0, tokens_in: 0, tokens_out: 0, ms: 0,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(notes, caseId) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: modelSchema,
          maxOutputTokens: 32768,
        },
      }),
    });
    const text = await res.text();
    base.ms = Date.now() - started;

    if (!res.ok) {
      let msg = text.slice(0, 160);
      try { msg = JSON.parse(text).error?.message?.slice(0, 160) ?? msg; } catch {}
      return { ...base, reason: `http ${res.status}: ${msg}` };
    }

    const body = JSON.parse(text);
    base.tokens_in = body.usageMetadata?.promptTokenCount ?? 0;
    base.tokens_out = body.usageMetadata?.candidatesTokenCount ?? 0;
    if (body.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      return { ...base, reason: "hit output token limit" };
    }

    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
    } catch {
      return { ...base, reason: "response was not valid JSON" };
    }

    const resolve = resolveProvenance(doc, notes);
    const shapeOk = Boolean(validate(doc));

    const d = doc as {
      findings?: { lane: string; ambiguous_terms?: unknown[] }[];
      header?: { allergies?: unknown[] };
      coverage?: { ratio?: number };
    };
    const row: Row = {
      ...base,
      ok: shapeOk,
      reason: shapeOk ? undefined : (validate.errors ?? []).slice(0, 2).map((e) => `${e.instancePath} ${e.message}`).join("; "),
      findings: d.findings?.length ?? 0,
      lanes: [...new Set((d.findings ?? []).map((f) => f.lane))],
      spans_resolved: resolve.resolved,
      spans_rejected: resolve.rejected.length,
      shape_ok: shapeOk,
      coverage: d.coverage?.ratio ?? null,
      allergies: d.header?.allergies?.length ?? 0,
      ambiguous_flags: (d.findings ?? []).reduce((a, f) => a + (f.ambiguous_terms?.length ?? 0), 0),
    };

    writeFileSync(
      join(outDir, `case-${caseId}.json`),
      JSON.stringify({ meta: row, rejected: resolve.rejected, doc }, null, 1) + "\n",
    );
    return row;
  } catch (err) {
    return { ...base, ms: Date.now() - started, reason: err instanceof Error ? err.message.slice(0, 160) : "failed" };
  }
}

const rows: Row[] = [];
let index = 0;
async function worker() {
  while (index < todo.length) {
    const caseId = todo[index++];
    const row = await runCase(caseId);
    rows.push(row);
    const mark = row.ok ? (row.spans_rejected ? "!" : "+") : "x";
    process.stdout.write(
      `  ${mark} case ${caseId.padEnd(4)} ${String(row.findings).padStart(3)} findings  ` +
        `${String(row.spans_resolved).padStart(3)} spans` +
        `${row.spans_rejected ? ` (${row.spans_rejected} rejected)` : ""}` +
        `${row.reason ? `  ${row.reason}` : ""}\n`,
    );
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

/* ----------------------------------------------------------------- report -- */

const ok = rows.filter((r) => r.ok);
const spans = rows.reduce((a, r) => a + r.spans_resolved, 0);
const rejected = rows.reduce((a, r) => a + r.spans_rejected, 0);
const tokIn = rows.reduce((a, r) => a + r.tokens_in, 0);
const tokOut = rows.reduce((a, r) => a + r.tokens_out, 0);
const cost = (tokIn / 1e6) * 0.75 + (tokOut / 1e6) * 3.75;
const cov = ok.map((r) => r.coverage).filter((c): c is number => typeof c === "number");
const laneCount = new Map<string, number>();
for (const r of rows) for (const l of r.lanes) laneCount.set(l, (laneCount.get(l) ?? 0) + 1);

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

console.log(`
  ================= BATCH RESULT =================

  cases run            ${rows.length}
  schema valid         ${ok.length}  (${pct(ok.length, rows.length)})
  failed               ${rows.length - ok.length}

  spans grounded       ${spans}
  spans rejected       ${rejected}  (${pct(rejected, spans + rejected)} of all citations)
  cases with 0 rejects ${rows.filter((r) => r.ok && r.spans_rejected === 0).length}

  findings total       ${rows.reduce((a, r) => a + r.findings, 0)}
  allergies captured   ${rows.reduce((a, r) => a + r.allergies, 0)}
  ambiguity flags      ${rows.reduce((a, r) => a + r.ambiguous_flags, 0)}
  mean coverage        ${cov.length ? `${((cov.reduce((a, b) => a + b, 0) / cov.length) * 100).toFixed(1)}%` : "—"}

  tokens               ${(tokIn / 1000).toFixed(0)}k in / ${(tokOut / 1000).toFixed(0)}k out
  cost                 $${cost.toFixed(2)}
  mean latency         ${(rows.reduce((a, r) => a + r.ms, 0) / Math.max(1, rows.length) / 1000).toFixed(1)}s

  lanes used (cases containing each):`);
[...laneCount].sort((a, b) => b[1] - a[1]).forEach(([l, n]) =>
  console.log(`    ${l.padEnd(9)}${String(n).padStart(4)}`),
);

const failures = rows.filter((r) => !r.ok);
if (failures.length) {
  console.log("\n  failures:");
  for (const f of failures.slice(0, 15)) console.log(`    case ${f.case_id.padEnd(4)} ${f.reason}`);
}

const worst = rows.filter((r) => r.spans_rejected > 0).sort((a, b) => b.spans_rejected - a.spans_rejected);
if (worst.length) {
  console.log("\n  most rejected citations (inspect these first):");
  for (const w of worst.slice(0, 10)) {
    console.log(`    case ${w.case_id.padEnd(4)} ${w.spans_rejected} rejected of ${w.spans_resolved + w.spans_rejected}`);
  }
}

writeFileSync(join(outDir, "_summary.json"), JSON.stringify(rows, null, 1) + "\n");
console.log(`\n  per-case output and _summary.json in ${outDir}\n`);
