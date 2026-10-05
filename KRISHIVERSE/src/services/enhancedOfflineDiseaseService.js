// Enhanced Offline Disease Detection Service
// High-accuracy multi-crop disease detection without internet

import { 
  CROPS, 
  DISEASE_DATABASE, 
  CROP_FEATURES, 
  VISUAL_ANALYSIS_RULES,
  getDiseaseInfo,
  getAllDiseasesForCrop,
  getCropFeatures,
  analyzeVisualFeatures
} from '../data/comprehensiveDiseaseDB.js';

let cropDetectionModel = null;
let isModelsLoaded = false;

// TensorFlow.js removed from KrishiVerse. Crop Doctor uses ONNX Runtime Web
// (onDeviceClassifier.js) + the rule-based visual analysis in this file.
// (Former TF model-loader helpers were deleted with the dependency;
// the rule-based path below always runs offline.)

// Load all models for offline detection (no-op since TF.js removal)
export async function loadEnhancedDiseaseModels() {
  // No-op: rule-based + ONNX path needs no TF model download.
  isModelsLoaded = false;
  return;
}

// Preprocess image for analysis
export function preprocessImage(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Standardize image size
  canvas.width = 224;
  canvas.height = 224;
  
  // Draw and resize image
  ctx.drawImage(imageElement, 0, 0, 224, 224);
  
  return canvas;
}

// Extract visual features from image
export function extractVisualFeatures(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const features = {
    colors: [],
    shapes: [],
    locations: [],
    texture: [],
    patterns: []
  };
  
  // Color analysis
  const colorHistogram = analyzeColors(data);
  features.colors = identifyDominantColors(colorHistogram);
  
  // Shape analysis (simplified)
  features.shapes = analyzeShapes(data, canvas.width, canvas.height);
  
  // Location analysis (where symptoms appear)
  features.locations = analyzeSymptomLocations(data, canvas.width, canvas.height);
  
  // Pattern analysis
  features.patterns = analyzePatterns(data, canvas.width, canvas.height);
  
  return features;
}

// Analyze color distribution
function analyzeColors(data) {
  const histogram = {
    green: 0,
    yellow: 0,
    brown: 0,
    white: 0,
    black: 0,
    red: 0,
    gray: 0
  };
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Classify colors
    if (g > r && g > b && g > 100) {
      histogram.green++;
    } else if (r > 200 && g > 200 && b < 100) {
      histogram.yellow++;
    } else if (r < 100 && g < 100 && b < 100) {
      histogram.black++;
    } else if (r > 200 && g > 200 && b > 200) {
      histogram.white++;
    } else if (r > g && r > b && r > 150) {
      histogram.brown++;
    } else if (r > 150 && g < 100 && b < 100) {
      histogram.red++;
    } else {
      histogram.gray++;
    }
  }
  
  return histogram;
}

// Identify dominant colors based on histogram
function identifyDominantColors(histogram) {
  const total = Object.values(histogram).reduce((a, b) => a + b, 0);
  const dominantColors = [];
  
  for (const [color, count] of Object.entries(histogram)) {
    const percentage = (count / total) * 100;
    if (percentage > 5) { // More than 5% of the image
      dominantColors.push(color);
    }
  }
  
  return dominantColors;
}

// Analyze shapes in the image
function analyzeShapes(data, width, height) {
  const shapes = [];
  
  // Simplified shape detection
  // Look for circular patterns (spots), linear patterns (lesions), etc.
  
  // Detect circular spots (common in many diseases)
  const hasCircularSpots = detectCircularSpots(data, width, height);
  if (hasCircularSpots) shapes.push('circular_spots');
  
  // Detect target patterns (early blight)
  const hasTargetPattern = detectTargetPattern(data, width, height);
  if (hasTargetPattern) shapes.push('target_pattern');
  
  // Detect linear lesions
  const hasLinearLesions = detectLinearLesions(data, width, height);
  if (hasLinearLesions) shapes.push('linear_lesions');
  
  // Detect irregular patches
  const hasIrregularPatches = detectIrregularPatches(data, width, height);
  if (hasIrregularPatches) shapes.push('irregular_patches');
  
  return shapes;
}

