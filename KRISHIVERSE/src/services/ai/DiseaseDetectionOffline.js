/**
 * Offline Disease Detection Service
 * 
 * Rule-based disease identification from symptoms
 * Works 100% offline using local knowledge base
 * Supports multiple languages (English, Tamil, Hindi)
 */

class DiseaseDetectionOffline {
  constructor() {
    this.diseases = this.initializeDiseaseDatabase();
    this.symptomKeywords = this.initializeSymptomKeywords();
  }

  initializeDiseaseDatabase() {
    return [
      {
        id: 'late_blight',
        name: 'Late Blight',
        nameTamil: 'இறுதி எரிப்பு நோய்',
        nameHindi: 'अंगमारी रोग',
        crops: ['potato', 'tomato'],
        symptoms: {
          leaf: ['water-soaked lesions', 'brown patches', 'black patches', 'white fuzzy growth', 'rapid wilting'],
          stem: ['brown discoloration', 'soft rot'],
          fruit: ['brown rot', 'firm rot'],
          tuber: ['brown discoloration', 'firm decay']
        },
        organicTreatment: [
          'Bordeaux mixture (1% solution) - Mix 100g copper sulfate + 100g lime in 10L water',
          'Neem oil spray - 10ml neem oil + 1ml liquid soap per liter water',
          'Remove and destroy infected plants immediately',
          'Spray every 7-10 days during rainy season'
        ],
        chemicalTreatment: [
          'Mancozeb 75% WP @ 2.5g per liter water',
          'Metalaxyl + Mancozeb @ 2g per liter',
          'Spray at 7-10 day intervals',
          'Start spraying preventively before disease appears'
        ],
        prevention: [
          'Plant resistant varieties like Kufri Girdhari (potato) or Arka Rakshak (tomato)',
          'Maintain plant spacing of 45-60cm',
          'Avoid overhead irrigation - use drip if possible',
          'Remove all crop debris after harvest',
          'Rotate with non-solanaceous crops for 2-3 years'
        ],
        severity: 'very_high',
        confidenceFactors: {
          'water-soaked': 0.3,
          'brown patches': 0.2,
          'white fuzzy': 0.4,
          'rapid': 0.3,
          'humid weather': 0.2
        }
      },
      {
        id: 'brown_spot',
        name: 'Brown Spot',
        nameTamil: 'பழுப்பு புள்ளி நோய்',
        nameHindi: 'भूरा धब्बा रोग',
        crops: ['rice', 'paddy'],
        symptoms: {
          leaf: ['circular brown spots', 'oval brown spots', 'dark margins', 'gray center', 'spots merge', 'leaf death'],
          grain: ['brown discoloration', 'poor quality']
        },
        organicTreatment: [
          'Neem cake application - 200kg per acre during land preparation',
          'Pseudomonas fluorescens - Mix 10g in 1 liter water and spray',
          'Cow urine + neem leaf extract - 10L cow urine + 5kg neem leaves, ferment 15 days, dilute 1:10',
          'Apply potassium-rich organic fertilizer (wood ash or banana peel compost)'
        ],
        chemicalTreatment: [
          'Carbendazim 50% WP @ 1g per liter water',
          'Propiconazole 25% EC @ 1ml per liter',
          'Spray at booting stage (50-60 days after transplanting)',
          'Repeat spray at flowering stage if disease persists'
        ],
        prevention: [
          'Use certified, disease-free seeds',
          'Treat seeds with Trichoderma @ 10g per kg seed',
          'Apply balanced fertilizer - NPK 120:60:40 kg per hectare',
          'Ensure adequate potassium - very important for this disease',
          'Avoid water stress - maintain proper water level',
          'Burn or bury infected stubble after harvest'
        ],
        severity: 'medium',
        confidenceFactors: {
          'circular spots': 0.3,
          'brown spots': 0.3,
          'dark margin': 0.2,
          'gray center': 0.3,
          'rice': 0.2
        }
      },
      {
        id: 'bacterial_wilt',
        name: 'Bacterial Wilt',
        nameTamil: 'பாக்டீரியா வாடல்',
        nameHindi: 'जीवाणु मुरझान',
        crops: ['tomato', 'potato', 'brinjal', 'chilli', 'capsicum'],
        symptoms: {
          whole_plant: ['sudden wilting', 'wilting despite wet soil', 'entire plant affected'],
          leaf: ['leaves stay green while wilting', 'drooping'],
          stem: ['brown vascular tissue', 'bacterial ooze', 'slimy discharge when cut']
        },
        organicTreatment: [
          'NO CURE once infected - prevention is key',
          'Remove and burn infected plants immediately - do not compost',
          'Soil solarization - Cover moist soil with clear plastic for 4-6 weeks in summer',
          'Mustard cake amendment - 500kg per hectare before planting',
          'Avoid planting solanaceous crops for 3-4 years in affected area'
        ],
        chemicalTreatment: [
          'Streptocycline 100ppm + Copper oxychloride 0.3% - Drench soil around healthy plants',
          'Bleaching powder - 10kg per hectare mixed in irrigation water',
          'Formaldehyde soil treatment before planting (not after infection)',
          'NO effective chemical treatment once plant is infected'
        ],
        prevention: [
          'MOST IMPORTANT: Plant resistant varieties like Kashi Amrit, Arka Rakshak',
          'Use raised beds for better drainage',
          'Rotate with non-solanaceous crops (rice, maize, pulses) for 3-4 years',
          'Use only disease-free transplants from reliable nursery',
          'Sterilize tools with bleach solution between plants',
          'Do not work in field when plants are wet',
          'Avoid deep cultivation which can spread bacteria'
        ],
        severity: 'very_high',
        confidenceFactors: {
          'sudden wilting': 0.4,
          'green leaves': 0.3,
          'wet soil': 0.2,
          'brown stem': 0.3,
          'ooze': 0.4
        }
      },
      {
        id: 'powdery_mildew',
        name: 'Powdery Mildew',
        nameTamil: 'பொடி பூஞ்சை நோய்',
        nameHindi: 'चूर्णिल आसिता',
        crops: ['cucumber', 'pumpkin', 'bottle gourd', 'ridge gourd', 'muskmelon', 'pea', 'okra'],
        symptoms: {
          leaf: ['white powdery coating', 'upper leaf surface affected first', 'spreads to both surfaces', 'leaf yellowing', 'premature leaf drop'],
          stem: ['white powdery growth'],
          fruit: ['poor quality', 'reduced size']
        },
        organicTreatment: [
          'Milk spray - Mix 1 part milk with 9 parts water, spray weekly',
          'Baking soda solution - 5g baking soda + 5ml liquid soap per liter water',
          'Neem oil spray - 10ml neem oil per liter water',
          'Sulfur dust - Dust sulfur powder on affected plants early morning',
          'Remove severely affected leaves and destroy'
        ],
        chemicalTreatment: [
          'Sulfur 80% WP @ 2g per liter water',
          'Hexaconazole 5% EC @ 1ml per liter',
          'Dinocap 48% EC @ 1ml per liter',
          'Spray at 10-15 day intervals',
          'Start spraying at first sign of disease'
        ],
        prevention: [
          'Plant resistant varieties when available',
          'Ensure good air circulation - proper spacing (1-1.5m)',
          'Avoid overhead irrigation - use drip system',
          'Remove crop residues after harvest',
          'Spray preventively with sulfur or neem oil from flowering stage',
          'Avoid excess nitrogen fertilizer which makes plants susceptible'
        ],
        severity: 'medium',
        confidenceFactors: {
          'white powder': 0.5,
          'leaf surface': 0.3,
          'yellowing': 0.2,
          'cucurbit': 0.2
        }
      }
    ];
  }

