// Comprehensive Disease Database for Offline Detection
// Covers all major crops in Tamil Nadu with detailed information

export const CROPS = {
  RICE: 'rice',
  SUGARCANE: 'sugarcane',
  COTTON: 'cotton',
  TOMATO: 'tomato',
  CHILI: 'chili',
  ONION: 'onion',
  MANGO: 'mango',
  BANANA: 'banana',
  TURMERIC: 'turmeric',
  GROUNDNUT: 'groundnut',
  BLACKGRAM: 'blackgram',
  GREENGram: 'greengram',
  CORIANDER: 'coriander',
  BRINJAL: 'brinjal',
  LADYFINGER: 'ladyfinger',
  PAPAYA: 'papaya',
  COCONUT: 'coconut',
  CASHEW: 'cashew',
  GUAVA: 'guava',
  SAPOTA: 'sapota'
};

export const DISEASE_DATABASE = {
  [CROPS.RICE]: {
    diseases: [
      {
        id: 'rice_blast',
        name: 'Rice Blast',
        scientificName: 'Pyricularia oryzae',
        symptoms: ['Diamond-shaped lesions on leaves', 'Gray centers with brown margins', 'Neck rot in panicles'],
        visualFeatures: {
          color: ['gray', 'brown', 'white'],
          shape: ['diamond', 'oval', 'irregular'],
          pattern: ['spotted', 'lesions', 'centers'],
          location: ['leaves', 'stem', 'panicles']
        },
        confidence: 0.92,
        severity: 'high',
        causes: 'Fungal disease favored by high humidity, warm temperatures (25-28°C), and excessive nitrogen',
        naturalTreatment: [
          'Apply neem leaf extract (5%) spray',
          'Use Trichoderma viride biocontrol agent',
          'Maintain proper field drainage',
          'Avoid excessive nitrogen fertilizers',
          'Use resistant varieties like IR64'
        ],
        chemicalTreatment: [
          'Spray Tricyclazole 75% WP @ 0.6g/L',
          'Apply Propiconazole 25% EC @ 1ml/L',
          'Use Validamycin 3% L @ 2ml/L'
        ],
        prevention: [
          'Use certified disease-free seeds',
          'Maintain proper spacing (20x20cm)',
          'Avoid water stagnation in fields',
          'Remove infected plant debris'
        ]
      },
      {
        id: 'rice_bacterial_leaf_blight',
        name: 'Bacterial Leaf Blight',
        scientificName: 'Xanthomonas oryzae',
        symptoms: ['Yellow to white lesions along leaf margins', 'Wavy margins progressing towards leaf tip', 'Kresek phase in seedlings'],
        visualFeatures: {
          color: ['yellow', 'white', 'cream'],
          shape: ['linear', 'wavy', 'marginal'],
          pattern: ['lesions', 'margins', 'progressive'],
          location: ['leaf margins', 'leaf tips', 'seedlings']
        },
        confidence: 0.88,
        severity: 'medium',
        causes: 'Bacterial disease spread by wind, water, and infected seeds. Favored by high humidity and temperature',
        naturalTreatment: [
          'Spray copper-based bactericides',
          'Apply Bordeaux mixture (1:2:10)',
          'Use resistant varieties',
          'Remove infected plants'
        ],
        chemicalTreatment: [
          'Spray Streptomycin sulfate @ 200ppm',
          'Apply Copper oxychloride 50% WP @ 3g/L',
          'Use Validamycin 3% L @ 2ml/L'
        ],
        prevention: [
          'Use disease-free certified seeds',
          'Avoid excessive nitrogen',
          'Maintain proper field sanitation',
          'Grow resistant varieties'
        ]
      },
      {
        id: 'rice_tungro',
        name: 'Tungro Virus',
        scientificName: 'Rice tungro bacilliform virus',
        symptoms: ['Yellow-orange discoloration of leaves', 'Stunted growth', 'Reduced tillering'],
        visualFeatures: {
          color: ['yellow', 'orange', 'pale green'],
          shape: ['uniform', 'diffuse', 'whole leaf'],
          pattern: ['discoloration', 'stunting', 'reduction'],
          location: ['entire plant', 'leaves', 'growth points']
        },
        confidence: 0.85,
        severity: 'high',
        causes: 'Viral disease transmitted by green leafhopper. Favored by high vector populations',
        naturalTreatment: [
          'Control leafhopper population',
          'Remove infected plants',
          'Use neem-based pesticides',
          'Plant resistant varieties'
        ],
        chemicalTreatment: [
          'Apply Imidacloprid 17.8% SL @ 0.3ml/L',
          'Use Thiamethoxam 25% WG @ 0.2g/L',
          'Spray Acephate 75% SP @ 1g/L'
        ],
        prevention: [
          'Use resistant varieties',
          'Control leafhopper vectors',
          'Maintain proper planting time',
          'Avoid late planting'
        ]
      }
    ]
  },
  
  [CROPS.TOMATO]: {
    diseases: [
      {
        id: 'tomato_early_blight',
        name: 'Early Blight',
        scientificName: 'Alternaria solani',
        symptoms: ['Dark brown spots with concentric rings', 'Yellowing around spots', 'Lower leaves affected first'],
        visualFeatures: {
          color: ['brown', 'dark brown', 'yellow'],
          shape: ['circular', 'target-like', 'concentric'],
          pattern: ['rings', 'spots', 'yellowing'],
          location: ['lower leaves', 'older leaves', 'leaf edges']
        },
        confidence: 0.90,
        severity: 'medium',
        causes: 'Fungal disease favored by warm, humid weather and poor air circulation',
        naturalTreatment: [
          'Spray neem oil (2%) with baking soda',
          'Apply copper fungicide spray',
          'Remove affected leaves',
          'Improve air circulation'
        ],
        chemicalTreatment: [
          'Spray Mancozeb 75% WP @ 2g/L',
          'Apply Copper oxychloride 50% WP @ 3g/L',
          'Use Chlorothalonil 75% WP @ 2g/L'
        ],
        prevention: [
          'Crop rotation with non-solanaceous crops',
          'Proper spacing between plants',
          'Avoid overhead irrigation',
          'Use resistant varieties'
        ]
      },
      {
        id: 'tomato_late_blight',
        name: 'Late Blight',
        scientificName: 'Phytophthora infestans',
        symptoms: ['Water-soaked lesions on leaves', 'White fungal growth on undersides', 'Rapid plant collapse'],
        visualFeatures: {
          color: ['water-soaked', 'brown', 'white'],
          shape: ['irregular', 'large patches', 'cottony'],
          pattern: ['lesions', 'fungal growth', 'collapse'],
          location: ['all leaves', 'undersides', 'entire plant']
        },
        confidence: 0.93,
        severity: 'high',
        causes: 'Oomycete disease favored by cool, wet weather. Can destroy entire crop in days',
        naturalTreatment: [
          'Remove infected plants immediately',
          'Apply copper spray preventively',
          'Improve drainage and air flow',
          'Use resistant varieties'
        ],
        chemicalTreatment: [
          'Spray Metalaxyl-M 8% WP @ 2g/L',
          'Apply Mancozeb 75% WP @ 2g/L',
          'Use Copper hydroxide 50% WP @ 3g/L'
        ],
        prevention: [
          'Avoid overhead irrigation',
          'Maintain proper plant spacing',
          'Monitor weather conditions',
          'Use disease-free transplants'
        ]
      },
      {
        id: 'tomato_leaf_curl',
        name: 'Leaf Curl Virus',
        scientificName: 'Tomato leaf curl virus',
        symptoms: ['Upward curling of leaves', 'Yellowing of veins', 'Stunted growth'],
        visualFeatures: {
          color: ['yellow', 'pale green', 'white'],
          shape: ['curled', 'cupped', 'distorted'],
          pattern: ['curling', 'vein clearing', 'stunting'],
          location: ['new growth', 'leaf tips', 'upper leaves']
        },
        confidence: 0.87,
        severity: 'high',
        causes: 'Viral disease transmitted by whiteflies. Favored by high temperatures',
        naturalTreatment: [
          'Control whitefly population',
          'Use yellow sticky traps',
          'Apply neem oil spray',
          'Remove infected plants'
        ],
        chemicalTreatment: [
          'Spray Imidacloprid 17.8% SL @ 0.3ml/L',
          'Apply Thiamethoxam 25% WG @ 0.2g/L',
          'Use Diafenthiuron 50% WP @ 1g/L'
        ],
        prevention: [
          'Use resistant varieties',
          'Control whitefly vectors',
          'Maintain proper sanitation',
          'Avoid infected transplants'
        ]
      }
    ]
  },

  [CROPS.CHILI]: {
    diseases: [
      {
        id: 'chili_leaf_spot',
        name: 'Leaf Spot',
        scientificName: 'Cercospora capsici',
        symptoms: ['Small circular spots on leaves', 'Brown to gray centers', 'Yellowing around spots'],
        visualFeatures: {
          color: ['brown', 'gray', 'yellow'],
          shape: ['circular', 'small', 'numerous'],
          pattern: ['spots', 'halos', 'yellowing'],
          location: ['leaves', 'lower surface', 'older leaves']
        },
        confidence: 0.89,
        severity: 'medium',
        causes: 'Fungal disease favored by high humidity and moderate temperatures',
        naturalTreatment: [
          'Spray neem leaf extract',
          'Apply copper fungicide',
          'Remove infected leaves',
          'Improve air circulation'
        ],
        chemicalTreatment: [
          'Spray Mancozeb 75% WP @ 2g/L',
          'Apply Copper oxychloride 50% WP @ 3g/L',
          'Use Hexaconazole 5% EC @ 1ml/L'
        ],
        prevention: [
          'Crop rotation',
          'Proper spacing',
          'Avoid overhead irrigation',
          'Use disease-free seeds'
        ]
      },
      {
        id: 'chili_wilt',
        name: 'Wilt',
        scientificName: 'Fusarium oxysporum',
        symptoms: ['Wilting of leaves', 'Yellowing and dropping of leaves', 'Vascular discoloration'],
        visualFeatures: {
          color: ['yellow', 'brown', 'wilted'],
          shape: ['wilting', 'drooping', 'vascular'],
          pattern: ['systemic', 'progressive', 'vascular'],
          location: ['entire plant', 'stem', 'vascular system']
        },
        confidence: 0.91,
        severity: 'high',
        causes: 'Soil-borne fungal disease. Favored by high soil moisture and poor drainage',
        naturalTreatment: [
          'Apply Trichoderma viride to soil',
          'Improve soil drainage',
          'Use biofertilizers',
          'Crop rotation with non-solanaceous crops'
        ],
        chemicalTreatment: [
          'Soil drench with Carbendazim 50% WP @ 1g/L',
          'Apply Metalaxyl-M 8% WP @ 2g/L',
          'Use Thiophanate methyl 70% WP @ 1g/L'
        ],
        prevention: [
          'Use resistant varieties',
          'Soil solarization',
          'Proper drainage',
          'Avoid waterlogging'
        ]
      }
    ]
  },

  [CROPS.MANGO]: {
    diseases: [
      {
        id: 'mango_powdery_mildew',
        name: 'Powdery Mildew',
        scientificName: 'Oidium mangiferae',
        symptoms: ['White powdery coating on leaves', 'Flowers and fruits affected', 'Premature fruit drop'],
        visualFeatures: {
          color: ['white', 'powdery', 'gray'],
          shape: ['coating', 'patches', 'dusty'],
          pattern: ['powdery', 'superficial', 'spreading'],
          location: ['leaves', 'flowers', 'young fruits']
        },
        confidence: 0.94,
        severity: 'medium',
        causes: 'Fungal disease favored by high humidity, moderate temperatures',
        naturalTreatment: [
          'Spray sulfur solution',
          'Apply neem oil spray',
          'Remove infected parts',
          'Improve air circulation'
        ],
        chemicalTreatment: [
          'Spray Wettable sulfur 80% WP @ 3g/L',
          'Apply Trifloxystrobin 25% WG @ 0.5g/L',
          'Use Hexaconazole 5% EC @ 1ml/L'
        ],
        prevention: [
          'Proper pruning for air circulation',
          'Avoid excessive nitrogen',
          'Monitor weather conditions',
          'Apply preventive sprays'
        ]
      },
      {
        id: 'mango_anthracnose',
        name: 'Anthracnose',
        scientificName: 'Colletotrichum gloeosporioides',
        symptoms: ['Dark sunken spots on fruits', 'Black lesions on leaves', 'Flower blight'],
        visualFeatures: {
          color: ['black', 'dark brown', 'sunken'],
          shape: ['circular', 'sunken', 'irregular'],
          pattern: ['spots', 'lesions', 'blight'],
          location: ['fruits', 'leaves', 'flowers']
        },
        confidence: 0.92,
        severity: 'high',
        causes: 'Fungal disease favored by high humidity and rainfall during flowering',
        naturalTreatment: [
          'Remove infected fruits and flowers',
          'Apply copper spray',
          'Use botanical fungicides',
          'Proper orchard sanitation'
        ],
        chemicalTreatment: [
          'Spray Mancozeb 75% WP @ 2g/L',
          'Apply Copper oxychloride 50% WP @ 3g/L',
          'Use Carbendazim 50% WP @ 1g/L'
        ],
        prevention: [
          'Proper pruning',
          'Sanitation practices',
          'Timely fungicide application',
          'Use resistant varieties'
        ]
      }
    ]
  },

  [CROPS.BANANA]: {
    diseases: [
      {
        id: 'banana_panama_disease',
        name: 'Panama Disease',
        scientificName: 'Fusarium oxysporum f.sp. cubense',
        symptoms: ['Yellowing of older leaves', 'Splitting of pseudostem', 'Vascular discoloration'],
        visualFeatures: {
          color: ['yellow', 'brown', 'red'],
          shape: ['wilting', 'splitting', 'vascular'],
          pattern: ['systemic', 'progressive', 'vascular'],
          location: ['older leaves', 'pseudostem', 'vascular system']
        },
        confidence: 0.90,
        severity: 'high',
        causes: 'Soil-borne fungal disease. Can survive in soil for decades',
        naturalTreatment: [
          'Apply biocontrol agents',
          'Use organic amendments',
          'Soil solarization',
          'Crop rotation'
        ],
        chemicalTreatment: [
          'Soil drench with Carbendazim',
          'Apply fungicides to planting material',
          'Use systemic fungicides'
        ],
        prevention: [
          'Use disease-free planting material',
          'Soil sterilization',
          'Avoid contaminated equipment',
          'Use resistant varieties'
        ]
      }
    ]
  }
};

