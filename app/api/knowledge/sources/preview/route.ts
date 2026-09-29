import { NextResponse } from "next/server";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { getSyncPreview } from "@/lib/gcs-sync";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the next sync would change. Fetched by the UI on demand so page
 * navigation never has to compute it.
 */
export async function GET() {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  try {
    const preview = await getSyncPreview();
    return NextResponse.json({ preview });
  } catch (error) {
    logError("Sync preview failed", error);
    return NextResponse.json({ preview: null });
  }
}
