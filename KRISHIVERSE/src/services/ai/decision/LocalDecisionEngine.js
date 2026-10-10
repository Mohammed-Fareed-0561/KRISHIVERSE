/**
 * LocalDecisionEngine.js
 *
 * MANDATORY offline decision engine. Works with zero network, zero downloads,
 * zero optional dependencies. Reuses AgriculturalNLP + existing deterministic
 * rules — it introduces NO duplicate agricultural knowledge system.
 *
 * If Laya disappears tomorrow, KrishiVerse keeps working on this engine alone.
 */

import {
  parseQuery,
  classifyIntent,
  fastSearch,
  normalizeCrop,
  normalizeSymptom,
  distinctSymptoms,
} from "../AgriculturalNLP";
import { buildClarification } from "../ResponseValidator";
import { normalizeDecision, validateDecisionRequest } from "./decisionSchemas";

export const LOCAL_ENGINE_NAME = "local";

function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates || []) {
    if (c === null || c === undefined) continue; // invalid → drop
    const key = typeof c === "object"
      ? String(c.id ?? c.name ?? JSON.stringify(c))
      : String(c);
    if (seen.has(key)) continue; // duplicate → drop
    seen.add(key);
    out.push(c);
  }
  return out;
}

function scoreCandidate(candidate, { crop, symptom, evidence }) {
  const text = JSON.stringify(candidate || {}).toLowerCase();
  let score = 0;
  if (crop && text.includes(String(crop).toLowerCase())) score += 2;
  if (symptom && text.includes(String(symptom).toLowerCase())) score += 2;
  for (const ev of evidence || []) {
    const evText = JSON.stringify(ev || {}).toLowerCase();
    if (!evText) continue;
    // Bounded overlap: count shared crop/symptom tokens, not free-text magic.
    if (crop && evText.includes(String(crop).toLowerCase()) && text.includes(String(crop).toLowerCase())) score += 1;
    if (symptom && evText.includes(String(symptom).toLowerCase()) && text.includes(String(symptom).toLowerCase())) score += 1;
  }
  return score;
}

function decideIntentClassification(state = {}) {
  const query = String(state.query ?? state.text ?? "");
  const parsed = parseQuery(query);
  const intent = parsed.intent || classifyIntent(query);
  const confidence = intent === "unknown" ? 0.3 : parsed.crop || parsed.symptom ? 0.75 : 0.6;
  return normalizeDecision({
    task: "intent_classification",
    decision: { intent, crop: parsed.crop, symptom: parsed.symptom },
    confidence,
    needsClarification: intent === "unknown" || (!parsed.crop && query.trim().length < 140),
    clarification: intent === "unknown" ? buildClarification({ parsed, intent }) : null,
    engine: LOCAL_ENGINE_NAME,
  });
}

function decideClarification(state = {}) {
  const query = String(state.query ?? state.text ?? "");
  const parsed = state.parsed || parseQuery(query);
  const intent = state.intent || parsed.intent || classifyIntent(query);
  // Meta intents (capabilities/greetings) never need clarification.
  if (intent === "greeting" || intent === "help" || intent === "about") {
    return normalizeDecision({
      task: "clarification",
      decision: { intent, parsed, hasCrop: false, hasSymptom: false },
      confidence: 0.9,
      needsClarification: false,
      clarification: null,
      engine: LOCAL_ENGINE_NAME,
    });
  }
  // Enough evidence: known crop + (known symptom for disease OR non-disease intent)
  const hasCrop = Boolean(parsed.crop || normalizeCrop(query.split(/\s+/)[0] || ""));
  // The "general" symptom bucket (problem/issue/trouble) means the farmer has
  // NOT named a symptom — a disease query without a concrete symptom must
  // clarify, never fall through to KB hits.
  const hasSymptom = Boolean(parsed.symptom && parsed.symptom !== "general");
  let needed = false;
  if (!hasCrop) needed = true;
  else if (distinctSymptoms(query).size >= 2) {
    // Differential: the query names two or more distinct symptoms/diseases
    // ("blast or brown spot?"). Never pick one — ask which the farmer means.
    needed = true;
  } else if (intent === "disease" && !hasSymptom) needed = true;
  else {
    try {
      const hits = fastSearch(query, { limit: 3 });
      if (!hits.records || hits.records.length === 0) needed = true;
    } catch {
      needed = true;
    }
  }
  void normalizeSymptom;
  return normalizeDecision({
    task: "clarification",
    decision: { intent, parsed, hasCrop, hasSymptom },
    confidence: needed ? 0.4 : 0.8,
    needsClarification: needed,
    clarification: needed ? buildClarification({ parsed, intent }) : null,
    engine: LOCAL_ENGINE_NAME,
  });
}

function decideCandidateSelection({ candidates = [], evidence = [], state = {} } = {}) {
  const query = String(state.query ?? state.text ?? "");
  const parsed = state.parsed || parseQuery(query);
  const clean = dedupeCandidates(candidates);
  if (clean.length === 0) {
    return normalizeDecision({
      task: "candidate_selection",
      decision: { selected: null, ranked: [], reason: "empty_candidates" },
      confidence: 0,
      needsClarification: true,
      clarification: buildClarification({ parsed, intent: parsed.intent }),
      engine: LOCAL_ENGINE_NAME,
    });
  }
  const ranked = clean
    .map((c) => ({ candidate: c, score: scoreCandidate(c, { crop: parsed.crop, symptom: parsed.symptom, evidence }) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  return normalizeDecision({
    task: "candidate_selection",
    decision: { selected: top.candidate, ranked: ranked.map((r) => r.candidate), reason: "local_rank" },
    confidence: top.score > 0 ? 0.7 : 0.35,
    needsClarification: top.score === 0,
    clarification: top.score === 0 ? buildClarification({ parsed, intent: parsed.intent }) : null,
    engine: LOCAL_ENGINE_NAME,
  });
}

const LocalDecisionEngine = {
  name: LOCAL_ENGINE_NAME,
  supportedTasks: ["intent_classification", "clarification", "candidate_selection"],
  async decide({ task, state = {}, candidates = [], evidence = [] } = {}) {
    validateDecisionRequest({ task, state, candidates, evidence });
    if (task === "intent_classification") return decideIntentClassification(state);
    if (task === "clarification") return decideClarification(state);
    return decideCandidateSelection({ candidates, evidence, state });
  },
};

export default LocalDecisionEngine;
