// Enhanced Agricultural Knowledge Base
// Comprehensive farming information for accurate chatbot responses

export class AgriculturalKnowledgeBase {
  constructor() {
    this.crops = this.initializeCrops();
    this.diseases = this.initializeDiseases();
    this.fertilizers = this.initializeFertilizers();
    this.schemes = this.initializeSchemes();
    this.weatherAdvice = this.initializeWeatherAdvice();
    this.marketInfo = this.initializeMarketInfo();
    this.generalAdvice = this.initializeGeneralAdvice();
  }

  // Initialize comprehensive crop information
  initializeCrops() {
    return {
      rice: {
        name: 'Rice (Paddy)',
        scientificName: 'Oryza sativa',
        description: 'Rice is the staple food crop of India, grown in both Kharif and Rabi seasons.',
        climate: 'Requires warm climate (20-35°C) and high humidity (70-80%). Annual rainfall of 100-200cm needed.',
        soil: 'Well-drained clay loam soils with pH 5.5-7.0. Can tolerate slightly acidic to alkaline soils.',
        season: 'Kharif (June-October) and Rabi (November-March)',
        planting: 'Direct seeding in puddled fields or transplanting 25-30 day old seedlings.',
        spacing: '20cm x 15cm for direct seeding, 20cm x 10cm for transplanting',
        irrigation: 'Maintain 2-5cm standing water during vegetative stage. Critical stages: tillering, panicle initiation, flowering.',
        management: [
          'Apply basal fertilizer before planting',
          'Control weeds in first 30 days',
          'Monitor for pests and diseases',
          'Drain fields 15 days before harvest'
        ],
        yield: '4-6 tons/ha for traditional varieties, 6-8 tons/ha for hybrid varieties',
        tips: [
          'Use certified seeds for better germination',
          'Apply nitrogen in split doses',
          'Monitor water depth regularly',
          'Harvest when 80% grains are golden'
        ],
        waterRequirements: '1500-2500mm throughout growing season',
        irrigationSchedule: 'Field preparation → Transplanting → Tillering (25 days) → Panicle initiation (50 days) → Flowering (70 days) → Grain filling (90 days)',
        criticalStages: ['Tillering stage', 'Panicle initiation', 'Flowering stage', 'Grain filling stage'],
        irrigationMethods: ['Flood irrigation', 'Alternate wetting and drying', 'Drip irrigation (water-saving)'],
        waterConservation: ['Use alternate wetting and drying', 'Maintain proper field bunds', 'Use laser land leveling'],
        waterStressSymptoms: ['Leaf rolling', 'Reduced tillering', 'Poor panicle emergence', 'Chaffy grains'],
        harvestTime: '120-150 days after sowing',
        harvestIndicators: ['80% grains turn golden', 'Moisture content 20-22%', 'Lower leaves dry up'],
        harvestMethod: 'Manual harvesting with sickles or mechanical harvesters',
        postHarvest: ['Threshing immediately', 'Dry grains to 12-14% moisture', 'Store in cool dry place'],
        storage: 'Store at 12-14% moisture in cool, dry, well-ventilated place',
        yieldOptimization: ['Use balanced fertilization', 'Control weeds effectively', 'Manage water properly', 'Use improved varieties'],
        varieties: ['IR64', 'Ponni', 'Basmati varieties', 'Hybrid rice'],
        seedRate: '80-100 kg/ha for direct seeding, 20-25 kg/ha for transplanting',
        seedTreatment: 'Treat with Carbofuran 3G at 25kg/ha or Thiamethoxam 70 WS at 5g/kg seed',
        germination: '5-7 days after sowing',
        seedSource: 'State agricultural universities, certified seed dealers',
        seedQuality: ['High germination rate (>85%)', 'Pure seed (>98%)', 'Free from weed seeds', 'Disease-free'],
        benefits: ['Primary food crop', 'Good market demand', 'Multiple cropping possible', 'Straw used as fodder'],
        difficulty: 'Moderate - requires water management',
        profitability: 'High - staple food with good returns',
        challenges: ['Water management', 'Pest attacks', 'Disease outbreaks', 'Labor intensive'],
        suitableFor: ['Areas with good irrigation', 'Traditional rice-growing regions', 'Farmers with water access']
      },
      
      wheat: {
        name: 'Wheat',
        scientificName: 'Triticum aestivum',
        description: 'Wheat is the second most important cereal crop in India, primarily grown in Rabi season.',
        climate: 'Requires cool climate (15-25°C) during growing season and warm dry weather during harvest.',
        soil: 'Well-drained loamy soils with pH 6.0-7.5. Avoid waterlogged and saline soils.',
        season: 'Rabi (October-November to March-April)',
        planting: 'Sow seeds at 3-4cm depth in rows 20-22cm apart.',
        spacing: '20-22cm between rows, 2-3cm between plants',
        irrigation: '4-6 irrigations at critical stages. Total water requirement: 400-600mm.',
        management: [
          'Timely sowing is crucial',
          'Apply balanced fertilizers',
          'Control weeds in early stages',
          'Monitor for rust and powdery mildew'
        ],
        yield: '3-4 tons/ha for traditional varieties, 4-5 tons/ha for improved varieties',
        tips: [
          'Sow within optimal window (first fortnight of November)',
          'Apply nitrogen in split doses',
          'Ensure proper drainage',
          'Harvest at proper moisture content'
        ],
        waterRequirements: '400-600mm total growing season',
        irrigationSchedule: 'Pre-sowing → Crown root initiation (20-25 days) → Tillering (40-45 days) → Jointing (60-65 days) → Flowering (80-85 days) → Dough stage (95-100 days)',
        criticalStages: ['Crown root initiation', 'Tillering', 'Jointing', 'Flowering', 'Dough formation'],
        irrigationMethods: ['Flood irrigation', 'Sprinkler irrigation', 'Drip irrigation'],
        waterConservation: ['Use laser land leveling', 'Apply mulch', 'Optimize irrigation timing'],
        waterStressSymptoms: ['Stunted growth', 'Reduced tillering', 'Yellowing of leaves', 'Poor grain filling'],
        harvestTime: '110-120 days after sowing',
        harvestIndicators: ['Leaves turn yellow and dry', 'Grains become hard', 'Moisture content 12-14%'],
        harvestMethod: 'Mechanical harvesting with combines or manual with sickles',
        postHarvest: ['Threshing and cleaning', 'Dry grains to 12% moisture', 'Store in moisture-proof containers'],
        storage: 'Store at 12% moisture in cool, dry place with proper aeration',
        yieldOptimization: ['Timely sowing', 'Balanced fertilization', 'Effective weed control', 'Proper irrigation'],
        varieties: ['HD 2967', 'PBW 343', 'Lok 1', 'GW 322'],
        seedRate: '100-120 kg/ha',
        seedTreatment: 'Treat with Thiram 75% WP at 2g/kg seed or Carbendazim 50% WP at 2g/kg seed',
        germination: '5-7 days after sowing',
        seedSource: 'Agricultural universities, certified seed agencies',
        seedQuality: ['Germination >85%', 'Physical purity >98%', 'Free from weeds', 'Disease-free'],
        benefits: ['Major Rabi crop', 'Good market price', 'Straw used as fodder', 'Suitable for crop rotation'],
        difficulty: 'Easy to moderate',
        profitability: 'Good to high',
        challenges: ['Timely sowing', 'Terminal heat stress', 'Rust diseases', 'Market fluctuations'],
        suitableFor: ['North Indian states', 'Areas with irrigation facilities', 'Crop rotation systems']
      },
      
      cotton: {
        name: 'Cotton',
        scientificName: 'Gossypium hirsutum',
        description: 'Cotton is an important commercial crop providing fiber and oil.',
        climate: 'Requires warm climate (21-30°C) with moderate rainfall (500-800mm). Frost is harmful.',
        soil: 'Deep, well-drained black soils (vertisols) with pH 6.0-8.0. Can tolerate saline soils.',
        season: 'Kharif (April-May to October-November)',
        planting: 'Sow treated seeds at 3-5cm depth in rows 60-90cm apart.',
        spacing: '60-90cm between rows, 30-45cm between plants',
        irrigation: '8-10 irrigations. Critical stages: flowering, boll development.',
        management: [
          'Proper seed treatment',
          'Balanced fertilization',
          'Pest monitoring',
          'Proper plant density'
        ],
        yield: '15-20 quintals/ha of seed cotton',
        tips: [
          'Monitor bollworm regularly',
          'Avoid excessive nitrogen',
          'Maintain proper plant population',
          'Timely irrigation is crucial'
        ],
        waterRequirements: '700-1000mm total growing season',
        irrigationSchedule: 'Pre-sowing → 30 days → 60 days → Flowering (90 days) → Boll development (120 days)',
        criticalStages: ['Flowering stage', 'Boll development stage', 'Boll opening stage'],
        irrigationMethods: ['Flood irrigation', 'Drip irrigation (recommended)', 'Sprinkler irrigation'],
        waterConservation: ['Use drip irrigation', 'Mulch between rows', 'Optimize irrigation schedule'],
        waterStressSymptoms: ['Square and boll shedding', 'Reduced flowering', 'Stunted growth', 'Leaf wilting'],
        harvestTime: '150-180 days after sowing',
        harvestIndicators: ['Bolls open naturally', '60% bolls opened', 'Fiber quality optimal'],
        harvestMethod: 'Manual picking of opened bolls',
        postHarvest: ['Dry picked cotton properly', 'Remove trash', 'Store in dry place'],
        storage: 'Store in dry, well-ventilated place away from moisture',
        yieldOptimization: ['Optimal plant density', 'Balanced fertilization', 'Effective pest control', 'Proper irrigation'],
        varieties: ['Bt cotton hybrids', 'JKHY 1', 'NHH 44', 'MCU 5'],
        seedRate: '15-20 kg/ha for hybrids, 25-30 kg/ha for varieties',
        seedTreatment: 'Treat with Imidacloprid 70 WS at 5g/kg seed + Thiram 75% WP at 2g/kg seed',
        germination: '7-10 days after sowing',
        seedSource: 'Certified seed agencies, agricultural universities',
        seedQuality: ['Germination >80%', 'Genetic purity >95%', 'Free from contaminants', 'Disease-free'],
        benefits: ['Commercial cash crop', 'Multiple uses (fiber, oil, feed)', 'Good export potential', 'Long harvest period'],
        difficulty: 'Moderate to high',
        profitability: 'High (when managed well)',
        challenges: ['Pest pressure', 'High input costs', 'Weather sensitivity', 'Market volatility'],
        suitableFor: ['Black soil regions', 'Areas with irrigation', 'Commercial farming']
      },
      
      tomato: {
        name: 'Tomato',
        scientificName: 'Solanum lycopersicum',
        description: 'Tomato is an important vegetable crop rich in vitamins and minerals.',
        climate: 'Requires warm climate (18-27°C). Very high temperatures affect fruit set.',
        soil: 'Well-drained sandy loam soils with pH 6.0-7.0. Rich in organic matter.',
        season: 'Year-round cultivation possible with proper management',
        planting: 'Raise seedlings in nursery and transplant 30-35 day old seedlings.',
        spacing: '60cm x 60cm for indeterminate, 45cm x 45cm for determinate varieties',
        irrigation: 'Regular irrigation required. Maintain soil moisture but avoid waterlogging.',
        management: [
          'Proper nursery management',
          'Staking for indeterminate varieties',
          'Regular pest monitoring',
          'Balanced fertilization'
        ],
        yield: '25-40 tons/ha',
        tips: [
          'Use disease-free seedlings',
          'Provide proper support',
          'Monitor for fruit borer',
          'Harvest at proper maturity'
        ],
        waterRequirements: '400-600mm total growing season',
        irrigationSchedule: 'Immediately after transplanting → Every 3-4 days during vegetative growth → Every 2-3 days during flowering and fruiting',
        criticalStages: ['Transplanting', 'Flowering', 'Fruit set', 'Fruit development'],
        irrigationMethods: ['Drip irrigation (recommended)', 'Furrow irrigation', 'Sprinkler irrigation'],
        waterConservation: ['Use drip irrigation', 'Mulch around plants', 'Irrigate in early morning'],
        waterStressSymptoms: ['Flower and fruit drop', 'Leaf wilting', 'Reduced fruit size', 'Blossom end rot'],
        harvestTime: '90-120 days after transplanting',
        harvestIndicators: ['Fruits attain full color', 'Firm but slightly yield to touch', 'Easily detachable'],
        harvestMethod: 'Manual harvesting with care to avoid damage',
        postHarvest: ['Sort and grade fruits', 'Remove damaged ones', 'Pack in ventilated containers'],
        storage: 'Store at 12-13°C and 85-90% relative humidity',
        yieldOptimization: ['Balanced fertilization', 'Proper pruning', 'Effective pest control', 'Optimal plant density'],
        varieties: ['Pusa Ruby', 'Arka Vikas', 'Arka Meghali', 'Hybrid varieties'],
        seedRate: '200-250g/ha',
        seedTreatment: 'Treat with Thiram 75% WP at 2g/kg seed',
        germination: '5-7 days after sowing',
        seedSource: 'Certified seed agencies, agricultural universities',
        seedQuality: ['Germination >80%', 'Physical purity >98%', 'Disease-free', 'True to type'],
        benefits: ['High demand vegetable', 'Good nutritional value', 'Multiple market options', 'Year-round cultivation'],
        difficulty: 'Moderate',
        profitability: 'Good to high',
        challenges: ['Disease pressure', 'Fruit borer', 'Weather sensitivity', 'Post-harvest losses'],
        suitableFor: ['Areas with good market access', 'Small and medium farmers', 'Peri-urban areas']
      }
    };
  }

