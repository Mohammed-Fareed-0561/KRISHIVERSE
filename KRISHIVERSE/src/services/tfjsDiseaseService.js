// DEPRECATED — TensorFlow.js removed from KrishiVerse.
// Canonical image-classification path is ONNX Runtime Web
// (see src/services/ai/onDeviceClassifier.js) plus rule-based matching
// (see src/services/advancedDiseaseDetection.js).
// This stub is kept so any legacy import does not break the build;
// it performs no ML inference and never requires @tensorflow/tfjs.
import { getDiseaseInfo } from "../data/diseaseDB";

let model = null;

// (Former lazy tfjs importer deleted with the @tensorflow/tfjs dependency.)

/**
 * Initializes the AI Model.
 * Currently uses a mock fallback to simulate loading times and inference
 * while providing the TFJS architectural skeleton.
 */
export async function loadDiseaseModel() {
  if (model) return;

  // No-op: ONNX Runtime Web is the supported loader (onDeviceClassifier).
  // Kept async so legacy callers (`await loadDiseaseModel()`) keep working.
  console.info("[tfjsDiseaseService] deprecated stub — use onDeviceClassifier (ONNX) instead.");
}

/**
 * Predict crop disease from an HTML Image Element.
 * @param {HTMLImageElement} imageElement
 * @returns {Promise<Object>} The heavily detailed disease mapping
 */
export async function predictDisease(imageElement) {
  if (!imageElement) throw new Error("No image element provided");

  try {
    // Rule-based fallback index (deterministic, offline). No tensor ops.
    // Fixed index 0: this deprecated stub must be deterministic; the supported
    // path is onDeviceClassifier (ONNX) + rule-based matching.
    const predictedIndex = 0;

    // 2. Format result with Indian Natural remedies & Chemical remedies
    return getDiseaseInfo(predictedIndex);
  } catch (error) {
    console.error("Error predicting disease:", error);
    throw new Error("Unable to analyze image.");
  }
}
