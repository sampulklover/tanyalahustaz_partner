import { config } from "dotenv";
import type { RetrievedKnowledge } from "../lib/types";

config({ path: ".env.local" });
config({ path: ".env" });

const args = process.argv.slice(2);
const query = args.find((arg) => !arg.startsWith("--"));
const categoryArg = args.find((arg) => arg.startsWith("--category="));
const thresholdArg = args.find((arg) => arg.startsWith("--threshold="));
const topArg = args.find((arg) => arg.startsWith("--top="));

// Must be set before lib/knowledge reads it at module load.
if (thresholdArg) {
  process.env.RAG_SIMILARITY_THRESHOLD = thresholdArg.split("=")[1];
}

const category = categoryArg?.split("=")[1];
const top = topArg ? Number(topArg.split("=")[1]) : 6;

async function main() {
  if (!query) {
    console.log('Usage: npm run search-knowledge -- "your question" [--category=fiqh] [--threshold=0.3] [--top=6]');
    process.exit(1);
  }

  const { findRelevantKnowledge, buildKnowledgeContext } = await import("../lib/knowledge");
  const { DEFAULT_EMBEDDING_MODEL } = await import("../lib/embeddings");

  console.log(`query:      ${query}`);
  console.log(`category:   ${category ?? "(all)"}`);
  console.log(`model:      ${process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL}`);
  console.log(`threshold:  ${process.env.RAG_SIMILARITY_THRESHOLD ?? "0.5"}`);
  console.log("");

  const results: RetrievedKnowledge[] = await findRelevantKnowledge(query, category);

  if (results.length === 0) {
    console.log("No matches. (Small talk is skipped; otherwise lower --threshold.)");
    return;
  }

  results.slice(0, top).forEach((item, index) => {
    const similarity =
      typeof item.similarity === "number" ? `${(item.similarity * 100).toFixed(1)}%` : "n/a";
    const snippet = item.content.replace(/\s+/g, " ").slice(0, 180);
    console.log(`${index + 1}. [${similarity}] ${item.title} (${item.category})`);
    console.log(`   ${snippet}${item.content.length > 180 ? "…" : ""}`);
    console.log("");
  });

  const contextChars = buildKnowledgeContext(results).length;
  console.log(`matches: ${results.length} · prompt context: ${contextChars} chars`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