  // Initialize disease information
  initializeDiseases() {
    return {
      rice: {
        blast: {
          name: 'Rice Blast',
          scientificName: 'Pyricularia oryzae',
          symptoms: ['Diamond-shaped lesions on leaves', 'Neck rot in panicles', 'Gray centers with brown margins'],
          causes: 'Fungal disease favored by high humidity and warm temperatures (25-28°C)',
          naturalTreatment: ['Apply neem leaf extract (5%)', 'Use Trichoderma viride biocontrol', 'Maintain proper field drainage'],
          chemicalTreatment: ['Spray Tricyclazole 75% WP at 0.6g/L', 'Apply Propiconazole 25% EC at 1ml/L'],
          prevention: ['Use resistant varieties', 'Avoid excessive nitrogen', 'Remove infected plant debris'],
          severity: 'High',
          urgency: 'High - treat immediately'
        },
        bacterial_leaf_blight: {
          name: 'Bacterial Leaf Blight',
          scientificName: 'Xanthomonas oryzae',
          symptoms: ['Yellow to white lesions along leaf margins', 'Wavy margins progressing to tip', 'Kresek phase in seedlings'],
          causes: 'Bacterial disease spread by wind and water. Favored by high humidity',
          naturalTreatment: ['Spray copper-based bactericides', 'Apply Bordeaux mixture', 'Use resistant varieties'],
          chemicalTreatment: ['Spray Streptomycin sulfate at 200ppm', 'Apply Copper oxychloride 50% WP at 3g/L'],
          prevention: ['Use disease-free seeds', 'Avoid excessive nitrogen', 'Maintain field sanitation'],
          severity: 'Medium',
          urgency: 'Medium'
        }
      },
      wheat: {
        rust: {
          name: 'Wheat Rust',
          scientificName: 'Puccinia triticina',
          symptoms: ['Orange-brown pustules on leaves', 'Yellowing of leaves', 'Reduced photosynthesis'],
          causes: 'Fungal disease spread by wind. Favored by moderate temperatures',
          naturalTreatment: ['Spray neem oil', 'Remove infected plants', 'Use resistant varieties'],
          chemicalTreatment: ['Spray Propiconazole 25% EC at 1ml/L', 'Apply Tebuconazole 25% EC at 1ml/L'],
          prevention: ['Use resistant varieties', 'Monitor crop regularly', 'Avoid late sowing'],
          severity: 'High',
          urgency: 'High'
        }
      },
      cotton: {
        bollworm: {
          name: 'American Bollworm',
          scientificName: 'Helicoverpa armigera',
          symptoms: ['Larvae bore into squares and bolls', 'Flaring of squares', 'Holes in bolls'],
          causes: 'Insect pest with multiple generations. Eggs laid on flowers and bolls',
          naturalTreatment: ['Use pheromone traps', 'Release Trichogramma wasps', 'Plant marigold as trap crop'],
          chemicalTreatment: ['Spray Emamectin benzoate 5% SG at 0.4g/L', 'Apply Spinosad 45% SC at 0.3ml/L'],
          prevention: ['Monitor with pheromone traps', 'Remove infested bolls', 'Maintain field sanitation'],
          severity: 'High',
          urgency: 'High'
        }
      },
      tomato: {
        late_blight: {
          name: 'Late Blight',
          scientificName: 'Phytophthora infestans',
          symptoms: ['Water-soaked lesions on leaves', 'White fungal growth on undersides', 'Rapid plant collapse'],
          causes: 'Oomycete disease favored by cool, wet weather',
          naturalTreatment: ['Remove infected plants', 'Apply copper spray', 'Improve air circulation'],
          chemicalTreatment: ['Spray Metalaxyl-M 8% WP at 2g/L', 'Apply Mancozeb 75% WP at 2g/L'],
          prevention: ['Avoid overhead irrigation', 'Maintain proper spacing', 'Use disease-free transplants'],
          severity: 'High',
          urgency: 'High'
        },
        fruit_borer: {
          name: 'Tomato Fruit Borer',
          scientificName: 'Helicoverpa armigera',
          symptoms: ['Larvae bore into fruits', 'Entry holes with frass', 'Premature fruit drop'],
          causes: 'Insect pest that attacks fruits at various stages',
          naturalTreatment: ['Use pheromone traps', 'Release parasitoids', 'Handpick infested fruits'],
          chemicalTreatment: ['Spray Spinosad 45% SC at 0.3ml/L', 'Apply Emamectin benzoate 5% SG at 0.4g/L'],
          prevention: ['Monitor regularly', 'Use yellow sticky traps', 'Maintain field hygiene'],
          severity: 'Medium',
          urgency: 'Medium'
        }
      }
    };
  }

