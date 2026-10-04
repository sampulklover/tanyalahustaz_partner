import { NextResponse } from "next/server";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { countPendingUnderFolders } from "@/lib/gcs-sync";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Per-folder "not yet synced" counts for the visible folder paths. Fetched
 * after the page renders so listing bucket folders never delays first paint.
 */
export async function GET(request: Request) {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  const raw = new URL(request.url).searchParams.get("folders")?.trim() ?? "";
  const folders = raw
    .split(",")
    .map((path) => path.trim())
    .filter((path) => path.length > 0 && path.length <= 1024 && !path.startsWith("/") && !path.includes(".."))
    .slice(0, 200);

  if (folders.length === 0) {
    return NextResponse.json({ pending: {} });
  }

  try {
    const pending = await countPendingUnderFolders(folders);
    return NextResponse.json({ pending });
  } catch (error) {
    logError("Pending folder counts failed", error);
    return NextResponse.json({ pending: {} });
  }
}
