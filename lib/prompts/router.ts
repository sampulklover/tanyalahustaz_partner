// Question-type router.
//
// Picks which specialty module(s) to attach to a chat turn based on the user's
// message. This is a keyword/pattern classifier, deliberately simple and
// dependency-free so it is fast, predictable, and easy to unit test. It is a
// router, not an oracle: when nothing matches confidently it falls back to
// fiqh, which is the broadest module.

import type { PromptModuleId } from "@/lib/prompts/modules";

type Rule = {
  id: PromptModuleId;
  /** Weighted keywords. Higher score wins the turn. */
  terms: string[];
};

// Keywords are grouped so a single hit is meaningful. Malay and English terms
// are both listed; matching is case-insensitive and diacritic-agnostic enough
// for the common forms.
const RULES: Rule[] = [
  {
    id: "tafsir",
    terms: [
      "tafsir",
      "tafseer",
      "tafsīr",
      "ayat",
      "verse",
      "surah",
      "sura",
      "juz",
      "juz'",
      "tadabbur",
      "mufassir",
      "asbab al-nuzul",
      "asbabun nuzul",
      "quranic verse",
      "al-quran",
      "al-qur'an",
      "quran",
      "qur'an",
      "surah al-",
      "mushaf",
      "terjemahan ayat",
    ],
  },
  {
    id: "hadith",
    terms: [
      "hadith",
      "hadis",
      "hadeeth",
      "matn",
      "sahih al-bukhari",
      "sahih muslim",
      "sunan",
      "bukhari",
      "muslim",
      "abu dawud",
      "abu daud",
      "tirmidhi",
      "nasa'i",
      "nasai",
      "ibn majah",
      "perawi",
      "sanad",
      "isnad",
      "syarah hadis",
      "du'a",
      "doa",
      "dua",
      "zikir",
      "dhikr",
      "azkar",
      "adzkar",
      "hisnul muslim",
      "hishnul muslim",
      "kesahihan hadis",
      "grading hadis",
    ],
  },
  {
    id: "muamalat",
    terms: [
      "zakat",
      "zakah",
      "fidyah",
      "fidya",
      "kaffarah",
      "kafarah",
      "faraid",
      "fara'id",
      "pusaka",
      "wasiat",
      "wasiyyah",
      "wakaf",
      "waqf",
      "muamalat",
      "muamalah",
      "hutang",
      "riba",
      "interest",
      "insurans",
      "takaful",
      "saham",
      "sukuk",
      "perbankan islam",
      "islamic banking",
      "kwsp",
      "epf",
      "emas",
      "gold zakat",
      "fitrah",
      "zakat fitrah",
      "harta haram",
      "pencucian harta",
      "agihan harta",
      "pembahagian harta",
      "nisab",
      "warisan",
      "inheritance",
      "estate distribution",
    ],
  },
  {
    id: "fiqh",
    terms: [
      "hukum",
      "ruling",
      "haram",
      "halal",
      "wajib",
      "sunat",
      "sunnah",
      "makruh",
      "mazhab",
      "madhhab",
      "solat",
      "salah",
      "prayer",
      "puasa",
      "fasting",
      "wuduk",
      "wudhu",
      "ablution",
      "mandi wajib",
      "tayammum",
      "haji",
      "umrah",
      "nikah",
      "perkahwinan",
      "talak",
      "talaq",
      "divorce",
      "aurat",
      "akidah",
      "tauhid",
      "aqidah",
    ],
  },
];

export type RouteResult = {
  /** The module(s) to attach, in priority order. Never empty. */
  modules: PromptModuleId[];
  /** Whether the message matched any rule above the fallback threshold. */
  matched: boolean;
};

/**
 * Score a message against every rule and return the winning module(s).
 *
 * - The highest-scoring module is always included.
 * - A second module is added only when a question genuinely spans two areas
 *   (e.g. a zakat question that also asks for the hadith evidence).
 * - With no clear match, falls back to fiqh.
 */
export function routePromptModules(message: string): RouteResult {
  const haystack = message.toLowerCase();

  const scored = RULES.map((rule) => {
    let score = 0;

    for (const term of rule.terms) {
      if (haystack.includes(term)) {
        // Longer, more specific terms count for more than short ones.
        score += term.length >= 8 ? 2 : 1;
      }
    }

    return { id: rule.id, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { modules: ["fiqh"], matched: false };
  }

  // Always include the top module. Add the runner-up when the question
  // genuinely spans two areas: it must score on its own (>= 2) or be a real
  // tie with the winner. This keeps single-topic questions to one module.
  const modules: PromptModuleId[] = [scored[0].id];
  const runnerUp = scored[1];
  if (runnerUp && (runnerUp.score >= 2 || runnerUp.score >= scored[0].score - 1)) {
    modules.push(runnerUp.id);
  }

  return { modules, matched: true };
}