  // Initialize fertilizer information
  initializeFertilizers() {
    return {
      urea: {
        name: 'Urea (46% N)',
        purpose: 'Provides nitrogen for vegetative growth and chlorophyll formation',
        dosage: '50-150 kg/ha depending on crop and soil',
        application: 'Apply in split doses - basal and top dressing',
        timing: 'Basal at sowing + top dressing at critical growth stages',
        precautions: ['Avoid application before heavy rain', 'Use soil test for precise dosage', 'Apply when soil has moisture'],
        benefits: ['Promotes leaf growth', 'Increases protein content', 'Enhances photosynthesis']
      },
      dap: {
        name: 'DAP (18% N, 46% P2O5)',
        purpose: 'Provides nitrogen and phosphorus for root development and early growth',
        dosage: '100-150 kg/ha depending on crop',
        application: 'Apply as basal dose before or at sowing',
        timing: 'Basal application before sowing or at planting',
        precautions: ['Mix well with soil', 'Avoid contact with seeds', 'Use based on soil test'],
        benefits: ['Promotes root development', 'Enhances early growth', 'Improves seedling vigor']
      },
      mop: {
        name: 'Muriate of Potash (60% K2O)',
        purpose: 'Provides potassium for disease resistance and stress tolerance',
        dosage: '40-80 kg/ha depending on crop',
        application: 'Apply as basal dose or split for long-duration crops',
        timing: 'Basal or split application',
        precautions: ['Avoid in chloride-sensitive crops', 'Apply when soil has moisture', 'Use soil test recommendations'],
        benefits: ['Increases disease resistance', 'Improves stress tolerance', 'Enhances fruit quality']
      }
    };
  }

