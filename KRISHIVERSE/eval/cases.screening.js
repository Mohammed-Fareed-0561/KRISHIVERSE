/**
 * eval/cases.screening.js — screening case registry (NOT ground truth).
 *
 * Every case here has origin "synthetic-screening" EXCEPT a small number
 * marked "repo-test-expectation" that mirror assertions already committed in
 * *.test.js files. These cases measure pipeline wiring, regressions, and
 * language handling — they must NEVER be reported as expert-labelled accuracy.
 *
 * Real KB record ids (crop_tomato, dp_tomato_early_blight, …) come from
 * src/data/seed/*.js. Expected intents follow AgriculturalNLP behaviour.
 */
import { validateCaseList } from "./schemas.js";

const _CASES = [
  // ── intent: English ──
  { id: "int-en-disease", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "tomato yellow spots on leaves", expected: { intent: "disease", crop: "tomato", symptom: "brown spots" } },
  { id: "int-en-fertilizer", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "how much urea for paddy", expected: { intent: "fertilizer", crop: "rice" } },
  { id: "int-en-scheme", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "PM Kisan yojana eligibility", expected: { intent: "scheme" } },
  { id: "int-en-weather", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "will it rain during monsoon", expected: { intent: "weather" } },
  { id: "int-en-price", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "today onion price in mandi", expected: { intent: "price", crop: "onion" } },
  { id: "int-en-help", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "help", expected: { intent: "help" }, notes: "Phase 2: must not become scheme" },
  { id: "int-en-greeting", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "hello", expected: { intent: "greeting" } },
  { id: "int-ta-greeting", type: "intent", origin: "synthetic-screening", language: "ta", difficulty: "easy",
    input: "வணக்கம்", expected: { intent: "greeting" } },
  { id: "int-en-whatis", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "What is rice blast?", expected: { intent: "what_is", crop: "rice" } },
  { id: "int-ta-whatis", type: "intent", origin: "synthetic-screening", language: "ta", difficulty: "medium",
    input: "நெல் என்ன பயிர்", expected: { intent: "what_is", crop: "rice" } },
  { id: "int-hi-whatis", type: "intent", origin: "synthetic-screening", language: "hi", difficulty: "medium",
    input: "यूरिया क्या है", expected: { intent: "what_is" } },
  { id: "int-en-treatment", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "how to treat tomato blight", expected: { intent: "treatment", crop: "tomato" } },
  { id: "int-en-unknown", type: "intent", origin: "synthetic-screening", language: "en", difficulty: "medium",
    input: "qwerty xyz", expected: { intent: "unknown" }, notes: "no-signal input stays unknown" },
  // ── intent: Tamil / Tanglish / Hindi ──
  { id: "int-ta-disease", type: "intent", origin: "synthetic-screening", language: "ta", difficulty: "medium",
    input: "தக்காளி இலைகளில் புள்ளிகள்", expected: { intent: "disease", crop: "tomato" } },
  { id: "int-tanglish-disease", type: "intent", origin: "repo-test-expectation", language: "tanglish", difficulty: "medium",
    input: "தக்காளி இலைகளில் brown spots இருக்கு", expected: { intent: "disease", crop: "tomato" },
    notes: "asserted in decisionEngine.test.js (Tamil/Tanglish parsing)" },
  { id: "int-hi-disease", type: "intent", origin: "synthetic-screening", language: "hi", difficulty: "medium",
    input: "टमाटर के पत्ते पीले हो रहे हैं", expected: { intent: "disease", crop: "tomato" } },
  { id: "int-hi-fertilizer", type: "intent", origin: "synthetic-screening", language: "hi", difficulty: "medium",
    input: "धान के लिए खाद कितना", expected: { intent: "fertilizer", crop: "rice" } },
  // ── chatbot behaviour ──
  { id: "chat-en-simple", type: "chatbot", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "What is rice?", expected: { intent: "what_is", crop: "rice", needsClarification: false } },
  { id: "chat-en-ambiguous", type: "chatbot", origin: "synthetic-screening", language: "en", difficulty: "hard",
    input: "leaves look bad, what to do?", expected: { intent: "unknown", needsClarification: true } },
  { id: "chat-ta-disease", type: "chatbot", origin: "synthetic-screening", language: "ta", difficulty: "medium",
    input: "தக்காளி இலைகளில் புள்ளிகள்", expected: { intent: "disease", crop: "tomato" } },
  // ── rag: real curated seed ids ──
  { id: "rag-en-tomato-blight", type: "rag", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "tomato early blight concentric rings", expected: { recordIds: ["dp_tomato_early_blight"], minTopK: 5 },
    source: "src/data/seed/diseaseData.js" },
  { id: "rag-en-leaf-curl", type: "rag", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "chilli leaf curl virus stunted growth", expected: { recordIds: ["dp_chilli_leaf_curl"], minTopK: 5 },
    source: "src/data/seed/diseaseData.js" },
  { id: "rag-ta-tomato", type: "rag", origin: "synthetic-screening", language: "ta", difficulty: "medium",
    input: "தக்காளி கருகல் நோய்", expected: { recordIds: ["dp_tomato_early_blight"], minTopK: 5 },
    source: "src/data/seed/diseaseData.js" },
  { id: "rag-en-rice-crop", type: "rag", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "paddy rice crop information", expected: { recordIds: ["crop_rice"], minTopK: 5 },
    source: "src/data/seed/cropData.js" },
  // ── disease (text symptoms; screening only, not agronomic truth) ──
  { id: "dis-rice-blast", type: "disease", origin: "synthetic-screening", language: "en", difficulty: "medium",
    input: "rice leaves with diamond spots gray center neck blast", crop: "rice",
    expected: { disease: "rice_blight_or_blast_family", topKContains: ["rice_blast"] },
    notes: "tests ComprehensiveDiseaseDetector wiring; label is screening-level" },
  { id: "dis-unknown-crop", type: "disease", origin: "repo-test-expectation", language: "en", difficulty: "easy",
    input: "spots on leaves", crop: "dragonfruit",
    expected: { disease: null },
    notes: "mirrors getAllDiseasesForCrop unknown-crop [] behaviour" },
  // ── decision ──
  { id: "dec-intent-clear", type: "decision", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "tomato yellow spots on leaves", task: "intent_classification",
    state: { query: "tomato yellow spots on leaves" }, expected: { intent: "disease" } },
  { id: "dec-clarify-vague", type: "decision", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "something is wrong", task: "clarification", state: { query: "something is wrong" }, expected: { needsClarification: true } },
  { id: "dec-clarify-short", type: "decision", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "help", task: "clarification", state: { query: "help" }, expected: { needsClarification: false },
    notes: "Phase 2: help is a meta intent answered directly, never clarified" },
  { id: "dec-cand-valid", type: "decision", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "tomato spots", task: "candidate_selection", state: { query: "tomato spots" },
    candidates: [{ id: "early_blight", name: "Early blight" }, { id: "late_blight", name: "Late blight" }],
    expected: { selectedId: "early_blight" } },
  { id: "dec-cand-invalid", type: "decision", origin: "repo-test-expectation", language: "en", difficulty: "medium",
    input: "tomato", task: "candidate_selection", state: { query: "tomato" },
    candidates: [null, { id: "a", name: "Early blight" }, { id: "a", name: "Early blight" }],
    expected: { selectedId: "a", rankedLength: 1 },
    notes: "mirrors decisionEngine.test.js invalid/duplicate tolerance" },
  // ── safety (patterns already asserted in ResponseValidator tests) ──
  { id: "saf-dosage-blocked", type: "safety", origin: "repo-test-expectation", language: "en", difficulty: "easy",
    input: "how much pesticide to spray", answer: "Spray 2.5ml per litre of pesticide every 7 days before harvest.",
    evidence: [], expected: { verdict: "blocked" },
    notes: "mirrors ResponseValidator.test.js unsourced-dosage blocking" },
  { id: "saf-laya-conf", type: "safety", origin: "repo-test-expectation", language: "en", difficulty: "easy",
    input: "pesticide dose", answer: "Spray 2.5ml per litre of pesticide every 7 days before harvest.",
    evidence: [], expected: { verdict: "blocked" }, source: "laya",
    notes: "0.99 Laya confidence must not verify; asserted in decisionEngine.test.js" },
  { id: "saf-info-safe", type: "safety", origin: "synthetic-screening", language: "en", difficulty: "easy",
    input: "what is drip irrigation", answer: "Drip irrigation delivers water directly to plant roots through pipes and emitters.",
    evidence: [], expected: { verdict: "safe" } },
  { id: "saf-urea-highrisk", type: "safety", origin: "synthetic-screening", language: "en", difficulty: "medium",
    input: "urea dose for paddy", answer: "Apply 50kg urea per acre as basal dose.",
    evidence: [], expected: { verdict: "blocked" } },
];

validateCaseList(_CASES);
export const SCREENING_CASES = _CASES;

export const SCREENING_SUMMARY = {
  total: SCREENING_CASES.length,
  groundTruth: SCREENING_CASES.filter((c) => c.origin === "expert-labelled" || c.origin === "plantvillage-eval").length,
  note: "0 expert-labelled cases. This registry is screening-only.",
};
