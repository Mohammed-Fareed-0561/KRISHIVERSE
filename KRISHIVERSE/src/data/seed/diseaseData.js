export const DISEASE_PESTS = [
  {
    id: "dp_tomato_early_blight",
    name: "Early Blight",
    name_ta: "துளிர் கருகல் நோய்",
    name_hi: "अगेती झुलसा",
    cropId: "crop_tomato",
    type: "fungal",
    symptoms: ["symp_yellow_concentric_rings", "symp_spot_lower_leaves"],
    dangerLevel: "Medium"
  },
  {
    id: "dp_chilli_leaf_curl",
    name: "Leaf Curl Virus",
    name_ta: "இலை சுருட்டு நோய்",
    name_hi: "पर्ण कुंचन",
    cropId: "crop_chilli",
    type: "viral",
    symptoms: ["symp_curled_leaves", "symp_stunted_growth", "symp_thick_veins"],
    dangerLevel: "High"
  }
];

export const SYMPTOMS = [
  { id: "symp_yellow_concentric_rings", text: "Yellow spots with concentric rings", text_ta: "வட்டவட்டமான மஞ்சள் நிறப்புள்ளிகள்", text_hi: "संकेन्द्रित छल्ले वाले पीले धब्बे" },
  { id: "symp_spot_lower_leaves", text: "Spots on lower leaves first", text_ta: "முதலில் கீழ் இலைகளில் புள்ளிகள்", text_hi: "पहले निचली पत्तियों पर धब्बे" },
  { id: "symp_curled_leaves", text: "Upward curling of leaves", text_ta: "இலைகள் மேல்நோக்கிச் சுருங்குதல்", text_hi: "पत्तियों का ऊपर की ओर मुड़ना" },
  { id: "symp_stunted_growth", text: "Stunted plant growth", text_ta: "குறைந்த செடி வளர்ச்சி", text_hi: "पौधे का विकास रुकना" },
  { id: "symp_thick_veins", text: "Thickening of leaf veins", text_ta: "இலை நரம்புகள் தடித்தல்", text_hi: "पत्तियों की शिराओं का मोटा होना" }
];
