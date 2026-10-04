import { NextResponse } from "next/server";
import {
  getGcsSyncStatus,
  reapStaleSyncRuns,
  syncKnowledgeFromGcs,
} from "@/lib/gcs-sync";
import { drainEmbedJobs } from "@/lib/knowledge-embed-jobs";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/** Daily sweeper: mirror new/changed Google Cloud Storage files into Supabase. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getGcsSyncStatus().configured) {
    return NextResponse.json({ skipped: true, reason: "not_configured" });
  }

  try {
    await reapStaleSyncRuns();
    const result = await syncKnowledgeFromGcs({
      maxFiles: Number(process.env.GCS_SYNC_MAX_FILES ?? 20),
    });
    const embed = await drainEmbedJobs({ deadlineMs: 120_000 });

    return NextResponse.json({ result, embed });
  } catch (error) {
    logError("Cron gcs-sync failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed." },
      { status: 500 },
    );
  }
}
