/**
 * Comprehensive Crop Disease Detector
 * Covers ALL major crops: Rice, Wheat, Cotton, Tomato, Chilli, Banana, Sugarcane, etc.
 * Works 100% offline with advanced symptom matching
 */

// Import the complete disease database
const ALL_DISEASES = [
  // RICE DISEASES
  {
    id: "rice_blast",
    name: "Rice Blast (Blast Disease)",
    nameTamil: "நெல் வெடிப்பு நோய்",
    nameHindi: "धान का झुलसा रोग",
    crop: "rice",
    symptoms: ["diamond spots", "gray center", "brown margin", "leaf blast", "neck blast", "whitish gray"],
    keywords: ["blast", "diamond", "gray spots", "neck black", "பட்டம்", "झुलसा"],
    treatment: {
      organic: [
        "Spray Neem oil @ 5ml per liter water",
        "Use Pseudomonas fluorescens @ 10g per liter",
        "Apply Trichoderma viride as seed treatment and foliar spray",
        "Remove and burn infected plant parts immediately"
      ],
      chemical: [
        "Tricyclazole 75% WP @ 0.6g per liter water",
        "Carbendazim 50% WP @ 1g per liter",
        "Spray at tillering, booting, and flowering stages"
      ]
    },
    prevention: [
      "Use resistant varieties: IR-64, Jaya, Swarna",
      "Balanced fertilization - avoid excess nitrogen",
      "Seed treatment with Carbendazim before sowing"
    ]
  },
  {
    id: "rice_yellow_spots",
    name: "Tungro Disease / Bacterial Blight",
    nameTamil: "மஞ்சள் புள்ளி நோய்",
    nameHindi: "पीले धब्बे रोग",
    crop: "rice",
    symptoms: ["yellow spots", "yellow streaks", "yellowing", "stunted growth", "mottled leaves", "orange discoloration"],
    keywords: ["yellow", "spots", "streak", "stunted", "மஞ்சள்", "पीला"],
    treatment: {
      organic: [
        "If Tungro: Control green leafhoppers with neem spray @ 5ml/liter",
        "Remove infected plants immediately and destroy",
        "Use yellow sticky traps",
        "Spray neem oil weekly"
      ],
      chemical: [
        "For vector control: Imidacloprid 17.8% SL @ 0.3ml/liter",
        "Thiamethoxam 25% WG @ 0.2g/liter",
        "No direct cure for virus - focus on prevention"
      ]
    },
    prevention: [
      "Plant resistant varieties like TKM-6, Vikram",
      "Control leafhopper population",
      "Remove infected plants immediately (roguing)",
      "Avoid staggered planting"
    ]
  },
  {
    id: "rice_brown_spot",
    name: "Brown Spot",
    nameTamil: "பழுப்பு புள்ளி நோய்",
    nameHindi: "भूरा धब्बा रोग",
    crop: "rice",
    symptoms: ["brown spots", "circular spots", "dark margin", "gray center", "oval spots"],
    keywords: ["brown", "circular", "oval", "பழுப்பு", "भूरा"],
    treatment: {
      organic: [
        "Apply Neem cake @ 200kg per acre",
        "Spray Pseudomonas fluorescens @ 10g per liter",
        "Use cow urine + neem leaf extract (1:10 dilution)"
      ],
      chemical: [
        "Carbendazim 50% WP @ 1g per liter",
        "Propiconazole 25% EC @ 1ml per liter",
        "Spray at booting and flowering stages"
      ]
    },
    prevention: [
      "Use certified disease-free seeds",
      "Apply balanced NPK fertilizer (120:60:40 kg/ha)",
      "Ensure adequate potassium - very important!"
    ]
  },
  {
    id: "rice_sheath_blight",
    name: "Sheath Blight",
    nameTamil: "உறை எரிப்பு",
    nameHindi: "म्यान झुलसा",
    crop: "rice",
    symptoms: ["greenish gray lesions", "oval spots on sheath", "snake skin pattern", "brown margin white center"],
    keywords: ["sheath", "snake skin", "oval lesion", "water level"],
    treatment: {
      organic: [
        "Pseudomonas fluorescens @ 2.5kg/ha mixed in FYM",
        "Neem cake @ 250kg/ha",
        "Trichoderma harzianum soil application"
      ],
      chemical: [
        "Validamycin 3% L @ 2.5ml/liter",
        "Hexaconazole 5% SC @ 2ml/liter",
        "Spray twice at flowering stage"
      ]
    },
    prevention: [
      "Avoid excess nitrogen",
      "Maintain proper plant spacing",
      "Drain water periodically"
    ]
  },
  // TOMATO DISEASES
  {
    id: "tomato_late_blight",
    name: "Late Blight",
    nameTamil: "இறுதி எரிப்பு",
    nameHindi: "अंगमारी रोग",
    crop: "tomato",
    symptoms: ["water soaked", "brown patches", "white fuzzy growth", "rapid wilting", "black spots"],
    keywords: ["water soaked", "fuzzy", "white growth", "late blight", "humid"],
    treatment: {
      organic: [
        "Bordeaux mixture (1%) - Mix 100g copper sulfate + 100g lime in 10L water",
        "Neem oil spray @ 10ml per liter",
        "Remove infected plants immediately"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g per liter",
        "Metalaxyl + Mancozeb @ 2g per liter",
        "Spray every 7-10 days during rainy season"
      ]
    },
    prevention: [
      "Plant resistant varieties: Kufri Girdhari, Arka Rakshak",
      "Maintain 45-60cm spacing",
      "Use drip irrigation, avoid overhead watering"
    ]
  },
  {
    id: "tomato_early_blight",
    name: "Early Blight",
    nameTamil: "ஆரம்ப எரிப்பு",
    nameHindi: "आरंभिक अंगमारी",
    crop: "tomato",
    symptoms: ["dark brown spots", "concentric rings", "target board", "yellow around spots", "lower leaves"],
    keywords: ["target", "concentric", "rings", "early blight", "brown spots lower"],
    treatment: {
      organic: [
        "Copper fungicide @ 3g/liter",
        "Baking soda @ 5g/liter + liquid soap",
        "Remove infected lower leaves"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g/liter",
        "Chlorothalonil 75% WP @ 2g/liter",
        "Spray every 7-10 days"
      ]
    },
    prevention: [
      "Crop rotation with non-solanaceous crops",
      "Mulching to prevent soil splash",
      "Good air circulation"
    ]
  },
  {
    id: "tomato_bacterial_wilt",
    name: "Bacterial Wilt",
    nameTamil: "பாக்டீரியா வாடல்",
    nameHindi: "जीवाणु मुरझान",
    crop: "tomato",
    symptoms: ["sudden wilting", "green leaves wilting", "brown vascular", "bacterial ooze", "entire plant"],
    keywords: ["sudden wilt", "green wilt", "ooze", "vascular brown"],
    treatment: {
      organic: [
        "NO CURE once infected",
        "Remove and burn plants immediately",
        "Soil solarization for 4-6 weeks",
        "Mustard cake @ 500kg/ha"
      ],
      chemical: [
        "Streptocycline 100ppm + Copper oxychloride 0.3%",
        "Preventive only - no cure after infection"
      ]
    },
    prevention: [
      "Plant resistant varieties: Kashi Amrit, Arka Rakshak",
      "Use raised beds",
      "3-year crop rotation",
      "Sterilize tools"
    ]
  },
  // COTTON DISEASES
  {
    id: "cotton_wilt",
    name: "Cotton Wilt (Fusarium/Verticillium)",
    nameTamil: "பருத்தி வாடல்",
    nameHindi: "कपास म्लानि",
    crop: "cotton",
    symptoms: ["yellowing drooping", "one sided wilting", "vascular browning", "stunted growth", "wilting entire plant"],
    keywords: ["cotton wilt", "yellowing", "one side", "कपास", "பருத்தி"],
    treatment: {
      organic: [
        "Trichoderma viride seed treatment @ 10g/kg",
        "Soil application Pseudomonas @ 2.5kg/ha",
        "Neem cake @ 500kg/ha",
        "No cure once infected"
      ],
      chemical: [
        "Carbendazim 50% WP @ 2g/kg seed treatment",
        "Soil drench Carbendazim @ 2g/liter"
      ]
    },
    prevention: [
      "Plant resistant varieties: Bunny Bt, RCH-2",
      "Crop rotation with cereals",
      "Deep summer ploughing"
    ]
  },
  // CHILLI DISEASES
  {
    id: "chilli_leaf_curl",
    name: "Chilli Leaf Curl Virus",
    nameTamil: "மிளகாய் இலை சுருட்டல்",
    nameHindi: "मिर्च पत्ती मोड़",
    crop: "chilli",
    symptoms: ["upward curling", "leaf curl", "yellowing puckering", "stunted growth", "small fruits"],
    keywords: ["curl", "curling", "chilli", "whitefly", "मिर्च", "மிளகாய்"],
    treatment: {
      organic: [
        "Neem oil @ 5ml/liter for whitefly control",
        "Yellow sticky traps",
        "Remove infected plants",
        "Weekly neem spray"
      ],
      chemical: [
        "Imidacloprid 17.8% SL @ 0.5ml/liter",
        "Thiamethoxam 25% WG @ 0.2g/liter",
        "Target whitefly vectors"
      ]
    },
    prevention: [
      "Control whitefly population",
      "Silver plastic mulching",
      "Remove infected plants immediately"
    ]
  },
  // BANANA DISEASES
  {
    id: "banana_panama_wilt",
    name: "Panama Wilt (Fusarium)",
    nameTamil: "வாழை வாடல்",
    nameHindi: "केला मुरझान",
    crop: "banana",
    symptoms: ["yellowing older leaves", "splitting sheaths", "wilting drooping", "brown pseudostem", "plant death"],
    keywords: ["banana wilt", "panama", "yellowing", "வாழை", "केला"],
    treatment: {
      organic: [
        "Remove infected plants immediately",
        "Soil solarization",
        "Trichoderma @ 5kg/ha",
        "NO CURE - prevention only"
      ],
      chemical: [
        "Carbendazim soil drench @ 2g/liter (preventive)",
        "No cure once infected"
      ]
    },
    prevention: [
      "Use tissue culture plants",
      "Plant resistant varieties: Dwarf Cavendish",
      "Avoid waterlogging"
    ]
  },
  // WHEAT DISEASES
  {
    id: "wheat_rust",
    name: "Wheat Rust (Brown/Yellow)",
    nameTamil: "கோதுமை துருப்பிடிப்பு",
    nameHindi: "गेहूं का रतुआ",
    crop: "wheat",
    symptoms: ["orange brown pustules", "yellow stripes", "brown spots leaves", "premature drying", "rust colored"],
    keywords: ["rust", "orange", "pustules", "wheat", "गेहूं", "கோதுமை"],
    treatment: {
      organic: [
        "Sulfur dust @ 20kg/ha",
        "Copper oxychloride @ 3g/liter",
        "Early sowing to escape"
      ],
      chemical: [
        "Propiconazole 25% EC @ 1ml/liter",
        "Tebuconazole 25% EC @ 1ml/liter",
        "Spray at first sign"
      ]
    },
    prevention: [
      "Plant resistant varieties: HD-2967, PBW-343",
      "Early sowing (Oct-Nov)",
      "Avoid excess nitrogen"
    ]
  },
  // SUGARCANE DISEASES
  {
    id: "sugarcane_red_rot",
    name: "Red Rot",
    nameTamil: "கரும்பு சிவப்பு அழுகல்",
    nameHindi: "गन्ना लाल सड़न",
    crop: "sugarcane",
    symptoms: ["reddening internal", "white patches red margins", "drying tips", "side shoots", "sour smell"],
    keywords: ["red rot", "reddening", "sugarcane", "गन्ना", "கரும்பு"],
    treatment: {
      organic: [
        "Hot water treatment of setts (52°C for 30 min)",
        "Trichoderma seed treatment",
        "Remove and burn infected plants"
      ],
      chemical: [
        "Carbendazim 50% WP @ 2g/liter sett treatment",
        "Copper oxychloride + Mancozeb spray"
      ]
    },
    prevention: [
      "Plant resistant varieties: Co-86032",
      "Hot water treatment",
      "Crop rotation"
    ]
  },
  // POTATO DISEASES
  {
    id: "potato_late_blight",
    name: "Late Blight",
    nameTamil: "உருளைக்கிழங்கு எரிப்பு",
    nameHindi: "आलू का झुलसा",
    crop: "potato",
    symptoms: ["water soaked lesions", "brown black patches", "white mold", "rapid spread", "foul smell"],
    keywords: ["late blight", "potato", "water soaked", "white mold", "आलू"],
    treatment: {
      organic: [
        "Bordeaux mixture 1% spray",
        "Remove infected plants immediately",
        "Improve drainage",
        "Use disease-free seed tubers"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g/liter",
        "Metalaxyl + Mancozeb @ 2g/liter",
        "Spray every 7-10 days in rainy season"
      ]
    },
    prevention: [
      "Plant resistant varieties: Kufri Girdhari",
      "Avoid overhead irrigation",
      "Remove crop residues"
    ]
  },
  // ONION DISEASES
  {
    id: "onion_purple_blotch",
    name: "Purple Blotch",
    nameTamil: "வெங்காயம் ஊதா புள்ளி",
    nameHindi: "प्याज बैंगनी धब्बा",
    crop: "onion",
    symptoms: ["purple spots", "concentric rings", "yellowing leaves", "tip dieback"],
    keywords: ["purple", "blotch", "onion", "pyaz", "பெங்காயம்", "प्याज"],
    treatment: {
      organic: [
        "Garlic extract spray @ 50ml/liter",
        "Copper oxychloride @ 3g/liter",
        "Remove infected leaves"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g/liter",
        "Chlorothalonil @ 2g/liter",
        "Spray at 10-day intervals"
      ]
    },
    prevention: [
      "Wide row spacing for air circulation",
      "Avoid overhead watering",
      "Crop rotation with non-allium crops"
    ]
  },
  // MAIZE DISEASES
  {
    id: "maize_blight",
    name: "Maize Blight (Turcicum Leaf Blight)",
    nameTamil: "சோளம் இலை எரிப்பு",
    nameHindi: "मक्का झुलसा",
    crop: "maize",
    symptoms: ["long elliptical lesions", "tan gray color", "leaf blight", "chlorosis"],
    keywords: ["blight", "maize", "corn", "makka", "சோளம்", "मक्का"],
    treatment: {
      organic: [
        "Neem oil @ 5ml/liter",
        "Trichoderma application",
        "Remove infected lower leaves"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g/liter",
        "Propiconazole 25% EC @ 1ml/liter",
        "Spray at tasseling stage"
      ]
    },
    prevention: [
      "Plant resistant hybrids",
      "Balanced fertilization",
      "Crop rotation"
    ]
  },
  // GROUNDNUT DISEASES
  {
    id: "groundnut_tikka",
    name: "Tikka Disease (Leaf Spot)",
    nameTamil: "நிலக்கடலை டிக்கா நோய்",
    nameHindi: "मूंगफली टिक्का",
    crop: "groundnut",
    symptoms: ["circular brown spots", "yellow halo", "premature defoliation", "concentric rings"],
    keywords: ["tikka", "leaf spot", "groundnut", "peanut", "moongfali", "நிலக்கடலை"],
    treatment: {
      organic: [
        "Copper fungicide @ 3g/liter",
        "Neem cake @ 200kg/ha",
        "Pseudomonas spray"
      ],
      chemical: [
        "Mancozeb 75% WP @ 2.5g/liter",
        "Chlorothalonil @ 2g/liter",
        "3 sprays at 15-day intervals starting at 30 days after sowing"
      ]
    },
    prevention: [
      "Use certified disease-free seeds",
      "Crop rotation with cereals",
      "Maintain adequate spacing"
    ]
  },
  // BRINJAL (EGGPLANT) DISEASES
  {
    id: "brinjal_wilt",
    name: "Bacterial Wilt",
    nameTamil: "கத்தரிக்காய் வாடல்",
    nameHindi: "बैंगन मुरझान",
    crop: "brinjal",
    symptoms: ["sudden wilting", "drooping leaves", "yellowing", "vascular browning", "plant death"],
    keywords: ["wilt", "brinjal", "eggplant", "baingan", "கத்தரி"],
    treatment: {
      organic: [
        "Remove and destroy infected plants",
        "Soil solarization",
        "Pseudomonas application",
        "NO CURE - focus on prevention"
      ],
      chemical: [
        "Streptocycline 100ppm + Copper oxychloride 0.3%",
        "Soil drench preventive only"
      ]
    },
    prevention: [
      "Use resistant varieties",
      "Crop rotation for 3 years",
      "Raised bed planting",
      "Use grafted seedlings"
    ]
  },
  // CABBAGE DISEASES
  {
    id: "cabbage_black_rot",
    name: "Black Rot",
    nameTamil: "முட்டைகோஸு கருப்பு அழுகல்",
    nameHindi: "कोभी काला सड़न",
    crop: "cabbage",
    symptoms: ["V-shaped yellow lesions", "black veins", "leaf margins", "vascular blackening"],
    keywords: ["black rot", "cabbage", "patta gobhi", "முட்டைகோஸு"],
    treatment: {
      organic: [
        "Copper hydroxide spray @ 3g/liter",
        "Remove infected plants",
        "Hot water seed treatment (50°C for 20 min)"
      ],
      chemical: [
        "Streptocycline @ 100ppm",
        "Copper oxychloride @ 3g/liter",
        "Preventive sprays at 10-day intervals"
      ]
    },
    prevention: [
      "Use disease-free seeds",
      "Crop rotation",
      "Avoid overhead irrigation",
      "Remove crop debris"
    ]
  }
];

