/**
 * eval/mobile-ai/imagequality/imageQualityGuard.js
 *
 * ISOLATED prototype — a lightweight deterministic image-quality/content gate
 * for Crop Doctor inputs. Not wired into production. Pure functions over RGBA
 * buffers (no canvas, no model, no network) so results are reproducible in
 * node and the browser alike.
 *
 * Detects: blurry, too_dark, too_bright, leaf_too_small, no_plant_or_leaf,
 * excessive_background. Heavy occlusion and multi-object confusion are
 * explicitly out of scope for a deterministic gate (documented limitation).
 */

export const QUALITY_THRESHOLDS = Object.freeze({
  blurVarianceMin: 60,      // variance of Laplacian below → blurry
  brightnessMin: 55,        // mean gray below → too_dark
  brightnessMax: 205,       // mean gray above → too_bright
  minContrast: 12,          // gray stddev below → flat/unusable
  plantRatioNone: 0.005,    // green-dominant pixel fraction below → no plant
  plantRatioTooSmall: 0.04, // below → leaf occupies too little of the frame
  centerPlantMin: 0.08,     // central region plant fraction below → background-heavy
});

function grayOf(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isPlantPixel(r, g, b) {
  const exg = 2 * g - r - b;
  return exg > 18 && g > r && g > b;
}

export function toGray(data) {
  const n = data.length / 4;
  const gray = new Float64Array(n);
  for (let i = 0; i < n; i++) gray[i] = grayOf(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  return gray;
}

/** Variance of a 3x3 Laplacian over the gray image (blur metric). */
export function laplacianVariance(gray, width, height) {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function brightnessAndContrast(gray) {
  let sum = 0;
  for (const v of gray) sum += v;
  const mean = sum / gray.length;
  let varSum = 0;
  for (const v of gray) varSum += (v - mean) * (v - mean);
  return { brightness: mean, contrast: Math.sqrt(varSum / gray.length) };
}

export function plantFractions(data, width, height) {
  let plant = 0;
  let centerPlant = 0;
  let centerTotal = 0;
  const x0 = Math.floor(width * 0.25);
  const x1 = Math.floor(width * 0.75);
  const y0 = Math.floor(height * 0.25);
  const y1 = Math.floor(height * 0.75);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const p = isPlantPixel(data[i], data[i + 1], data[i + 2]);
      if (p) plant++;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) {
        centerTotal++;
        if (p) centerPlant++;
      }
    }
  }
  const total = width * height;
  return {
    plantRatio: plant / total,
    centerPlantRatio: centerTotal ? centerPlant / centerTotal : 0,
  };
}

/**
 * @param {{data:Uint8ClampedArray|Uint8Array, width:number, height:number}} image
 * @returns {{verdict:"usable"|"unusable", flags:string[], scores:object, reasons:string[]}}
 */
export function assessImageQuality({ data, width, height }) {
  const t = QUALITY_THRESHOLDS;
  const gray = toGray(data);
  const blur = laplacianVariance(gray, width, height);
  const { brightness, contrast } = brightnessAndContrast(gray);
  const { plantRatio, centerPlantRatio } = plantFractions(data, width, height);

  const flags = [];
  const reasons = [];
  if (blur < t.blurVarianceMin) { flags.push("blurry"); reasons.push(`blur variance ${blur.toFixed(1)} < ${t.blurVarianceMin}`); }
  if (brightness < t.brightnessMin) { flags.push("too_dark"); reasons.push(`brightness ${brightness.toFixed(1)} < ${t.brightnessMin}`); }
  if (brightness > t.brightnessMax) { flags.push("too_bright"); reasons.push(`brightness ${brightness.toFixed(1)} > ${t.brightnessMax}`); }
  if (contrast < t.minContrast) { flags.push("flat_low_contrast"); reasons.push(`contrast ${contrast.toFixed(1)} < ${t.minContrast}`); }
  if (plantRatio < t.plantRatioNone) flags.push("no_plant_or_leaf");
  else if (plantRatio < t.plantRatioTooSmall) { flags.push("leaf_too_small"); reasons.push(`plant covers ${(plantRatio * 100).toFixed(1)}% of frame`); }
  else if (centerPlantRatio < t.centerPlantMin) { flags.push("excessive_background"); reasons.push(`center plant ratio ${centerPlantRatio.toFixed(2)}`); }

  return {
    verdict: flags.length ? "unusable" : "usable",
    flags,
    scores: {
      blurVariance: +blur.toFixed(2),
      brightness: +brightness.toFixed(2),
      contrast: +contrast.toFixed(2),
      plantRatio: +plantRatio.toFixed(4),
      centerPlantRatio: +centerPlantRatio.toFixed(4),
    },
    reasons,
  };
}

export default { assessImageQuality, QUALITY_THRESHOLDS };
