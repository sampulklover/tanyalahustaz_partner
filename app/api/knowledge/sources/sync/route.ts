import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { createSyncRun, getGcsSyncStatus, syncKnowledgeFromGcs, syncRunCap } from "@/lib/gcs-sync";
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

/**
 * Start a sync. Returns immediately with a run id; the work continues on the
 * server, so the admin can close the page and watch progress from the history.
 */
export async function POST(request: Request) {
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

  // Pruning is opt-in: a normal sync never deletes mirrored files.
  const body = (await request.json().catch(() => null)) as { prune?: boolean } | null;
  const prune = body?.prune === true;

  let runId: string;

  try {
    runId = await createSyncRun(admin.userId);
  } catch (error) {
    logError("Could not create sync run", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync could not start." },
      { status: 400 },
    );
  }

  // Runs after the response is sent — the client polls for progress.
  after(async () => {
    try {
      await syncKnowledgeFromGcs({
        runId,
        createdBy: admin.userId,
        maxFiles: syncRunCap(),
        prune,
      });
      await drainEmbedJobs({ deadlineMs: 180_000 });
    } catch (error) {
      logError("GCS sync run failed", error, { runId });
    } finally {
      revalidatePath("/dashboard/knowledge/sources");
    }
  });

  return NextResponse.json({ runId });
}
