// Comprehensive Agricultural Knowledge Base for Tamil Nadu Farmers
// Offline-first structured data for accurate farming advice

class AgriculturalKnowledgeBase {
  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.cropData = this.initializeCropData();
    this.diseaseData = this.initializeDiseaseData();
    this.pestData = this.initializePestData();
    this.fertilizerData = this.initializeFertilizerData();
    this.weatherAdvice = this.initializeWeatherAdvice();
    this.marketData = this.initializeMarketData();
  }

  // Main knowledge base with quick access patterns
  initializeKnowledgeBase() {
    return {
      // Seasonal farming calendar for Tamil Nadu
      seasons: {
        'குளிர்காலம்': { // Winter (Oct-Jan)
          crops: ['நெல்', 'கரும்பு', 'பயறு'],
          activities: ['நிலத்தயாரிப்பு', 'விதைத்தல்', 'நீர் மேலாண்மை'],
          diseases: ['வெண்ணிற ஈரல் நோய்', 'இலைச்சுழல் நோய்'],
          pests: ['வெட்டுப்புழு', 'இலைச்சுருள்']
        },
        'கோடைகாலம்': { // Summer (Feb-May)
          crops: ['தக்காளி', 'வெங்காயம்', 'மிளகாய்'],
          activities: ['நீர் பாசனம்', 'பூச்சிக்கொல்லி தெளிப்பு', 'அறுவடை'],
          diseases: ['இலை சுருள் நோய்', 'வேர் அழுகல்'],
          pests: ['பச்சை வண்டு', 'வெட்டுப்புழு']
        },
        'மழைகாலம்': { // Monsoon (Jun-Sep)
          crops: ['நெல்', 'கரும்பு', 'பருத்தி'],
          activities: ['விதைத்தல்', 'உரம் இடுதல்', 'நீர் மேலாண்மை'],
          diseases: ['கரும்பு சாம்பல் நோய்', 'பருத்தி இலை சுருள்'],
          pests: ['தண்டு துளைப்பாம்பு', 'இலை வண்டு']
        }
      },

      // Quick response patterns for common questions
      quickAnswers: {
        watering: {
          'நெல்': 'நெல் பயிருக்கு வாரத்திற்கு 5-10 செ.மீ நீர் தேவை. வளர்ச்சி காலத்தில் 2-5 செ.மீ நீர் நிலையை பராமரிக்கவும்.',
          'கரும்பு': 'கரும்புக்கு வாரத்திற்கு 25-30 மி.மீ நீர் தேவை. வறண்ட காலத்தில் அதிக நீர் பாசனம் தேவை.',
          'தக்காளி': 'தக்காளிக்கு நாளொன்றுக்கு 1-2 லிட்டர் நீர் போதுமானது. மண் ஈரப்பதத்தை சரிபார்த்து நீர் பாய்ச்சவும்.'
        },
        planting: {
          'நெல்': 'நெல் நடவுக்கு சரியான காலம் ஜூன்-ஜூலை மாதங்கள். விதை நாற்றம் 25-30 நாட்கள் தேவை.',
          'கரும்பு': 'கரும்பு நடவுக்கு சரியான காலம் அக்டோபர்-நவம்பர். விதைகளை 12 மணி நேரம் நீரில் ஊறவைத்து நடவும்.',
          'பருத்தி': 'பருத்தி நடவுக்கு சரியான காலம் ஜூலை-ஆகஸ்ட். 30 செ.மீ இடைவெளி விட்டு நடவும்.'
        },
        harvesting: {
          'நெல்': 'நெல் அறுவடைக்கு 90-120 நாட்கள் தேவை. 80% நெற்கதிரிகள் மஞ்சள் நிறமாக மாறியதும் அறுவடை செய்யலாம்.',
          'கரும்பு': 'கரும்பு அறுவடைக்கு 10-12 மாதங்கள் தேவை. கரும்பு தண்டுகள் முதிர்ந்ததும் அறுவடை செய்யலாம்.',
          'தக்காளி': 'தக்காளி அறுவடைக்கு 60-75 நாட்கள் தேவை. பழங்கள் முழுமையாக சிவப்பு நிறமாக மாறியதும் அறுவடை செய்யலாம்.'
        }
      }
    };
  }

  // Detailed crop information
  initializeCropData() {
    return {
      'நெல்': {
        scientificName: 'Oryza sativa',
        varieties: ['பாரம்பரிய நெல்', 'ஐபோனி', 'பிடிஎன்'],
        growingSeason: 'குளிர்காலம், மழைகாலம்',
        duration: '90-120 நாட்கள்',
        waterRequirement: 'வாரத்திற்கு 5-10 செ.மீ',
        soilType: 'களிமண், மணல் கலந்த மண்',
        fertilizer: {
          nitrogen: '80-100 கிகி/ஹெக்டர்',
          phosphorus: '40-60 கிகி/ஹெக்டர்',
          potassium: '40-60 கிகி/ஹெக்டர்'
        },
        diseases: ['வெண்ணிற ஈரல் நோய்', 'இலைச்சுழல் நோய்', 'காமாலை நோய்'],
        pests: ['வெட்டுப்புழு', 'இலைச்சுருள்', 'தண்டு துளைப்பாம்பு'],
        marketPrice: 'குவிண்டலுக்கு ₹3000-4500',
        storage: 'ஈரப்பதம் 12-14%',
        yield: 'ஹெக்டருக்கு 3-5 டன்'
      },
      'கரும்பு': {
        scientificName: 'Saccharum officinarum',
        varieties: ['சிஓ 86032', 'சிஓ 92061', 'சிஓ 94012'],
        growingSeason: 'குளிர்காலம்',
        duration: '10-12 மாதங்கள்',
        waterRequirement: 'வாரத்திற்கு 25-30 மி.மீ',
        soilType: 'செம்புச் சிவப்பு மண், கருமையான மண்',
        fertilizer: {
          nitrogen: '150-200 கிகி/ஹெக்டர்',
          phosphorus: '60-80 கிகி/ஹெக்டர்',
          potassium: '80-100 கிகி/ஹெக்டர்'
        },
        diseases: ['சாம்பல் நோய்', 'சிவப்பு அழுகல்', 'இலை புள்ளி நோய்'],
        pests: ['வெட்டுப்புழு', 'தண்டு துளைப்பாம்பு', 'இலை வண்டு'],
        marketPrice: 'குவிண்டலுக்கு ₹2500-3500',
        storage: 'அறுவடைக்குள் 48 மணிநேரத்தில் ஆலைக்கு அனுப்ப வேண்டும்',
        yield: 'ஹெக்டருக்கு 60-80 டன்'
      },
      'தக்காளி': {
        scientificName: 'Solanum lycopersicum',
        varieties: ['பாம்பே', 'பன்னி', 'உள்ளூர் வகைகள்'],
        growingSeason: 'கோடைகாலம்',
        duration: '60-75 நாட்கள்',
        waterRequirement: 'நாளொன்றுக்கு 1-2 லிட்டர்',
        soilType: 'நன்கு வடிகால் மண்',
        fertilizer: {
          nitrogen: '100-120 கிகி/ஹெக்டர்',
          phosphorus: '80-100 கிகி/ஹெக்டர்',
          potassium: '60-80 கிகி/ஹெக்டர்'
        },
        diseases: ['இலை சுருள் நோய்', 'வேர் அழுகல்', 'பழம் அழுகல்'],
        pests: ['பச்சை வண்டு', 'வெட்டுப்புழு', 'இலை சுருள் பூச்சி'],
        marketPrice: 'கிலோவுக்கு ₹20-40',
        storage: 'அறை வெப்பநிலையில் 5-7 நாட்கள்',
        yield: 'ஹெக்டருக்கு 15-25 டன்'
      }
    };
  }

  // Disease information with treatment
  initializeDiseaseData() {
    return {
      'வெண்ணிற ஈரல் நோய்': {
        crop: 'நெல்',
        symptoms: ['இலைகளில் வெண்ணிற புள்ளிகள்', 'இலைகள் மஞ்சள் நிறமாதல்', 'சாகுபடி குறைதல்'],
        cause: 'பூச்சி தாக்குதல்',
        prevention: ['நோய் எதிர்ப்பு விதைகள்', 'சரியான நீர் மேலாண்மை', 'உரம் சமநிலை'],
        treatment: {
          chemical: 'கார்பெண்டாசிம் 50 WP - 1 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          organic: 'நிம்பு கரைசல் - 50 மில்லி/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          frequency: '10-12 நாட்களுக்கு ஒருமுறை'
        },
        severity: 'மிதமானது',
        spread: 'காற்று மூலம் பரவும்'
      },
      'இலை சுருள் நோய்': {
        crop: 'தக்காளி',
        symptoms: ['இலைகள் சுருண்டு விறல்', 'இலைகள் மஞ்சள் நிறமாதல்', 'சாகுபடி குறைதல்'],
        cause: 'வைரஸ் தாக்குதல்',
        prevention: ['நோய் எதிர்ப்பு விதைகள்', 'தீங்கு கட்டுப்பாடு', 'பூச்சி கட்டுப்பாடு'],
        treatment: {
          chemical: 'மான்கோஜெப் 75 WP - 2 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          organic: 'பஞ்சாரம் கரைசல் - 5% கலந்து தெளிக்கவும்',
          frequency: '7-10 நாட்களுக்கு ஒருமுறை'
        },
        severity: 'கடுமையானது',
        spread: 'பூச்சிகள் மூலம் பரவும்'
      },
      'சாம்பல் நோய்': {
        crop: 'கரும்பு',
        symptoms: ['இலைகளில் சாம்பல் நிற புள்ளிகள்', 'தண்டுகள் பலவீனமாதல்', 'வளர்ச்சி குறைதல்'],
        cause: 'பூச்சி தாக்குதல்',
        prevention: ['நோய் எதிர்ப்பு விதைகள்', 'நல்ல வடிகால் மண்', 'சரியான உரம்'],
        treatment: {
          chemical: 'கார்பெண்டாசிம் 50 WP - 1.5 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          organic: 'கஸ்டர்ட் ஆயில் கரைசல் - 1% கலந்து தெளிக்கவும்',
          frequency: '12-15 நாட்களுக்கு ஒருமுறை'
        },
        severity: 'மிதமானது',
        spread: 'நீர் மூலம் பரவும்'
      }
    };
  }

  // Pest information with control measures
  initializePestData() {
    return {
      'வெட்டுப்புழு': {
        crop: 'நெல், கரும்பு',
        symptoms: ['தண்டுகளில் துளைகள்', 'சாகுபடி குறைதல்', 'செடிகள் பலவீனமாதல்'],
        lifecycle: 'முட்டை → இளம் புழு → முதிர் புழு',
        prevention: ['நிலத்தை உழுதல்', 'பயிர் சுழற்சி', 'எதிர் பூச்சிகள்'],
        control: {
          chemical: 'குளோரோபைரிபாஸ் 20 EC - 2 மில்லி/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          biological: 'பி.டி. பாசில்லஸ் - 2 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          mechanical: 'கையால் பிடித்து அகற்றுதல்',
          frequency: '15 நாட்களுக்கு ஒருமுறை'
        },
        severity: 'கடுமையானது',
        damage: '30-40% சாகுபடி இழப்பு'
      },
      'இலை சுருள் பூச்சி': {
        crop: 'தக்காளி, மிளகாய்',
        symptoms: ['இலைகள் சுருண்டு விறல்', 'இலைகள் மஞ்சள் நிறமாதல்', 'பூக்கள் வாடுதல்'],
        lifecycle: 'முட்டை → இளம் பூச்சி → முதிர் பூச்சி',
        prevention: ['நோய் எதிர்ப்பு விதைகள்', 'வலை பயன்படுத்துதல்', 'எதிர் பூச்சிகள்'],
        control: {
          chemical: 'இமிடாக்ளோப்ரிட் 17.8 SL - 1 மில்லி/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          biological: 'வெர்டிசிலியம் லெகானி - 5 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்',
          mechanical: 'பிடித்து அழித்தல்',
          frequency: '7-10 நாட்களுக்கு ஒருமுறை'
        },
        severity: 'மிதமானது',
        damage: '15-25% சாகுபடி இழப்பு'
      }
    };
  }

  // Fertilizer recommendations
  initializeFertilizerData() {
    return {
      'யூரியா': {
        nitrogenContent: '46%',
        crops: ['நெல்', 'கரும்பு', 'தக்காளி'],
        application: 'மண் தயாரிப்பு மற்றும் சாகுபடி காலத்தில்',
        dosage: {
          'நெல்': '50-60 கிகி/ஹெக்டர்',
          'கரும்பு': '100-120 கிகி/ஹெக்டர்',
          'தக்காளி': '40-50 கிகி/ஹெக்டர்'
        },
        timing: 'நடவுக்கு 3 வாரங்களுக்குள்',
        method: 'மண்ணில் கலந்து பயன்படுத்தவும்'
      },
      'டீஏபி': {
        nitrogenContent: '18%',
        phosphorusContent: '46%',
        crops: ['நெல்', 'கரும்பு', 'தக்காளி'],
        application: 'மண் தயாரிப்பு காலத்தில்',
        dosage: {
          'நெல்': '80-100 கிகி/ஹெக்டர்',
          'கரும்பு': '120-150 கிகி/ஹெக்டர்',
          'தக்காளி': '60-80 கிகி/ஹெக்டர்'
        },
        timing: 'நடவுக்கு முன்பு',
        method: 'மண்ணில் கலந்து பயன்படுத்தவும்'
      },
      'எம்ஓபி': {
        phosphorusContent: '16%',
        potassiumContent: '16%',
        crops: ['நெல்', 'கரும்பு', 'தக்காளி'],
        application: 'சாகுபடி காலத்தில்',
        dosage: {
          'நெல்': '50-60 கிகி/ஹெக்டர்',
          'கரும்பு': '80-100 கிகி/ஹெக்டர்',
          'தக்காளி': '40-50 கிகி/ஹெக்டர்'
        },
        timing: 'சாகுபடி தொடங்கும் போது',
        method: 'மண்ணில் கலந்து பயன்படுத்தவும்'
      }
    };
  }

  // Weather-based farming advice
  initializeWeatherAdvice() {
    return {
      'மழை': {
        activities: ['விதைத்தல்', 'உரம் இடுதல்', 'நீர் மேலாண்மை'],
        warnings: ['வெள்ளம்', 'மண் அரிப்பு', 'நோய் பரவல்'],
        advice: 'நல்ல வடிகால் உள்ள இடங்களில் விதைத்தல். மழை நீரை சேமிக்கவும்.'
      },
      'வறண்டல்': {
        activities: ['நீர் பாசனம்', 'பூச்சிக்கொல்லி தெளிப்பு'],
        warnings: ['பயிர் சுவாசம்', 'மண் வறண்டல்', 'தீ விபத்து'],
        advice: 'நீர் சேமிப்பு முறைகளை பயன்படுத்தவும். காலை மாலை மட்டும் நீர் பாய்ச்சவும்.'
      },
      'அதிக வெப்பம்': {
        activities: ['நிழல் வலை', 'நீர் தெளிப்பு'],
        warnings: ['பயிர் சூடேற்றம்', 'மண் வறண்டல்'],
        advice: 'பயிர்களுக்கு நிழல் ஏற்படுத்தவும். அதிக நீர் பாய்ச்சவும்.'
      },
      'குளிர்': {
        activities: ['பயிர் பாதுகாப்பு', 'வெப்பமாற்றி'],
        warnings: ['பனி தாக்குதல்', 'பயிர் சேதம்'],
        advice: 'பயிர்களை பனியிலிருந்து பாதுகாக்கவும். வெப்பம் தடுப்பு ஏற்பாடுகள் செய்யவும்.'
      }
    };
  }

  // Market information
  initializeMarketData() {
    return {
      'நெல்': {
        currentPrice: '₹3500-4500/குவிண்டல்',
        trend: 'நிலையானது',
        bestMarkets: ['கோவை', 'சேலம்', 'திருச்சி'],
        priceFactors: ['மழை', 'தேவை', 'ஏற்றுமதி'],
        storageTips: 'ஈரப்பதம் 12-14% வரை குறைத்து சேமிக்கவும்'
      },
      'கரும்பு': {
        currentPrice: '₹2500-3500/குவிண்டல்',
        trend: 'லேசாக உயர்கிறது',
        bestMarkets: ['ஈரோடு', 'திருச்சி', 'கரூர்'],
        priceFactors: ['சர்க்கரை தேவை', 'மழை', 'ஆலை உற்பத்தி'],
        storageTips: 'அறுவடைக்குள் 48 மணிநேரத்தில் ஆலைக்கு அனுப்பவும்'
      },
      'தக்காளி': {
        currentPrice: '₹20-40/கிலோ',
        trend: 'மாறுபடுகிறது',
        bestMarkets: ['சென்னை', 'கோவை', 'திருப்பூர்'],
        priceFactors: ['பருவம்', 'தேவை', 'போக்குவரத்து'],
        storageTips: 'அறை வெப்பநிலையில் 5-7 நாட்கள் மட்டுமே கெடாமல் இருக்கும்'
      }
    };
  }

  // Query knowledge base
  query(question, context = {}) {
    const questionLower = question.toLowerCase();
    const { crop } = context;

    // Check quick answers first
    for (const [key, answers] of Object.entries(this.knowledgeBase.quickAnswers)) {
      if (questionLower.includes(key) && crop && answers[crop]) {
        return {
          type: 'quick_answer',
          answer: answers[crop],
          confidence: 0.9,
          source: 'knowledge_base'
        };
      }
    }

    // Check crop information
    for (const [cropName, cropInfo] of Object.entries(this.cropData)) {
      if (questionLower.includes(cropName)) {
        return this.getCropInformation(cropName, questionLower, cropInfo);
      }
    }

    // Check disease information
    for (const [diseaseName, diseaseInfo] of Object.entries(this.diseaseData)) {
      if (questionLower.includes(diseaseName) || 
          questionLower.includes('நோய்') || 
          questionLower.includes('பூச்சி')) {
        return this.getDiseaseInformation(diseaseName, questionLower, diseaseInfo);
      }
    }

    // Check pest information
    for (const [pestName, pestInfo] of Object.entries(this.pestData)) {
      if (questionLower.includes(pestName) || 
          questionLower.includes('பூச்சி') || 
          questionLower.includes('புழு')) {
        return this.getPestInformation(pestName, questionLower, pestInfo);
      }
    }

    // Check fertilizer information
    if (questionLower.includes('உரம்') || questionLower.includes('உரம்')) {
      return this.getFertilizerInformation(questionLower);
    }

    // Check weather advice
    if (questionLower.includes('வானிலை') || 
        questionLower.includes('மழை') || 
        questionLower.includes('வெப்பம்')) {
      return this.getWeatherAdvice(questionLower);
    }

    // Check market information
    if (questionLower.includes('விலை') || 
        questionLower.includes('சந்தை') || 
        questionLower.includes('விற்பனை')) {
      return this.getMarketInformation(questionLower);
    }

    return {
      type: 'general',
      answer: 'உங்கள் கேள்வியை நான் புரிந்து கொள்ளவில்லை. தயவு செய்து மீண்டும் கேள்கவும்.',
      confidence: 0.3,
      source: 'fallback'
    };
  }

  getCropInformation(cropName, question, cropInfo) {
    if (question.includes('நடவு') || question.includes('நடுவது')) {
      return {
        type: 'crop_info',
        answer: `${cropName} நடவுக்கு சரியான காலம் ${cropInfo.growingSeason}. ${cropInfo.duration} தேவை. மண் வகை: ${cropInfo.soilType}.`,
        confidence: 0.85,
        source: 'crop_data'
      };
    }

    if (question.includes('நீர்') || question.includes('பாசனம்')) {
      return {
        type: 'crop_info',
        answer: `${cropName}க்கு ${cropInfo.waterRequirement} தேவை. சரியான நீர் மேலாண்மை முக்கியம்.`,
        confidence: 0.85,
        source: 'crop_data'
      };
    }

    if (question.includes('உரம்')) {
      return {
        type: 'crop_info',
        answer: `${cropName}க்கு தேவையான உரம்: நைட்ரஜன் ${cropInfo.fertilizer.nitrogen}, பாஸ்பரஸ் ${cropInfo.fertilizer.phosphorus}, பொட்டாஷியம் ${cropInfo.fertilizer.potassium}.`,
        confidence: 0.85,
        source: 'crop_data'
      };
    }

    return {
      type: 'crop_info',
      answer: `${cropName} பற்றிய தகவல்கள்: அறிவியல் பெயர் ${cropInfo.scientificName}, வளர்ச்சி காலம் ${cropInfo.duration}, சந்தை விலை ${cropInfo.marketPrice}.`,
      confidence: 0.8,
      source: 'crop_data'
    };
  }

  getDiseaseInformation(diseaseName, _question, diseaseInfo) {
    return {
      type: 'disease_info',
      answer: `${diseaseName} பற்றி: அறிகுறிகள்: ${diseaseInfo.symptoms.join(', ')}. காரணம்: ${diseaseInfo.cause}. சிகிச்சை: ${diseaseInfo.treatment.chemical}. தடுப்பு: ${diseaseInfo.prevention.join(', ')}.`,
      confidence: 0.9,
      source: 'disease_data'
    };
  }

  getPestInformation(pestName, question, pestInfo) {
    return {
      type: 'pest_info',
      answer: `${pestName} பற்றி: அறிகுறிகள்: ${pestInfo.symptoms.join(', ')}. கட்டுப்பாடு: ${pestInfo.control.chemical}. தடுப்பு: ${pestInfo.prevention.join(', ')}.`,
      confidence: 0.9,
      source: 'pest_data'
    };
  }

  getFertilizerInformation() {
    let answer = 'உரங்கள் பற்றிய தகவல்கள்:\n';
    
    for (const [fertilizer, info] of Object.entries(this.fertilizerData)) {
      answer += `\n${fertilizer}: ${info.nitrogenContent || info.phosphorusContent || info.potassiumContent}. `;
      answer += `பயன்படுத்தும் காலம்: ${info.application}.`;
    }

    return {
      type: 'fertilizer_info',
      answer: answer,
      confidence: 0.8,
      source: 'fertilizer_data'
    };
  }

  getWeatherAdvice(input) {
    // Compatibility mode for EnhancedAgriculturalChatbot:
    // when called with a season identifier, return structured recommendation object.
    const looksLikeSeason = typeof input === "string" && !input.includes(" ");
    if (!input || looksLikeSeason) {
      return {
        recommendations: [
          "Monitor field moisture daily and irrigate in the morning.",
          "Follow crop-specific nutrient schedule; avoid over-application.",
          "Scout leaves and stems twice a week for early pest signs.",
        ],
        precautions: [
          "Avoid spraying during peak sunlight or heavy wind.",
          "Keep drainage channels clear before rains.",
          "Use protective equipment while applying chemicals.",
        ],
        activities: [
          "Soil health check",
          "Pest scouting",
          "Irrigation planning",
        ],
      };
    }

    let answer = 'வானிலை அடிப்படையிலான விவசாய ஆலோசனைகள்:\n';
    
    for (const [weather, advice] of Object.entries(this.weatherAdvice)) {
      answer += `\n${weather}: ${advice.advice}`;
    }

    return {
      type: 'weather_advice',
      answer: answer,
      confidence: 0.8,
      source: 'weather_advice'
    };
  }

  getMarketInformation() {
    let answer = 'சந்தை தகவல்கள்:\n';
    
    for (const [crop, info] of Object.entries(this.marketData)) {
      answer += `\n${crop}: தற்போதைய விலை ${info.currentPrice}, போக்கு ${info.trend}.`;
    }

    return {
      type: 'market_info',
      answer: answer,
      confidence: 0.8,
      source: 'market_data'
    };
  }

  // ---- Compatibility methods for EnhancedAgriculturalChatbot ----
  getCropInfo(crop) {
    if (!crop) return null;
    const key = String(crop).toLowerCase();
    const map = {
      rice: "நெல்",
      paddy: "நெல்",
      tomato: "தக்காளி",
      sugarcane: "கரும்பு",
    };
    const cropKey = map[key] || crop;
    const c = this.cropData[cropKey];
    if (!c) return null;
    return {
      name: cropKey,
      description: `${cropKey} is a major crop in Tamil Nadu.`,
      climate: c.growingSeason,
      soil: c.soilType,
      season: c.growingSeason,
      planting: "Use healthy seeds and prepare field with proper drainage.",
      spacing: "Use crop-specific spacing for better airflow.",
      irrigation: c.waterRequirement,
      management: ["Regular field scouting", "Balanced fertilization", "Timely weeding"],
      yield: c.yield,
      tips: ["Use certified seeds", "Maintain soil moisture", "Record pest incidence"],
      waterRequirements: c.waterRequirement,
      irrigationSchedule: "Adjust by rainfall and crop stage.",
      criticalStages: ["Establishment", "Vegetative growth", "Flowering/Fruiting"],
      irrigationMethods: ["Drip", "Furrow", "Sprinkler where suitable"],
      waterConservation: ["Mulching", "Irrigate during cool hours", "Avoid runoff"],
      waterStressSymptoms: ["Leaf curl", "Wilting", "Reduced growth"],
      harvestTime: c.duration,
      harvestIndicators: ["Maturity color change", "Expected crop age reached"],
      harvestMethod: "Harvest at physiological maturity to reduce losses.",
      postHarvest: ["Shade drying", "Sort and grade", "Use clean storage bags"],
      storage: c.storage,
      yieldOptimization: ["Timely pest control", "Balanced nutrition", "Good irrigation practices"],
      varieties: c.varieties || [],
      seedRate: "Use recommended seed rate from local agri office.",
      seedTreatment: "Treat seeds before sowing using approved methods.",
      germination: "Typically 5-10 days depending on crop and weather.",
      seedSource: "Certified seed dealers / agriculture department",
      seedQuality: ["High germination", "Uniform size", "Disease-free seeds"],
      benefits: ["Improves farm income", "High local demand"],
      difficulty: "Moderate",
      profitability: "Medium to high with proper management",
      challenges: ["Pest pressure", "Price fluctuations"],
      suitableFor: ["Small and medium farmers"],
    };
  }

  getDiseaseInfo(crop, disease) {
    const diseaseKey = Object.keys(this.diseaseData).find((k) =>
      String(k).toLowerCase().includes(String(disease || "").toLowerCase()),
    ) || Object.keys(this.diseaseData)[0];
    const d = this.diseaseData[diseaseKey];
    if (!d) return null;
    return {
      name: diseaseKey,
      symptoms: d.symptoms || [],
      causes: d.cause || "Multiple biotic/abiotic factors",
      naturalTreatment: [d.treatment?.organic || "Use neem-based sprays"],
      chemicalTreatment: [d.treatment?.chemical || "Use approved fungicide as per label"],
      prevention: d.prevention || [],
      severity: d.severity || "moderate",
      urgency: d.severity === "கடுமையானது" ? "high" : "medium",
    };
  }

  getFertilizerInfo(crop, chemical) {
    const fertilizerKey = Object.keys(this.fertilizerData).find((k) =>
      String(k).toLowerCase().includes(String(chemical || "").toLowerCase()),
    ) || Object.keys(this.fertilizerData)[0];
    const f = this.fertilizerData[fertilizerKey];
    if (!f) return null;
    return {
      name: fertilizerKey,
      purpose: "Improve crop nutrition and growth",
      dosage: f.dosage?.["நெல்"] || "Use soil-test based dose",
      application: f.application || "Apply in split doses",
      timing: f.timing || "At critical crop stages",
      precautions: ["Do not over-apply", "Irrigate after application"],
      benefits: ["Better growth", "Improved yield"],
    };
  }

  getRelevantSchemes(location) {
    void location;
    return [
      {
        name: "PM-KISAN",
        benefits: "Income support to eligible farmers",
        eligibility: "Small and marginal farmers as per scheme rules",
        application: "Apply through official portal / local office",
      },
      {
        name: "PMFBY",
        benefits: "Crop insurance support",
        eligibility: "Farmers with notified crops/areas",
        application: "Through bank/insurance channel",
      },
    ];
  }

  getMarketInfo(crop) {
    const key = String(crop || "").toLowerCase();
    const map = { rice: "நெல்", paddy: "நெல்", tomato: "தக்காளி", sugarcane: "கரும்பு" };
    const cropKey = map[key] || "நெல்";
    const m = this.marketData[cropKey];
    return {
      trend: m?.trend || "Stable",
      bestTime: "Sell when local arrivals are moderate and quality is high.",
      tips: ["Track mandi prices", "Sort produce before sale", "Compare nearby markets"],
      storage: m?.storageTips || "Store in dry, ventilated place",
    };
  }

  getGeneralFarmingAdvice() {
    return {
      bestPractices: [
        "Use certified seeds and healthy planting material",
        "Follow integrated pest management",
        "Maintain soil organic matter",
      ],
      seasonalTips: [
        "Align sowing with local rainfall patterns",
        "Plan drainage before monsoon",
        "Monitor weather alerts weekly",
      ],
      mistakes: [
        "Overuse of fertilizers",
        "Late pest control",
        "Ignoring soil testing",
      ],
      productivity: [
        "Record farm activities",
        "Use timely irrigation",
        "Adopt recommended spacing",
      ],
    };
  }

  getSize() {
    return Object.keys(this.cropData).length +
      Object.keys(this.diseaseData).length +
      Object.keys(this.pestData).length +
      Object.keys(this.fertilizerData).length;
  }

  getSupportedCrops() {
    return Object.keys(this.cropData);
  }

  getSupportedDiseases() {
    return Object.keys(this.diseaseData);
  }
}

export default AgriculturalKnowledgeBase;
