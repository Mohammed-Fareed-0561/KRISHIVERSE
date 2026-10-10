import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_WEIGHTS,
  computeConfidence,
  classifyRecommendationType,
  extractHighRiskClaims,
  buildClarification,
  validateResponse,
  SAFE_LIMITATION_MESSAGE,
} from "./ResponseValidator";

describe("ResponseValidator", () => {
  describe("classifyRecommendationType", () => {
    it("classifies informational text", () => {
      expect(classifyRecommendationType("Rice is a staple crop grown in Tamil Nadu.")).toBe("informational");
      expect(classifyRecommendationType("PM Kisan gives Rs 6000 per year.")).toBe("informational");
    });

    it("classifies recommendations without specific doses", () => {
      expect(classifyRecommendationType("Try neem oil spray and improve drainage.")).toBe("recommendation");
    });

    it("classifies high-risk claims (exact doses / chemicals / intervals)", () => {
      expect(classifyRecommendationType("Spray Mancozeb 2.5g per litre of water.")).toBe("high_risk");
      expect(classifyRecommendationType("Apply Urea at 120 kg per hectare.")).toBe("high_risk");
      expect(classifyRecommendationType("Stop spraying 14 days before harvest.")).toBe("high_risk");
      expect(classifyRecommendationType("Use an insecticide for control.")).toBe("high_risk");
    });
  });

  describe("extractHighRiskClaims", () => {
    it("returns matched dose/chemical claims", () => {
      const claims = extractHighRiskClaims("Spray Carbendazim 1g per litre. Wait 10 days before harvest.");
      expect(claims.length).toBeGreaterThan(0);
      expect(claims.some((c) => c.includes("1g"))).toBe(true);
    });

    it("returns no claims for informational text", () => {
      expect(extractHighRiskClaims("Tomato grows well in warm weather.")).toEqual([]);
    });
  });

  describe("computeConfidence", () => {
    it("documents weights that sum to 1.0", () => {
      const total = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });

    it("maps scores to the confidence ladder", () => {
      expect(computeConfidence({ retrievalScore: 1, cropMatch: true, intentMatch: true, metadataMatch: true, sourceVerified: true, sourcePriority: 8, recordCount: 5 }).level).toBe("HIGH");
      expect(computeConfidence({ retrievalScore: 0.5, cropMatch: true, intentMatch: true, metadataMatch: true, sourceVerified: true, recordCount: 3 }).level).toBe("MEDIUM");
      expect(computeConfidence({ retrievalScore: 0.4, cropMatch: true, metadataMatch: true, recordCount: 1 }).level).toBe("LOW");
      expect(computeConfidence({}).level).toBe("VERY_LOW");
    });

    it("applies a contradiction penalty", () => {
      const base = computeConfidence({ retrievalScore: 1, cropMatch: true, intentMatch: true, metadataMatch: true, sourceVerified: true, sourcePriority: 8, recordCount: 5 });
      const withContradiction = computeConfidence({ retrievalScore: 1, cropMatch: true, intentMatch: true, metadataMatch: true, sourceVerified: true, sourcePriority: 8, recordCount: 5, contradictionDetected: true });
      expect(withContradiction.score).toBeLessThan(base.score);
    });
  });

  describe("buildClarification", () => {
    it("asks for the crop when missing", () => {
      const c = buildClarification({ parsed: {}, intent: "disease" });
      expect(c.question).toContain("crop");
      expect(c.options).toContain("Tomato");
    });

    it("asks for symptoms when crop known but symptom missing", () => {
      const c = buildClarification({ parsed: { crop: "tomato" }, intent: "disease" });
      expect(c.question).toContain("seeing");
      expect(c.options).toContain("Brown spots");
    });

    it("asks which fertilizer for fertilizer intent", () => {
      const c = buildClarification({ parsed: { crop: "paddy" }, intent: "fertilizer" });
      expect(c.options).toContain("Urea (Nitrogen)");
    });
  });

  describe("validateResponse", () => {
    it("blocks an unverified exact dosage", () => {
      const result = validateResponse({
        answer: "Spray Mancozeb 2.5g per litre of water.",
        source: "groq",
        confidence: 0.8,
        evidence: [{ id: "treatment_0", name: "Generic treatment" }],
        parsed: { crop: "tomato", symptom: "blight" },
        intent: "disease",
      });
      expect(result.verdict).toBe("blocked");
      expect(result.safeAnswer).toContain("can't safely give");
      expect(result.clarification).toBeTruthy();
      expect(result.reasons).toContain("high_risk_without_verified_source");
    });

    it("blocks a Groq answer that invents fertilizer dosage without backing", () => {
      const result = validateResponse({
        answer: "Apply DAP at 200 kg per hectare for paddy.",
        source: "groq-online",
        confidence: 0.72,
        evidence: [{ id: "crop_0", name: "Rice" }],
        parsed: { crop: "rice" },
        intent: "fertilizer",
      });
      expect(result.verdict).toBe("blocked");
      expect(result.safeAnswer).toBe(SAFE_LIMITATION_MESSAGE);
    });

    it("allows a high-risk dosage when an explicitly verified record backs it", () => {
      const result = validateResponse({
        answer: "Spray Copper Oxychloride 3g per litre of water.",
        confidence: 0.88,
        records: [{ id: "tr_tomato_blight_chem", name: "Copper Oxychloride", method: "Spray 3g per litre", verified: true }],
        evidence: [],
        parsed: { crop: "tomato", symptom: "blight" },
        intent: "disease",
      });
      expect(result.verdict).toBe("safe");
      expect(result.level).toBe("HIGH");
    });

    it("allows a high-risk dosage when a TNAU-sourced record backs it", () => {
      const result = validateResponse({
        answer: "Spray Copper Oxychloride 3g per litre.",
        confidence: 0.8,
        // KB treatment records carry the dose in `method` (content backing).
        evidence: [{ id: "t1", name: "Copper Oxychloride", source: "TNAU", method: "Copper Oxychloride (3g/L) spray." }],
        parsed: { crop: "tomato" },
        intent: "disease",
      });
      expect(result.verdict).toBe("safe");
    });

    it("returns a cautious answer at LOW confidence", () => {
      const result = validateResponse({
        answer: "Try neem oil spray.",
        confidence: 0.4,
        evidence: [{ id: "d1", name: "Neem oil" }],
        parsed: { crop: "tomato" },
        intent: "disease",
      });
      expect(result.verdict).toBe("cautious");
      expect(result.level).toBe("LOW");
      expect(result.safeAnswer).toContain("verify this guidance");
    });

    it("blocks a very-low-confidence non-informational answer", () => {
      const result = validateResponse({
        answer: "Apply Urea at 120 kg per hectare.",
        confidence: 0.1,
        evidence: [],
        parsed: {},
        intent: "unknown",
      });
      expect(result.verdict).toBe("blocked");
    });

    it("always passes informational answers even with no evidence", () => {
      const result = validateResponse({
        answer: "Rice is a staple crop grown in Tamil Nadu.",
        confidence: 0,
        records: [],
        evidence: [],
        parsed: {},
        intent: "unknown",
      });
      expect(result.verdict).toBe("safe");
    });

    it("returns safe MEDIUM/HIGH recommendation when verified", () => {
      const result = validateResponse({
        answer: "Improve drainage and rotate crops to prevent soil-borne disease.",
        confidence: 0.6,
        records: [{ id: "tr_x", name: "Crop rotation", verified: true }],
        evidence: [{ id: "dp_tomato_x", name: "Root rot", crop: "tomato" }],
        parsed: { crop: "tomato", symptom: "root rot" },
        intent: "disease",
      });
      expect(result.verdict).toBe("safe");
      expect(["HIGH", "MEDIUM"]).toContain(result.level);
    });
  });

  describe("Phase 2: plant-noun precision (no weakening)", () => {
    it("classifies bare plant-noun queries as informational", () => {
      expect(classifyRecommendationType("What is a plant?")).toBe("informational");
      expect(classifyRecommendationType("Tell me about plants.")).toBe("informational");
    });
    it("still classifies planting advice as recommendation", () => {
      expect(classifyRecommendationType("When to start planting seeds?")).toBe("recommendation");
      expect(classifyRecommendationType("Spray neem oil on leaves.")).toBe("recommendation");
    });
    it("does not block informational plant answers", () => {
      const v = validateResponse({
        answer: "A plant is a living organism that grows in soil and needs water and sunlight.",
        source: "local-knowledge-base", evidence: [],
      });
      expect(v.verdict).not.toBe("blocked");
    });
  });

  describe("Phase 2: Tamil/Hindi dosage units block like English", () => {
    it("blocks Tamil chemical dosage without verified backing", () => {
      const v = validateResponse({
        answer: "காப்பர் ஆக்ஸிகுளோரைடு (3கி/லி) தெளிக்கவும்.",
        source: "local-knowledge-base", evidence: [],
      });
      expect(v.type).toBe("high_risk");
      expect(v.verdict).toBe("blocked");
    });
    it("blocks Hindi chemical dosage without verified backing", () => {
      const v = validateResponse({
        answer: "कॉपर ऑक्सीक्लोराइड (3 ग्राम / लीटर) स्प्रे करें।",
        source: "local-knowledge-base", evidence: [],
      });
      expect(v.type).toBe("high_risk");
      expect(v.verdict).toBe("blocked");
    });
  });

  describe("Phase 3E.3: dose/schedule content backing (rice wrong-dose regression)", () => {
    const riceEvidence = [{
      id: "tnau_rice_blast_treatment",
      cropId: "crop_rice",
      verified: true,
      source: "TNAU",
      sourceUrl: "https://agritech.tnau.ac.in",
      text: "Tricyclazole 75% WP @ 1g/liter for rice blast",
    }];

    it("REGRESSION: verified rice evidence must not authorize a different dose number", () => {
      const v = validateResponse({
        answer: "Apply Mancozeb 75% WP at 2 g per liter of water on rice every week.",
        source: "eval",
        records: riceEvidence,
        evidence: riceEvidence,
        parsed: { crop: "rice" },
        intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.safeAnswer).toContain("can't safely give");
      expect(v.reasons.join(" ")).toContain("dose_not_backed_by_evidence:2g");
      expect(v.reasons.join(" ")).toContain("dose_contradicts_evidence:2g");
    });

    it("allows the exact dose the evidence contains (content + crop + provenance)", () => {
      const v = validateResponse({
        answer: "For rice blast, TNAU recommends Tricyclazole 75% WP at 1 g per liter of water.",
        source: "eval",
        records: riceEvidence,
        evidence: riceEvidence,
        parsed: { crop: "rice" },
        intent: "disease",
      });
      expect(v.verdict).toBe("safe");
    });

    it("wrong crop: rice evidence never authorizes a tomato dose (identical number)", () => {
      const v = validateResponse({
        answer: "Spray Tricyclazole 75% WP at 1 g per liter on tomato.",
        source: "eval",
        records: riceEvidence,
        evidence: riceEvidence,
        parsed: { crop: "tomato" },
        intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.reasons).toContain("high_risk_verified_evidence_crop_ineligible");
    });

    it("missing crop + crop-declaring evidence blocks; crop-agnostic evidence can back", () => {
      const cropless = validateResponse({
        answer: "Spray Tricyclazole 75% WP at 1 g per liter.",
        source: "eval", records: riceEvidence, evidence: riceEvidence,
        parsed: {}, intent: "disease",
      });
      expect(cropless.verdict).toBe("blocked");

      const agnostic = validateResponse({
        answer: "Spray Copper Oxychloride 3g per litre.",
        source: "eval",
        confidence: 0.8,
        records: [{ id: "gen", source: "TNAU", method: "Copper Oxychloride (3g/L) spray." }],
        evidence: [], parsed: {}, intent: "disease",
      });
      expect(agnostic.verdict).not.toBe("blocked"); // crop-agnostic + content-backed
      expect(agnostic.verdict).toBe("safe");
    });

    it("verified record without the dose number cannot back it (unsupported dosage)", () => {
      const v = validateResponse({
        answer: "Spray Copper Oxychloride 3g per litre.",
        source: "eval",
        evidence: [{ id: "t1", name: "Copper Oxychloride", source: "TNAU" }],
        parsed: { crop: "tomato" }, intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.reasons.join(" ")).toContain("dose_not_backed_by_evidence:3g");
    });

    it("unsupported numeric agricultural claim (%/yield) blocks without backing", () => {
      const v = validateResponse({
        answer: "Rice blast reduces yield by 40 percent in every affected field.",
        source: "eval", records: riceEvidence, evidence: riceEvidence,
        parsed: { crop: "rice" }, intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.reasons.join(" ")).toContain("dose_not_backed_by_evidence:40%");
    });

    it("unsupported spray schedule blocks even with verified backing", () => {
      const v = validateResponse({
        answer: "Spray neem oil on rice every 7 days.",
        source: "eval",
        records: [{ id: "tr", cropId: "crop_rice", verified: true, method: "Neem oil spray at tillering." }],
        evidence: [], parsed: { crop: "rice" }, intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.reasons.join(" ")).toContain("spray_schedule_not_backed_by_evidence");
    });

    it("schedule present in evidence is backed", () => {
      const v = validateResponse({
        answer: "Repeat the spray after 15 days.",
        source: "eval",
        records: [{ id: "tr", cropId: "crop_rice", verified: true, method: "Spray at tillering; repeat after 15 days." }],
        evidence: [], parsed: { crop: "rice" }, intent: "disease",
      });
      expect(v.verdict).not.toBe("blocked");
    });

    it("insufficient evidence → blocked safe limitation WITH clarification (abstain)", () => {
      const v = validateResponse({
        answer: "Apply 5 g per liter.",
        source: "eval", records: [], evidence: [],
        parsed: { crop: "rice" }, intent: "disease",
      });
      expect(v.verdict).toBe("blocked");
      expect(v.safeAnswer).toContain("can't safely give");
      expect(v.clarification).toBeTruthy();
    });

    it("informational answers without schedules are untouched", () => {
      const v = validateResponse({
        answer: "Rice is grown across the Cauvery delta.",
        source: "local-knowledge-base", evidence: [],
      });
      expect(v.verdict).toBe("safe");
    });
  });
});