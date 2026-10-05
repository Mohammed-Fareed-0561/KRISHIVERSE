export const chatbotKB = [
  {
    intent: "greeting",
    keywords: ["hi", "hello", "hey", "namaste", "vanakkam"],
    answer:
      "Hello! I am your KrishiVerse Offline Assistant. How can I help you today? You can ask about crops, pests, fertilizers, or schemes.",
  },
  {
    intent: "help",
    keywords: ["help", "what can you do", "features", "assistance"],
    answer:
      "I can assist you with information regarding crop diseases, pest control, best fertilizer dosages, government schemes for farmers, and general farming tips. What do you need help with?",
  },
  // --- FERTILIZER & NUTRIENTS (General) ---
  {
    intent: "fertilizer_general",
    keywords: ["fertilizer", "manure", "npk", "nutrients", "dose"],
    answer:
      "Fertilizer dosages depend on the crop type and soil health. Generally, a balanced NPK (Nitrogen, Phosphorus, Potassium) ratio is recommended. Have you performed a soil test recently? If not, please check the 'Soil Health' tab.",
  },
  {
    intent: "urea_dose",
    keywords: ["urea", "nitrogen", "amount", "quantity"],
    answer:
      "Urea provides Nitrogen, essential for leafy growth. The standard dose varies from 50 to 150 kg per acre depending on the crop. Always apply in split doses (basal and top dressing) for better efficiency.",
  },
  {
    intent: "dap_dose",
    keywords: ["dap", "phosphorus", "basal"],
    answer:
      "DAP (Diammonium Phosphate) should be applied as a basal dose before or at the time of sowing. It promotes strong root development.",
  },
  {
    intent: "potash",
    keywords: ["potash", "mop", "potassium"],
    answer:
      "Muriate of Potash (MOP) improves crop resistance to diseases and abiotic stress. Usually applied as a basal dose or split for long-duration crops.",
  },
  {
    intent: "organic_farming",
    keywords: ["organic", "compost", "vermicompost", "fy", "fym", "farm yard"],
    answer:
      "Organic farming utilizes Farm Yard Manure (FYM), vermicompost, and green manure. Applying 5-10 tons of FYM per acre significantly improves soil structure and water retention.",
  },
  // --- WATER & IRRIGATION ---
  {
    intent: "irrigation",
    keywords: ["water", "irrigation", "drip", "sprinkler", "when to water"],
    answer:
      "Efficient irrigation methods like drip or sprinkler save water and increase yield. Irrigate based on critical growth stages of the crop. Do not let water stagnate.",
  },
  {
    intent: "drought",
    keywords: ["drought", "dry", "no rain", "water stress"],
    answer:
      "During drought, mulch your fields to conserve moisture, use anti-transpirants, and apply potassium to increase drought tolerance.",
  },
  // --- SPECIFIC CROPS ---
  {
    intent: "paddy",
    keywords: ["paddy", "rice", "basmati"],
    answer:
      "For paddy, maintain standing water of 2-5 cm during the vegetative stage. Apply NPK in a 120:60:40 kg/ha ratio. Watch out for stem borer and blast disease.",
  },
  {
    intent: "wheat",
    keywords: ["wheat", "rabi"],
    answer:
      "Wheat requires 4-6 irrigations at critical stages like CRI (Crown Root Initiation), jointing, and flowering. Recommended NPK is around 120:60:40 kg/ha.",
  },
  {
    intent: "cotton",
    keywords: ["cotton", "bollworm", "whitefly"],
    answer:
      "Cotton requires deep, well-drained soils. Monitor regularly for pink bollworm and whitefly. Avoid excessive nitrogen to prevent excessive vegetative growth.",
  },
  {
    intent: "sugarcane",
    keywords: ["sugarcane", "red rot"],
    answer:
      "Sugarcane is a long-duration crop needing heavy irrigation. Plant healthy setts to avoid Red Rot disease. Earthing up is important to prevent lodging.",
  },
  {
    intent: "tomato",
    keywords: ["tomato", "blight", "fruit borer"],
    answer:
      "Tomatoes need structured support (staking). Keep an eye on late blight and fruit borer. Use appropriate fungicides and trap crops like marigold.",
  },
  {
    intent: "potato",
    keywords: ["potato", "tuber", "blight"],
    answer:
      "For potatoes, earthing up is essential for tuber expansion. Late blight is the most severe disease—spray Mancozeb preventively when weather is cloudy.",
  },
  // --- PESTS & DISEASES ---
  {
    intent: "pest_general",
    keywords: ["pest", "insect", "bug", "worm"],
    answer:
      "For general pest control, adopt Integrated Pest Management (IPM). Use neem oil (10000 ppm) at 2ml/L water as a preventive spray.",
  },
  {
    intent: "fall_armyworm",
    keywords: ["armyworm", "faw", "maize pest"],
    answer:
      "Fall Armyworm primarily attacks maize. Use pheromone traps to monitor. Spray Emamectin Benzoate 5 SG at 0.4 g/L if infestation is severe.",
  },
  {
    intent: "aphids",
    keywords: ["aphid", "sucking pest", "yellow bug"],
    answer:
      "Aphids suck plant sap and transmit viruses. Spray Imidacloprid 17.8 SL at 0.5 ml/L or Thiamethoxam 25 WG at 0.25 g/L.",
  },
  {
    intent: "whitefly",
    keywords: ["whitefly", "cotton pest", "white bug"],
    answer:
      "Whiteflies transmit leaf curl virus. Use yellow sticky traps. For chemical control, use Spiromesifen or Diafenthiuron.",
  },
  {
    intent: "fungus",
    keywords: ["fungus", "rot", "wilt", "spots on leaves"],
    answer:
      "Fungal diseases thrive in high humidity. Ensure good field drainage. Broad-spectrum fungicides like Carbendazim or Mancozeb are commonly used.",
  },
  // --- SCHEMES & SUBSIDIES ---
  {
    intent: "pm_kisan",
    keywords: [
      "pm kisan",
      "6000",
      "scheme",
      "money",
      "subsidy",
      "samman nidhi",
    ],
    answer:
      "PM-KISAN scheme provides ₹6,000 per year in 3 equal installments. Ensure your e-KYC and Aadhaar-bank seeding are complete to receive the benefits.",
  },
  {
    intent: "crop_insurance",
    keywords: ["insurance", "fby", "fasal bima", "crop loss", "damage"],
    answer:
      "The Pradhan Mantri Fasal Bima Yojana (PMFBY) covers crop loss due to non-preventable natural risks. Register quickly before the sowing season ends.",
  },
  {
    intent: "soil_health_card",
    keywords: ["soil health card", "shc", "soil test"],
    answer:
      "The Soil Health Card scheme helps you get your soil tested. It provides a customized fertilizer recommendation to reduce cost and boost yield.",
  },
  // --- WEATHER & CLIMATE ---
  {
    intent: "weather",
    keywords: ["weather", "rain", "forecast", "climate"],
    answer:
      "You can check the detailed local weather in our 'Weather' tab. If you expect heavy rain, delay spraying chemicals and ensure field drainage.",
  },
  {
    intent: "frost",
    keywords: ["frost", "cold", "winter"],
    answer:
      "To protect crops from frost, apply light irrigation in the evening, create smoke around the field boundaries, or spray 0.1% thiourea.",
  },
  {
    intent: "heatwave",
    keywords: ["heat", "hot", "sunburn", "summer"],
    answer:
      "During heatwaves, increase irrigation frequency. For high-value crops, use shade nets and spray potassium nitrate to manage heat stress.",
  },
  // --- POST-HARVEST & MARKET ---
  {
    intent: "market_price",
    keywords: ["price", "mandi", "rate", "sell"],
    answer:
      "Prices vary daily in local mandis. Check the 'Market' section (e-NAM integration) of the app for the latest commodity prices.",
  },
  {
    intent: "storage",
    keywords: ["storage", "godown", "warehouse", "spoilage"],
    answer:
      "Dry grains to below 12% moisture before storage. Clean the storage bins and use Neem leaves or safe grain protectants to avoid weevils.",
  },
  // --- MISC / CATCH-ALL ---
  {
    intent: "seed_treatment",
    keywords: ["seed treatment", "before sowing", "treating seed"],
    answer:
      "Seed treatment with bio-fungicides like Trichoderma viride (4-10g/kg) or chemical fungicides prevents seed and soil-borne diseases.",
  },
  {
    intent: "loans",
    keywords: ["loan", "kcc", "kisan credit card", "credit"],
    answer:
      "Kisan Credit Card (KCC) provides affordable credit to farmers. Apply at your nearest rural or commercial bank with your land records.",
  },
];

