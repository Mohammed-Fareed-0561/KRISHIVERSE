// On-device crop disease classifier using EfficientNet-B0 (fine-tuned) via
// ONNX Runtime Web. Runs 100% in the browser — no network, no API key — and is
// cached by the Service Worker so it works offline on mobile.
import { CROPS, getDiseaseInfo } from "../../data/comprehensiveDiseaseDB";
import { VERIFIED_TREATMENT_UNAVAILABLE, sanitizeTreatmentList } from "./treatmentSafety";

export const MODEL_URL = `${import.meta.env.BASE_URL}models/efficientnet_b0_plantvillage.onnx`;
export const LABELS_URL = `${import.meta.env.BASE_URL}models/labels.json`;
export const WASM_PATHS = `${import.meta.env.BASE_URL}onnx/`;

// class name (model output index) -> crop/disease mapping used to build advice
export const CLASS_META = [
  { index: 0, cls: "Tomato___Early_blight", crop: CROPS.TOMATO, diseaseId: "tomato_early_blight", displayName: "Tomato Early Blight" },
  { index: 1, cls: "Tomato___Late_blight", crop: CROPS.TOMATO, diseaseId: "tomato_late_blight", displayName: "Tomato Late Blight" },
  { index: 2, cls: "Tomato___healthy", crop: CROPS.TOMATO, diseaseId: null, displayName: "Healthy Tomato Plant" },
  { index: 3, cls: "Potato___Early_blight", crop: "potato", diseaseId: null, displayName: "Potato Early Blight" },
  { index: 4, cls: "Potato___Late_blight", crop: "potato", diseaseId: null, displayName: "Potato Late Blight" },
  { index: 5, cls: "Pepper__bell___Bacterial_spot", crop: "chili", diseaseId: null, displayName: "Pepper Bacterial Spot" },
];

// ─── diagnosis states (result contract; see docs/cropdoctor/current-pipeline.md) ─
// KNOWN: model class + KB backing, top probability above threshold.
// POSSIBLE: model class without KB backing (generic guidance only).
// INSUFFICIENT_EVIDENCE: top probability below threshold — do not present as a finding.
// HEALTHY: healthy class above threshold.
// Probabilities are RAW softmax outputs, NOT calibrated — calibration is NOT ESTABLISHED.
export const DIAGNOSIS_STATES = Object.freeze({
  KNOWN_DIAGNOSIS: "KNOWN_DIAGNOSIS",
  POSSIBLE_DIAGNOSIS: "POSSIBLE_DIAGNOSIS",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  UNKNOWN_CROP: "UNKNOWN_CROP",
  IMAGE_UNUSABLE: "IMAGE_UNUSABLE",
  HEALTHY: "HEALTHY",
  NO_RESULT: "NO_RESULT",
});

// Heuristic gate, not a calibrated cutoff: below this the top class is reported
// as INSUFFICIENT_EVIDENCE instead of a diagnosis.
export const KNOWN_MIN_TOP_PROBABILITY = 0.6;

// ─── pure helpers (unit-tested without canvas/onnx) ────────────────────────

export function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export function topK(probs, k = 3) {
  return probs
    .map((p, index) => ({ index, probability: p, ...CLASS_META[index] }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, k);
}

// Bilinear resize of RGBA Uint8ClampedArray -> { data, width, height }
export function bilinearResize(rgba, width, height, newWidth, newHeight) {
  const out = new Uint8ClampedArray(newWidth * newHeight * 4);
  const xRatio = width / newWidth;
  const yRatio = height / newHeight;
  for (let y = 0; y < newHeight; y++) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, height - 1);
    const fy = srcY - y0;
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, width - 1);
      const fx = srcX - x0;
      for (let c = 0; c < 4; c++) {
        const top = rgba[(y0 * width + x0) * 4 + c] * (1 - fx) + rgba[(y0 * width + x1) * 4 + c] * fx;
        const bottom = rgba[(y1 * width + x0) * 4 + c] * (1 - fx) + rgba[(y1 * width + x1) * 4 + c] * fx;
        out[(y * newWidth + x) * 4 + c] = top * (1 - fy) + bottom * fy;
      }
    }
  }
  return { data: out, width: newWidth, height: newHeight };
}

