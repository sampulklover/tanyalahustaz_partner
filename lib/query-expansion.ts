// Query expansion for retrieval. Pure and dependency-free so it can be unit
// tested. Small embedding models match phrasings, not topics: "hukum minum tuak"
// ranks "hukum minum kopi" above actual khamr content because the words "hukum
// minum" dominate. Appending topical synonyms gives the retriever a better
// chance of surfacing the right material without changing the embedding model.

/**
 * Term -> synonyms/related terms. Keys are matched case-insensitively against
 * whole words in the query. Keep entries to terms the corpus actually uses.
 */
const SYNONYMS: Record<string, string[]> = {
  tuak: ["arak", "khamr", "memabukkan", "minuman keras"],
  arak: ["khamr", "memabukkan", "minuman keras"],
  khamr: ["arak", "memabukkan"],
  mabuk: ["memabukkan", "khamr"],
  judi: ["perjudian", "pertaruhan", "loteri"],
  rokok: ["merokok", "vape", "tembakau"],
  zakat: ["fitrah", "sedekah"],
  solat: ["sembahyang", "namaz"],
  puasa: ["sawm", "puasa"],
  riba: ["faedah", "bunga bank"],
  wakaf: ["endowment"],
  babi: ["khinzir", "pork", "porcine"],
  aurat: ["menutup aurat"],
  talak: ["cerai", "perceraian"],
  nikah: ["perkahwinan", "kahwin"],
  faraid: ["pusaka", "warisan"],
  wasiat: ["hibah", "pusaka"],
  hadis: ["hadith", "sunnah"],
  quran: ["al-quran", "alquran"],
  akidah: ["tauhid", "aqidah"],
  murtad: ["kafir", "riddah"],
};

/**
 * Return the query with related terms appended. The original wording is kept
 * first so exact-phrase relevance is not lost. Returns the input unchanged when
 * nothing matches, so behaviour is identical for queries we don't expand.
 */
export function expandQuery(query: string): string {
  const lower = query.toLowerCase();
  const words = new Set(lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean));

  const additions = new Set<string>();
  for (const [term, synonyms] of Object.entries(SYNONYMS)) {
    if (!words.has(term)) continue;
    for (const synonym of synonyms) {
      if (!lower.includes(synonym)) additions.add(synonym);
    }
  }

  if (additions.size === 0) return query;
  return `${query} ${[...additions].join(" ")}`;
}
