// Enhanced Agricultural Chatbot Service
// High-accuracy farming assistance with comprehensive knowledge base

import AgriculturalKnowledgeBase from './AgriculturalKnowledgeBase.js';

class EnhancedAgriculturalChatbot {
  constructor() {
    this.knowledgeBase = new AgriculturalKnowledgeBase();
    this.context = {
      userLocation: 'Tamil Nadu',
      currentSeason: null,
      cropTypes: [],
      lastQuestions: [],
      userProfile: {
        language: 'en',
        experience: 'intermediate'
      }
    };
    this.responseCache = new Map();
  }

  // Main chatbot response method
  async getResponse(question, userContext = {}) {
    try {
      // Update context
      this.updateContext(userContext);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(question, this.context);
      if (this.responseCache.has(cacheKey)) {
        return this.responseCache.get(cacheKey);
      }

      // Process the question
      const processedQuestion = this.preprocessQuestion(question);
      
      // Determine response strategy
      const responseStrategy = this.determineResponseStrategy(processedQuestion);
      
      // Generate response based on strategy
      let response;
      switch (responseStrategy) {
        case 'crop_specific':
          response = await this.handleCropSpecificQuery(processedQuestion);
          break;
        case 'disease_diagnosis':
          response = await this.handleDiseaseQuery(processedQuestion);
          break;
        case 'fertilizer_recommendation':
          response = await this.handleFertilizerQuery(processedQuestion);
          break;
        case 'scheme_information':
          response = await this.handleSchemeQuery(processedQuestion);
          break;
        case 'weather_advice':
          response = await this.handleWeatherQuery(processedQuestion);
          break;
        case 'market_prices':
          response = await this.handleMarketQuery(processedQuestion);
          break;
        case 'general_farming':
          response = await this.handleGeneralQuery(processedQuestion);
          break;
        default:
          response = await this.handleFallbackQuery(processedQuestion);
      }

      // Personalize response
      const personalizedResponse = this.personalizeResponse(response, processedQuestion);
      
      // Cache response
      this.responseCache.set(cacheKey, personalizedResponse);
      
      // Update context
      this.updateContextAfterResponse(processedQuestion, personalizedResponse);
      
      return personalizedResponse;
      
    } catch (error) {
      console.error('Chatbot error:', error);
      return this.getErrorResponse(error);
    }
  }

  // Preprocess question for better understanding
  preprocessQuestion(question) {
    const processed = {
      original: question,
      normalized: question.toLowerCase().trim(),
      tokens: this.tokenize(question),
      entities: this.extractEntities(question),
      intent: this.detectIntent(question),
      confidence: 0
    };

    // Calculate confidence
    processed.confidence = this.calculateIntentConfidence(processed);
    
    return processed;
  }

