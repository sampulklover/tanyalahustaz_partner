import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createAdminClient } from "../lib/supabase/admin";
import { embedQuery } from "../lib/embeddings";

async function main() {
  const query = process.argv.slice(2).join(" ") || "hukum berjudi";
  console.log(`Query: "${query}"\n`);

  const db = createAdminClient();
  const embedding = await embedQuery(query);

  for (const threshold of [0.0, 0.2, 0.3, 0.35, 0.5]) {
    const { data, error } = await db.rpc("match_knowledge_chunks_hybrid", {
      query_embedding: embedding,
      query_text: query,
      match_count: 30,
      filter_category: null,
      similarity_threshold: threshold,
    });
    if (error) {
      console.log(`threshold ${threshold}: ERROR ${error.message}`);
      continue;
    }
    const rows = (data ?? []) as Array<{ similarity?: number; score?: number; content: string; category?: string }>;
    console.log(`threshold ${threshold}: ${rows.length} row(s)`);
    for (const r of rows.slice(0, 3)) {
      const sim = (r.similarity ?? r.score ?? 0).toFixed(3);
      console.log(`   [${sim}] ${(r.category ?? "?").slice(0, 12)} | ${r.content.slice(0, 60).replace(/\n/g, " ")}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