export function centerCropRgba(rgba, width, height, cropSize) {
  const left = Math.floor((width - cropSize) / 2);
  const top = Math.floor((height - cropSize) / 2);
  const out = new Uint8ClampedArray(cropSize * cropSize * 4);
  for (let y = 0; y < cropSize; y++) {
    for (let x = 0; x < cropSize; x++) {
      const src = ((top + y) * width + (left + x)) * 4;
      const dst = (y * cropSize + x) * 4;
      out[dst] = rgba[src];
      out[dst + 1] = rgba[src + 1];
      out[dst + 2] = rgba[src + 2];
      out[dst + 3] = rgba[src + 3];
    }
  }
  return { data: out, width: cropSize, height: cropSize };
}

// RGBA square crop -> normalized CHW Float32Array matching the training transform
// (Resize 256 -> CenterCrop 224 -> /255 -> ImageNet normalize).
export function rgbaToChwNormalized(rgba, width, height, mean, std) {
  const size = width; // square crop
  const out = new Float32Array(3 * size * size);
  for (let i = 0; i < size * size; i++) {
    const px = i * 4;
    const r = rgba[px] / 255;
    const g = rgba[px + 1] / 255;
    const b = rgba[px + 2] / 255;
    out[i] = (r - mean[0]) / std[0];
    out[size * size + i] = (g - mean[1]) / std[1];
    out[2 * size * size + i] = (b - mean[2]) / std[2];
  }
  return out;
}

// ─── browser-only parts ────────────────────────────────────────────────────

let ortPromise = null;
let sessionPromise = null;
let labelsPromise = null;

async function getOrt() {
  if (!ortPromise) {
    // NOTE: import the wasm-only build, NOT the default bundle.
    // The default "onnxruntime-web" bundle hardcodes the JSEP loader
    // (ort-wasm-simd-threaded.jsep.mjs + 26.8MB jsep.wasm), which is only
    // needed for WebGPU-accelerated execution. This classifier explicitly
    // requests executionProviders: ["wasm"] (plain CPU), so JSEP is dead
    // weight AND an offline failure point (it is excluded from the SW
    // precache). The "onnxruntime-web/wasm" entry hardcodes the plain
    // ort-wasm-simd-threaded.mjs + 13.5MB wasm instead — no JSEP dep.
    ortPromise = import("onnxruntime-web/wasm").then((m) => {
      const ort = m.default || m;
      ort.env.wasm.wasmPaths = WASM_PATHS;
      if (!ort.env.wasm.numThreads) ort.env.wasm.numThreads = 1;
      return ort;
    });
  }
  return ortPromise;
}

export async function getModelConfig() {
  if (!labelsPromise) {
    labelsPromise = fetch(LABELS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`labels.json HTTP ${r.status}`);
        return r.json();
      })
      .then((cfg) => {
        const classes = cfg.classes || CLASS_META.map((m) => m.cls);
        const metaByClass = new Map(CLASS_META.map((m) => [m.cls, m]));
        return {
          ...cfg,
          classes,
          mean: cfg.mean || [0.485, 0.456, 0.406],
          std: cfg.std || [0.229, 0.224, 0.225],
          metaByClass,
        };
      })
      .catch((e) => {
        labelsPromise = null;
        throw e;
      });
  }
  return labelsPromise;
}

/**
 * Loads (or reuses) the ONNX inference session.
 * @returns {Promise<{session: object, ort: object, cfg: object}>}
 */