// Detect circular spots
function detectCircularSpots(data, width, height) {
  // Simplified circular spot detection
  // Look for roundish areas with different colors
  let circularScore = 0;
  
  for (let y = 10; y < height - 10; y += 20) {
    for (let x = 10; x < width - 10; x += 20) {
      const centerColor = getPixelColor(data, x, y, width);
      const surroundingColors = [];
      
      // Check surrounding pixels
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          if (dx !== 0 || dy !== 0) {
            surroundingColors.push(getPixelColor(data, x + dx, y + dy, width));
          }
        }
      }
      
      // Check if center is different from surroundings
      const differentCount = surroundingColors.filter(color => 
        colorDistance(centerColor, color) > 50
      ).length;
      
      if (differentCount > surroundingColors.length * 0.6) {
        circularScore++;
      }
    }
  }
  
  return circularScore > 5;
}

// Detect target pattern (concentric circles) — deterministic heuristic.
// Samples a fixed grid and counts points whose center differs strongly from
// BOTH a near ring (r=5) and a far ring (r=10) average, a cheap proxy for
// ringed lesions. Replaces the former Math.random() mock.
function detectTargetPattern(data, width, height) {
  let ringScore = 0;
  let samples = 0;

  for (let y = 15; y < height - 15; y += 20) {
    for (let x = 15; x < width - 15; x += 20) {
      const center = getPixelColor(data, x, y, width);
      const near = [
        getPixelColor(data, x + 5, y, width), getPixelColor(data, x - 5, y, width),
        getPixelColor(data, x, y + 5, width), getPixelColor(data, x, y - 5, width),
      ];
      const far = [
        getPixelColor(data, x + 10, y, width), getPixelColor(data, x - 10, y, width),
        getPixelColor(data, x, y + 10, width), getPixelColor(data, x, y - 10, width),
      ];
      const avg = (list) => ({
        r: list.reduce((a, c) => a + c.r, 0) / list.length,
        g: list.reduce((a, c) => a + c.g, 0) / list.length,
        b: list.reduce((a, c) => a + c.b, 0) / list.length,
      });
      samples++;
      if (colorDistance(center, avg(near)) > 50 && colorDistance(center, avg(far)) > 30) {
        ringScore++;
      }
    }
  }

  return samples > 0 && ringScore / samples > 0.15;
}

// Detect linear lesions
function detectLinearLesions(data, width, height) {
  // Look for linear patterns along leaf margins
  let linearScore = 0;
  
  // Check edges of image (leaf margins)
  for (let y = 5; y < height - 5; y += 10) {
    // Left edge
    const leftEdge = getPixelColor(data, 5, y, width);
    const innerLeft = getPixelColor(data, 15, y, width);
    
    // Right edge
    const rightEdge = getPixelColor(data, width - 5, y, width);
    const innerRight = getPixelColor(data, width - 15, y, width);
    
    if (colorDistance(leftEdge, innerLeft) > 30 || 
        colorDistance(rightEdge, innerRight) > 30) {
      linearScore++;
    }
  }
  
  return linearScore > 3;
}

// Detect irregular patches
function detectIrregularPatches(data, width, height) {
  // Look for large, irregular color areas
  let patchScore = 0;
  
  // Check 10 fixed sample areas for color consistency (deterministic — the
  // former random sampling made repeated diagnoses disagree with themselves).
  // Spread points keep the original >5/10 statistic meaningful.
  const samplePoints = [
    [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
    [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
    [0.2, 0.8], [0.5, 0.8], [0.8, 0.8],
    [0.35, 0.65],
  ];
  for (const [fx, fy] of samplePoints) {
    const x = Math.floor(fx * width);
    const y = Math.floor(fy * height);
    const centerColor = getPixelColor(data, x, y, width);
    let consistent = true;
    
    // Check 10x10 area around center
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const pixelColor = getPixelColor(data, x + dx, y + dy, width);
        if (colorDistance(centerColor, pixelColor) > 40) {
          consistent = false;
          break;
        }
      }
      if (!consistent) break;
    }
    
    if (!consistent) patchScore++;
  }
  
  return patchScore > 5;
}

