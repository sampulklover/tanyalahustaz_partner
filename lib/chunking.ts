const DEFAULT_MAX_CHARS = 900;

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

  const chunks: string[] = [];
  let current = intro;

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > maxChars && current !== intro) {
      chunks.push(current.trim());
      current = `${title}. ${paragraph}`;
      continue;
    }

    if (candidate.length > maxChars && current === intro) {
      chunks.push(intro);
      current = paragraph;
      continue;
    }

    current = candidate;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [intro];
}