  // Initialize government schemes
  initializeSchemes() {
    return [
      {
        name: 'PM-Kisan Samman Nidhi',
        benefits: '₹6,000 per year in 3 equal installments to small and marginal farmers',
        eligibility: 'Small and marginal farmers with cultivable land up to 2 hectares',
        application: 'Apply through CSC or online with Aadhaar and bank account linking'
      },
      {
        name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        benefits: 'Crop insurance against natural calamities, pests, and diseases',
        eligibility: 'All farmers growing notified crops in notified areas',
        application: 'Apply through bank or insurance company before sowing season'
      },
      {
        name: 'Soil Health Card Scheme',
        benefits: 'Free soil testing and fertilizer recommendations',
        eligibility: 'All farmers',
        application: 'Apply through agriculture department or CSC'
      },
      {
        name: 'PM-KUSUM Scheme',
        benefits: '60% subsidy for solar pumps and solar power plants',
        eligibility: 'Farmers for standalone solar pumps, individuals/organizations for solar power plants',
        application: 'Apply through state renewable energy agencies'
      }
    ];
  }

  // Initialize weather advice
  initializeWeatherAdvice() {
    return {
      kharif: {
        recommendations: [
          'Prepare fields before monsoon onset',
          'Use short-duration varieties',
          'Ensure proper drainage',
          'Plan for pest management'
        ],
        precautions: [
          'Watch for flood conditions',
          'Delay pesticide application during heavy rain',
          'Maintain field bunds',
          'Monitor water logging'
        ],
        activities: [
          'Land preparation',
          'Sowing/planting',
          'Weed management',
          'Fertilizer application'
        ]
      },
      rabi: {
        recommendations: [
          'Ensure adequate irrigation',
          'Use cold-tolerant varieties',
          'Protect from frost',
          'Optimize fertilizer use'
        ],
        precautions: [
          'Protect from terminal heat',
          'Manage irrigation efficiently',
          'Monitor for diseases',
          'Plan for water scarcity'
        ],
        activities: [
          'Sowing in optimal window',
          'Irrigation scheduling',
          'Fertilizer application',
          'Harvest planning'
        ]
      }
    };
  }

