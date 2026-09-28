const DEFAULT_MAX_CHARS = 900;
const OVERLAP_CHARS = 120;

/**
 * Split text that is longer than `maxChars` on its own. Extracted PDF text
 * often has no blank lines, so it arrives as one huge "paragraph" — without
 * this, a whole book would become a single chunk and blow up the AI prompt.
 */
function splitLongText(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    if (end < text.length) {
      const window = text.slice(start, end);
      const lastBreak = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n"));
      if (lastBreak > maxChars * 0.5) {
        end = start + lastBreak;
      }
    }

    const part = text.slice(start, end).trim();
    if (part) parts.push(part);
    if (end >= text.length) break;

    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }

  return parts;
}

export function chunkArticleText({
  title,
  summary,
  content,
  maxChars = DEFAULT_MAX_CHARS,
}: {
  title: string;
  summary: string;
  content: string;
  maxChars?: number;
}) {
  const intro = `${title}. ${summary}`;
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [intro];
  }

  // Guarantee every unit fits the limit before packing them together.
  const units: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      units.push(paragraph);
    } else {
      units.push(...splitLongText(paragraph, maxChars));
    }
  }

  const chunks: string[] = [];
  let current = intro;

  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;

    if (candidate.length > maxChars && current !== intro) {
      chunks.push(current.trim());
      current = `${title}. ${unit}`;
      continue;
    }

    if (candidate.length > maxChars && current === intro) {
      chunks.push(intro);
      current = unit;
      continue;
    }

    current = candidate;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [intro];
}