  // Tokenize question
  tokenize(question) {
    // Remove punctuation and split into words
    return question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  // Extract entities (crops, diseases, chemicals, etc.)
  extractEntities(question) {
    const entities = {
      crops: [],
      diseases: [],
      chemicals: [],
      numbers: [],
      locations: [],
      seasons: []
    };

    // Extract crops
    const crops = ['rice', 'paddy', 'wheat', 'cotton', 'sugarcane', 'tomato', 'chilli', 'onion', 'mango', 'banana', 'groundnut', 'turmeric', 'ginger', 'potato', 'brinjal', 'ladyfinger', 'coriander', 'garlic', 'mustard', 'soybean'];
    entities.crops = crops.filter(crop => question.toLowerCase().includes(crop));

    // Extract diseases
    const diseases = ['blast', 'blight', 'wilt', 'rot', 'curl', 'mosaic', 'spot', 'rust', 'mildew', 'anthracnose', 'virus', 'bacterial', 'fungal'];
    entities.diseases = diseases.filter(disease => question.toLowerCase().includes(disease));

    // Extract chemicals
    const chemicals = ['urea', 'dap', 'mop', 'nitrogen', 'phosphorus', 'potassium', 'npk', 'pesticide', 'fungicide', 'insecticide', 'herbicide'];
    entities.chemicals = chemicals.filter(chemical => question.toLowerCase().includes(chemical));

    // Extract numbers
    const numbers = question.match(/\d+/g);
    entities.numbers = numbers ? numbers.map(Number) : [];

    // Extract locations
    const locations = ['tamil nadu', 'coimbatore', 'chennai', 'madurai', 'trichy', 'salem', 'erode', 'tirupur'];
    entities.locations = locations.filter(location => question.toLowerCase().includes(location));

    // Extract seasons
    const seasons = ['kharif', 'rabi', 'summer', 'winter', 'monsoon'];
    entities.seasons = seasons.filter(season => question.toLowerCase().includes(season));

    return entities;
  }

  // Detect user intent
  detectIntent(question) {
    const intents = {
      'crop_info': ['how to grow', 'planting', 'cultivation', 'growing'],
      'disease_help': ['disease', 'pest', 'problem', 'symptom', 'infected'],
      'fertilizer_dose': ['fertilizer', 'dose', 'how much', 'quantity', 'amount'],
      'scheme_query': ['scheme', 'subsidy', 'government', 'benefit', 'money'],
      'weather_advice': ['weather', 'rain', 'climate', 'temperature'],
      'market_query': ['price', 'market', 'sell', 'rate', 'mandi'],
      'irrigation': ['water', 'irrigation', 'drip', 'sprinkler'],
      'harvest': ['harvest', 'cutting', 'ready', 'mature'],
      'seed_info': ['seed', 'variety', 'germination'],
      'soil_health': ['soil', 'ph', 'testing', 'health'],
      'general_help': ['help', 'what', 'how', 'why', 'tell me']
    };

    const questionLower = question.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => questionLower.includes(keyword))) {
        return intent;
      }
    }
    
    return 'general_help';
  }

  // Calculate intent confidence
  calculateIntentConfidence(processed) {
    // Simple confidence calculation based on keyword matches
    const intentKeywords = {
      'crop_info': 3,
      'disease_help': 3,
      'fertilizer_dose': 3,
      'scheme_query': 3,
      'weather_advice': 2,
      'market_query': 2,
      'irrigation': 2,
      'harvest': 2,
      'seed_info': 2,
      'soil_health': 2,
      'general_help': 1
    };

    const baseConfidence = intentKeywords[processed.intent] || 0.5;
    const entityBonus = (processed.entities.crops.length + processed.entities.diseases.length) * 0.1;
    const lengthBonus = processed.tokens.length > 5 ? 0.1 : 0;
    
    return Math.min(1, baseConfidence + entityBonus + lengthBonus);
  }

  // Determine response strategy
  determineResponseStrategy(processedQuestion) {
    if (processedQuestion.entities.crops.length > 0) {
      if (processedQuestion.entities.diseases.length > 0) {
        return 'disease_diagnosis';
      }
      return 'crop_specific';
    }
    
    if (processedQuestion.entities.chemicals.length > 0) {
      return 'fertilizer_recommendation';
    }
    
    if (processedQuestion.intent === 'scheme_query') {
      return 'scheme_information';
    }
    
    if (processedQuestion.intent === 'weather_advice') {
      return 'weather_advice';
    }
    
    if (processedQuestion.intent === 'market_query') {
      return 'market_prices';
    }
    
    return 'general_farming';
  }

  // Handle crop-specific queries
  async handleCropSpecificQuery(processedQuestion) {
    const crop = processedQuestion.entities.crops[0] || 'general';
    const cropInfo = this.knowledgeBase.getCropInfo(crop);
    
    if (!cropInfo) {
      return this.getNoCropFoundResponse(crop);
    }

    let response = '';
    
    switch (processedQuestion.intent) {
      case 'crop_info':
        response = this.getCropCultivationInfo(cropInfo);
        break;
      case 'irrigation':
        response = this.getCropIrrigationInfo(cropInfo);
        break;
      case 'harvest':
        response = this.getCropHarvestInfo(cropInfo);
        break;
      case 'seed_info':
        response = this.getCropSeedInfo(cropInfo);
        break;
      default:
        response = this.getCropGeneralInfo(cropInfo);
    }

    return {
      type: 'crop_specific',
      crop: crop,
      response: response,
      confidence: processedQuestion.confidence,
      followUpQuestions: this.generateCropFollowUpQuestions(cropInfo)
    };
  }

  // Handle disease queries
  async handleDiseaseQuery(processedQuestion) {
    const crop = processedQuestion.entities.crops[0] || 'general';
    const disease = processedQuestion.entities.diseases[0] || 'general';
    
    const diseaseInfo = this.knowledgeBase.getDiseaseInfo(crop, disease);
    
    if (!diseaseInfo) {
      return this.getNoDiseaseFoundResponse(crop, disease);
    }

    const response = this.getDiseaseTreatmentInfo(diseaseInfo);

    return {
      type: 'disease_diagnosis',
      crop: crop,
      disease: disease,
      response: response,
      confidence: processedQuestion.confidence,
      severity: diseaseInfo.severity,
      urgency: diseaseInfo.urgency
    };
  }

  // Handle fertilizer queries
  async handleFertilizerQuery(processedQuestion) {
    const crop = processedQuestion.entities.crops[0] || 'general';
    const chemical = processedQuestion.entities.chemicals[0] || 'general';
    
    const fertilizerInfo = this.knowledgeBase.getFertilizerInfo(crop, chemical);
    
    if (!fertilizerInfo) {
      return this.getNoFertilizerFoundResponse(crop, chemical);
    }

    const response = this.getFertilizerRecommendation(fertilizerInfo);

    return {
      type: 'fertilizer_recommendation',
      crop: crop,
      fertilizer: chemical,
      response: response,
      confidence: processedQuestion.confidence,
      dosage: fertilizerInfo.dosage,
      application: fertilizerInfo.application
    };
  }

  // Handle scheme queries
  async handleSchemeQuery(processedQuestion) {
    const schemes = this.knowledgeBase.getRelevantSchemes(this.context.userLocation);
    
    const response = this.getSchemeInformation(schemes);

    return {
      type: 'scheme_information',
      response: response,
      confidence: processedQuestion.confidence,
      schemes: schemes
    };
  }

  // Handle weather queries
  async handleWeatherQuery(processedQuestion) {
    const weatherAdvice = this.knowledgeBase.getWeatherAdvice(this.context.currentSeason);

    const response = this.getWeatherRecommendation(weatherAdvice);

    return {
      type: 'weather_advice',
      response: response,
      confidence: processedQuestion.confidence,
      season: this.context.currentSeason
    };
  }

  // Handle market queries
  async handleMarketQuery(processedQuestion) {
    const crop = processedQuestion.entities.crops[0] || 'general';
    const marketInfo = this.knowledgeBase.getMarketInfo(crop);

    const response = this.getMarketAdvice(marketInfo);

    return {
      type: 'market_prices',
      crop: crop,
      response: response,
      confidence: processedQuestion.confidence,
      marketInfo: marketInfo
    };
  }

  // Handle general queries
  async handleGeneralQuery(processedQuestion) {
    const generalInfo = this.knowledgeBase.getGeneralFarmingAdvice();

    const response = this.getGeneralAdvice(generalInfo);

    return {
      type: 'general_farming',
      response: response,
      confidence: processedQuestion.confidence
    };
  }

  // Handle fallback queries
  async handleFallbackQuery(processedQuestion) {
    return {
      type: 'fallback',
      response: "I'm not sure I understand your question. Could you please provide more details about your farming concern? You can ask about specific crops, diseases, fertilizers, or government schemes.",
      confidence: 0.3,
      suggestions: this.getGeneralSuggestions()
    };
  }

  // Generate crop cultivation information
  getCropCultivationInfo(cropInfo) {
    return `**${cropInfo.name} Cultivation Guide**

**Climate Requirements:**
${cropInfo.climate}

**Soil Requirements:**
${cropInfo.soil}

**Planting Season:**
${cropInfo.season}

**Planting Method:**
${cropInfo.planting}

**Spacing:**
${cropInfo.spacing}

**Irrigation Schedule:**
${cropInfo.irrigation}

**Key Management Practices:**
${cropInfo.management.join('\n')}

**Expected Yield:**
${cropInfo.yield}

**Tips for Success:**
${cropInfo.tips.join('\n')}`;
  }

  // Generate crop irrigation information
  getCropIrrigationInfo(cropInfo) {
    return `**${cropInfo.name} Irrigation Guide**

**Water Requirements:**
${cropInfo.waterRequirements}

**Irrigation Schedule:**
${cropInfo.irrigationSchedule}

**Critical Growth Stages for Irrigation:**
${cropInfo.criticalStages.join('\n')}

**Irrigation Methods:**
${cropInfo.irrigationMethods.join('\n')}

**Water Conservation Tips:**
${cropInfo.waterConservation.join('\n')}

**Signs of Water Stress:**
${cropInfo.waterStressSymptoms.join('\n')}`;
  }

  // Generate crop harvest information
  getCropHarvestInfo(cropInfo) {
    return `**${cropInfo.name} Harvest Guide**

**Harvesting Time:**
${cropInfo.harvestTime}

**Harvesting Indicators:**
${cropInfo.harvestIndicators.join('\n')}

**Harvesting Method:**
${cropInfo.harvestMethod}

**Post-Harvest Handling:**
${cropInfo.postHarvest.join('\n')}

**Storage Requirements:**
${cropInfo.storage}

**Yield Optimization:**
${cropInfo.yieldOptimization.join('\n')}`;
  }

  // Generate crop seed information
  getCropSeedInfo(cropInfo) {
    return `**${cropInfo.name} Seed Information**

**Recommended Varieties:**
${cropInfo.varieties.join('\n')}

**Seed Rate:**
${cropInfo.seedRate}

**Seed Treatment:**
${cropInfo.seedTreatment}

**Germination Period:**
${cropInfo.germination}

**Seed Source:**
${cropInfo.seedSource}

**Quality Indicators:**
${cropInfo.seedQuality.join('\n')}`;
  }

  // Generate crop general information
  getCropGeneralInfo(cropInfo) {
    return `**${cropInfo.name} Overview**

${cropInfo.description}

**Key Benefits:**
${cropInfo.benefits.join('\n')}

**Growing Difficulty:**
${cropInfo.difficulty}

**Profitability:**
${cropInfo.profitability}

**Common Challenges:**
${cropInfo.challenges.join('\n')}

**Best Suited For:**
${cropInfo.suitableFor.join('\n')}`;
  }

  // Generate disease treatment information
  getDiseaseTreatmentInfo(diseaseInfo) {
    return `**${diseaseInfo.name} Treatment**

**Symptoms:**
${diseaseInfo.symptoms.join('\n')}

**Causes:**
${diseaseInfo.causes}

**Natural Treatments:**
${diseaseInfo.naturalTreatment.join('\n')}

**Chemical Treatments:**
${diseaseInfo.chemicalTreatment.join('\n')}

**Prevention Measures:**
${diseaseInfo.prevention.join('\n')}

**Severity Level:**
${diseaseInfo.severity}

**Urgency:**
${diseaseInfo.urgency}`;
  }

  // Generate fertilizer recommendation
  getFertilizerRecommendation(fertilizerInfo) {
    return `**${fertilizerInfo.name} Recommendation**

**Purpose:**
${fertilizerInfo.purpose}

**Recommended Dosage:**
${fertilizerInfo.dosage}

**Application Method:**
${fertilizerInfo.application}

**Best Time to Apply:**
${fertilizerInfo.timing}

**Precautions:**
${fertilizerInfo.precautions.join('\n')}

**Expected Benefits:**
${fertilizerInfo.benefits.join('\n')}`;
  }

  // Generate scheme information
  getSchemeInformation(schemes) {
    let response = '**Available Government Schemes:**\n\n';
    
    schemes.forEach((scheme, index) => {
      response += `**${index + 1}. ${scheme.name}**\n`;
      response += `Benefits: ${scheme.benefits}\n`;
      response += `Eligibility: ${scheme.eligibility}\n`;
      response += `How to Apply: ${scheme.application}\n\n`;
    });

    return response;
  }

  // Generate weather recommendation
  getWeatherRecommendation(weatherAdvice) {
    return `**Weather-Based Farming Advice**

**Current Season Recommendations:**
${weatherAdvice.recommendations.join('\n')}

**Precautions:**
${weatherAdvice.precautions.join('\n')}

**Optimal Activities:**
${weatherAdvice.activities.join('\n')}`;
  }

  // Generate market advice
  getMarketAdvice(marketInfo) {
    return `**Market Information**

**Current Price Trend:**
${marketInfo.trend}

**Best Time to Sell:**
${marketInfo.bestTime}

**Market Tips:**
${marketInfo.tips.join('\n')}

**Storage Recommendations:**
${marketInfo.storage}`;
  }

  // Generate general advice
  getGeneralAdvice(generalInfo) {
    return `**General Farming Advice**

**Best Practices:**
${generalInfo.bestPractices.join('\n')}

**Seasonal Tips:**
${generalInfo.seasonalTips.join('\n')}

**Common Mistakes to Avoid:**
${generalInfo.mistakes.join('\n')}

**Productivity Tips:**
${generalInfo.productivity.join('\n')}`;
  }

  // Generate error response
  getErrorResponse(error) {
    return {
      type: 'error',
      response: "I apologize, but I encountered an error while processing your question. Please try again or contact support if the problem persists.",
      confidence: 0,
      error: error.message
    };
  }

  // Generate no crop found response
  getNoCropFoundResponse(crop) {
    return {
      type: 'no_crop_found',
      response: `I don't have specific information about "${crop}". Could you please check the spelling or ask about one of these crops: rice, wheat, cotton, sugarcane, tomato, chilli, onion, mango, or banana?`,
      confidence: 0.2
    };
  }

  // Generate no disease found response
  getNoDiseaseFoundResponse(crop, disease) {
    return {
      type: 'no_disease_found',
      response: `I don't have specific information about "${disease}" in ${crop}. Could you provide more details about the symptoms you're seeing?`,
      confidence: 0.2
    };
  }

  // Generate no fertilizer found response
  getNoFertilizerFoundResponse(crop, fertilizer) {
    return {
      type: 'no_fertilizer_found',
      response: `I don't have specific information about "${fertilizer}" for ${crop}. Would you like general fertilizer recommendations for this crop?`,
      confidence: 0.2
    };
  }

  // Generate follow-up questions
  generateCropFollowUpQuestions(cropInfo) {
    return [
      `What is your soil type for ${cropInfo.name}?`,
      `Have you grown ${cropInfo.name} before?`,
      `What's your field size?`,
      `Do you have irrigation facilities?`
    ];
  }

  // Generate general suggestions
  getGeneralSuggestions() {
    return [
      "Ask about specific crops (rice, wheat, cotton, etc.)",
      "Inquire about disease symptoms and treatments",
      "Get fertilizer recommendations",
      "Learn about government schemes",
      "Check weather-related advice",
      "Ask about market prices"
    ];
  }

  // Personalize response
  personalizeResponse(response, processedQuestion) {
    let personalized = { ...response };
    
    // Add location context
    if (this.context.userLocation) {
      personalized.response = `Based on conditions in ${this.context.userLocation}, here's my advice:\n\n${personalized.response}`;
    }
    
    // Add language preference
    if (this.context.userProfile.language === 'ta') {
      personalized.response = this.translateToTamil(personalized.response);
    }
    
    // Add experience level context
    if (this.context.userProfile.experience === 'beginner') {
      personalized.response += '\n\n💡 **Beginner Tip**: Start small and learn from experienced farmers in your area.';
    }
    
    return personalized;
  }

  // Simple Tamil translation (basic implementation)
  translateToTamil(text) {
    // This is a placeholder for actual translation
    // In production, use a proper translation service
    return text;
  }

  // Update context
  updateContext(userContext) {
    this.context = { ...this.context, ...userContext };
  }

  // Update context after response
  updateContextAfterResponse(question, response) {
    this.context.lastQuestions.push({
      question: question.original,
      response: response.response,
      timestamp: Date.now()
    });
    
    // Keep only last 5 questions
    if (this.context.lastQuestions.length > 5) {
      this.context.lastQuestions = this.context.lastQuestions.slice(-5);
    }
  }

  // Generate cache key
  generateCacheKey(question, context) {
    const key = `${question.normalized}_${context.userLocation}_${context.userProfile.language}`;
    return key;
  }

  // Clear cache
  clearCache() {
    this.responseCache.clear();
  }

  // Get chatbot statistics
  getStats() {
    return {
      totalQueries: this.context.lastQuestions.length,
      cacheSize: this.responseCache.size,
      knowledgeBaseSize: this.knowledgeBase.getSize(),
      supportedCrops: this.knowledgeBase.getSupportedCrops().length,
      supportedDiseases: this.knowledgeBase.getSupportedDiseases().length
    };
  }
}

export default EnhancedAgriculturalChatbot;