export const CROP_FEATURES = {
  [CROPS.RICE]: {
    leafShape: ['long', 'linear', 'lanceolate'],
    leafColor: ['green', 'light green', 'dark green'],
    plantStructure: ['grass', 'tillering', 'panicles'],
    growthPattern: ['upright', 'dense', 'tillering']
  },
  [CROPS.TOMATO]: {
    leafShape: ['lobed', 'compound', 'ovate'],
    leafColor: ['green', 'medium green', 'dark green'],
    plantStructure: ['vine', 'erect', 'branching'],
    growthPattern: ['indeterminate', 'determinate', 'spreading']
  },
  [CROPS.CHILI]: {
    leafShape: ['ovate', 'lanceolate', 'elliptical'],
    leafColor: ['green', 'dark green', 'medium green'],
    plantStructure: ['shrub', 'erect', 'branching'],
    growthPattern: ['compact', 'upright', 'bushy']
  },
  [CROPS.MANGO]: {
    leafShape: ['lanceolate', 'oblong', 'elliptical'],
    leafColor: ['dark green', 'glossy', 'medium green'],
    plantStructure: ['tree', 'evergreen', 'spreading'],
    growthPattern: ['canopy', 'dense', 'upright']
  },
  [CROPS.BANANA]: {
    leafShape: ['oblong', 'elliptical', 'large'],
    leafColor: ['green', 'dark green', 'light green'],
    plantStructure: ['herb', 'pseudostem', 'large'],
    growthPattern: ['upright', 'large leaves', 'clumping']
  }
};

