export const GUIDED_ROOT_CATEGORIES = [
  {
    id: "crops",
    label: "Crops",
    icon: "🌾",
    children: [
      { id: "rice", label: "Rice", icon: "🌾", flowId: "cropIssue", initialAnswers: { crop: "rice" } },
      { id: "wheat", label: "Wheat", icon: "🌾", flowId: "cropIssue", initialAnswers: { crop: "wheat" } },
      { id: "tomato", label: "Tomato", icon: "🍅", flowId: "cropIssue", initialAnswers: { crop: "tomato" } },
      { id: "banana", label: "Banana", icon: "🍌", flowId: "cropIssue", initialAnswers: { crop: "banana" } },
      { id: "cotton", label: "Cotton", icon: "🌿", flowId: "cropIssue", initialAnswers: { crop: "cotton" } },
      { id: "other-crop", label: "Other Crop", icon: "🌱", flowId: "cropIssue", initialAnswers: { crop: "other crop" } },
    ],
  },
  {
    id: "fertilizers",
    label: "Fertilizers",
    icon: "🌿",
    children: [
      { id: "dose", label: "Dosage Help", icon: "🧪", flowId: "fertilizerAdvice" },
      { id: "timing", label: "Application Timing", icon: "⏰", flowId: "fertilizerAdvice", initialAnswers: { concern: "timing" } },
      { id: "deficiency", label: "Deficiency Symptoms", icon: "🟡", flowId: "fertilizerAdvice", initialAnswers: { concern: "deficiency" } },
    ],
  },
  {
    id: "irrigation",
    label: "Irrigation",
    icon: "💧",
    children: [
      { id: "watering", label: "How much water?", icon: "💧", flowId: "irrigationAdvice", initialAnswers: { concern: "water amount" } },
      { id: "drainage", label: "Drainage problem", icon: "🌊", flowId: "irrigationAdvice", initialAnswers: { concern: "drainage" } },
      { id: "schedule", label: "Irrigation timing", icon: "📅", flowId: "irrigationAdvice", initialAnswers: { concern: "schedule" } },
    ],
  },
  {
    id: "soil",
    label: "Soil",
    icon: "🌱",
    children: [
      { id: "soil-health", label: "Soil health", icon: "🌱", flowId: "soilAdvice" },
      { id: "ph", label: "Soil pH", icon: "🧪", flowId: "soilAdvice", initialAnswers: { concern: "soil pH" } },
      { id: "organic-matter", label: "Organic matter", icon: "🍂", flowId: "soilAdvice", initialAnswers: { concern: "organic matter" } },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    icon: "☁️",
    children: [
      { id: "rain", label: "Rain planning", icon: "🌧️", flowId: "weatherAdvice", initialAnswers: { concern: "rain planning" } },
      { id: "heat", label: "Heat stress", icon: "☀️", flowId: "weatherAdvice", initialAnswers: { concern: "heat stress" } },
      { id: "spraying", label: "Safe spraying weather", icon: "🌬️", flowId: "weatherAdvice", initialAnswers: { concern: "spraying weather" } },
    ],
  },
  {
    id: "market",
    label: "Market",
    icon: "📈",
    children: [
      { id: "best-price", label: "Best price", icon: "💰", flowId: "marketAdvice", initialAnswers: { concern: "best price" } },
      { id: "sell-now", label: "Sell now or wait?", icon: "⏳", flowId: "marketAdvice", initialAnswers: { concern: "sell timing" } },
      { id: "market-trend", label: "Market trend", icon: "📊", flowId: "marketAdvice", initialAnswers: { concern: "trend" } },
    ],
  },
  {
    id: "schemes",
    label: "Government Schemes",
    icon: "🏛",
    children: [
      { id: "eligibility", label: "Eligibility", icon: "✅", flowId: "schemeAdvice", initialAnswers: { concern: "eligibility" } },
      { id: "application", label: "How to apply", icon: "📝", flowId: "schemeAdvice", initialAnswers: { concern: "application" } },
      { id: "payment", label: "Payment status", icon: "💸", flowId: "schemeAdvice", initialAnswers: { concern: "payment status" } },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    icon: "📦",
    children: [
      { id: "grains", label: "Grains", icon: "🌾", flowId: "storageAdvice", initialAnswers: { produceType: "grain" } },
      { id: "vegetables", label: "Vegetables", icon: "🥬", flowId: "storageAdvice", initialAnswers: { produceType: "vegetable" } },
      { id: "fruits", label: "Fruits", icon: "🍎", flowId: "storageAdvice", initialAnswers: { produceType: "fruit" } },
    ],
  },
  {
    id: "harvesting",
    label: "Harvesting",
    icon: "🌾",
    children: [
      { id: "harvest-time", label: "Best harvest time", icon: "⏰", flowId: "harvestingAdvice" },
      { id: "readiness", label: "Is it ready to harvest?", icon: "👀", flowId: "harvestingAdvice", initialAnswers: { concern: "readiness" } },
    ],
  },
  {
    id: "organic",
    label: "Organic Farming",
    icon: "🌱",
    children: [
      { id: "organic-pest", label: "Natural pest control", icon: "🐞", flowId: "organicAdvice", initialAnswers: { concern: "pest control" } },
      { id: "organic-feed", label: "Organic nutrition", icon: "🍃", flowId: "organicAdvice", initialAnswers: { concern: "nutrition" } },
      { id: "organic-practice", label: "General organic practice", icon: "🌱", flowId: "organicAdvice" },
    ],
  },
  {
    id: "livestock",
    label: "Livestock",
    icon: "🐄",
    children: [
      { id: "cow", label: "Cow", icon: "🐄", flowId: "livestockAdvice", initialAnswers: { animal: "cow" } },
      { id: "goat", label: "Goat", icon: "🐐", flowId: "livestockAdvice", initialAnswers: { animal: "goat" } },
      { id: "poultry", label: "Poultry", icon: "🐔", flowId: "livestockAdvice", initialAnswers: { animal: "poultry" } },
    ],
  },
];

export const GUIDED_FLOWS = {
  cropIssue: {
    intro: "I will help identify the crop problem. I will ask one question at a time.",
    steps: [
      {
        key: "issueType",
        question: "What kind of crop issue are you seeing?",
        options: [
          { label: "Growth problem", value: "growth problem" },
          { label: "Leaf problem", value: "leaf problem" },
          { label: "Pest or disease", value: "pest or disease" },
          { label: "Water problem", value: "water problem" },
        ],
      },
      {
        key: "affectedPart",
        question: "Which part is mainly affected?",
        options: [
          { label: "Leaves", value: "leaves" },
          { label: "Stem", value: "stem" },
          { label: "Roots", value: "roots" },
          { label: "Whole plant", value: "whole plant" },
        ],
      },
      {
        key: "symptom",
        question: "Which symptom is closest to your problem?",
        options: [
          { label: "Yellow leaves", value: "yellow leaves" },
          { label: "Brown or black spots", value: "brown or black spots" },
          { label: "Leaf curl", value: "leaf curl" },
          { label: "Slow growth", value: "slow growth" },
          { label: "Wilting", value: "wilting" },
          { label: "Insects visible", value: "insects visible" },
        ],
      },
      {
        key: "plantArea",
        question: "Where do you see this first?",
        options: [
          { label: "Lower part of plant", value: "lower part of plant" },
          { label: "Upper part of plant", value: "upper part of plant" },
          { label: "New leaves only", value: "new leaves only" },
          { label: "Everywhere", value: "everywhere" },
        ],
      },
      {
        key: "growthStage",
        question: "Which growth stage is your crop in?",
        options: [
          { label: "Seedling", value: "seedling" },
          { label: "Vegetative", value: "vegetative" },
          { label: "Flowering", value: "flowering" },
          { label: "Harvesting", value: "harvesting" },
        ],
      },
      {
        key: "recentRain",
        question: "Has it rained recently?",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Not sure", value: "not sure" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. A farmer needs help with a crop issue. Use clear English and do not guess. If the information is still not enough, ask one clarification question only. Otherwise answer in sections with these exact headings: Problem, Reason, Recommended Action, Prevention, Need more help?\n\nFarmer details:\n- Crop: ${answers.crop}\n- Issue type: ${answers.issueType}\n- Affected part: ${answers.affectedPart}\n- Symptom: ${answers.symptom}\n- First seen at: ${answers.plantArea}\n- Growth stage: ${answers.growthStage}\n- Recent rain: ${answers.recentRain}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} ${answers.symptom} ${answers.issueType} ${answers.affectedPart} ${answers.plantArea} ${answers.growthStage} ${answers.recentRain}`,
  },
  fertilizerAdvice: {
    intro: "I will help with fertilizer guidance.",
    steps: [
      {
        key: "crop",
        question: "Which crop do you need fertilizer help for?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Wheat", value: "wheat" },
          { label: "Tomato", value: "tomato" },
          { label: "Banana", value: "banana" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "growthStage",
        question: "Which growth stage is the crop in?",
        options: [
          { label: "Before sowing", value: "before sowing" },
          { label: "Early growth", value: "early growth" },
          { label: "Vegetative", value: "vegetative" },
          { label: "Flowering / Fruiting", value: "flowering or fruiting" },
        ],
      },
      {
        key: "goal",
        question: "What do you need help with?",
        options: [
          { label: "Recommended dosage", value: "recommended dosage" },
          { label: "Yellow leaves / deficiency", value: "yellow leaves deficiency" },
          { label: "Application timing", value: "application timing" },
          { label: "General fertilizer plan", value: "general fertilizer plan" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give fertilizer guidance in simple English for a farmer. If details are missing, ask one clarification question only. Otherwise answer with headings: Problem, Reason, Recommended Action, Prevention, Need more help?\n\nFarmer details:\n- Crop: ${answers.crop}\n- Growth stage: ${answers.growthStage}\n- Need: ${answers.goal}\n- Additional concern: ${answers.concern || "not specified"}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} fertilizer ${answers.goal} ${answers.growthStage} ${answers.concern || ""}`,
  },
  irrigationAdvice: {
    intro: "I will help with irrigation planning.",
    steps: [
      {
        key: "crop",
        question: "Which crop is this about?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Tomato", value: "tomato" },
          { label: "Banana", value: "banana" },
          { label: "Vegetables", value: "vegetables" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "fieldCondition",
        question: "What is the current field condition?",
        options: [
          { label: "Too dry", value: "too dry" },
          { label: "Too wet / waterlogging", value: "too wet" },
          { label: "Normal but unsure", value: "normal but unsure" },
        ],
      },
      {
        key: "recentWeather",
        question: "What best describes recent weather?",
        options: [
          { label: "Heavy rain", value: "heavy rain" },
          { label: "Hot and dry", value: "hot and dry" },
          { label: "Mild weather", value: "mild weather" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Help a farmer with irrigation advice. Use short sections and easy English. Ask one clarification question only if still needed.\n\nCrop: ${answers.crop}\nConcern: ${answers.concern || "general irrigation"}\nField condition: ${answers.fieldCondition}\nRecent weather: ${answers.recentWeather}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} irrigation ${answers.concern || ""} ${answers.fieldCondition} ${answers.recentWeather}`,
  },
  soilAdvice: {
    intro: "I will help with soil-related guidance.",
    steps: [
      {
        key: "crop",
        question: "Which crop is affected?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Tomato", value: "tomato" },
          { label: "Banana", value: "banana" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "soilIssue",
        question: "What soil issue do you suspect?",
        options: [
          { label: "Poor growth", value: "poor growth" },
          { label: "Hard soil", value: "hard soil" },
          { label: "Low fertility", value: "low fertility" },
          { label: "Not sure", value: "not sure" },
        ],
      },
      {
        key: "soilType",
        question: "What is your soil type if you know it?",
        options: [
          { label: "Clay", value: "clay" },
          { label: "Sandy", value: "sandy" },
          { label: "Loam", value: "loam" },
          { label: "Not sure", value: "not sure" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give soil health guidance using simple English and short sections.\n\nCrop: ${answers.crop}\nConcern: ${answers.concern || answers.soilIssue}\nSoil issue: ${answers.soilIssue}\nSoil type: ${answers.soilType}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} soil ${answers.concern || answers.soilIssue} ${answers.soilType}`,
  },
  weatherAdvice: {
    intro: "I will help you plan around weather conditions.",
    steps: [
      {
        key: "crop",
        question: "Which crop do you want weather advice for?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Tomato", value: "tomato" },
          { label: "Banana", value: "banana" },
          { label: "General farm advice", value: "general farm" },
        ],
      },
      {
        key: "weatherConcern",
        question: "What is your main weather concern?",
        options: [
          { label: "Rain", value: "rain" },
          { label: "Heat", value: "heat" },
          { label: "Spraying window", value: "spraying window" },
          { label: "General forecast action", value: "general forecast action" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give weather-based farming advice in simple English and structured sections.\n\nCrop: ${answers.crop}\nWeather concern: ${answers.weatherConcern}\nExtra concern: ${answers.concern || "none"}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} weather ${answers.weatherConcern} ${answers.concern || ""}`,
  },
  marketAdvice: {
    intro: "I will help with market planning.",
    steps: [
      {
        key: "crop",
        question: "Which crop do you want market advice for?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Tomato", value: "tomato" },
          { label: "Onion", value: "onion" },
          { label: "Banana", value: "banana" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "goal",
        question: "What do you need help with?",
        options: [
          { label: "Best time to sell", value: "best time to sell" },
          { label: "Price trend", value: "price trend" },
          { label: "Storage before selling", value: "storage before selling" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give market advice in simple English.\n\nCrop: ${answers.crop}\nGoal: ${answers.goal}\nConcern: ${answers.concern || "none"}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} market price ${answers.goal} ${answers.concern || ""}`,
  },
  schemeAdvice: {
    intro: "I will help you find the right government scheme information.",
    steps: [
      {
        key: "farmerType",
        question: "Which option best describes you?",
        options: [
          { label: "Small farmer", value: "small farmer" },
          { label: "Tenant farmer", value: "tenant farmer" },
          { label: "New farmer", value: "new farmer" },
          { label: "General inquiry", value: "general inquiry" },
        ],
      },
      {
        key: "goal",
        question: "What do you need help with?",
        options: [
          { label: "Eligibility", value: "eligibility" },
          { label: "How to apply", value: "how to apply" },
          { label: "Payment status", value: "payment status" },
          { label: "Best scheme for me", value: "best scheme for me" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give government scheme guidance in simple English.\n\nFarmer type: ${answers.farmerType}\nNeed: ${answers.goal}\nConcern: ${answers.concern || "none"}`,
    buildLocalQuery: (answers) =>
      `government scheme ${answers.goal} ${answers.farmerType} ${answers.concern || ""}`,
  },
  storageAdvice: {
    intro: "I will help with storage guidance.",
    steps: [
      {
        key: "produce",
        question: "What do you want to store?",
        options: [
          { label: "Grains", value: "grains" },
          { label: "Vegetables", value: "vegetables" },
          { label: "Fruits", value: "fruits" },
        ],
      },
      {
        key: "issue",
        question: "What is your storage concern?",
        options: [
          { label: "How to store safely", value: "safe storage" },
          { label: "Rot / spoilage", value: "rot or spoilage" },
          { label: "How long it lasts", value: "storage duration" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give produce storage advice in simple English.\n\nProduce type: ${answers.produceType || answers.produce}\nConcern: ${answers.issue}`,
    buildLocalQuery: (answers) =>
      `${answers.produceType || answers.produce} storage ${answers.issue}`,
  },
  harvestingAdvice: {
    intro: "I will help with harvesting decisions.",
    steps: [
      {
        key: "crop",
        question: "Which crop are you harvesting?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Wheat", value: "wheat" },
          { label: "Tomato", value: "tomato" },
          { label: "Banana", value: "banana" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "goal",
        question: "What do you need help with?",
        options: [
          { label: "Is it ready?", value: "is it ready to harvest" },
          { label: "Best harvest time", value: "best harvest time" },
          { label: "Post-harvest handling", value: "post-harvest handling" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give harvesting guidance in simple English.\n\nCrop: ${answers.crop}\nNeed: ${answers.goal}\nConcern: ${answers.concern || "none"}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} harvest ${answers.goal} ${answers.concern || ""}`,
  },
  organicAdvice: {
    intro: "I will help with organic farming guidance.",
    steps: [
      {
        key: "crop",
        question: "Which crop is this about?",
        options: [
          { label: "Rice", value: "rice" },
          { label: "Tomato", value: "tomato" },
          { label: "Vegetables", value: "vegetables" },
          { label: "Other", value: "other crop" },
        ],
      },
      {
        key: "goal",
        question: "What kind of organic help do you need?",
        options: [
          { label: "Pest control", value: "pest control" },
          { label: "Nutrition", value: "nutrition" },
          { label: "General practice", value: "general organic practice" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give organic farming advice in simple English.\n\nCrop: ${answers.crop}\nNeed: ${answers.goal}\nConcern: ${answers.concern || "none"}`,
    buildLocalQuery: (answers) =>
      `${answers.crop} organic farming ${answers.goal} ${answers.concern || ""}`,
  },
  livestockAdvice: {
    intro: "I will help with livestock guidance.",
    steps: [
      {
        key: "issue",
        question: "What do you need help with?",
        options: [
          { label: "Feeding", value: "feeding" },
          { label: "Health symptom", value: "health symptom" },
          { label: "Housing / care", value: "housing and care" },
        ],
      },
      {
        key: "severity",
        question: "How urgent does it seem?",
        options: [
          { label: "Mild / just started", value: "mild" },
          { label: "Moderate", value: "moderate" },
          { label: "Severe / urgent", value: "severe" },
        ],
      },
    ],
    buildPrompt: (answers) =>
      `You are KrishiVerse AI. Give livestock guidance in simple English. If the issue sounds urgent, clearly say the farmer should contact a veterinarian.\n\nAnimal: ${answers.animal || "livestock"}\nNeed: ${answers.issue}\nSeverity: ${answers.severity}`,
    buildLocalQuery: (answers) =>
      `${answers.animal || "livestock"} ${answers.issue} ${answers.severity}`,
  },
};

export const FOLLOW_UP_SUGGESTIONS = [
  "Fertilizer Guide",
  "Irrigation Advice",
  "Weather Precautions",
  "Save to My Farm",
];
