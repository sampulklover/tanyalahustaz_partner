import { NextResponse } from "next/server";
import { requireKnowledgeTeamMember } from "@/lib/dashboard";
import { isGcsConfigured, streamGcsObject } from "@/lib/gcs";
import { logError } from "@/lib/logger";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream the real Google Cloud object to the browser, so admins can open the
 * original file (e.g. the PDF) rather than the extracted article text.
 *
 * Auth is the knowledge team. The bucket stays private — we never expose a
 * public URL, only proxy the bytes we are allowed to read.
 */
export async function GET(request: Request) {
  const admin = await requireKnowledgeTeamMember();
  if (!admin) {
    return NextResponse.json({ error: "Access required." }, { status: 403 });
  }

  if (!isGcsConfigured()) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 400 });
  }

  const path = new URL(request.url).searchParams.get("path")?.trim();
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\u0000")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  // Honour a single-range request so PDF viewers can seek.
  const rangeHeader = request.headers.get("range");
  let range: { start: number; end: number } | null = null;

  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : Number.MAX_SAFE_INTEGER;
      range = { start, end };
    }
  }

  try {
    const file = await streamGcsObject(path, range);
    if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const filename = path.split("/").pop() ?? path;
    const headers = new Headers({
      "content-type": file.contentType,
      // Inline so it opens in a new tab instead of downloading.
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, max-age=60",
      "accept-ranges": "bytes",
    });

    let status = 200;
    const body = Readable.toWeb(file.stream as Readable) as ReadableStream<Uint8Array>;

    if (range && file.size > 0) {
      const start = range.start;
      const end = Math.min(range.end, file.size - 1);
      const length = Math.max(0, end - start + 1);

      if (start >= file.size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "content-range": `bytes */${file.size}` },
        });
      }

      status = 206;
      headers.set("content-range", `bytes ${start}-${end}/${file.size}`);
      headers.set("content-length", String(length));

      // The GCS read stream is created with the same range, so body matches.
    } else if (file.size > 0) {
      headers.set("content-length", String(file.size));
    }

    return new NextResponse(body, { status, headers });
  } catch (error) {
    logError("Could not stream GCS file", error, { path });
    return NextResponse.json({ error: "Could not open the file." }, { status: 500 });
  }
}
