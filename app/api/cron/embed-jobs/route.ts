import { NextResponse } from "next/server";
import { drainEmbedJobs } from "@/lib/knowledge-embed-jobs";
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
    const embed = await drainEmbedJobs({ deadlineMs: 240_000 });
    return NextResponse.json({
      rounds: embed.rounds,
      remaining: embed.remaining,
    });
  } catch (error) {
    logError("Cron embed-jobs failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed." },
      { status: 500 },
    );
  }
}
