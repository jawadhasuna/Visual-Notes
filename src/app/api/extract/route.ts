/**
 * POST /api/extract — nursing notes in, verified chart out.
 *
 * Runs server-side so credentials never reach the browser, and so the
 * verification cannot be skipped: the response is built from the document
 * only after offsets are resolved and the strict schema has passed.
 */

import { NextResponse } from "next/server";
import { extractVisualNote, VertexError } from "@/lib/vertex.ts";
import { parseNotes } from "@/lib/extract.ts";
import { toVisualNote } from "@/lib/toVisualNote.ts";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  try {
    const result = await extractVisualNote(notes, caseId);

    // A document that fails the strict schema is not rendered. Reporting the
    // errors is more useful than quietly drawing a partial chart.
    if (!result.shapeOk) {
      return NextResponse.json(
        {
          error: "The extracted document did not satisfy the schema.",
          details: result.shapeErrors,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      caseId,
      chart: toVisualNote(result.doc as Parameters<typeof toVisualNote>[0]),
      verification: {
        spansResolved: result.resolve.resolved,
        spansRejected: result.resolve.rejected.length,
        rejected: result.resolve.rejected.slice(0, 10),
        coverage: (result.doc as { coverage?: { ratio?: number } }).coverage?.ratio ?? null,
      },
      usage: result.usage,
      elapsedMs: result.elapsedMs,
      noteCount: Object.keys(notes).length,
    });
  } catch (err) {
    if (err instanceof VertexError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("extraction failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed." },
      { status: 500 },
    );
  }
}
