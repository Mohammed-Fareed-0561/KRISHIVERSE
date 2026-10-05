/**
 * eval/cases.retrieval.js — retrieval benchmark cases (NOT ground truth).
 *
 * Every query is built from a REAL curated record's own indexed text
 * (src/data/seed/*.js + kb v2), so expectations are defensible retrieval
 * checks, not agronomic labels: origin is synthetic-screening throughout.
 * Topics follow the Phase 3B breakdown; fertilizer/pest/cultivation have NO
 * curated evidence and are reported as uncovered, not faked.
 */
import { validateCaseList } from "./schemas.js";

const S = "src/data/seed/";

function rag(id, language, difficulty, input, recordIds, topic, source, notes) {
  return {
    id, type: "rag", origin: "synthetic-screening", language, difficulty,
    input, expected: { recordIds, minTopK: 5, sourceClass: "curated" },
    topic, source, ...(notes ? { notes } : {}),
  };
}

const _CASES = [
  // ── crops → general agriculture ──
  rag("ret-crop-tomato-en", "en", "easy", "tomato", ["crop_tomato"], "general", S + "cropData.js"),
  rag("ret-crop-tomato-ta", "ta", "easy", "தக்காளி", ["crop_tomato"], "general", S + "cropData.js"),
  rag("ret-crop-tomato-hi", "hi", "easy", "टमाटर", ["crop_tomato"], "general", S + "cropData.js"),
  rag("ret-crop-tomato-alias", "en", "easy", "tamatar", ["crop_tomato"], "general", S + "cropData.js"),
  rag("ret-crop-rice-en", "en", "easy", "rice", ["crop_rice"], "general", S + "cropData.js"),
  rag("ret-crop-rice-ta", "ta", "easy", "நெல்", ["crop_rice"], "general", S + "cropData.js"),
  rag("ret-crop-rice-hi", "hi", "easy", "धान", ["crop_rice"], "general", S + "cropData.js"),
  rag("ret-crop-rice-alias", "en", "easy", "paddy", ["crop_rice"], "general", S + "cropData.js"),
  rag("ret-crop-chilli-en", "en", "easy", "chilli", ["crop_chilli"], "general", S + "cropData.js"),
  rag("ret-crop-chilli-ta", "ta", "easy", "மிளகாய்", ["crop_chilli"], "general", S + "cropData.js"),
  rag("ret-crop-chilli-hi", "hi", "easy", "मिर्च", ["crop_chilli"], "general", S + "cropData.js"),
  rag("ret-crop-chilli-alias", "en", "easy", "mirchi", ["crop_chilli"], "general", S + "cropData.js"),
  // ── diseases → disease ──
  rag("ret-dis-eb-en", "en", "easy", "tomato early blight", ["dp_tomato_early_blight"], "disease", S + "diseaseData.js"),
  rag("ret-dis-eb-ta", "ta", "medium", "துளிர் கருகல் நோய்", ["dp_tomato_early_blight"], "disease", S + "diseaseData.js"),
  rag("ret-dis-eb-hi", "hi", "medium", "अगेती झुलसा", ["dp_tomato_early_blight"], "disease", S + "diseaseData.js"),
  rag("ret-dis-eb-symptom", "en", "medium", "yellow spots with concentric rings on tomato", ["dp_tomato_early_blight"], "disease", S + "diseaseData.js"),
  rag("ret-dis-curl-en", "en", "easy", "chilli leaf curl virus", ["dp_chilli_leaf_curl"], "disease", S + "diseaseData.js"),
  rag("ret-dis-curl-ta", "ta", "medium", "இலை சுருட்டு நோய்", ["dp_chilli_leaf_curl"], "disease", S + "diseaseData.js"),
  rag("ret-dis-curl-hi", "hi", "medium", "पर्ण कुंचन", ["dp_chilli_leaf_curl"], "disease", S + "diseaseData.js"),
  rag("ret-dis-curl-symptom", "en", "medium", "upward curling of chilli leaves stunted growth", ["dp_chilli_leaf_curl"], "disease", S + "diseaseData.js"),
  // ── symptoms → symptom ──
  rag("ret-sym-rings-en", "en", "easy", "Yellow spots with concentric rings", ["symp_yellow_concentric_rings"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-rings-ta", "ta", "medium", "வட்டவட்டமான மஞ்சள் நிறப்புள்ளிகள்", ["symp_yellow_concentric_rings"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-rings-hi", "hi", "medium", "संकेन्द्रित छल्ले वाले पीले धब्बे", ["symp_yellow_concentric_rings"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-lower-en", "en", "easy", "Spots on lower leaves first", ["symp_spot_lower_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-lower-ta", "ta", "medium", "முதலில் கீழ் இலைகளில் புள்ளிகள்", ["symp_spot_lower_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-lower-hi", "hi", "medium", "पहले निचली पत्तियों पर धब्बे", ["symp_spot_lower_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-curl-en", "en", "easy", "Upward curling of leaves", ["symp_curled_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-curl-ta", "ta", "medium", "இலைகள் மேல்நோக்கிச் சுருங்குதல்", ["symp_curled_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-curl-hi", "hi", "medium", "पत्तियों का ऊपर की ओर मुड़ना", ["symp_curled_leaves"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-stunt-en", "en", "easy", "Stunted plant growth", ["symp_stunted_growth"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-stunt-ta", "ta", "medium", "குறைந்த செடி வளர்ச்சி", ["symp_stunted_growth"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-stunt-hi", "hi", "medium", "पौधे का विकास रुकना", ["symp_stunted_growth"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-veins-en", "en", "easy", "Thickening of leaf veins", ["symp_thick_veins"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-veins-ta", "ta", "medium", "இலை நரம்புகள் தடித்தல்", ["symp_thick_veins"], "symptom", S + "diseaseData.js"),
  rag("ret-sym-veins-hi", "hi", "medium", "पत्तियों की शिराओं का मोटा होना", ["symp_thick_veins"], "symptom", S + "diseaseData.js"),
  // ── treatments → treatment / prevention ──
  rag("ret-tx-neem-en", "en", "easy", "neem leaf extract spray", ["tr_tomato_blight_organic"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-neem-ta", "ta", "medium", "வேப்பிலை சாறு", ["tr_tomato_blight_organic"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-neem-hi", "hi", "medium", "नीम पत्ती अर्क", ["tr_tomato_blight_organic"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-copper-en", "en", "easy", "copper oxychloride spray", ["tr_tomato_blight_chem"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-copper-ta", "ta", "medium", "காப்பர் ஆக்ஸிகுளோரைடு", ["tr_tomato_blight_chem"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-copper-hi", "hi", "medium", "कॉपर ऑक्सीक्लोराइड", ["tr_tomato_blight_chem"], "treatment", S + "treatmentData.js"),
  rag("ret-tx-whitefly-en", "en", "easy", "control whiteflies burn infected plants", ["tr_chilli_curl_control"], "prevention", S + "treatmentData.js"),
  rag("ret-tx-whitefly-ta", "ta", "medium", "வெள்ளை ஈக்கள்", ["tr_chilli_curl_control"], "prevention", S + "treatmentData.js"),
  rag("ret-tx-whitefly-hi", "hi", "medium", "सफेद मक्खी", ["tr_chilli_curl_control"], "prevention", S + "treatmentData.js"),
];

validateCaseList(_CASES);
export const RETRIEVAL_CASES = _CASES;
export const RETRIEVAL_SUMMARY = {
  total: _CASES.length,
  note: "screening-only retrieval checks against 13 curated records; fertilizer/pest/cultivation topics have no curated evidence (reported uncovered).",
};