  // Initialize market information
  initializeMarketInfo() {
    return {
      rice: {
        trend: 'Stable to slightly increasing due to good demand',
        bestTime: 'Harvest season (October-November)',
        tips: [
          'Dry grains properly before selling',
          'Monitor mandi prices regularly',
          'Consider warehouse storage for better prices',
          'Join farmer cooperatives for better bargaining'
        ],
        storage: 'Store at 12-14% moisture in cool, dry place'
      },
      wheat: {
        trend: 'Generally stable with seasonal variations',
        bestTime: 'March-April harvest period',
        tips: [
          'Clean and grade grains properly',
          'Monitor MSP announcements',
          'Consider contract farming options',
          'Store for better prices if possible'
        ],
        storage: 'Store at 12% moisture in moisture-proof containers'
      },
      cotton: {
        trend: 'Volatile depending on international demand',
        bestTime: 'October-December when prices are generally higher',
        tips: [
          'Follow proper picking practices',
          'Grade cotton properly',
          'Monitor international cotton prices',
          'Consider ginners for better prices'
        ],
        storage: 'Store in dry, well-ventilated place away from moisture'
      },
      tomato: {
        trend: 'Highly volatile with daily fluctuations',
        bestTime: 'Sell immediately after harvest due to perishability',
        tips: [
          'Sort and grade properly',
          'Develop direct market links',
          'Consider processing options',
          'Join farmer groups for collective marketing'
        ],
        storage: 'Short-term storage at 12-13°C and 85-90% humidity'
      }
    };
  }