  initializeSymptomKeywords() {
    return {
      leaf: {
        english: ['leaf', 'leaves', 'foliage'],
        tamil: ['இலை', 'இலைகள்'],
        hindi: ['पत्ता', 'पत्ते', 'पत्ती']
      },
      spots: {
        english: ['spot', 'spots', 'patches', 'lesion', 'lesions'],
        tamil: ['புள்ளி', 'புள்ளிகள்', 'திட்டு'],
        hindi: ['धब्बा', 'धब्बे', 'दाग']
      },
      color_brown: {
        english: ['brown', 'brownish'],
        tamil: ['பழுப்பு', 'பழுப்பு நிறம்'],
        hindi: ['भूरा', 'भूरे रंग']
      },
      color_yellow: {
        english: ['yellow', 'yellowing', 'golden'],
        tamil: ['மஞ்சள்', 'மஞ்சள் நிறம்'],
        hindi: ['पीला', 'पीलापन']
      },
      wilting: {
        english: ['wilt', 'wilting', 'drooping', 'sagging'],
        tamil: ['வாடுதல்', 'தொங்குதல்'],
        hindi: ['मुरझाना', 'सूखना']
      },
      powder: {
        english: ['powder', 'powdery', 'dusty', 'white coating'],
        tamil: ['பொடி', 'தூள்'],
        hindi: ['पाउडर', 'चूर्ण', 'सफेद परत']
      }
    };
  }

