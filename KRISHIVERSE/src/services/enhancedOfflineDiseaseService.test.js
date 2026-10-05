/**
 * enhancedOfflineDiseaseService.test.js — Phase 2: detection is deterministic.
 *
 * The former Math.random() mocks (target pattern, patch sampling, wilting)
 * made repeated diagnoses disagree with themselves. These tests pin
 * determinism on synthetic pixel buffers plus sensible polarity
 * (uniform healthy-green vs uniform brown).
 */
import { describe, it, expect } from "vitest";
import {
  detectTargetPattern,
  detectIrregularPatches,
  hasWiltingPattern,
  detectDisease,
} from "./enhancedOfflineDiseaseService.js";

function solidBuffer(w, h, r, g, b) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return data;
}

const GREEN = (w = 64, h = 64) => solidBuffer(w, h, 40, 160, 40);
const BROWN = (w = 64, h = 64) => solidBuffer(w, h, 150, 90, 40);

describe("Crop Doctor determinism", () => {
  it("returns identical results on repeated calls", () => {
    const g = GREEN();
    const b = BROWN();
    for (const buf of [g, b]) {
      expect(detectTargetPattern(buf, 64, 64)).toBe(detectTargetPattern(buf, 64, 64));
      expect(detectIrregularPatches(buf, 64, 64)).toBe(detectIrregularPatches(buf, 64, 64));
      expect(hasWiltingPattern(buf, 64, 64)).toBe(hasWiltingPattern(buf, 64, 64));
    }
  });

  it("flags uniform brown as wilted/patchy but not healthy green", () => {
    expect(hasWiltingPattern(BROWN(), 64, 64)).toBe(true);
    expect(hasWiltingPattern(GREEN(), 64, 64)).toBe(false);
    expect(detectIrregularPatches(GREEN(), 64, 64)).toBe(false);
  });
});

describe("diagnosis gates (Phase 3A)", () => {
  it("abstains with UNKNOWN_CROP on unrecognized crop hints", async () => {
    const r = await detectDisease({ naturalWidth: 200, naturalHeight: 200 }, "en", { cropHint: "dragonfruit" });
    expect(r.state).toBe("UNKNOWN_CROP");
    expect(r.chemicalTreatment).toEqual([]);
  });
  it("accepts recognized crop hints without abstaining on gates", async () => {
    // null image still hits IMAGE_UNUSABLE first (gate order), not UNKNOWN_CROP
    const r = await detectDisease(null, "en", { cropHint: "dragonfruit" });
    expect(r.state).toBe("IMAGE_UNUSABLE");
  });
  it("abstains with IMAGE_UNUSABLE on missing/tiny images", async () => {
    for (const img of [null, undefined, {}, { naturalWidth: 20, naturalHeight: 20 }]) {
      const r = await detectDisease(img, "en", {});
      expect(r.state).toBe("IMAGE_UNUSABLE");
    }
  });
});
