/**
 * POST /api/extract — nursing notes in, verified chart out, streamed.
 *
 * Runs server-side so credentials never reach the browser, and so the
 * verification cannot be skipped: every chart frame is built from a document
 * whose offsets have already been resolved against the source.
 *
 * The response is NDJSON — one JSON event per line — because a long admission
 * is extracted in parts and the user should see the chart build rather than a
 * spinner. Each line is a StreamEvent from lib/vertex.
 */

import { NextResponse } from "next/server";
import { extractStreaming, type StreamEvent } from "@/lib/vertex.ts";
import { parseNotes } from "@/lib/extract.ts";
import { toVisualNote } from "@/lib/toVisualNote.ts";

export const runtime = "nodejs";

/**
 * How long the host will let one extraction run.
 *
 * This is a hosting-plan ceiling, not a preference: Vercel rejects the build
 * outright with "maxDuration must be between 1 and 300 for plan hobby". At the
 * measured rate of roughly 33 seconds per four-shift part, 300 seconds is about
 * nine parts, so an admission longer than about 36 shifts will be cut off.
 *
 * That covers 146 of the 163 cases in the corpus. The 17 it does not cover
 * include the longest, case 15 at 141 shifts. Running locally has no such
 * limit, because nothing is imposing one.
 *
 * On a plan that allows longer functions this is the single number to raise.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  let payload: { notes?: unknown; caseId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const raw = typeof payload.notes === "string" ? payload.notes : "";
  if (!raw.trim()) {
    return NextResponse.json({ error: "No notes were supplied." }, { status: 400 });
  }

  // Accept the corpus format, and fall back to treating the whole paste as a
  // single note so the box is usable without the delimiters.
  let notes = parseNotes(raw);
  if (Object.keys(notes).length === 0) notes = { 1: raw.trim() };

  const caseId =
    typeof payload.caseId === "string" && payload.caseId.trim()
      ? payload.caseId.trim()
      : (/START_OF_RECORD=([^|]+)\|/.exec(raw)?.[1] ?? "case");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for await (const event of extractStreaming(notes, caseId)) {
          if (event.type === "doc") {
            // Translate to the render shape here so the client stays a view.
            // A partial document can fail the strict schema while still being
            // drawable; the client is told about that at the end, not now.
            try {
              send({
                type: "chart",
                caseId,
                chart: toVisualNote(event.doc as Parameters<typeof toVisualNote>[0]),
                coverage: (event.doc as { coverage?: { ratio?: number } }).coverage?.ratio ?? null,
              });
            } catch {
              // A frame that will not render is skipped, not fatal — the next
              // chunk usually produces a drawable one.
            }
          } else {
            send(event satisfies StreamEvent);
          }
        }
      } catch (err) {
        send({
          type: "error",
          fatal: true,
          message: err instanceof Error ? err.message : "Extraction failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