  // Initialize general farming advice
  initializeGeneralAdvice() {
    return {
      bestPractices: [
        'Conduct soil testing before planting',
        'Use certified seeds and planting material',
        'Follow integrated pest management',
        'Maintain proper farm records',
        'Practice crop rotation',
        'Use water efficiently',
        'Stay updated with market prices'
      ],
      seasonalTips: [
        'Kharif: Prepare for monsoon, ensure proper drainage',
        'Rabi: Plan irrigation, protect from frost',
        'Summer: Focus on water conservation, heat management'
      ],
      mistakes: [
        'Overuse of fertilizers and pesticides',
        'Ignoring soil health',
        'Not following recommended practices',
        'Poor water management',
        'Lack of record keeping'
      ],
      productivity: [
        'Use improved varieties',
        'Optimize plant density',
        'Balanced fertilization',
        'Timely pest and disease management',
        'Proper harvesting techniques'
      ]
    };
  }

  // Get crop information
  getCropInfo(crop) {
    return this.crops[crop.toLowerCase()] || null;
  }

  // Get disease information
  getDiseaseInfo(crop, disease) {
    const cropDiseases = this.diseases[crop.toLowerCase()];
    if (!cropDiseases) return null;
    
    return cropDiseases[disease.toLowerCase()] || null;
  }

  // Get fertilizer information
  getFertilizerInfo(crop, fertilizer) {
    return this.fertilizers[fertilizer.toLowerCase()] || null;
  }

  // Get relevant schemes
  getRelevantSchemes(location) {
    // Return all schemes for now - could be location-specific in future
    return this.schemes;
  }

  // Get weather advice
  getWeatherAdvice(season) {
    return this.weatherAdvice[season.toLowerCase()] || this.weatherAdvice.kharif;
  }

  // Get market information
  getMarketInfo(crop) {
    return this.marketInfo[crop.toLowerCase()] || null;
  }

  // Get general farming advice
  getGeneralFarmingAdvice() {
    return this.generalAdvice;
  }

  // Get supported crops
  getSupportedCrops() {
    return Object.keys(this.crops);
  }

  // Get supported diseases
  getSupportedDiseases() {
    const diseases = [];
    Object.values(this.diseases).forEach(cropDiseases => {
      diseases.push(...Object.keys(cropDiseases));
    });
    return [...new Set(diseases)];
  }

  // Get knowledge base size
  getSize() {
    return {
      crops: Object.keys(this.crops).length,
      diseases: this.getSupportedDiseases().length,
      fertilizers: Object.keys(this.fertilizers).length,
      schemes: this.schemes.length
    };
  }
}

export default AgriculturalKnowledgeBase;
