import { config } from "dotenv";
import { embedAllKnowledgeArticles } from "../lib/embed-knowledge";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  console.log("Embedding published knowledge articles...");

  const result = await embedAllKnowledgeArticles();

  console.log(
    `Done. Processed ${result.articlesProcessed} article(s), wrote ${result.chunksWritten} chunk embedding(s).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
