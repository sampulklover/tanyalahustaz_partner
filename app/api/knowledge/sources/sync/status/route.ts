import { NextResponse } from "next/server";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live status of one sync run, polled by the UI while it works. */
export async function GET(request: Request) {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  const runId = new URL(request.url).searchParams.get("runId")?.trim();
  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("knowledge_sync_runs")
    .select(
      "id, status, files_seen, created_count, updated_count, removed_count, skipped_count, deferred_count, current_path, error, started_at, finished_at, embed_job_id, embed_cost_usd, embed_prompt_tokens",
    )
    .eq("id", runId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run: data });
}
