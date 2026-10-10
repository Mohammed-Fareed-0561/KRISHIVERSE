/**
 * eval/mobile-ai/schemas.js — benchmark record schemas for the Rice mobile AI
 * benchmark & architecture study (isolated; never imported by farmer runtime).
 *
 * Every benchmark result file MUST validate against `validateBenchmarkResult`:
 * - reproducibility block (git SHA, dataset/model/KB hashes, runtime, device)
 * - dataClass: always "benchmark-evaluation" — NEVER production telemetry,
 *   NEVER live farmer accuracy
 * - explicit `limitations` array so unmeasured things are stated, not implied
 * - arm records must be one of: measured | skipped | not-applicable
 *
 * Pure ESM, zero dependencies.
 */

import { createHash } from "node:crypto";

export const DATA_CLASS = Object.freeze("benchmark-evaluation");
export const PROHIBITED_DATA_CLASS = Object.freeze(["production-telemetry", "live-farmer-accuracy"]);

export const ARM_STATES = Object.freeze(["measured", "skipped", "not-applicable"]);

export const RECOMMENDATIONS = Object.freeze([
  "ADOPT",
  "PILOT",
  "KEEP AS FALLBACK",
  "REJECT",
  "NEEDS MORE DATA",
]);

export const TASKS = Object.freeze([
  "language-identification",
  "intent-classification",
  "crop-extraction",
  "disease-extraction",
  "symptom-extraction",
  "plant-part-extraction",
  "farmer-context-extraction",
  "query-normalization",
  "kb-retrieval",
  "clarification-selection",
  "answer-generation",
  "grounding",
  "safety",
  "unknown-query-handling",
]);

function assert(cond, msg) {
  if (!cond) {
    const err = new Error(`mobile-ai schema: ${msg}`);
    err.code = "INVALID_BENCHMARK_RECORD";
    throw err;
  }
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Reproducibility block present on every benchmark result. */
export function validateRunMeta(meta) {
  assert(meta && typeof meta === "object", "runMeta required");
  for (const key of ["benchmarkId", "date", "gitCommit", "runtime"]) {
    assert(typeof meta[key] === "string" && meta[key].length > 0, `runMeta.${key} required`);
  }
  assert(meta.configuration && typeof meta.configuration === "object",
    "runMeta.configuration required (object)");
  assert(meta.device && (typeof meta.device === "object" || typeof meta.device === "string"),
    "runMeta.device required (object with deviceClass or string)");
  assert(meta.datasetHashes && typeof meta.datasetHashes === "object", "runMeta.datasetHashes required");
  assert(typeof meta.seed === "number", "runMeta.seed required (number, even when not stochastic)");
  return true;
}

/** One arm (candidate configuration) inside a benchmark. */
export function validateArm(arm) {
  assert(arm && typeof arm === "object", "arm required");
  assert(typeof arm.id === "string" && arm.id.length > 0, "arm.id required");
  assert(typeof arm.label === "string", "arm.label required");
  assert(ARM_STATES.includes(arm.state), `arm.state must be one of ${ARM_STATES.join("|")}`);
  if (arm.state === "measured") {
    assert(arm.metrics && typeof arm.metrics === "object", `arm ${arm.id}: metrics required when measured`);
    assert(arm.latencyMs !== undefined && (typeof arm.latencyMs === "object" || arm.latencyMs === null),
      `arm ${arm.id}: latencyMs must be object|null`);
  }
  if (arm.state !== "measured") {
    assert(typeof arm.skipReason === "string" && arm.skipReason.length > 0,
      `arm ${arm.id}: skipReason required when not measured`);
  }
  if (arm.howToRun !== undefined) assert(typeof arm.howToRun === "string", `arm ${arm.id}: howToRun must be a string`);
  return true;
}

export function validateBenchmarkResult(result) {
  assert(result && typeof result === "object", "result must be an object");
  assert(result.dataClass === DATA_CLASS,
    `dataClass must be "${DATA_CLASS}" (never ${PROHIBITED_DATA_CLASS.join("/")})`);
  validateRunMeta(result.runMeta);
  assert(typeof result.title === "string" && result.title.length > 0, "title required");
  assert(Array.isArray(result.arms) && result.arms.length > 0, "arms array required");
  result.arms.forEach(validateArm);
  assert(Array.isArray(result.limitations), "limitations array required (empty only if truly none)");
  assert(result.dataset && typeof result.dataset === "object", "dataset block required");
  assert(typeof result.dataset.origin === "string", "dataset.origin required (provenance honesty)");
  if (result.taskBreakdown !== undefined) {
    assert(result.taskBreakdown && typeof result.taskBreakdown === "object", "taskBreakdown must be object");
  }
  return true;
}

/** Decision-matrix row: unknown measurements must be null, never invented. */
export function validateDecisionRow(row) {
  assert(row && typeof row === "object", "decision row required");
  assert(typeof row.technology === "string", "technology required");
  assert(typeof row.role === "string", "role required");
  assert(RECOMMENDATIONS.includes(row.recommendation), `recommendation must be one of ${RECOMMENDATIONS.join("|")}`);
  for (const field of ["quality", "tamil", "tanglish", "latency", "ram", "size", "offline", "safety"]) {
    assert(field in row, `row.${field} required (use null when not measured)`);
    const v = row[field];
    assert(v === null || typeof v === "string", `row.${field} must be string|null`);
  }
  assert(typeof row.evidence === "string", "row.evidence must cite the result file or 'not measured'");
  return true;
}

export function validateDecisionMatrix(matrix) {
  assert(matrix && typeof matrix === "object", "matrix required");
  assert(matrix.dataClass === DATA_CLASS, "matrix dataClass must be benchmark-evaluation");
  assert(Array.isArray(matrix.rows) && matrix.rows.length > 0, "matrix.rows required");
  matrix.rows.forEach(validateDecisionRow);
  return true;
}
