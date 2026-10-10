/**
 * eval/mobile-ai/schemas.test.js — unit tests for the benchmark record schemas.
 */
import { describe, it, expect } from "vitest";
import {
  validateBenchmarkResult, validateDecisionMatrix, validateRunMeta, sha256, DATA_CLASS, RECOMMENDATIONS,
} from "./schemas.js";

const goodMeta = {
  benchmarkId: "x-v1", date: "2026-10-08T00:00:00.000Z", gitCommit: "abc", runtime: "node 22",
  device: { deviceClass: "desktop-reference" }, configuration: { seed: 1 },
  datasetHashes: { "a.js": sha256("a") }, seed: 1,
};

const goodResult = {
  dataClass: DATA_CLASS, title: "t", runMeta: goodMeta,
  dataset: { origin: "synthetic-screening" },
  arms: [{ id: "a", label: "A", state: "measured", metrics: { n: 1 }, latencyMs: { avg: 1 } }],
  limitations: ["none"],
};

describe("mobile-ai schemas", () => {
  it("accepts a well-formed benchmark result", () => {
    expect(validateBenchmarkResult(goodResult)).toBe(true);
  });

  it("rejects production-telemetry classification", () => {
    expect(() => validateBenchmarkResult({ ...goodResult, dataClass: "production-telemetry" }))
      .toThrow(/dataClass/);
  });

  it("rejects missing reproducibility fields", () => {
    const { gitCommit, ...rest } = goodMeta;
    expect(() => validateRunMeta({ ...rest })).toThrow(/gitCommit/);
    expect(() => validateRunMeta({ ...goodMeta, seed: "one" })).toThrow(/seed/);
  });

  it("requires skipReason for non-measured arms and metrics for measured arms", () => {
    expect(() => validateBenchmarkResult({
      ...goodResult,
      arms: [{ id: "b", label: "B", state: "skipped" }],
    })).toThrow(/skipReason/);
    expect(() => validateBenchmarkResult({
      ...goodResult,
      arms: [{ id: "b", label: "B", state: "measured", latencyMs: null }],
    })).toThrow(/metrics/);
  });

  it("requires honest decision rows and a fixed recommendation vocabulary", () => {
    expect(() => validateDecisionMatrix({
      dataClass: DATA_CLASS,
      rows: [{ technology: "t", role: "r", quality: null, tamil: null, tanglish: null, latency: null,
        ram: null, size: null, offline: null, safety: null, recommendation: "MAYBE", evidence: "x" }],
    })).toThrow(/recommendation/);
    expect(RECOMMENDATIONS).toContain("NEEDS MORE DATA");
    expect(validateDecisionMatrix({
      dataClass: DATA_CLASS,
      rows: [{ technology: "t", role: "r", quality: null, tamil: null, tanglish: null, latency: null,
        ram: null, size: null, offline: null, safety: null, recommendation: "PILOT", evidence: "results/x.json" }],
    })).toBe(true);
  });
});
