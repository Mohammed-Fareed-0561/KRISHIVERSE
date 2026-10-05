import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  softmax,
  topK,
  bilinearResize,
  centerCropRgba,
  rgbaToChwNormalized,
  diseaseInfoToResult,
  diagnoseFromFile,
  validateImageFile,
  assessImageDimensions,
  DIAGNOSIS_STATES,
  KNOWN_MIN_TOP_PROBABILITY,
  CLASS_META,
} from "./onDeviceClassifier";
import { getDiseaseInfo, CROPS } from "../../data/comprehensiveDiseaseDB";
import { VERIFIED_TREATMENT_UNAVAILABLE } from "./treatmentSafety";

describe("onDeviceClassifier pure helpers", () => {
  it("softmax normalizes logits to probabilities summing to 1", () => {
    const probs = softmax([2.0, 1.0, 0.1]);
    expect(probs.length).toBe(3);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(probs[0]).toBeGreaterThan(probs[1]);
  });

  it("topK returns highest-probability classes with meta", () => {
    const top = topK([0.1, 0.7, 0.05, 0.1, 0.03, 0.02], 2);
    expect(top.length).toBe(2);
    expect(top[0].index).toBe(1);
    expect(top[0].cls).toBe("Tomato___Late_blight");
    expect(top[1].index).toBe(0);
  });

  it("topK honors probability ranking", () => {
    const top = topK([0.8, 0.1, 0.02, 0.03, 0.04, 0.01], 1);
    expect(top[0].index).toBe(0);
    expect(top[0].displayName).toBe("Tomato Early Blight");
  });

  it("bilinearResize preserves dimensions and is separable", () => {
    const w = 4, h = 4;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = i * 10; // red gradient
      rgba[i * 4 + 3] = 255;
    }
    const out = bilinearResize(rgba, w, h, 8, 8);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    // red channel monotonic-ish across the resized image
    expect(out.data[0]).toBeLessThan(out.data[7 * 8 * 4]);
  });

  it("centerCropRgba returns a square crop", () => {
    const size = 6;
    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) rgba[i * 4 + 2] = 77; // blue
    const crop = centerCropRgba(rgba, size, size, 4);
    expect(crop.width).toBe(4);
    expect(crop.height).toBe(4);
    expect(crop.data[2]).toBe(77);
  });

  it("rgbaToChwNormalized produces CHW Float32Array with /255 + normalization", () => {
    const size = 2;
    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4] = 0; // R
      rgba[i * 4 + 1] = 128; // G
      rgba[i * 4 + 2] = 255; // B
      rgba[i * 4 + 3] = 255;
    }
    const out = rgbaToChwNormalized(rgba, size, size, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
    expect(out.length).toBe(3 * size * size);
    expect(out[0]).toBeCloseTo((0 - 0.485) / 0.229, 5);
    expect(out[size * size]).toBeCloseTo((128 / 255 - 0.456) / 0.224, 5);
    expect(out[2 * size * size]).toBeCloseTo((1 - 0.406) / 0.225, 5);
  });

  it("CLASS_META has 6 classes matching the trained model", () => {
    expect(CLASS_META.length).toBe(6);
    expect(CLASS_META.map((m) => m.cls)).toContain("Tomato___Early_blight");
  });
});

describe("diseaseInfoToResult", () => {
  it("formats a known disease (tomato early blight)", () => {
    const meta = CLASS_META[0];
    const diseaseInfo = {
      name: "Tomato Early Blight",
      severity: "high",
      naturalTreatment: ["A", "B", "C", "D"],
      chemicalTreatment: ["X", "Y"],
      prevention: ["P1", "P2"],
    };
    const r = diseaseInfoToResult(meta, 0.92, diseaseInfo);
    expect(r.name).toBe("Tomato Early Blight");
    expect(r.confidence).toBe("92%");
    expect(r.crop).toBe("Tomato");
    expect(r.recommendations.natural).toHaveLength(3);
    expect(r.recommendations.chemical).toHaveLength(2);
    expect(r.onDeviceModel).toBe(true);
    expect(r.model).toBe("efficientnet-b0");
  });

  it("maps healthy class to healthy result", () => {
    const meta = CLASS_META[2]; // Tomato___healthy
    const r = diseaseInfoToResult(meta, 0.97, null);
    expect(r.name).toBe("Healthy Plant");
    expect(r.severity).toBe("Low");
  });

  it("falls back gracefully for classes without DB entries", () => {
    const meta = CLASS_META[3]; // Potato___Early_blight
    const r = diseaseInfoToResult(meta, 0.71, null);
    expect(r.name).toBe("Potato Early Blight");
    expect(r.recommendations.natural.length).toBeGreaterThan(0);
  });

  it("Crop Doctor safety: Metalaxyl-M dosage cannot reach the UI (no verified backing)", () => {
    const meta = CLASS_META[1]; // Tomato___Late_blight
    const diseaseInfo = getDiseaseInfo(CROPS.TOMATO, "tomato_late_blight");
    const r = diseaseInfoToResult(meta, 0.9, diseaseInfo);
    const chemicalText = (r.recommendations.chemical || []).join(" ");
    expect(chemicalText).not.toContain("Metalaxyl");
    expect(chemicalText).not.toContain("2g/L");
    expect(chemicalText).not.toContain("Mancozeb");
    expect(r.recommendations.chemical).toContain(VERIFIED_TREATMENT_UNAVAILABLE);
  });

  it("Crop Doctor safety: unsourced dosage is never displayed even with a disease match", () => {
    const meta = CLASS_META[0]; // Tomato___Early_blight
    const diseaseInfo = getDiseaseInfo(CROPS.TOMATO, "tomato_early_blight");
    const r = diseaseInfoToResult(meta, 0.92, diseaseInfo);
    const chemicalText = (r.recommendations.chemical || []).join(" ");
    expect(chemicalText).not.toContain("Mancozeb");
    expect(chemicalText).not.toContain("3g/L");
    expect(r.recommendations.chemical).toContain(VERIFIED_TREATMENT_UNAVAILABLE);
  });

  it("Crop Doctor safety: a fully-verified KB record MAY display the dosage", () => {
    const meta = CLASS_META[1]; // Tomato___Late_blight
    const diseaseInfo = getDiseaseInfo(CROPS.TOMATO, "tomato_late_blight");
    const backing = [
      { id: "tr_x", verified: true, source: "TNAU", sourceUrl: "https://tnau.ac.in/tech" },
    ];
    const r = diseaseInfoToResult(meta, 0.9, diseaseInfo, { backing });
    expect(r.recommendations.chemical.join(" ")).toContain("Metalaxyl");
  });

  it("Crop Doctor safety: dosage-free natural guidance is still provided", () => {
    const meta = CLASS_META[1]; // Tomato___Late_blight
    const diseaseInfo = getDiseaseInfo(CROPS.TOMATO, "tomato_late_blight");
    const r = diseaseInfoToResult(meta, 0.9, diseaseInfo);
    expect(r.recommendations.natural.length).toBeGreaterThan(0);
    expect(r.recommendations.natural.join(" ")).not.toContain("copper fungicide");
  });
});

