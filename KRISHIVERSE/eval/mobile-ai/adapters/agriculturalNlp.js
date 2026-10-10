/**
 * eval/mobile-ai/adapters/agriculturalNlp.js — production AgriculturalNLP
 * exposed as a benchmark arm (read-only usage; production code unchanged).
 */
import {
  parseQuery, fastSearch, classifyIntent, normalizeCrop, normalizeSymptom,
} from "../../../src/services/ai/AgriculturalNLP.js";

export const agriculturalNlp = {
  id: "agricultural-nlp",
  label: "AgriculturalNLP (production, read-only)",
  state: "measured",
  available: () => true,
  parse(text) {
    const p = parseQuery(text);
    return { intent: p.intent, crop: p.crop ?? null, symptom: p.symptom ?? null, tokens: p.tokens || [] };
  },
  classifyIntent: (text) => classifyIntent(text),
  normalizeCrop: (token) => normalizeCrop(token),
  normalizeSymptom: (token) => normalizeSymptom(token),
  retrieve(text, limit = 5) {
    return fastSearch(text, { limit }).records.map((r) => r.record);
  },
};

export default agriculturalNlp;

