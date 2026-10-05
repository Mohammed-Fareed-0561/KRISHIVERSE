/** eval/schemas.test.js — schemas accept valid cases, reject bad ones. */
import { describe, it, expect } from "vitest";
import { validateCase, validateCaseList, isGroundTruth } from "./schemas.js";
import { SCREENING_CASES, SCREENING_SUMMARY } from "./cases.screening.js";

describe("eval schemas", () => {
  it("accepts one valid case of each type", () => {
    for (const c of SCREENING_CASES.slice(0, 6)) expect(validateCase(c)).toBe(true);
  });
  it("rejects missing origin (provenance is structural)", () => {
    expect(() => validateCase({ id: "x", type: "intent", language: "en", input: "q", difficulty: "easy", expected: { intent: "disease" } })).toThrow();
  });
  it("rejects unknown language", () => {
    expect(() => validateCase({ id: "x", type: "intent", origin: "synthetic-screening", language: "te", input: "q", difficulty: "easy", expected: { intent: "disease" } })).toThrow();
  });
  it("rejects duplicate ids", () => {
    const a = { id: "dup", type: "intent", origin: "synthetic-screening", language: "en", input: "q", difficulty: "easy", expected: { intent: "disease" } };
    expect(() => validateCaseList([a, { ...a }])).toThrow();
  });
  it("rejects fabricated recordIds (empty)", () => {
    expect(() => validateCase({ id: "x", type: "rag", origin: "synthetic-screening", language: "en", input: "q", difficulty: "easy", expected: { recordIds: [] } })).toThrow();
  });
  it("screening registry validates and declares zero ground truth", () => {
    expect(validateCaseList(SCREENING_CASES)).toBe(true);
    expect(SCREENING_SUMMARY.total).toBe(SCREENING_CASES.length);
    expect(SCREENING_SUMMARY.groundTruth).toBe(0);
    expect(SCREENING_CASES.every((c) => !isGroundTruth(c))).toBe(true);
  });
});
