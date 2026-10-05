// Enhanced Voice Service for Agricultural Assistance
// Handles diverse farming questions with better speech recognition

class ImprovedVoiceService {
  constructor() {
    this.isSupported = false;
    this.isListening = false;
    this.recognition = null;
    this.confidence = 0;
    this.lastTranscript = '';
    this.interimTranscript = '';
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.language = 'en-IN'; // Default to English (India)
    
    // Agricultural context and vocabulary
    this.initializeRecognition();
  }

  // Initialize speech recognition with agricultural context
  initializeRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        
        // Configure for agricultural context
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = this.language;
        
        // Agricultural vocabulary enhancement
        this.setupAgriculturalGrammar();
        this.setupEventHandlers();
      }
    }
  }

  // Setup agricultural grammar and vocabulary
  setupAgriculturalGrammar() {
    const crops = [
      'rice', 'wheat', 'cotton', 'sugarcane', 'tomato', 'potato', 
      'chilli', 'onion', 'mango', 'banana', 'groundnut', 'turmeric', 'ginger',
      'mustard', 'soybean', 'barley', 'maize', 'bajra', 'ragi', 'jowar'
    ];
    
    const diseases = [
      'blast', 'blight', 'wilt', 'rot', 'rust', 'mildew', 'anthracnose',
      'mosaic', 'curl', 'spot', 'scab', 'virus', 'bacterial', 'fungal',
      'leaf spot', 'stem rot', 'fruit rot', 'powdery mildew'
    ];
    
    const pests = [
      'armyworm', 'bollworm', 'aphid', 'whitefly', 'thrips', 'mite',
      'caterpillar', 'beetle', 'grasshopper', 'stem borer', 'leaf miner',
      'mealybug', 'scale', 'nematode', 'weevil', 'cutworm'
    ];
    
    const fertilizers = [
      'urea', 'dap', 'mop', 'nitrogen', 'phosphorus', 'potassium',
      'npk', 'zinc', 'sulphur', 'borax', 'gypsum', 'lime',
      'organic', 'compost', 'vermicompost', 'farm yard', 'green manure'
    ];
    
    const treatments = [
      'fungicide', 'insecticide', 'herbicide', 'pesticide', 'spray',
      'treatment', 'control', 'management', 'prevention', 'cure',
      'remedy', 'medicine', 'chemical', 'organic', 'natural'
    ];
    
    const actions = [
      'plant', 'grow', 'sow', 'harvest', 'irrigate', 'water',
      'fertilize', 'spray', 'apply', 'treat', 'diagnose', 'identify',
      'monitor', 'check', 'inspect', 'remove', 'isolate', 'protect'
    ];
    
    const quantities = [
      'kg', 'gram', 'liter', 'ml', 'ton', 'quintal', 'acre',
      'hectare', 'percent', 'per', 'dose', 'amount', 'quantity'
    ];
    
    const conditions = [
      'drought', 'flood', 'rain', 'dry', 'wet', 'hot', 'cold',
      'frost', 'humidity', 'temperature', 'weather', 'climate',
      'soil', 'ph', 'acidic', 'alkaline', 'saline', 'sandy'
    ];

    // Create comprehensive grammar
    const allTerms = [...crops, ...diseases, ...pests, ...fertilizers, ...treatments, ...actions, ...quantities, ...conditions];
    
    if (this.recognition && this.recognition.addGrammar) {
      // Add individual terms
      allTerms.forEach(term => {
        this.recognition.addGrammar(term);
      });
      
      // Add common phrases
      const phrases = [
        'how to', 'what is', 'when to', 'where can', 'how much',
        'which type', 'best time', 'how often', 'what kind of',
        'tell me about', 'show me', 'give me', 'help me with',
        'recommend', 'suggest', 'advise', 'guide', 'instructions',
        'problem', 'issue', 'symptom', 'sign', 'indicator',
        'yellow', 'brown', 'black', 'white', 'green', 'red', 'purple',
        'spots', 'lesions', 'patches', 'mottling', 'curling',
        'wilting', 'drying', 'dying', 'dead', 'healthy', 'unhealthy'
      ];
      
      phrases.forEach(phrase => {
        this.recognition.addGrammar(phrase);
      });
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.confidence = 0;
      if (this.onStart) this.onStart();
    };

    this.recognition.onresult = (event) => {
      if (!event.results || event.results.length === 0) return;
      
      let finalTranscript = '';
      let interimTranscript = '';
      let bestConfidence = 0;
      let hasFinalResult = false;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result[0];
        const text = alternative?.transcript?.trim() || '';
        bestConfidence = Math.max(bestConfidence, alternative?.confidence || 0);

        if (result.isFinal) {
          hasFinalResult = true;
          finalTranscript += `${text} `;
        } else {
          interimTranscript += `${text} `;
        }
      }

      const cleanInterim = interimTranscript.trim();
      if (cleanInterim) {
        this.interimTranscript = cleanInterim;
        if (this.onInterim) this.onInterim(cleanInterim);
      }

      const transcript = finalTranscript.trim();
      
      if (hasFinalResult && transcript) {
        this.lastTranscript = [this.lastTranscript, transcript].filter(Boolean).join(' ').trim();
        this.confidence = bestConfidence;
        
        // Process the transcript
        const processedResult = this.processAgriculturalQuery(transcript);
        
        if (this.onResult) {
          this.onResult({
            ...processedResult,
            transcript: this.lastTranscript,
            originalTranscript: this.lastTranscript,
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };

    this.recognition.onspeechstart = () => {
      // Speech detected
    };

    this.recognition.onspeechend = () => {
      // Speech ended
    };

    this.recognition.onnomatch = () => {
      // No match found
      console.log('No speech match found');
    };
  }

  // Process agricultural queries for better understanding
  processAgriculturalQuery(transcript) {
    const query = transcript.toLowerCase();
    
    // Detect query type
    const queryType = this.detectQueryType(query);
    const entities = this.extractEntities(query);
    
    return {
      transcript,
      originalTranscript: transcript,
      queryType,
      entities,
      confidence: this.confidence,
      timestamp: new Date().toISOString(),
      processed: this.generateResponse(query, queryType, entities)
    };
  }

  // Detect the type of agricultural query
  detectQueryType(query) {
    if (query.includes('how to') || query.includes('when to') || query.includes('where can')) {
      return 'instruction';
    }
    
    if (query.includes('what is') || query.includes('tell me') || query.includes('show me')) {
      return 'information';
    }
    
    if (query.includes('diagnose') || query.includes('identify') || query.includes('problem')) {
      return 'diagnosis';
    }
    
    if (query.includes('recommend') || query.includes('suggest') || query.includes('best')) {
      return 'recommendation';
    }
    
    if (query.includes('price') || query.includes('rate') || query.includes('cost')) {
      return 'market';
    }
    
    if (query.includes('weather') || query.includes('rain') || query.includes('climate')) {
      return 'weather';
    }
    
    return 'general';
  }

  // Extract agricultural entities from query
  extractEntities(query) {
    const entities = {
      crops: [],
      diseases: [],
      pests: [],
      fertilizers: [],
      treatments: [],
      actions: [],
      quantities: [],
      conditions: []
    };

    const words = query.split(' ');
    
    words.forEach(word => {
      // Crop detection
      if (['rice', 'wheat', 'cotton', 'sugarcane', 'tomato', 'potato', 'chilli', 'onion', 'mango', 'banana', 'groundnut', 'turmeric', 'ginger', 'mustard', 'soybean', 'barley', 'maize', 'bajra', 'ragi', 'jowar'].includes(word)) {
        entities.crops.push(word);
      }
      
      // Disease detection
      if (['blast', 'blight', 'wilt', 'rot', 'rust', 'mildew', 'anthracnose', 'mosaic', 'curl', 'spot', 'scab', 'virus', 'bacterial', 'fungal', 'leaf spot', 'stem rot', 'fruit rot', 'powdery mildew'].includes(word)) {
        entities.diseases.push(word);
      }
      
      // Pest detection
      if (['armyworm', 'bollworm', 'aphid', 'whitefly', 'thrips', 'mite', 'caterpillar', 'beetle', 'grasshopper', 'stem borer', 'leaf miner', 'mealybug', 'scale', 'nematode', 'weevil', 'cutworm'].includes(word)) {
        entities.pests.push(word);
      }
      
      // Fertilizer detection
      if (['urea', 'dap', 'mop', 'nitrogen', 'phosphorus', 'potassium', 'npk', 'zinc', 'sulphur', 'borax', 'gypsum', 'lime', 'organic', 'compost', 'vermicompost', 'farm yard', 'green manure'].includes(word)) {
        entities.fertilizers.push(word);
      }
      
      // Treatment detection
      if (['fungicide', 'insecticide', 'herbicide', 'pesticide', 'spray', 'treatment', 'control', 'management', 'prevention', 'cure', 'remedy', 'medicine', 'chemical', 'organic', 'natural'].includes(word)) {
        entities.treatments.push(word);
      }
      
      // Action detection
      if (['plant', 'grow', 'sow', 'harvest', 'irrigate', 'water', 'fertilize', 'spray', 'apply', 'treat', 'diagnose', 'identify', 'monitor', 'check', 'inspect', 'remove', 'isolate', 'protect'].includes(word)) {
        entities.actions.push(word);
      }
      
      // Quantity detection
      if (['kg', 'gram', 'liter', 'ml', 'ton', 'quintal', 'acre', 'hectare', 'percent', 'per', 'dose', 'amount', 'quantity'].includes(word)) {
        entities.quantities.push(word);
      }
      
      // Condition detection
      if (['drought', 'flood', 'rain', 'dry', 'wet', 'hot', 'cold', 'frost', 'humidity', 'temperature', 'weather', 'climate', 'soil', 'ph', 'acidic', 'alkaline', 'saline', 'sandy'].includes(word)) {
        entities.conditions.push(word);
      }
    });

    return entities;
  }

  // Generate appropriate responses based on query type
  generateResponse(query, queryType, entities) {
    const responses = {
      instruction: this.generateInstructionResponse(query, entities),
      information: this.generateInformationResponse(query, entities),
      diagnosis: this.generateDiagnosisResponse(query, entities),
      recommendation: this.generateRecommendationResponse(query, entities),
      market: this.generateMarketResponse(query, entities),
      weather: this.generateWeatherResponse(query, entities),
      general: this.generateGeneralResponse(query, entities)
    };

    return responses[queryType] || responses.general;
  }

  // Generate instruction responses
  generateInstructionResponse(query, entities) {
    const crop = entities.crops[0] || 'crop';
    const action = entities.actions[0] || 'do something';
    
    const instructions = {
      'how to plant': `To plant ${crop}, prepare the soil by plowing and adding organic matter. Sow seeds at recommended depth and spacing. Water regularly after planting.`,
      'when to sow': `Sow ${crop} during the recommended season. For most crops, early morning is best. Maintain proper spacing between plants.`,
      'how to water': `Water ${crop} based on soil moisture and growth stage. Generally, young plants need more frequent watering. Avoid waterlogging.`,
      'when to harvest': `Harvest ${crop} when mature. Signs include color change, firmness, and easy separation from plant. Time of day doesn't significantly affect quality.`
    };

    return instructions[query] || `For ${action} with ${crop}, follow agricultural best practices and consult local experts for specific guidance.`;
  }

  // Generate information responses
  generateInformationResponse(query, entities) {
    const crop = entities.crops[0];
    const disease = entities.diseases[0];
    
    if (crop && disease) {
      return `${crop} ${disease} is a common problem. Look for symptoms like leaf spots, wilting, or unusual growth. Consider both natural and chemical treatments for best results.`;
    }
    
    if (crop) {
      return `${crop} is a major crop in India. It requires proper management including irrigation, fertilization, and pest control for optimal yields.`;
    }
    
    return 'I can help with information about crops, diseases, pests, fertilizers, and farming practices. Please specify what you\'d like to know.';
  }

  // Generate diagnosis responses
  generateDiagnosisResponse(query, entities) {
    const symptoms = query;
    const crop = entities.crops[0] || 'your crop';
    
    return `Based on your description "${symptoms}" for ${crop}, I recommend: 1) Examine the plant closely for visual symptoms, 2) Check for common diseases in your area, 3) Consider environmental factors, 4) Consult local agricultural experts for accurate diagnosis and treatment.`;
  }

  // Generate recommendation responses
  generateRecommendationResponse(query, entities) {
    const fertilizer = entities.fertilizers[0];
    const crop = entities.crops[0] || 'your crop';
    
    if (fertilizer) {
      return `For ${crop}, ${fertilizer} application depends on soil test results. Generally, apply as basal dose before sowing or as top dressing during growth stages. Follow recommended dosage to avoid over-application.`;
    }
    
    return 'I can provide recommendations for crops, fertilizers, pest control, and farming practices. Please specify your crop and current conditions.';
  }

  // Generate market responses
  generateMarketResponse(query, entities) {
    const crop = entities.crops[0] || 'crops';
    
    return `Current market prices for ${crop} vary by location and quality. Check local mandi prices or e-NAM platform for real-time rates. Consider factors like quality, demand, and season when selling.`;
  }

  // Generate weather responses
  generateWeatherResponse() {
    return `Weather conditions affect farming activities. Plan irrigation, fertilization, and pest control based on forecast. Consider drought-resistant varieties if water is scarce.`;
  }

  // Generate general responses
  generateGeneralResponse(query, entities) {
    if (entities.crops.length > 0) {
      return `I can help you with ${entities.crops.join(', ')} cultivation. Ask me about planting, irrigation, fertilization, pest control, or disease management.`;
    }
    
    if (entities.diseases.length > 0) {
      return `For ${entities.diseases.join(', ')} management, I can suggest both organic and chemical treatments. Prevention through crop rotation and resistant varieties is often most effective.`;
    }
    
    return 'I\'m here to help with agricultural questions. You can ask about crops, diseases, pests, fertilizers, irrigation, weather, market prices, or farming practices. I\'ll do my best to provide accurate information.';
  }

  // Start listening with options
  startListening(options = {}) {
    if (!this.isSupported) {
      if (options.onError) {
        options.onError(new Error('Speech recognition not supported'));
      }
      return Promise.reject(new Error('Speech recognition not supported'));
    }

    if (this.isListening) {
      if (options.onError) {
        options.onError(new Error('Already listening'));
      }
      return Promise.reject(new Error('Already listening'));
    }

    return new Promise((resolve, reject) => {
      this.onStart = options.onStart || (() => {});
      this.onEnd = options.onEnd || (() => {});
      this.onError = (error) => {
        if (options.onError) options.onError(error);
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      this.onInterim = options.onInterim || (() => {});

      try {
        this.onResult = (result) => {
          if (options.onResult) options.onResult(result);
          resolve(result.transcript || result.originalTranscript || '');
          setTimeout(() => this.stopListening(), 0);
        };
        this.lastTranscript = '';
        this.interimTranscript = '';
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Get current status
  getStatus() {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      lastTranscript: this.lastTranscript,
      confidence: this.confidence,
      language: this.language
    };
  }

  // Change language
  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      { code: 'en-IN', name: 'English (India)' },
      { code: 'hi-IN', name: 'हिंदी (India)' },
      { code: 'ta-IN', name: 'தமிழ் (India)' },
      { code: 'te-IN', name: 'తెలుగు (India)' },
      { code: 'bn-IN', name: 'বাংলা (India)' },
      { code: 'mr-IN', name: 'मराठठी (India)' },
      { code: 'gu-IN', name: 'ગુજરાતી (India)' },
      { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (India)' },
      { code: 'or-IN', name: 'ଓଡିଆ (India)' },
      { code: 'ml-IN', name: 'മലയം (India)' },
      { code: 'kn-IN', name: 'ಕನ್ನಡ (India)' },
      { code: 'as-IN', name: 'অসমীয়া (India)' }
    ];
  }

  // Check if voice is supported
  isVoiceSupported() {
    return this.isSupported;
  }
}

export default ImprovedVoiceService;
