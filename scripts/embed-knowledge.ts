import { config } from "dotenv";
import { embedAllKnowledgeArticles } from "../lib/embed-knowledge";

config({ path: ".env.local" });
config({ path: ".env" });

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const parsedLimit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

async function main() {
  console.log(
    limit
      ? `Embedding up to ${limit} published article(s)...`
      : "Embedding all published knowledge articles...",
  );

  const result = await embedAllKnowledgeArticles({ limit });

  console.log(
    `Done. Processed ${result.articlesProcessed} article(s), wrote ${result.chunksWritten} chunk embedding(s).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
