/**
 * eval/schemas.js — evaluation data schemas for KrishiVerse quality engineering.
 *
 * Six case types: chatbot, intent, rag, disease (image), decision, safety.
 *
 * Provenance honesty is structural, not conventional:
 * - every case MUST declare `origin`: "expert-labelled" | "repo-test-expectation"
 *   | "plantvillage-eval" | "synthetic-screening".
 * - NOTHING in eval/ may be reported as ground truth unless
 *   origin === "expert-labelled" (or "plantvillage-eval" for the 120-image
 *   PlantVillage hold-out, whose provenance lives in backend/eval/).
 * - `validateCase()` throws on missing/invalid fields so runners fail loudly
 *   instead of silently scoring garbage.
 *
 * Pure ESM, zero dependencies — importable from vitest runners and node scripts.
 */

export const CASE_TYPES = Object.freeze([
  "chatbot",
  "intent",
  "rag",
  "disease",
  "decision",
  "safety",
]);

export const ORIGINS = Object.freeze([
  "expert-labelled", // human agronomist labelled; may be reported as ground truth
  "repo-test-expectation", // expectation already asserted by a committed test
  "plantvillage-eval", // backend/eval/dataset hold-out (image labels only)
  "synthetic-screening", // hand-written smoke case; NEVER ground truth
  "unlabelled", // field data awaiting labels; must not score accuracy
]);

export const LANGUAGES = Object.freeze(["en", "ta", "tanglish", "hi"]);
export const DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

function assert(cond, msg) {
  if (!cond) {
    const err = new Error(`eval schema: ${msg}`);
    err.code = "INVALID_EVAL_CASE";
    throw err;
  }
}

function checkBase(c) {
  assert(c && typeof c === "object", "case must be an object");
  assert(typeof c.id === "string" && c.id.length > 0, "case.id required");
  assert(CASE_TYPES.includes(c.type), `case.type must be one of ${CASE_TYPES.join(",")}`);
  assert(ORIGINS.includes(c.origin), `case.origin must be one of ${ORIGINS.join(",")}`);
  assert(LANGUAGES.includes(c.language), `case.language must be one of ${LANGUAGES.join(",")}`);
  assert(typeof c.input === "string" && c.input.length > 0, "case.input required");
  assert(DIFFICULTIES.includes(c.difficulty), `case.difficulty must be one of ${DIFFICULTIES.join(",")}`);
  if (c.alternatives !== undefined) assert(Array.isArray(c.alternatives), "alternatives must be an array");
  if (c.notes !== undefined) assert(typeof c.notes === "string", "notes must be a string");
}

export function isGroundTruth(c) {
  return c.origin === "expert-labelled" || c.origin === "plantvillage-eval";
}

/** 1. chatbot case: full question → expected intent + behaviour. */
export function validateChatbotCase(c) {
  checkBase(c);
  assert(c.type === "chatbot", "wrong type");
  assert(typeof c.expected?.intent === "string", "expected.intent required");
  if (c.expected?.crop !== undefined) assert(typeof c.expected.crop === "string" || c.expected.crop === null, "expected.crop must be string|null");
  if (c.expected?.needsClarification !== undefined) assert(typeof c.expected.needsClarification === "boolean", "expected.needsClarification must be boolean");
  if (c.expected?.mustNotContain !== undefined) assert(Array.isArray(c.expected.mustNotContain), "expected.mustNotContain must be an array");
  return true;
}

/** 2. intent case: text → intent (+ optional crop/symptom slots). */
export function validateIntentCase(c) {
  checkBase(c);
  assert(c.type === "intent", "wrong type");
  assert(typeof c.expected?.intent === "string", "expected.intent required");
  return true;
}

/** 3. rag case: query → expected record ids (real KB ids, never invented). */
export function validateRagCase(c) {
  checkBase(c);
  assert(c.type === "rag", "wrong type");
  assert(Array.isArray(c.expected?.recordIds) && c.expected.recordIds.length > 0, "expected.recordIds non-empty array required");
  if (c.expected?.minTopK !== undefined) assert(Number.isInteger(c.expected.minTopK) && c.expected.minTopK > 0, "expected.minTopK must be a positive int");
  // Phase 3B: any of these ids is an acceptable hit (e.g. near-duplicate records).
  if (c.expected?.acceptableIds !== undefined) assert(Array.isArray(c.expected.acceptableIds), "expected.acceptableIds must be an array");
  // Phase 3B: expected provenance class of the evidence (curated|community|unknown; never synthetic-in-index).
  if (c.expected?.sourceClass !== undefined) assert(["curated", "community", "unknown"].includes(c.expected.sourceClass), "expected.sourceClass must be curated|community|unknown");
  if (c.topic !== undefined) assert(typeof c.topic === "string", "topic must be a string");
  if (c.source !== undefined) assert(typeof c.source === "string", "source must be a string");
  return true;
}

/** 4. disease/image case: text symptoms OR image path → disease label. */
export function validateDiseaseCase(c) {
  checkBase(c);
  assert(c.type === "disease", "wrong type");
  assert(typeof c.expected?.disease === "string" || c.expected?.disease === null, "expected.disease string|null required (null = healthy/unknown)");
  if (c.image !== undefined) assert(typeof c.image === "string", "image must be a path string");
  if (c.crop !== undefined) assert(typeof c.crop === "string", "crop must be a string");
  if (c.expected?.topKContains !== undefined) assert(Array.isArray(c.expected.topKContains), "expected.topKContains must be an array");
  return true;
}

/** 5. decision/Laya case: task + state → expected decision shape. */
export function validateDecisionCase(c) {
  checkBase(c);
  assert(c.type === "decision", "wrong type");
  assert(["intent_classification", "clarification", "candidate_selection"].includes(c.task), "task must be an allowed decision task");
  assert(c.state && typeof c.state === "object", "state object required");
  assert(c.expected && typeof c.expected === "object", "expected object required");
  if (c.candidates !== undefined) assert(Array.isArray(c.candidates), "candidates must be an array");
  return true;
}

/** 6. safety case: answer text (+ optional evidence) → expected verdict. */
export function validateSafetyCase(c) {
  checkBase(c);
  assert(c.type === "safety", "wrong type");
  assert(typeof c.answer === "string", "answer text required");
  if (c.evidence !== undefined) assert(Array.isArray(c.evidence), "evidence must be an array");
  assert(["safe", "cautious", "blocked"].includes(c.expected?.verdict), "expected.verdict must be safe|cautious|blocked");
  if (c.source !== undefined) assert(typeof c.source === "string", "source must be a string");
  return true;
}

const VALIDATORS = {
  chatbot: validateChatbotCase,
  intent: validateIntentCase,
  rag: validateRagCase,
  disease: validateDiseaseCase,
  decision: validateDecisionCase,
  safety: validateSafetyCase,
};

export function validateCase(c) {
  checkBase(c);
  return VALIDATORS[c.type](c);
}

export function validateCaseList(list) {
  assert(Array.isArray(list), "case list must be an array");
  const ids = new Set();
  for (const c of list) {
    validateCase(c);
    assert(!ids.has(c.id), `duplicate case id ${c.id}`);
    ids.add(c.id);
  }
  return true;
}
