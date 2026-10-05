/**
 * DecisionEngine.js
 *
 * Application-level orchestrator. The ONLY entry point the router uses:
 *
 *   decisionEngine.decide({ task, state, candidates, evidence })
 *
 * Policy (Phases 6 / 10 / 11 / 15):
 *   - Simple queries NEVER touch Laya (efficient local path).
 *   - Laya only when: flag ON + allowed task + ONLINE/UNCERTAIN + ambiguous input.
 *   - Laya failure (timeout/malformed/offline) → silent LocalDecisionEngine
 *     fallback. The farmer never sees a Laya error.
 *   - Returned shape is ALWAYS the normalized decision (decisionSchemas).
 */

import { parseQuery, fastSearch } from "../AgriculturalNLP";
import { getConnectivityState, CONNECTIVITY_STATES } from "../connectivity";
import LocalDecisionEngine from "./LocalDecisionEngine";
import LayaDecisionEngine, { LayaUnavailableError } from "./LayaDecisionEngine";
import { validateDecisionRequest } from "./decisionSchemas";

export { LayaUnavailableError };

export function isLayaFlagEnabled() {
  return (import.meta.env.VITE_ENABLE_LAYA_DECISIONS ?? "false") === "true";
}

// Queries that must use the efficient path — Laya adds nothing here.
const SIMPLE_QUERY_PATTERNS = [
  /^\s*what is (rice|tomato|paddy|wheat|maize|cotton|onion|potato|chilli|banana|mango)\??\s*$/i,
  /^\s*when is paddy harvested\??\s*$/i,
  /^\s*what is drip irrigation\??\s*$/i,
];

/**
 * True when a query is ambiguous enough that structured decision-making helps:
 * unknown intent, missing crop/symptom on a disease query, or zero KB hits.
 * Pure helper — exported for tests/benchmarks.
 */
export function isAmbiguousQuery(question, { parsed = null, evidenceCount = null } = {}) {
  const q = String(question || "");
  if (!q.trim()) return true;
  if (SIMPLE_QUERY_PATTERNS.some((re) => re.test(q))) return false;
  let p = parsed;
  try {
    p = p || parseQuery(q);
  } catch {
    return true;
  }
  if (!p || p.intent === "unknown") return true;
  // Meta intents never need structured decisions.
  if (p.intent === "greeting" || p.intent === "help" || p.intent === "about") return false;
  if (p.intent === "disease" && (!p.crop || !p.symptom)) return true;
  // Definitions and treatment advice need at least the crop; symptoms are only
  // required for disease diagnosis. With a recognized crop the local KB can
  // answer directly, so no structured decision is needed even on zero hits.
  if (p.intent === "what_is" || p.intent === "treatment") {
    return !p.crop;
  }
  if (!p.crop && q.trim().split(/\s+/).length > 6) return true;
  if (evidenceCount === null) {
    try {
      const hits = fastSearch(q, { limit: 3 });
      if (!hits.records || hits.records.length === 0) return true;
    } catch {
      return true;
    }
  } else if (evidenceCount === 0) return true;
  return false;
}

export function shouldInvokeLaya({ task, question, state = {} } = {}) {
  if (!isLayaFlagEnabled()) return false;
  try {
    validateDecisionRequest({ task, state });
  } catch {
    return false;
  }
  if (getConnectivityState() === CONNECTIVITY_STATES.OFFLINE) return false;
  const q = String(question ?? state.query ?? state.text ?? "");
  return isAmbiguousQuery(q, { parsed: state.parsed || null });
}

const DecisionEngine = {
  name: "decision-engine",
  /**
   * @returns {Promise<{...normalized decision, engine: string ("local"|"laya-*"), fallback: boolean|null}>}
   */
  async decide({ task, state = {}, candidates = [], evidence = [], question = "" } = {}) {
    validateDecisionRequest({ task, state, candidates, evidence });
    const q = String(question || state.query || state.text || "");
    if (shouldInvokeLaya({ task, question: q, state })) {
      try {
        const via = await LayaDecisionEngine.decide({ task, state, candidates, evidence });
        return { ...via, engine: via.engine || "laya", fallback: false };
      } catch (err) {
        // Silent fallback — never surface model-infra errors to the farmer.
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[DecisionEngine] Laya failed, using local fallback:", err?.message || err);
        }
      }
    }
    const local = await LocalDecisionEngine.decide({ task, state, candidates, evidence });
    return { ...local, engine: "local", fallback: isLayaFlagEnabled() ? null : false };
  },
};

export default DecisionEngine;