export const VISUAL_ANALYSIS_RULES = {
  // Color-based detection rules
  colorPatterns: {
    'white_powdery': { crops: [CROPS.MANGO, CROPS.TOMATO], diseases: ['powdery_mildew'], confidence: 0.85 },
    'brown_spots': { crops: [CROPS.RICE, CROPS.TOMATO, CROPS.CHILI], diseases: ['blast', 'early_blight', 'leaf_spot'], confidence: 0.80 },
    'yellow_leaves': { crops: [CROPS.RICE, CROPS.TOMATO], diseases: ['tungro', 'bacterial_leaf_blight'], confidence: 0.75 },
    'water_soaked': { crops: [CROPS.TOMATO], diseases: ['late_blight'], confidence: 0.90 },
    'black_lesions': { crops: [CROPS.MANGO, CROPS.BANANA], diseases: ['anthracnose', 'panama_disease'], confidence: 0.85 }
  },
  
  // Shape-based detection rules
  shapePatterns: {
    'circular_spots': { crops: [CROPS.RICE, CROPS.TOMATO, CROPS.CHILI], diseases: ['blast', 'early_blight', 'leaf_spot'], confidence: 0.82 },
    'target_pattern': { crops: [CROPS.TOMATO], diseases: ['early_blight'], confidence: 0.88 },
    'linear_lesions': { crops: [CROPS.RICE], diseases: ['bacterial_leaf_blight'], confidence: 0.85 },
    'irregular_patches': { crops: [CROPS.TOMATO], diseases: ['late_blight'], confidence: 0.87 },
    'curled_leaves': { crops: [CROPS.TOMATO], diseases: ['leaf_curl'], confidence: 0.90 }
  },
  
  // Location-based detection rules
  locationPatterns: {
    'lower_leaves': { crops: [CROPS.TOMATO, CROPS.CHILI], diseases: ['early_blight', 'leaf_spot'], confidence: 0.80 },
    'upper_leaves': { crops: [CROPS.TOMATO], diseases: ['leaf_curl'], confidence: 0.85 },
    'all_leaves': { crops: [CROPS.TOMATO, CROPS.RICE], diseases: ['late_blight', 'tungro'], confidence: 0.88 },
    'flowers_fruits': { crops: [CROPS.MANGO], diseases: ['anthracnose', 'powdery_mildew'], confidence: 0.85 }
  }
};