describe("diagnosis states (Phase 3A contract)", () => {
  const info = { name: "Tomato Early Blight", severity: "high", naturalTreatment: ["A"], chemicalTreatment: [], prevention: [] };
  it("marks backed confident results KNOWN_DIAGNOSIS", () => {
    const r = diseaseInfoToResult(CLASS_META[0], 0.92, info);
    expect(r.state).toBe(DIAGNOSIS_STATES.KNOWN_DIAGNOSIS);
    expect(r.unverified).toBe(false);
  });
  it("marks unbacked classes POSSIBLE_DIAGNOSIS, never KNOWN", () => {
    const r = diseaseInfoToResult(CLASS_META[3], 0.71, null);
    expect(r.state).toBe(DIAGNOSIS_STATES.POSSIBLE_DIAGNOSIS);
    expect(r.unverified).toBe(true);
  });
  it("marks low top-probability INSUFFICIENT_EVIDENCE without inventing confidence", () => {
    const r = diseaseInfoToResult(CLASS_META[0], 0.4, info);
    expect(r.state).toBe(DIAGNOSIS_STATES.INSUFFICIENT_EVIDENCE);
    expect(r.confidence).toBe("40%");
    expect(r.unverified).toBe(true);
  });
  it("marks healthy class HEALTHY only above threshold", () => {
    expect(diseaseInfoToResult(CLASS_META[2], 0.97, null).state).toBe(DIAGNOSIS_STATES.HEALTHY);
    expect(diseaseInfoToResult(CLASS_META[2], 0.3, null).state).toBe(DIAGNOSIS_STATES.INSUFFICIENT_EVIDENCE);
  });
  it("exposes the documented heuristic threshold", () => {
    expect(KNOWN_MIN_TOP_PROBABILITY).toBe(0.6);
  });
});

describe("image-usability gate", () => {
  it("rejects missing/empty/non-image/oversize files deterministically", () => {
    expect(validateImageFile(null).ok).toBe(false);
    expect(validateImageFile({ size: 0 }).ok).toBe(false);
    expect(validateImageFile({ size: 10, type: "application/pdf" }).ok).toBe(false);
    expect(validateImageFile({ size: 20 * 1024 * 1024, type: "image/jpeg" }).ok).toBe(false);
    expect(validateImageFile(null).state).toBe(DIAGNOSIS_STATES.IMAGE_UNUSABLE);
    expect(validateImageFile({ size: 1000, type: "image/jpeg" }).ok).toBe(true);
    // repeatability
    expect(validateImageFile(null)).toEqual(validateImageFile(undefined));
  });
  it("rejects tiny dimensions without over-rejecting valid images", () => {
    expect(assessImageDimensions({ naturalWidth: 20, naturalHeight: 20 }).ok).toBe(false);
    expect(assessImageDimensions({ naturalWidth: 640, naturalHeight: 480 }).ok).toBe(true);
    expect(assessImageDimensions(null).state).toBe(DIAGNOSIS_STATES.IMAGE_UNUSABLE);
  });
});

describe("diagnoseFromFile", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null (graceful) when classification fails", async () => {
    vi.spyOn(globalThis, "Image").mockImplementation(
      () => ({ onload: null, onerror: null, src: "" })
    );
    // In jsdom there's no canvas 2D, so imageElementToRgba throws -> returns null
    const result = await diagnoseFromFile({ name: "leaf.jpg" });
    expect(result).toBeNull();
  });
});