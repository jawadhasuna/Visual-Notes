/**
 * Confirm the extraction stops on its own time budget and reports it honestly.
 *
 *   EXTRACT_BUDGET_MS=1 VERTEX_API_KEY=... node scripts/check-budget.ts
 *
 * A one-millisecond budget forces the stop after the first part, which is the
 * same code path as the production timeout without spending five minutes and
 * thirteen model calls to reach it.
 */

import { extractStreaming } from "../src/lib/vertex.ts";
import { parseNotes } from "../src/lib/extract.ts";

const notes: Record<number, string> = {};
for (let i = 1; i <= 12; i++) {
  notes[i] = `NPN shift ${i}. RESP: LS clear, sats 97% on 2L. CV: HR 82 SR, BP 120/70. ` +
    `GI: abd soft, tolerating feeds. GU: foley patent. NEURO: alert, follows commands.`;
}
void parseNotes;

for await (const e of extractStreaming(notes, "budget_check")) {
  if (e.type === "plan") console.log(`  plan   : ${e.chunks} parts`);
  if (e.type === "chunk") console.log(`  part   : ${e.index + 1} landed`);
  if (e.type === "error") console.log(`  error  : ${e.message.slice(0, 90)}`);
  if (e.type === "done") {
    console.log(`
  truncated : ${e.truncated}`);
    console.log(`  parts     : ${e.partsDone} of ${e.partsTotal}`);
    console.log(`  lastShift : ${e.lastShift}`);
    console.log(`  RESULT    : ${e.truncated && e.partsDone < e.partsTotal
      ? "budget honoured, run reported as partial"
      : "PROBLEM - budget did not stop the run"}`);
  }
}
