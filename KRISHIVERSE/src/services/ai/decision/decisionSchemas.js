/**
 * decisionSchemas.js
 *
 * Shared contract for the KrishiVerse decision layer (Laya + local fallback).
 *
 * Laya is an OPTIONAL structured-decision engine — never the chatbot, never RAG,
 * never the answer generator. Every engine (local or Laya-backed) returns the
 * SAME normalized shape so the rest of the app never sees raw model output.
 *
 * Allowed tasks (Phase 9):
 *   - intent_classification
 *   - clarification
 *   - candidate_selection
 */

export const ALLOWED_TASKS = Object.freeze([
  "intent_classification",
  "clarification",
  "candidate_selection",
]);

export const DECISION_VERSION = "laya-decision-v1";

export function isAllowedTask(task) {
  return ALLOWED_TASKS.includes(task);
}

/**
 * Validate a decision request. Throws a 400-style Error on invalid input so
 * both the frontend orchestrator and the backend route share one policy.
 */
export function validateDecisionRequest({ task, state, candidates, evidence } = {}) {
  if (!isAllowedTask(task)) {
    const err = new Error(
      `Unsupported decision task "${task}". Allowed: ${ALLOWED_TASKS.join(", ")}`,
    );
    err.status = 400;
    err.code = "INVALID_TASK";
    throw err;
  }
  if (state !== undefined && (typeof state !== "object" || state === null)) {
    const err = new Error("Decision `state` must be an object when provided.");
    err.status = 400;
    err.code = "INVALID_STATE";
    throw err;
  }
  if (candidates !== undefined && !Array.isArray(candidates)) {
    const err = new Error("Decision `candidates` must be an array when provided.");
    err.status = 400;
    err.code = "INVALID_CANDIDATES";
    throw err;
  }
  if (evidence !== undefined && !Array.isArray(evidence)) {
    const err = new Error("Decision `evidence` must be an array when provided.");
    err.status = 400;
    err.code = "INVALID_EVIDENCE";
    throw err;
  }
  return true;
}

/**
 * Normalize any engine output into the single app-level decision shape.
 * Never spreads raw Laya fields into the app — unknown fields are dropped.
 *
 * @returns {{
 *   version: string, task: string, decision: unknown,
 *   confidence: number|null, needsClarification: boolean,
 *   clarification: { question: string, options: string[] }|null,
 *   engine: string, rawConfidences: undefined
 * }}
 */
export function normalizeDecision({ task, decision, confidence = null, needsClarification = false, clarification = null, engine = "unknown" } = {}) {
  validateDecisionRequest({ task });
  const conf = typeof confidence === "number" && Number.isFinite(confidence)
    ? Math.min(1, Math.max(0, confidence))
    : null;
  return {
    version: DECISION_VERSION,
    task,
    decision,
    confidence: conf,
    // Laya/model confidence is routing confidence only — NEVER agricultural
    // factual confidence. ResponseValidator remains the final authority and
    // must re-check every answer (see docs/laya-integration.md).
    needsClarification: Boolean(needsClarification),
    clarification: clarification && clarification.question
      ? { question: String(clarification.question), options: Array.isArray(clarification.options) ? clarification.options.map(String).slice(0, 6) : [] }
      : null,
    engine: String(engine),
  };
}
