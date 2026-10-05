/**
 * decision/index.js — public surface of the decision layer.
 *
 * Only this module is imported by aiRouter and UI code. Raw Laya shapes
 * never leave the decision/ directory (see decisionSchemas.normalizeDecision).
 */
export { default as DecisionEngine, shouldInvokeLaya, isAmbiguousQuery, isLayaFlagEnabled } from "./DecisionEngine";
export { default as LocalDecisionEngine } from "./LocalDecisionEngine";
export { default as LayaDecisionEngine, LayaUnavailableError } from "./LayaDecisionEngine";
export { ALLOWED_TASKS, validateDecisionRequest, normalizeDecision } from "./decisionSchemas";
