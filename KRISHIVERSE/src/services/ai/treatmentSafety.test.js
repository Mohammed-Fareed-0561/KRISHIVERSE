// Verified-treatment safety policy for the Crop Doctor diagnosis flow.
// - Metalaxyl-M / any unsourced dosage cannot reach the UI.
// - A dosage may be shown ONLY when a KB record is fully verified
//   (verified === true AND source AND sourceUrl).
// - Non-chemical dosage-free guidance is kept.
// - Uses the ResponseValidator's HIGH_RISK_PATTERNS (same classification as chat).
import { describe, it, expect } from "vitest";
import {
  VERIFIED_TREATMENT_UNAVAILABLE,
  isFullyVerified,
  hasHighRiskDosage,
  sanitizeTreatmentList,
  sanitizeRecommendations,
} from "./treatmentSafety";

const METALAXYL = "Spray Metalaxyl-M 8% WP @ 2g/L";
const MANCOZEB = "Apply Mancozeb 75% WP @ 2g/L";
const VERIFIED = { id: "tr_x", verified: true, source: "TNAU", sourceUrl: "https://tnau.ac.in/tech" };

describe("isFullyVerified (provenance gate)", () => {
  it("requires verified flag + source + sourceUrl together", () => {
    expect(isFullyVerified(VERIFIED)).toBe(true);
    expect(isFullyVerified({ ...VERIFIED, verified: false })).toBe(false);
    expect(isFullyVerified({ ...VERIFIED, source: "" })).toBe(false);
    expect(isFullyVerified({ ...VERIFIED, sourceUrl: undefined })).toBe(false);
    expect(isFullyVerified({ verified: true })).toBe(false);
    expect(isFullyVerified(null)).toBe(false);
  });
});

describe("hasHighRiskDosage", () => {
  it("flags exact chemical/fertilizer/pesticide dosages", () => {
    expect(hasHighRiskDosage(METALAXYL)).toBe(true);
    expect(hasHighRiskDosage(MANCOZEB)).toBe(true);
    expect(hasHighRiskDosage("Spray Imidacloprid 17.8% SL @ 0.3ml/L")).toBe(true);
    expect(hasHighRiskDosage("Use neem oil (10000 ppm) at 2ml/L water")).toBe(true);
  });

  it("does not flag dosage-free guidance", () => {
    expect(hasHighRiskDosage("Improve airflow and remove infected plants")).toBe(false);
    expect(hasHighRiskDosage("Maintain proper field drainage")).toBe(false);
  });
});

describe("sanitizeTreatmentList", () => {
  it("blocks unsourced dosage — Metalaxyl cannot reach the UI", () => {
    const { kept, blocked } = sanitizeTreatmentList([METALAXYL]);
    expect(kept.length).toBe(0);
    expect(blocked).toEqual([METALAXYL]);
  });

  it("blocks a dosage even when verified is set but provenance is missing", () => {
    const { kept } = sanitizeTreatmentList([METALAXYL], { backing: [{ verified: true }] });
    expect(kept.length).toBe(0);
    const { kept: kept2 } = sanitizeTreatmentList([METALAXYL], { backing: [{ source: "TNAU" }] });
    expect(kept2.length).toBe(0);
  });

  it("allows a dosage only when a fully-verified record backs it", () => {
    const { kept } = sanitizeTreatmentList([METALAXYL], { backing: [VERIFIED] });
    expect(kept).toEqual([METALAXYL]);
  });

  it("keeps non-chemical dosage-free guidance", () => {
    const { kept, blocked } = sanitizeTreatmentList([
      "Remove infected plants",
      "Improve drainage and air flow",
      METALAXYL,
    ]);
    expect(kept).toEqual(["Remove infected plants", "Improve drainage and air flow"]);
    expect(blocked).toEqual([METALAXYL]);
  });
});

describe("sanitizeRecommendations", () => {
  it("replaces emptied chemical section with the safe verification message", () => {
    const out = sanitizeRecommendations({
      immediate: "Remove infected leaves",
      natural: ["Remove infected leaves"],
      chemical: [METALAXYL, MANCOZEB],
    });
    expect(out.chemical).toEqual([VERIFIED_TREATMENT_UNAVAILABLE]);
    expect(out.natural).toEqual(["Remove infected leaves"]);
    expect(out.chemical.join(" ")).not.toContain("Metalaxyl");
    expect(out.chemical.join(" ")).not.toContain("2g/L");
  });

  it("keeps a fully-verified dosage in place", () => {
    const out = sanitizeRecommendations(
      { immediate: "x", natural: [], chemical: [METALAXYL] },
      { backing: [VERIFIED] }
    );
    expect(out.chemical).toEqual([METALAXYL]);
  });

  it("handles a missing recommendations object safely", () => {
    const out = sanitizeRecommendations(null);
    expect(out.chemical).toEqual([VERIFIED_TREATMENT_UNAVAILABLE]);
    expect(out.natural).toEqual([VERIFIED_TREATMENT_UNAVAILABLE]);
  });
});