// Replace extended with some actual typical ones, for realism:
const realisticAdditions = [
  {
    intent: "mango",
    keywords: ["mango", "fruit drop"],
    answer:
      "To reduce fruit drop in mango, ensure adequate irrigation during fruit setting and spray 2% Urea or NAA (Planofix).",
  },
  {
    intent: "banana",
    keywords: ["banana", "sigatoka", "bunchy top"],
    answer:
      "For banana, control aphids targeting Bunchy Top virus. For Sigatoka leaf spot, spray Mancozeb or Propiconazole.",
  },
  {
    intent: "onion",
    keywords: ["onion", "purple blotch", "thrips"],
    answer:
      "Onion thrips cause silvery patches. Spray Fipronil or Lambda-cyhalothrin. For Purple Blotch, use Mancozeb.",
  },
  {
    intent: "garlic",
    keywords: ["garlic", "bulb"],
    answer:
      "Garlic requires well-drained loamy soil. Provide a balanced NPK dose and ensure sulfur application for pungent bulbs.",
  },
  {
    intent: "chilli",
    keywords: ["chilli", "leaf curl", "mite"],
    answer:
      "Chilli leaf curl is spread by whiteflies and thrips. Manage sucking pests early. Use proper resistant varieties.",
  },
  {
    intent: "soybean",
    keywords: ["soybean", "yellow mosaic"],
    answer:
      "For soybean, Yellow Mosaic Virus is common, spread by whitefly. Resistant varieties are the best defense.",
  },
  {
    intent: "mustard",
    keywords: ["mustard", "aphid"],
    answer:
      "Mustard aphid is a severe pest. Monitor in December-January. Dimethoate or Oxydemeton methyl can be sprayed.",
  },
  {
    intent: "groundnut",
    keywords: ["groundnut", "peanut", "tikka"],
    answer:
      "Tikka disease in groundnut causes leaf spots. Apply Chlorothalonil or Mancozeb. Ensure adequate Calcium for pod filling.",
  },
  {
    intent: "turmeric",
    keywords: ["turmeric", "rhizome rot"],
    answer:
      "Ensure no water stagnation to prevent rhizome rot. Treat seed rhizomes with Trichoderma before planting.",
  },
  {
    intent: "ginger",
    keywords: ["ginger", "soft rot"],
    answer:
      "Soft rot is devastating for ginger. Provide excellent drainage and drench soil with Copper Oxychloride.",
  },
  {
    intent: "green_house",
    keywords: ["polyhouse", "greenhouse", "net house"],
    answer:
      "Protected cultivation avoids extreme weather and pests, yielding 3-5x more. Proper ventilation and temperature control are vital.",
  },
  {
    intent: "tractor",
    keywords: ["tractor", "plough", "tillage"],
    answer:
      "Deep summer ploughing exposes soil pathogens and insects to harsh sunlight, acting as a natural pest control method.",
  },
  {
    intent: "drone",
    keywords: ["drone", "spray"],
    answer:
      "Agricultural drones can spray pesticides across 1 acre in 10 minutes, saving water and reducing human exposure to chemicals.",
  },
  {
    intent: "hydroponics",
    keywords: ["hydroponics", "soil less"],
    answer:
      "Hydroponics requires managing water EC and pH rigorously. Leafy greens like lettuce thrive in NFT hydroponic systems.",
  },
  {
    intent: "loan_waiver",
    keywords: ["loan waiver", "forgive loan", "maafi", "karz"],
    answer: "Crop loan waivers depend on specific state government policies. Please check announcements from your state's agriculture department or visit your local bank branch for updates on ongoing waiver schemes."
  },
  {
    intent: "soil_testing",
    keywords: ["how to test soil", "soil sample", "laboratory", "ph test"],
    answer: "To test your soil, take random samples from a depth of 15cm across the field, mix them, and dry in the shade. Take about 500g of this mixture to your nearest KVK or government soil testing lab."
  },
  {
    intent: "pm_kusum",
    keywords: ["solar pump", "kusum", "solar panel", "electricity"],
    answer: "The PM-KUSUM scheme provides up to 60% subsidy to set up standalone solar agriculture pumps and grid-connected solar power plants. You can apply on the official MNRE portal or your state's renewable energy agency."
  },
  {
    intent: "crop_rotation",
    keywords: ["crop rotation", "change crop", "soil fertility"],
    answer: "Rotating crops, for example following a cereal crop (wheat/rice) with a legume crop (chickpea/soybean), helps naturally restore nitrogen in the soil and breaks pest and disease cycles."
  },
  {
    intent: "bhendi_okra",
    keywords: ["bhendi", "okra", "bhindi", "yellow vein mosaic"],
    answer: "Yellow Vein Mosaic Virus is a common problem in Bhindi (Okra), transmitted by whiteflies. Plant resistant varieties like Arka Anamika and use sticky traps early in the season."
  },
  {
    intent: "post_harvest_processing",
    keywords: ["processing", "value addition", "jam", "pickles", "drying"],
    answer: "Adding value to raw produce, like making turmeric powder, mango pulp, or drying spices, can double your profits. The PM FME scheme offers subsidies for setting up micro food processing units."
  },
  {
    intent: "animal_husbandry",
    keywords: ["cow", "buffalo", "dairy", "milk", "poultry", "goat"],
    answer: "Integrated farming, which includes dairy or poultry alongside crops, provides a steady income. The National Livestock Mission offers subsidies for fodder development and setting up goat/poultry farms."
  },
  {
    intent: "kisan_call_center",
    keywords: ["call center", "helpline", "toll free", "phone number", "customer care"],
    answer: "You can reach the Kisan Call Center toll-free at 1800-180-1551 from 6 AM to 10 PM. Agricultural experts answer queries in local languages."
  },
  {
    intent: "millet_promotion",
    keywords: ["millets", "jowar", "bajra", "ragi", "shree anna"],
    answer: "Millets (Shree Anna) are climate-resilient and require very little water. State and central governments have special incentives and guaranteed procurement for millets. Good for dryland farming!"
  },
  {
    intent: "e_nam",
    keywords: ["e-nam", "enam", "online market", "sell online", "mandi online"],
    answer: "e-NAM (National Agriculture Market) is an online trading platform connecting APMC mandis across India. You can register with your local mandi to sell produce to buyers outside your district for better prices."
  }
];

export const finalChatbotKB = [...chatbotKB, ...realisticAdditions];
