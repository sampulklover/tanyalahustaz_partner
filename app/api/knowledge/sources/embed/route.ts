import { NextResponse } from "next/server";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { countKnowledgeChunks } from "@/lib/embed-knowledge";
import { drainEmbedJobs, getPendingEmbedJobCount } from "@/lib/knowledge-embed-jobs";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Process the pending embedding queue now, instead of waiting for the cron. */
export async function POST() {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  try {
    const chunksBefore = await countKnowledgeChunks();
    const { remaining } = await drainEmbedJobs({ deadlineMs: 180_000 });
    const chunksAfter = await countKnowledgeChunks();

    return NextResponse.json({
      chunksWritten: Math.max(0, chunksAfter - chunksBefore),
      pending: remaining,
    });
  } catch (error) {
    logError("Embed queue processing failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed." },
      { status: 500 },
    );
  }
}

/** Current queue size, for the button label. */
export async function GET() {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  return NextResponse.json({ pending: await getPendingEmbedJobCount() });
}
