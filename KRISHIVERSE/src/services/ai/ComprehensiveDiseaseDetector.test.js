/**
 * ComprehensiveDiseaseDetector.test.js — Phase 3A unknown-crop abstention.
 * An explicitly named but unrecognized crop must yield no cross-crop guesses.
 */
import { describe, it, expect } from "vitest";
import Detector from "./ComprehensiveDiseaseDetector.js";

describe("unknown-crop abstention", () => {
  it("returns no matches for an unrecognized explicit crop", () => {
    expect(Detector.detect("spots on leaves", "dragonfruit", "en")).toEqual([]);
  });
  it("still searches when no crop hint is given", () => {
    const out = Detector.detect("rice leaves with diamond spots gray center", "", "en");
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].disease.id).toBe("rice_blast");
  });
  it("still matches a recognized explicit crop", () => {
    const out = Detector.detect("yellow streaks stunted growth", "rice", "en");
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.disease.crop === "rice")).toBe(true);
  });
});
