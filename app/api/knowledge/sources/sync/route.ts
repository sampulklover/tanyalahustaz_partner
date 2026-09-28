import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { getGcsSyncStatus, syncKnowledgeFromGcs } from "@/lib/gcs-sync";
import { drainEmbedJobs } from "@/lib/knowledge-embed-jobs";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Connection summary for the Sources dashboard. */
export async function GET() {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  return NextResponse.json({ status: getGcsSyncStatus() });
}

/** Pull the Google Cloud Storage bucket into the Supabase mirror. */
export async function POST() {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  if (!getGcsSyncStatus().configured) {
    return NextResponse.json(
      { error: "Google Cloud Storage is not configured." },
      { status: 400 },
    );
  }

  try {
    const result = await syncKnowledgeFromGcs({
      createdBy: admin.userId,
      maxFiles: Number(process.env.GCS_SYNC_MAX_FILES ?? 10),
    });

    if (result.embedJobId) {
      after(async () => {
        try {
          // Keep embedding in the background until the queue is drained.
          await drainEmbedJobs({ deadlineMs: 180_000 });
        } catch (error) {
          logError("GCS sync embed drain failed", error, { jobId: result.embedJobId });
        }
      });
    }

    revalidatePath("/dashboard/knowledge");
    revalidatePath("/dashboard/knowledge/sources");

    return NextResponse.json({ result });
  } catch (error) {
    logError("GCS sync request failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed." },
      { status: 500 },
    );
  }
}