export function getDiseaseInfo(cropType, diseaseId) {
  const cropData = DISEASE_DATABASE[cropType];
  if (!cropData) return null;
  
  return cropData.diseases.find(disease => disease.id === diseaseId);
}

export function getAllDiseasesForCrop(cropType) {
  return DISEASE_DATABASE[cropType]?.diseases || [];
}

export function getCropFeatures(cropType) {
  return CROP_FEATURES[cropType] || {};
}

export function analyzeVisualFeatures(features) {
  const results = [];
  
  // Analyze color patterns
  if (features.colors) {
    features.colors.forEach(color => {
      const colorRule = VISUAL_ANALYSIS_RULES.colorPatterns[color];
      if (colorRule) {
        results.push({
          type: 'color',
          pattern: color,
          crops: colorRule.crops,
          diseases: colorRule.diseases,
          confidence: colorRule.confidence
        });
      }
    });
  }
  
  // Analyze shape patterns
  if (features.shapes) {
    features.shapes.forEach(shape => {
      const shapeRule = VISUAL_ANALYSIS_RULES.shapePatterns[shape];
      if (shapeRule) {
        results.push({
          type: 'shape',
          pattern: shape,
          crops: shapeRule.crops,
          diseases: shapeRule.diseases,
          confidence: shapeRule.confidence
        });
      }
    });
  }
  
  // Analyze location patterns
  if (features.locations) {
    features.locations.forEach(location => {
      const locationRule = VISUAL_ANALYSIS_RULES.locationPatterns[location];
      if (locationRule) {
        results.push({
          type: 'location',
          pattern: location,
          crops: locationRule.crops,
          diseases: locationRule.diseases,
          confidence: locationRule.confidence
        });
      }
    });
  }
  
  return results;
}

export default {
  CROPS,
  DISEASE_DATABASE,
  CROP_FEATURES,
  VISUAL_ANALYSIS_RULES,
  getDiseaseInfo,
  getAllDiseasesForCrop,
  getCropFeatures,
  analyzeVisualFeatures
};
