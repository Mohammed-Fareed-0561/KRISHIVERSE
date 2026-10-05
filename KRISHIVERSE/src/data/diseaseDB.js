export const diseaseDB = [
  {
    id: "tomato_early_blight",
    name: "Tomato Early Blight",
    crop: "Tomato",
    causes:
      "Caused by the fungus Alternaria solani. It thrives in warm, humid weather and typically starts on older leaves near the ground.",
    symptoms:
      "Target-like circular spots with dark rings on lower leaves, which eventually yellow and drop.",
    chemicalTreatment: [
      "Spray Mancozeb (2.5g/L of water)",
      "Use Chlorothalonil fungicide",
    ],
    naturalIndianTreatment: [
      "Spray 5% Neem Seed Kernel Extract (NSKE)",
      "Panchagavya spray (3%)",
      "Sour buttermilk spray (5-10 days fermented) to improve immunity",
    ],
  },
  {
    id: "paddy_brown_spot",
    name: "Paddy Brown Spot",
    crop: "Paddy / Rice",
    causes:
      "Caused by the fungus Bipolaris oryzae. Primarily affects nutrient-deficient soils, especially low in nitrogen and potassium.",
    symptoms:
      "Oval or cylindrical brown spots with a grey or whitish center on the leaves.",
    chemicalTreatment: [
      "Propiconazole (1ml/L of water)",
      "Mancozeb 75% WP (2kg/ha)",
    ],
    naturalIndianTreatment: [
      "Improve soil nutrition with FYM (Farm Yard Manure)",
      "Seed treatment with Agniastra",
      "Pseudomonas fluorescens bio-control agent (10g/kg seed)",
    ],
  },
  {
    id: "healthy_crop",
    name: "Healthy Crop",
    crop: "General",
    causes: "Good nutrient balance and environment.",
    symptoms: "Green, vibrant leaves with no spotting or discoloration.",
    chemicalTreatment: [
      "None required. Maintain preventive fungicidal spray rotation if seasonal.",
    ],
    naturalIndianTreatment: [
      "Continue regular Jeevamrutha application",
      "Neem oil spray once a month proactively",
    ],
  },
  {
    id: "potato_late_blight",
    name: "Potato Late Blight",
    crop: "Potato",
    causes: "Caused by the oomycete Phytophthora infestans. It spreads rapidly in cool, wet weather.",
    symptoms: "Water-soaked, dark green to black lesions on leaves, surrounded by a pale green halo. White fungal growth on the underside in humid conditions.",
    chemicalTreatment: [
      "Spray Mancozeb (2.5g/L) or Chlorothalonil before the disease appears",
      "Metalaxyl + Mancozeb combination for curative action",
    ],
    naturalIndianTreatment: [
      "Crop rotation avoiding solanaceous crops",
      "Spray 5% Neem Seed Kernel Extract (NSKE)",
      "Panchagavya foliar spray",
    ],
  },
  {
    id: "wheat_rust",
    name: "Wheat Yellow Rust",
    crop: "Wheat",
    causes: "Caused by the fungus Puccinia striiformis. Thrives in cool, moist conditions.",
    symptoms: "Yellow or orange spore pustules arranged in clear stripes on the leaves. Severe infection causes leaves to dry up prematurely.",
    chemicalTreatment: [
      "Spray Propiconazole 25 EC @ 1ml/Liter of water",
      "Tebuconazole 250 EC @ 1ml/Liter of water",
    ],
    naturalIndianTreatment: [
      "Use resistant varieties",
      "Spray sour buttermilk (diluted) to limit fungal spread",
      "Wood ash dusting on early infections",
    ],
  },
  {
    id: "sugarcane_red_rot",
    name: "Sugarcane Red Rot",
    crop: "Sugarcane",
    causes: "Caused by the fungus Colletotrichum falcatum. Primarily spreads through infected setts and water.",
    symptoms: "Yellowing and drying of the upper leaves. The stalk loses its natural color, and when split open, reveals reddened tissues with crosswise white bands and a sour alcoholic smell.",
    chemicalTreatment: [
      "Sett treatment with Carbendazim 50 WP (1g/Liter) for 15 minutes before planting",
    ],
    naturalIndianTreatment: [
      "Uproot and burn infected clumps",
      "Treat setts with Trichoderma viride culture before planting",
      "Follow proper crop rotation to break disease cycle",
    ],
  },
  {
    id: "banana_panama_disease",
    name: "Panama Disease (Fusarium Wilt)",
    crop: "Banana",
    causes: "Caused by the soil-borne fungus Fusarium oxysporum f. sp. cubense. It enters through roots and blocks the vascular system.",
    symptoms: "Yellowing begins at the margin of the older, lower leaves and progresses towards the midrib. The leaves eventually collapse and hang around the pseudostem.",
    chemicalTreatment: [
      "Soil drenching with Carbendazim (0.2%) at early stages",
    ],
    naturalIndianTreatment: [
      "Application of Neem cake in soil during planting",
      "Bio-control with Trichoderma viride and Pseudomonas fluorescens enriched Farm Yard Manure",
      "Avoid excess water-logging",
    ],
  },
  {
    id: "chilli_leaf_curl",
    name: "Chilli Leaf Curl Virus",
    crop: "Chilli",
    causes: "A viral disease transmitted primarily by Whiteflies (Bemisia tabaci).",
    symptoms: "Upward curling and crinkling of leaves, stunted plant growth, and significantly reduced flower and fruit setting.",
    chemicalTreatment: [
      "Spray Imidacloprid 17.8 SL (0.3ml/Liter) or Thiamethoxam 25 WG to control whiteflies",
      "Use systemic insecticides rotated with contact insecticides",
    ],
    naturalIndianTreatment: [
      "Use yellow sticky traps (10-15 per acre) to catch whiteflies",
      "Spray Neem oil (10,000 ppm) @ 2ml/L with soap solution",
      "Border cropping with tall plants like maize or sorghum to restrict whitefly movement",
    ],
  }
];

export const getDiseaseInfo = (index) => {
  // Map tensor index to disease, or return the exact index if it matches.
  if (index >= 0 && index < diseaseDB.length) {
    return diseaseDB[index];
  }

  // Deterministic fallback for out-of-range indexes (former Math.random()
  // mock removed: production diagnosis must be repeatable for the same input).
  return diseaseDB[0];
};