// Analyze symptom locations
function analyzeSymptomLocations(data, width, height) {
  const locations = [];
  
  // Check if symptoms are in upper, middle, or lower parts
  const upperSymptoms = analyzeRegionSymptoms(data, width, height, 0, 0.3);
  const middleSymptoms = analyzeRegionSymptoms(data, width, height, 0.3, 0.7);
  const lowerSymptoms = analyzeRegionSymptoms(data, width, height, 0.7, 1.0);
  
  if (upperSymptoms > 0.3) locations.push('upper_leaves');
  if (middleSymptoms > 0.3) locations.push('middle_leaves');
  if (lowerSymptoms > 0.3) locations.push('lower_leaves');
  
  // Check if symptoms are widespread
  const totalSymptoms = upperSymptoms + middleSymptoms + lowerSymptoms;
  if (totalSymptoms > 0.7) locations.push('all_leaves');
  
  return locations;
}

// Analyze symptoms in a specific region
function analyzeRegionSymptoms(data, width, height, startRatio, endRatio) {
  const startY = Math.floor(height * startRatio);
  const endY = Math.floor(height * endRatio);
  let symptomPixels = 0;
  let totalPixels = 0;
  
  for (let y = startY; y < endY; y++) {
    for (let x = 0; x < width; x++) {
      const color = getPixelColor(data, x, y, width);
      
      // Check if pixel indicates symptoms (not healthy green)
      if (!isHealthyGreen(color)) {
        symptomPixels++;
      }
      totalPixels++;
    }
  }
  
  return totalPixels > 0 ? symptomPixels / totalPixels : 0;
}

// Analyze patterns
function analyzePatterns(data, width, height) {
  const patterns = [];
  
  // Check for powdery patterns
  if (hasPowderyPattern(data, width, height)) {
    patterns.push('powdery');
  }
  
  // Check for water-soaked patterns
  if (hasWaterSoakedPattern(data, width, height)) {
    patterns.push('water_soaked');
  }
  
  // Check for wilting patterns
  if (hasWiltingPattern(data, width, height)) {
    patterns.push('wilting');
  }
  
  return patterns;
}

// Check for powdery patterns
function hasPowderyPattern(data, width, height) {
  let whitePixels = 0;
  let totalPixels = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check for white/light gray pixels
    if (r > 200 && g > 200 && b > 200) {
      whitePixels++;
    }
    totalPixels++;
  }
  
  return (whitePixels / totalPixels) > 0.1; // More than 10% white
}

// Check for water-soaked patterns
function hasWaterSoakedPattern(data, width, height) {
  let waterPixels = 0;
  let totalPixels = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check for dark, wet-looking areas
    if (r < 100 && g < 100 && b < 100) {
      waterPixels++;
    }
    totalPixels++;
  }
  
  return (waterPixels / totalPixels) > 0.05; // More than 5% dark areas
}

// Check for wilting patterns — deterministic heuristic: the share of sampled
// pixels that are not healthy green on a fixed grid. Replaces the former
// Math.random() mock, which made repeated diagnoses disagree with themselves.
function hasWiltingPattern(data, width, height) {
  let nonGreen = 0;
  let samples = 0;
  for (let y = 10; y < height - 10; y += 20) {
    for (let x = 10; x < width - 10; x += 20) {
      samples++;
      if (!isHealthyGreen(getPixelColor(data, x, y, width))) nonGreen++;
    }
  }
  return samples > 0 && nonGreen / samples > 0.5;
}

// Helper functions
function getPixelColor(data, x, y, width) {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2]
  };
}

