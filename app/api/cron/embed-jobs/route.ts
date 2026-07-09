import { NextResponse } from "next/server";
import { processPendingEmbedJobs } from "@/lib/knowledge-embed-jobs";
import { logError } from "@/lib/logger";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await processPendingEmbedJobs(3);
    return NextResponse.json({
      processed: jobs.length,
      jobs: jobs.map((job) =>
        job
          ? {
              id: job.id,
              status: job.status,
              articles_processed: job.articles_processed,
              articles_total: job.articles_total,
              chunks_written: job.chunks_written,
            }
          : null,
      ),
    });
  } catch (error) {
    logError("Cron embed-jobs failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed." },
      { status: 500 },
    );
  }
}
