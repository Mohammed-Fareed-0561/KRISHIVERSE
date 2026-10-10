/**
 * eval/mobile-ai/adapters/langId.js — deterministic script/marker language
 * identification prototype (benchmark-local, NOT wired into production).
 *
 * Production has no in-app language ID for chatbot text (the Python RAG
 * service has LanguageDetector); this adapter gives the benchmark a runnable
 * baseline arm for task 1 so Needle can be compared against something real.
 */

const TAMIL_RE = /[஀-௿]/;
const DEVANAGARI_RE = /[ऀ-ॿ]/;

// Word-boundary Tanglish transliteration markers (Tamil words typed in Latin).
const TANGLISH_MARKERS = new Set([
  "la", "ku", "ah", "um", "iruku", "irukku", "aguthu", "aaguthu", "aagudhu", "epdi",
  "eppadi", "romba", "enna", "illa", "thaan", "dhaan", "pannu", "pannum", "venum",
  "solu", "kedachu", "kedachathu", "varudhu", "irundhu", "pannittu", "nga", "inga",
  "anga", "nalla", "sari", "podhu", "podhum", "iniku", "naalu", "moonu", "rendu",
]);

/**
 * @param {string} text
 * @returns {"en"|"ta"|"tanglish"|"hi"}
 */
export function identifyLanguage(text) {
  const s = String(text || "");
  const hasTamil = TAMIL_RE.test(s);
  const hasDev = DEVANAGARI_RE.test(s);
  const words = s.toLowerCase().split(/[^a-z']+/).filter(Boolean);

  if (hasTamil) {
    const latinWords = words.length;
    return latinWords >= 3 ? "tanglish" : "ta";
  }
  if (hasDev) return "hi";
  const markers = words.filter((w) => TANGLISH_MARKERS.has(w));
  // Markers that are also plausible English function words need a second signal.
  const strong = markers.filter((w) => !["la", "ku", "ah", "um", "illa"].includes(w));
  if (strong.length >= 1) return "tanglish";
  if (markers.length >= 2) return "tanglish";
  return "en";
}

export default { identifyLanguage };