function colorDistance(color1, color2) {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isHealthyGreen(color) {
  // Check if color represents healthy green
  return color.g > color.r + 20 && color.g > color.b + 20 && color.g > 100;
}

// Main disease detection function.
// Result states: heuristic matches are POSSIBLE_DIAGNOSIS (never KNOWN —
// rules are not calibrated); no-symptom outcomes are HEALTHY; unusable inputs
// and unidentifiable crops abstain explicitly (IMAGE_UNUSABLE / UNKNOWN_CROP).
// options.cropHint: when the caller already knows the crop, pass it; an
// unrecognized hint abstains instead of diagnosing another crop's diseases.
const KNOWN_CROP_KEYS = new Set(
  ["rice", "tomato", "chili", "chilli", "mango", "banana", "sugarcane", "cotton", "onion", "turmeric", "groundnut"]
);

function unknownCropResult(language) {
  return {
    state: "UNKNOWN_CROP",
    name: "Crop not identified",
    crop: null,
    confidence: "—",
    severity: "Unknown",
    causes: "",
    naturalIndianTreatment: [
      language === "ta"
        ? "பயிர் எது என்று தெரிவிக்கவும், அல்லது இலைகளின் தெளிவான புகைப்படத்தை மீண்டும் முயற்சிக்கவும்."
        : language === "hi"
          ? "फसल का नाम बताएं या पत्तियों की साफ तस्वीर दोबारा लें।"
          : "Tell me which crop this is, or retry with a clearer photo of the leaves.",
    ],
    chemicalTreatment: [],
    source: "crop_gate",
    patterns: [],
  };
}

function unusableImageResult() {
  return {
    state: "IMAGE_UNUSABLE",
    name: "Image unusable",
    crop: null,
    confidence: "—",
    severity: "Unknown",
    causes: "",
    naturalIndianTreatment: [
      "This image can't be used for diagnosis (missing or too small). Take a well-lit close-up at least 64×64 px.",
    ],
    chemicalTreatment: [],
    source: "image_gate",
    patterns: [],
  };
}

export async function detectDisease(imageElement, language = 'en', options = {}) {
  try {
    // IMAGE_UNUSABLE gate: deterministic, heuristic thresholds only.
    const w = Number(imageElement?.naturalWidth || imageElement?.width || 0);
    const h = Number(imageElement?.naturalHeight || imageElement?.height || 0);
    if (!imageElement || !w || !h || w < 64 || h < 64) {
      return unusableImageResult();
    }
    // UNKNOWN_CROP gate: never diagnose another crop's diseases.
    const hint = typeof options.cropHint === "string" ? options.cropHint.trim().toLowerCase() : "";
    if (hint && !KNOWN_CROP_KEYS.has(hint)) {
      return unknownCropResult(language);
    }
    // Preprocess image
    const canvas = preprocessImage(imageElement);
    
    // Extract visual features
    const features = extractVisualFeatures(canvas);
    
    // Analyze visual features using rule-based system
    const visualAnalysis = analyzeVisualFeatures(features);
    
    // If models are loaded, use them for enhanced accuracy
    let modelResults = null;
    if (isModelsLoaded && cropDetectionModel) {
      modelResults = await runModelInference(canvas, features);
    }
    
    // Combine results for final diagnosis
    const diagnosis = combineAnalysisResults(visualAnalysis, modelResults, features);

    const formatted = formatDiagnosisResult(diagnosis, language);
    // Rule-based outcomes are POSSIBLE at best (uncalibrated heuristics);
    // a no-symptom outcome reads as HEALTHY via the existing message.
    formatted.state = diagnosis?.disease?.id === "healthy" ? "HEALTHY" : "POSSIBLE_DIAGNOSIS";
    formatted.unverified = formatted.state !== "HEALTHY";
    return formatted;
    
  } catch (error) {
    console.error('Disease detection failed:', error);
    throw new Error('Unable to analyze image. Please try with a clearer photo.');
  }
}

// Run model inference (retired with TF.js — rule-based path is authoritative)
async function runModelInference() {
  return null;
}

// Combine analysis results
function combineAnalysisResults(visualAnalysis, modelResults, features) {
  const candidates = [];
  
  // Process visual analysis results
  visualAnalysis.forEach(result => {
    result.crops.forEach(crop => {
      result.diseases.forEach(diseaseId => {
        const diseaseInfo = getDiseaseInfo(crop, diseaseId);
        if (diseaseInfo) {
          candidates.push({
            crop,
            disease: diseaseInfo,
            confidence: result.confidence,
            source: 'visual_analysis',
            patterns: [result.pattern]
          });
        }
      });
    });
  });
  
  // Add model results if available
  if (modelResults && modelResults.disease) {
    candidates.push({
      crop: modelResults.disease.crop,
      disease: modelResults.disease.disease,
      confidence: modelResults.disease.confidence,
      source: 'model_inference',
      patterns: []
    });
  }
  
  // Sort by confidence and return best match
  candidates.sort((a, b) => b.confidence - a.confidence);
  
  return candidates.length > 0 ? candidates[0] : generateFallbackResult(features);
}

// Generate fallback result
function generateFallbackResult(features) {
  // If no specific disease detected, return general analysis
  const hasSymptoms = features.colors.length > 0 || features.shapes.length > 0;
  
  if (hasSymptoms) {
    return {
      crop: CROPS.TOMATO, // Default to tomato
      disease: {
        id: 'general_issue',
        name: 'General Plant Issue',
        scientificName: 'Various',
        symptoms: ['Visible symptoms detected'],
        visualFeatures: features,
        confidence: 0.6,
        severity: 'medium',
        causes: 'Various factors including environmental stress, nutrient deficiency, or early disease stages',
        naturalTreatment: [
          'Ensure proper watering',
          'Check soil nutrients',
          'Provide adequate sunlight',
          'Monitor for disease development'
        ],
        chemicalTreatment: [
          'Apply balanced fertilizer',
          'Use appropriate pesticides if needed',
          'Consult local agricultural expert'
        ],
        prevention: [
          'Maintain plant health',
          'Proper sanitation',
          'Regular monitoring',
          'Optimal growing conditions'
        ]
      },
      confidence: 0.6,
      source: 'fallback_analysis',
      patterns: []
    };
  }
  
  return {
    crop: CROPS.TOMATO,
    disease: {
      id: 'healthy',
      name: 'Healthy Plant',
      scientificName: 'Healthy',
      symptoms: ['No visible symptoms'],
      visualFeatures: features,
      confidence: 0.8,
      severity: 'none',
      causes: 'No disease detected',
      naturalTreatment: ['Continue current care practices'],
      chemicalTreatment: [],
      prevention: ['Maintain good growing conditions']
    },
    confidence: 0.8,
    source: 'healthy_analysis',
    patterns: []
  };
}

// Format diagnosis result
function formatDiagnosisResult(diagnosis, language) {
  const result = {
    name: diagnosis.disease.name,
    crop: getCropName(diagnosis.crop, language),
    confidence: `${Math.round(diagnosis.confidence * 100)}%`,
    causes: diagnosis.disease.causes,
    naturalIndianTreatment: diagnosis.disease.naturalTreatment,
    chemicalTreatment: diagnosis.disease.chemicalTreatment,
    severity: diagnosis.disease.severity,
    source: diagnosis.source,
    patterns: diagnosis.patterns,
    detectedFeatures: diagnosis.disease.visualFeatures
  };
  
  // Add additional information
  if (diagnosis.disease.scientificName) {
    result.scientificName = diagnosis.disease.scientificName;
  }
  
  if (diagnosis.disease.symptoms) {
    result.symptoms = diagnosis.disease.symptoms;
  }
  
  if (diagnosis.disease.prevention) {
    result.prevention = diagnosis.disease.prevention;
  }
  
  return result;
}

// Get crop name in different languages
function getCropName(cropKey, language) {
  const cropNames = {
    [CROPS.RICE]: { en: 'Rice', ta: 'நெல்', hi: 'चावल' },
    [CROPS.TOMATO]: { en: 'Tomato', ta: 'தக்காளி', hi: 'टमाटर' },
    [CROPS.CHILI]: { en: 'Chili', ta: 'மிளகாய்', hi: 'मिर्च' },
    [CROPS.MANGO]: { en: 'Mango', ta: 'மாம்பழம்', hi: 'आम' },
    [CROPS.BANANA]: { en: 'Banana', ta: 'வாழை', hi: 'केला' },
    [CROPS.SUGARCANE]: { en: 'Sugarcane', ta: 'கரும்பு', hi: 'गन्ना' },
    [CROPS.COTTON]: { en: 'Cotton', ta: 'பருத்தி', hi: 'कपास' },
    [CROPS.ONION]: { en: 'Onion', ta: 'வெங்காயம்', hi: 'प्याज' },
    [CROPS.TURMERIC]: { en: 'Turmeric', ta: 'மஞ்சள்', hi: 'हल्दी' },
    [CROPS.GROUNDNUT]: { en: 'Groundnut', ta: 'நிலக்கடலை', hi: 'मूंगफली' }
  };
  
  return cropNames[cropKey]?.[language] || cropNames[cropKey]?.en || cropKey;
}

// Named exports for evaluation (determinism harness). Detection behaviour is
// unchanged for callers of the default export.
export { detectTargetPattern, detectIrregularPatches, hasWiltingPattern };

// Export functions for external use
export default {
  loadEnhancedDiseaseModels,
  detectDisease,
  preprocessImage,
  extractVisualFeatures,
  analyzeVisualFeatures,
  getDiseaseInfo,
  getAllDiseasesForCrop,
  CROPS,
  DISEASE_DATABASE
};