export async function loadClassifier() {
  const [cfg, ort] = await Promise.all([getModelConfig(), getOrt()]);
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const res = await fetch(MODEL_URL);
      if (!res.ok) throw new Error(`model HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
      return { session, ort, cfg };
    })().catch((e) => {
      sessionPromise = null;
      throw e;
    });
  }
  return sessionPromise;
}

export async function isClassifierAvailable() {
  try {
    const res = await fetch(MODEL_URL, { method: "HEAD" });
    if (res.ok) return true;
  } catch {
    // offline — fall through to cache check
  }
  // Offline: workbox's precache route only matches GET, so the HEAD above
  // fails even though the model IS cached. Check the SW caches directly
  // (ignore the ?__WB_REVISION__= query workbox adds to precache keys).
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        if (await cache.match(MODEL_URL, { ignoreSearch: true })) return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

export async function imageElementToRgba(imageElement, targetSize = 256) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = targetSize;
  canvas.height = targetSize;
  ctx.drawImage(imageElement, 0, 0, targetSize, targetSize);
  const { data } = ctx.getImageData(0, 0, targetSize, targetSize);
  return { data, width: targetSize, height: targetSize };
}

/**
 * Classify an image element.
 * @returns {Promise<{predictions: Array, top: object|null, latencyMs: number}>}
 */
export async function classifyImage(imageElement) {
  const { session, ort, cfg } = await loadClassifier();
  const inputSize = cfg.input_size || 224;
  const resize = 256;

  const rgba = await imageElementToRgba(imageElement, resize);
  const resized = bilinearResize(rgba.data, rgba.width, rgba.height, resize, resize);
  const cropped = centerCropRgba(resized.data, resize, resize, inputSize);
  const chw = rgbaToChwNormalized(cropped.data, cropped.width, cropped.height, cfg.mean, cfg.std);

  const tensor = new ort.Tensor("float32", chw, [1, 3, inputSize, inputSize]);
  const t0 = performance.now();
  const outputs = await session.run({ input: tensor });
  const latencyMs = performance.now() - t0;
  const logits = Array.from(outputs.logits.data);
  const probs = softmax(logits);
  const predictions = topK(probs, 3);
  return { predictions, top: predictions[0] || null, latencyMs };
}

// ─── diagnosis mapping (produces the DiagnosePage result shape) ────────────

export function diseaseInfoToResult(meta, probability, diseaseInfo, options = {}) {
  const name = meta.displayName;
  const cropName = meta.crop.charAt(0).toUpperCase() + meta.crop.slice(1);
  const isHealthy = meta.diseaseId === null && meta.cls.endsWith("_healthy");
  const confidence = Math.round(probability * 100);
  const lowEvidence = !(probability >= KNOWN_MIN_TOP_PROBABILITY);

  // No hardcoded dosages. Dosage-free generic guidance is kept; chemical advice
  // is never invented — it must come from a verified KB backing (options.backing).
  const baseTreatments = {
    natural: [
      "Improve airflow by pruning crowded leaves and branches",
      "Avoid overhead irrigation in the evening",
    ],
    chemical: [],
  };

  const filterWith = (list) => {
    const { kept } = sanitizeTreatmentList(list, { backing: options.backing });
    return kept.length > 0 ? kept : [VERIFIED_TREATMENT_UNAVAILABLE];
  };

  if (isHealthy) {
    return {
      name: "Healthy Plant",
      crop: cropName,
      confidence: `${confidence}%`,
      severity: "Low",
      state: lowEvidence ? DIAGNOSIS_STATES.INSUFFICIENT_EVIDENCE : DIAGNOSIS_STATES.HEALTHY,
      unverified: lowEvidence,
      recommendations: {
        immediate: lowEvidence
          ? "I couldn't identify the problem reliably from this image."
          : "Your plant looks healthy. Continue regular scouting and good crop management.",
        natural: ["Maintain balanced fertilizer schedule", "Keep field drains clear"],
        chemical: [],
      },
      onDeviceModel: true,
      model: "efficientnet-b0",
    };
  }

  if (diseaseInfo && !lowEvidence) {
    return {
      name: diseaseInfo.name || name,
      crop: cropName,
      confidence: `${confidence}%`,
      severity: diseaseInfo.severity || "Medium",
      state: DIAGNOSIS_STATES.KNOWN_DIAGNOSIS,
      unverified: false,
      recommendations: {
        immediate: `Remove infected ${meta.crop} leaves and isolate affected plants to prevent spread.`,
        natural: filterWith(diseaseInfo.naturalTreatment || baseTreatments.natural).slice(0, 3),
        chemical: filterWith(diseaseInfo.chemicalTreatment || baseTreatments.chemical).slice(0, 2),
        prevention: diseaseInfo.prevention || [],
      },
      causes: diseaseInfo.causes,
      symptoms: diseaseInfo.symptoms,
      onDeviceModel: true,
      model: "efficientnet-b0",
    };
  }

  if (lowEvidence) {
    return {
      name,
      crop: cropName,
      confidence: `${confidence}%`,
      severity: "Unknown",
      state: DIAGNOSIS_STATES.INSUFFICIENT_EVIDENCE,
      unverified: true,
      recommendations: {
        immediate: "I couldn't identify the problem reliably from this image. Try a clearer, well-lit close-up of the affected leaves.",
        natural: filterWith(baseTreatments.natural).slice(0, 3),
        chemical: filterWith(baseTreatments.chemical).slice(0, 2),
        prevention: ["Use certified disease-free seeds", "Maintain field sanitation"],
      },
      onDeviceModel: true,
      model: "efficientnet-b0",
    };
  }

  return {
    name,
    crop: cropName,
    confidence: `${confidence}%`,
    severity: "Medium",
    state: DIAGNOSIS_STATES.POSSIBLE_DIAGNOSIS,
    unverified: true,
    recommendations: {
      immediate: `This may be ${name} — treat as unconfirmed. Remove infected ${meta.crop} leaves and isolate affected plants to prevent spread.`,
      natural: filterWith(baseTreatments.natural).slice(0, 3),
      chemical: filterWith(baseTreatments.chemical).slice(0, 2),
      prevention: ["Use certified disease-free seeds", "Maintain field sanitation"],
    },
    onDeviceModel: true,
    model: "efficientnet-b0",
  };
}

// ─── image-usability gate (deterministic, heuristic — not a trained model) ─
// Rejects only what cannot possibly work: missing/invalid files and images too
// small to carry leaf detail. Returns { ok, reason } — never throws.
export const MIN_IMAGE_DIMENSION_PX = 64;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function validateImageFile(file) {
  if (!file || typeof file !== "object") {
    return { ok: false, reason: "missing", state: DIAGNOSIS_STATES.IMAGE_UNUSABLE };
  }
  if (typeof file.size === "number" && file.size <= 0) {
    return { ok: false, reason: "empty", state: DIAGNOSIS_STATES.IMAGE_UNUSABLE };
  }
  if (typeof file.size === "number" && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "too_large", state: DIAGNOSIS_STATES.IMAGE_UNUSABLE };
  }
  if (typeof file.type === "string" && file.type && !file.type.startsWith("image/")) {
    return { ok: false, reason: "not_an_image", state: DIAGNOSIS_STATES.IMAGE_UNUSABLE };
  }
  return { ok: true, reason: null, state: null };
}

export function assessImageDimensions(img) {
  const w = Number(img?.naturalWidth || img?.width || 0);
  const h = Number(img?.naturalHeight || img?.height || 0);
  if (!w || !h || w < MIN_IMAGE_DIMENSION_PX || h < MIN_IMAGE_DIMENSION_PX) {
    return { ok: false, reason: "too_small", state: DIAGNOSIS_STATES.IMAGE_UNUSABLE };
  }
  return { ok: true, reason: null, state: null };
}

export function fileToImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Diagnose an image file on-device. Returns the result object, or null if the
 * model is unavailable/failed (caller then falls back to cloud/heuristic).
 */
export async function diagnoseFromFile(file) {
  try {
    // Cheap pre-checks first: unusable files fail fast with a warning instead
    // of flowing into model inference. Contract unchanged (null on failure).
    if (!validateImageFile(file).ok) {
      console.warn("[onDeviceClassifier] unusable image file");
      return null;
    }
    const img = await fileToImageElement(file);
    if (!assessImageDimensions(img).ok) {
      console.warn("[onDeviceClassifier] image too small for diagnosis");
      return null;
    }
    const { top } = await classifyImage(img);
    if (!top) return null;
    const diseaseInfo =
      top.crop && top.diseaseId ? getDiseaseInfo(top.crop, top.diseaseId) : null;
    return diseaseInfoToResult(top, top.probability, diseaseInfo);
  } catch (e) {
    console.warn("[onDeviceClassifier] classification failed:", e);
    return null;
  }
}

export default {
  diagnoseFromFile,
  classifyImage,
  loadClassifier,
  isClassifierAvailable,
  softmax,
  topK,
  bilinearResize,
  centerCropRgba,
  rgbaToChwNormalized,
  validateImageFile,
  assessImageDimensions,
  DIAGNOSIS_STATES,
  KNOWN_MIN_TOP_PROBABILITY,
};