class ComprehensiveDiseaseDetector {
  constructor() {
    this.diseases = ALL_DISEASES;
    this.cropMap = {
      'rice': ['rice', 'paddy', 'dhan', 'நெல்', 'धान', 'chawal'],
      'tomato': ['tomato', 'tamatar', 'தக்காளி', 'टमाटर'],
      'cotton': ['cotton', 'kapas', 'பருத்தி', 'कपास', 'रुई'],
      'chilli': ['chilli', 'chili', 'mirchi', 'மிளகாய்', 'मिर्च'],
      'banana': ['banana', 'kela', 'வாழை', 'केला'],
      'wheat': ['wheat', 'gehun', 'கோதுமை', 'गेहूं'],
      'sugarcane': ['sugarcane', 'ganna', 'கரும்பு', 'गन्ना'],
      'potato': ['potato', 'aloo', 'உருளைக்கிழங்கு', 'आलू'],
      'onion': ['onion', 'pyaz', 'வெங்காயம்', 'प्याज'],
      'maize': ['maize', 'corn', 'makka', 'சோளம்', 'मक्का'],
      'groundnut': ['groundnut', 'peanut', 'moongfali', 'நிலக்கடலை', 'मूंगफली'],
      'brinjal': ['brinjal', 'eggplant', 'baingan', 'கத்தரி', 'बैंगन'],
      'cabbage': ['cabbage', 'patta gobhi', 'முட்டைகோஸு', 'कोभी']
    };
  }

