/**
 * Verify the API-key authentication path through the real extraction code.
 *
 *   VERTEX_API_KEY=... node scripts/check-apikey.ts
 *
 * The point is to exercise lib/vertex rather than a hand-rolled curl: the thing
 * worth checking is that the app's own request shape works over the API-key
 * endpoint, since that endpoint addresses the model without a project or
 * location and could plausibly reject the schema the app sends.
 *
 * Prints only counts and statuses. The key is read from the environment and is
 * never written anywhere.
 */

import { extractStreaming } from "../src/lib/vertex.ts";
import { parseNotes } from "../src/lib/extract.ts";
import { SAMPLE_NOTE } from "../src/lib/demo.ts";

if (!process.env.VERTEX_API_KEY) {
  console.error("VERTEX_API_KEY is not set in this shell.");
  process.exit(2);
}

const notes = parseNotes(SAMPLE_NOTE);
console.log(`\n  auth mode : API key (VERTEX_API_KEY present)`);
console.log(`  input     : ${Object.keys(notes).length} shifts\n`);

let findings = 0;
let resolved = 0;
let rejected = 0;
let failed = false;

for await (const event of extractStreaming(notes, "apikey_check")) {
  switch (event.type) {
    case "plan":
      console.log(`  plan      : ${event.chunks} part(s)`);
      break;
    case "chunk":
      findings += event.findings;
      resolved += event.spansResolved;
      rejected += event.spansRejected;
      console.log(
        `  part ${event.index + 1}    : ${event.findings} findings, ` +
          `${event.spansResolved} quotes verified, ${event.spansRejected} rejected`,
      );
      break;
    case "error":
      failed = true;
      console.log(`  ERROR     : ${event.message}`);
      break;
    case "done":
      console.log(
        `\n  schema    : ${event.shapeOk ? "valid" : "FAILED"}` +
          `${event.shapeErrors.length ? " " + event.shapeErrors.join("; ") : ""}`,
      );
      console.log(`  tokens    : ${event.usage.promptTokens} in / ${event.usage.outputTokens} out`);
      console.log(`  elapsed   : ${(event.elapsedMs / 1000).toFixed(1)}s`);
      break;
  }
}

console.log(
  `\n  RESULT    : ${
    !failed && findings > 0 && rejected === 0
      ? "API key works end to end"
      : "PROBLEM - see above"
  }\n`,
);
process.exit(!failed && findings > 0 ? 0 : 1);