  /**
   * Main detection function
   * @param {string} description - User's symptom description
   * @param {string} crop - Crop name
   * @param {string} language - 'en', 'ta', or 'hi'
   * @returns {Array} - Array of disease matches with confidence scores
   */
  detectDisease(description, crop = '', language = 'en') {
    const normalizedDesc = description.toLowerCase();
    const normalizedCrop = crop.toLowerCase();
    
    const matches = [];

    for (const disease of this.diseases) {
      // Check if crop matches
      const cropMatch = this.checkCropMatch(disease.crops, normalizedCrop);
      if (!cropMatch) continue;

      // Calculate symptom match score
      const symptomScore = this.calculateSymptomMatch(disease, normalizedDesc);
      
      if (symptomScore > 0.3) { // Minimum threshold
        const confidence = Math.min(symptomScore * 100, 95);
        
        matches.push({
          disease: {
            id: disease.id,
            name: this.getDiseaseName(disease, language),
            severity: disease.severity,
            affectedCrops: disease.crops
          },
          confidence: Math.round(confidence),
          symptoms: this.getMatchedSymptoms(disease, normalizedDesc),
          treatments: {
            organic: disease.organicTreatment,
            chemical: disease.chemicalTreatment
          },
          prevention: disease.prevention,
          advice: this.generateAdvice(disease, confidence, language)
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return top 3 matches
    return matches.slice(0, 3);
  }

  checkCropMatch(diseaseCrops, userCrop) {
    if (!userCrop) return true; // If no crop specified, check all
    
    // Normalize crop names
    const cropAliases = {
      'rice': ['rice', 'paddy', 'dhan', 'நெல்'],
      'tomato': ['tomato', 'tamatar', 'தக்காளி'],
      'potato': ['potato', 'aloo', 'உருளைக்கிழங்கு'],
      'chilli': ['chilli', 'chili', 'mirchi', 'மிளகாய்']
    };

    for (const diseaseCrop of diseaseCrops) {
      const aliases = cropAliases[diseaseCrop] || [diseaseCrop];
      if (aliases.some(alias => userCrop.includes(alias))) {
        return true;
      }
    }
    return false;
  }

  calculateSymptomMatch(disease, description) {
    let totalScore = 0;
    let matchCount = 0;

    // Check all symptom categories
    for (const [category, symptoms] of Object.entries(disease.symptoms)) {
      for (const symptom of symptoms) {
        const symptomWords = symptom.toLowerCase().split(' ');
        const keyWordMatches = symptomWords.filter(word => 
          word.length > 3 && description.includes(word)
        );

        if (keyWordMatches.length > 0) {
          const matchRatio = keyWordMatches.length / symptomWords.length;
          const confidence = disease.confidenceFactors[symptom] || 0.2;
          totalScore += matchRatio * confidence;
          matchCount++;
        }
      }
    }

    return matchCount > 0 ? totalScore / Math.sqrt(matchCount) : 0;
  }

  getMatchedSymptoms(disease, description) {
    const matched = [];
    
    for (const [category, symptoms] of Object.entries(disease.symptoms)) {
      for (const symptom of symptoms) {
        if (description.includes(symptom.toLowerCase()) || 
            symptom.toLowerCase().split(' ').some(word => description.includes(word))) {
          matched.push(symptom);
        }
      }
    }

    return matched.slice(0, 5); // Top 5 matched symptoms
  }

  getDiseaseName(disease, language) {
    switch(language) {
      case 'ta': return disease.nameTamil || disease.name;
      case 'hi': return disease.nameHindi || disease.name;
      default: return disease.name;
    }
  }

  generateAdvice(disease, confidence, language) {
    const severityAdvice = {
      'very_high': 'URGENT: This is a serious disease. Take immediate action to prevent crop loss.',
      'high': 'Important: Act quickly to control this disease and prevent spread.',
      'medium': 'Monitor closely and apply treatments as recommended.',
      'low': 'Manageable with proper care. Follow prevention practices.'
    };

    const advice = [];
    
    if (confidence > 80) {
      advice.push('High probability of this disease based on symptoms described.');
    } else if (confidence > 60) {
      advice.push('Likely to be this disease. Confirm with visual inspection.');
    } else {
      advice.push('Possible match. Consider other diseases with similar symptoms.');
    }

    advice.push(severityAdvice[disease.severity] || severityAdvice.medium);

    if (disease.severity === 'very_high') {
      advice.push('Consult agricultural officer immediately if unsure.');
    }

    return advice;
  }

  /**
   * Get treatment recommendation based on farming type
   */
  getTreatment(diseaseId, type = 'organic') {
    const disease = this.diseases.find(d => d.id === diseaseId);
    if (!disease) return null;

    return {
      disease: disease.name,
      treatments: type === 'organic' ? disease.organicTreatment : disease.chemicalTreatment,
      prevention: disease.prevention,
      severity: disease.severity
    };
  }
}

// Export singleton instance
export default new DiseaseDetectionOffline();