  /**
   * Main detection method
   * @param {string} description - Symptom description
   * @param {string} crop - Crop name (optional)
   * @param {string} language - Language code
   * @returns {Array} - Array of matching diseases
   */
  detect(description, crop = '', language = 'en') {
    const normalizedDesc = description.toLowerCase();
    // UNKNOWN_CROP gate: an explicitly named but unrecognized crop must NOT
    // fall through to cross-crop guessing. Only a genuinely absent crop hint
    // (''/whitespace) searches all crops by symptoms.
    const explicitCrop = String(crop || '').trim();
    if (explicitCrop && !this.normalizeCrop(explicitCrop) && !this.detectCropFromDescription(normalizedDesc)) {
      return [];
    }
    // Prefer an explicitly recognized crop; fall back to crop evidence in the
    // description. An unrecognized explicit crop never widens the search.
    const detectedCrop = this.normalizeCrop(explicitCrop) || this.detectCropFromDescription(normalizedDesc);
    
    const matches = [];

    for (const disease of this.diseases) {
      // Filter by crop if specified
      if (detectedCrop && disease.crop !== detectedCrop) {
        continue;
      }

      const score = this.calculateMatchScore(disease, normalizedDesc);
      
      if (score > 0.2) { // Lower threshold for better detection
        matches.push({
          disease: {
            id: disease.id,
            name: this.getLocalizedName(disease, language),
            crop: disease.crop,
            englishName: disease.name
          },
          confidence: Math.min(Math.round(score * 100), 95),
          matchedSymptoms: this.getMatchedSymptoms(disease, normalizedDesc),
          treatment: disease.treatment,
          prevention: disease.prevention,
          summary: this.generateSummary(disease, score, language)
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches.slice(0, 3); // Top 3 matches
  }

  calculateMatchScore(disease, description) {
    let score = 0;
    let matchCount = 0;

    // Check symptoms
    for (const symptom of disease.symptoms) {
      const symptomWords = symptom.toLowerCase().split(' ');
      const matches = symptomWords.filter(word => 
        word.length > 3 && description.includes(word)
      ).length;

      if (matches > 0) {
        score += (matches / symptomWords.length) * 0.3;
        matchCount++;
      }
    }

    // Check keywords (higher weight)
    for (const keyword of disease.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score += 0.4;
        matchCount++;
      }
    }

    return matchCount > 0 ? score / Math.sqrt(matchCount) : 0;
  }

  normalizeCrop(cropInput) {
    const input = cropInput.toLowerCase();
    for (const [crop, aliases] of Object.entries(this.cropMap)) {
      if (aliases.some(alias => input.includes(alias))) {
        return crop;
      }
    }
    return null;
  }

  detectCropFromDescription(description) {
    for (const [crop, aliases] of Object.entries(this.cropMap)) {
      if (aliases.some(alias => description.includes(alias))) {
        return crop;
      }
    }
    return null;
  }

  getMatchedSymptoms(disease, description) {
    const matched = [];
    for (const symptom of disease.symptoms) {
      if (description.includes(symptom.toLowerCase()) ||
          symptom.toLowerCase().split(' ').some(word => 
            word.length > 4 && description.includes(word)
          )) {
        matched.push(symptom);
      }
    }
    return matched.slice(0, 5);
  }

  getLocalizedName(disease, language) {
    switch(language) {
      case 'ta': return disease.nameTamil || disease.name;
      case 'hi': return disease.nameHindi || disease.name;
      default: return disease.name;
    }
  }

  generateSummary(disease, score, language) {
    const messages = [];
    
    if (score > 0.7) {
      messages.push("High probability match based on symptoms");
    } else if (score > 0.4) {
      messages.push("Likely match - verify with visual inspection");
    } else {
      messages.push("Possible match - consider other diseases too");
    }

    messages.push(`This affects ${disease.crop} crops`);
    
    return messages;
  }

  /**
   * Get all diseases for a specific crop
   */
  getDiseasesByCrop(crop) {
    const normalizedCrop = this.normalizeCrop(crop);
    return this.diseases.filter(d => d.crop === normalizedCrop);
  }

  /**
   * Get all supported crops
   */
  getSupportedCrops() {
    return [...new Set(this.diseases.map(d => d.crop))];
  }
}

// Export singleton
export default new ComprehensiveDiseaseDetector();
