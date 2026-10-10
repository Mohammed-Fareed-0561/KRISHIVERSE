/**
 * AgriculturalNLP.js
 *
 * World-class NLP for Indian farming chatbot:
 *  - 200+ crop & disease aliases: English, Hindi, Tamil, Marathi, Bengali, Punjabi
 *  - Symptom alias dictionary covering broken phrases farmers use
 *  - Inverted index builder (runs once at warm-up → O(1) per token at query time)
 *  - Fuzzy phonetic matching for misspellings
 *  - Intent classifier robust to any sentence structure
 */

// ─── STOP WORDS ───────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "the","is","are","was","were","my","your","our","this","that","it",
  "for","of","and","or","in","on","at","to","a","an","be","has","have",
  "had","with","from","but","not","can","will","what","how","when","why",
  "i","me","we","you","they","please","help","tell","show","give","want",
  "need","some","any","all","do","did","does","mera","meri","mujhe","muje",
  "hamara","hamare","aapka","aapke","kya","kaise","kab","kaun","kyun",
  "batao","bataye","bado","samjhao","yeh","woh","iska","uska","unka",
  "karein","karo","chahiye","chahie","nahi","nahin","hai","hain","hoga",
  "hua","hui","raha","rahi","rahe","se","ko","ka","ki","ke","par","pe",
  "ek","dono","sabhi","kuch","bahut","thoda","zyada","kam","jaldi","abhi",
]);

// ─── CROP ALIAS MAP ───────────────────────────────────────────────────────────
// Maps any alias back to the canonical crop value used in GuidedDiagnosisEngine
export const CROP_ALIASES = {
  // Rice
  rice: "rice", paddy: "rice", dhan: "rice", "धान": "rice", chawal: "rice",
  "cha'wal": "rice", nellu: "rice", nel: "rice", "நெல்": "rice", "நெல்லு": "rice",
  sali: "rice", "oryza": "rice", kharif: "rice",
  // Wheat
  wheat: "wheat", gehun: "wheat", gehu: "wheat", "गेहूं": "wheat",
  "गेहूँ": "wheat", godhi: "wheat", "கோதுமை": "wheat", triticum: "wheat",
  // Tomato
  tomato: "tomato", tamatar: "tomato", tamater: "tomato", "टमाटर": "tomato",
  thakkali: "tomato", "தக்காளி": "tomato", tomate: "tomato",
  // Onion
  onion: "onion", pyaz: "onion", piaz: "onion", "प्याज": "onion",
  vengayam: "onion", "வெங்காயம்": "onion", kanda: "onion",
  // Potato
  potato: "potato", aloo: "potato", alu: "potato", "आलू": "potato",
  urulaikizhangu: "potato", "உருளைக்கிழங்கு": "potato",
  // Cotton
  cotton: "cotton", kapas: "cotton", "कपास": "cotton", parutti: "cotton",
  narma: "cotton", "பருத்தி": "cotton", rui: "cotton",
  // Sugarcane
  sugarcane: "sugarcane", ganna: "sugarcane", "गन्ना": "sugarcane",
  kabbu: "sugarcane", "கரும்பு": "sugarcane", ikh: "sugarcane",
  // Groundnut
  groundnut: "groundnut", moongfali: "groundnut", "मूंगफली": "groundnut",
  peanut: "groundnut", verkadalai: "groundnut", "வேர்க்கடலை": "groundnut",
  // Maize / Corn
  maize: "maize", corn: "maize", makka: "maize", makkai: "maize",
  "मक्का": "maize", "மக்காச்சோளம்": "maize", bhutta: "maize",
  // Soybean
  soybean: "soybean", soya: "soybean", soyabean: "soybean",
  "सोयाबीन": "soybean", soyabeen: "soybean",
  // Sunflower
  sunflower: "sunflower", surajmukhi: "sunflower", "सूरजमुखी": "sunflower",
  "சூரியகாந்தி": "sunflower",
  // Chilli
  chilli: "chilli", chili: "chilli", mirchi: "chilli", "मिर्च": "chilli",
  milagai: "chilli", "மிளகாய்": "chilli", "lal mirch": "chilli", lalmirch: "chilli",
  // Banana
  banana: "banana", kela: "banana", "केला": "banana", vazhai: "banana",
  "வாழை": "banana",
  // Mango
  mango: "mango", aam: "mango", "आम": "mango", manga: "mango",
  "மாம்பழம்": "mango", mangifera: "mango",
  // Chickpea
  chickpea: "chickpea", chana: "chickpea", gram: "chickpea",
  "चना": "chickpea", kadalai: "chickpea", "கடலை": "chickpea",
  // Lentil / Dal
  lentil: "lentil", dal: "lentil", daal: "lentil", masur: "lentil",
  "मसूर": "lentil", "दाल": "lentil",
  // Mustard
  mustard: "mustard", sarson: "mustard", "सरसों": "mustard",
  kadugu: "mustard", "கடுகு": "mustard",
  // Garlic
  garlic: "garlic", lehsun: "garlic", "लहसुन": "garlic",
  poondu: "garlic", "பூண்டு": "garlic",
  // Capsicum / Bell pepper
  capsicum: "capsicum", "bell pepper": "capsicum", "shimla mirch": "capsicum", shimlamirch: "capsicum",
  // Brinjal / Eggplant
  brinjal: "brinjal", eggplant: "brinjal", baingan: "brinjal",
  "बैंगन": "brinjal", "கத்திரிக்காய்": "brinjal",
  // Cabbage
  cabbage: "cabbage", "patta gobhi": "cabbage", pattagobhi: "cabbage", kobi: "cabbage",
  // Cauliflower
  cauliflower: "cauliflower", "phool gobhi": "cauliflower", phoolgobhi: "cauliflower",
};

// ─── SYMPTOM ALIAS MAP ────────────────────────────────────────────────────────
export const SYMPTOM_ALIASES = {
  // Yellow leaves
  yellowing: "yellowing", yellow: "yellowing", pale: "yellowing",
  pila: "yellowing", "पीला": "yellowing", pilahpa: "yellowing",
  peeli: "yellowing", peela: "yellowing", "மஞ்சள்": "yellowing",
  manjal: "yellowing", halku: "yellowing", "हल्का": "yellowing",
  chlorosis: "yellowing", chlorotic: "yellowing",
  // Brown spots
  "brown spots": "brown spots", spots: "brown spots", brown: "brown spots",
  dag: "brown spots", "धब्बे": "brown spots", dhabbe: "brown spots",
  patches: "brown spots", lesion: "brown spots", lesions: "brown spots",
  "புள்ளி": "brown spots", pulli: "brown spots", spot: "brown spots",
  // Wilting
  wilting: "wilting", wilt: "wilting", droop: "wilting", drooping: "wilting",
  murjhana: "wilting", mura: "wilting", "मुरझाना": "wilting",
  sukhna: "wilting", sukha: "wilting", limp: "wilting", sag: "wilting",
  "வாடல்": "wilting", vaadal: "wilting", shrivel: "wilting",
  // Pest
  pest: "pest", insect: "pest", bug: "pest", kida: "pest", keeda: "pest",
  "कीड़ा": "pest", "कीट": "pest", keet: "pest", whitefly: "pest",
  aphid: "pest", mite: "pest", thrips: "pest", caterpillar: "pest",
  locust: "pest", grasshopper: "pest", "பூச்சி": "pest", poochi: "pest",
  worm: "pest", larva: "pest", larvae: "pest", nematode: "pest",
  // Stunted growth
  "stunted growth": "stunted growth", stunted: "stunted growth",
  slow: "stunted growth", small: "stunted growth", bauna: "stunted growth",
  "बौना": "stunted growth", kundi: "stunted growth", dwarf: "stunted growth",
  // Root rot
  "root rot": "root rot", rot: "root rot", rotting: "root rot",
  galna: "root rot", "गलना": "root rot", soggy: "root rot", mushy: "root rot",
  // White mold / Powdery mildew
  "white mold": "white mold", mold: "white mold", fungus: "white mold",
  powder: "white mold", powdery: "white mold", safed: "white mold",
  "सफेद": "white mold", mildew: "white mold", fungi: "white mold",
  // Leaf curl
  "leaf curl": "leaf curl", curl: "leaf curl", curling: "leaf curl",
  twist: "leaf curl", twisted: "leaf curl", distort: "leaf curl",
  murna: "leaf curl", "मुड़ना": "leaf curl",
  // Discoloration
  discoloration: "discoloration", purple: "discoloration", red: "discoloration",
  lal: "discoloration", "लाल": "discoloration",
  // Blight
  blight: "blight", black: "blight", kala: "blight", "काला": "blight",
  blait: "blight", "blast": "blight", fire: "blight",
  // Flower/fruit drop
  "flower drop": "flower drop", "fruit drop": "flower drop",
  drop: "flower drop", fall: "flower drop", "phal girna": "flower drop", phalgirna: "flower drop",
  "फल गिरना": "flower drop",
  // Dying / general distress
  dying: "general", die: "general", dead: "general", sick: "general",
  marna: "general", mar: "general", "मर रहा": "general",
  problem: "general", issue: "general", trouble: "general",
  kharab: "general", "खराब": "general", bekaar: "general",
};

// ─── INTENT ALIAS MAP ─────────────────────────────────────────────────────────
// Canonical intents (see docs/chatbot/intent-taxonomy.md). Single-word entries
// are matched script-aware (Latin substring legacy; short-Latin token-exact;
// non-Latin token prefix/exact so तना never matches inside कितना).
// Multi-word entries are matched as separator-bounded phrases.
export const INTENT_ALIASES = {
  greeting:   ["hello","hey","greetings","vanakkam","வணக்கம்","namaste","नमस्ते",
                "வணக்கம்","good morning","good evening"],
  help:       ["help","உதவி","udhavi","uthavi","मदद","madad",
                "help me","how can you help","can you help","please help",
                "எனக்கு உதவுங்கள்"],
  what_is:    ["என்ன","enna","क्या","kya",
                "what is","what are","what does","tell me about",
                "what do you mean","என்றால் என்ன"],
  disease:    ["disease","sick","dying","die","affected","infected","problem",
                "symptoms","symptom","yellowing","spots","blight","blast","wilt","rot",
                "mold","mildew","curl","pest","insect","fungus","virus","attack","damage",
                "kida","keeda","mara","bimari","rog","बीमारी","रोग","kharab","पत्ता","patta",
                "पीला","पीले","धब्बा","धब्बे","मुरझा","झुलसा",
                "நோய்","பிரச்சனை","புள்ளி","மஞ்சள்","வாடல்","பூச்சி","இலை","கருகல்",
                "leaf","plant","fasal","फसल","तना","stem","root","jad","बीज"],
  fertilizer: ["fertilizer","manure","npk","urea","dap","nutrient","dose",
                "nitrogen","phosphorus","potassium","deficiency","khad","खाद",
                "urvarak","उर्वरक","compost","fertiliser","zinc","boron","iron",
                "magnesium","sulphur","tsp","ssp","mop","உரம்","யூரியா","uram"],
  scheme:     ["scheme","subsidy","government","pm kisan","pmfby","loan","kcc",
                "kisan credit","insurance","benefit","yojana","योजना",
                "sarkar","सरकार","sahayata","सहायता","rupee","paise","money",
                "paisa","fayda","திட்டம்","மானியம்"],
  weather:    ["weather","rain","monsoon","drought","flood","temperature",
                "climate","forecast","barish","बारिश","sookha","सूखा","mosam",
                "मौसम","aandhi","toofan","ola","olu","மழை","வானிலை","mazhai"],
  price:      ["price","mandi","market","sell","rate","today","cost","bhav",
                "भाव","bazar","bazaar","बाजार","bikri","बिक्री","mandir","daam",
                "விலை","சந்தை"],
  cultivation:["how to grow","cultivation","sow","planting","spacing","irrigation",
                "harvest","harvested","variety","seed","ugana","उगाना","beej","बीज",
                "ropai","रोपाई","fasal","फसल","kheti","खेती","kisan","kishan",
                "buvai","pani","panee","water","सिंचाई","விவசாயம்","சாகுபடி","பயிர்",
                "விதை","நடவு"],
  treatment:  ["treat","treatment","cure","control","remedy","spray",
                "prevent","prevention","சிகிச்சை","மருந்து","தடுப்பு",
                "इलाज","उपचार","दवा","रोकथाम","बचाव",
                "how to treat","how to cure","how to control","how to prevent",
                "how do i treat"],
  about:      ["what can you do","what you can do","tell me about yourself",
                "who are you","what are you","your capabilities","how can you help",
                "features","capabilities","about you","introduce yourself",
                "what is this","kya kar sakte ho","tum kaun ho",
                "நீங்கள் என்ன செய்ய முடியும்","உங்களைப் பற்றி"],
};

// Phrase-first intents: multi-word/anchored patterns score double so that
// "what is X" beats a coincidental keyword and "help me" beats scheme.
const INTENT_PHRASE_BONUS = {
  help: ["help me","how can you help","can you help","please help"],
  about: ["what can you do","who are you","introduce yourself"],
  what_is: ["what is","what are","what does","tell me about","tell me a"],
  greeting: ["good morning","good evening"],
  // Symptom-seeking questions are disease questions even when phrased as
  // what-are ("What are the symptoms of brown spot in rice?") — otherwise the
  // what_is phrase bonus ties/wins and the query routes to the wrong handler.
  disease: ["symptoms of","signs of"],
};

// Tie-break priority: meta/advice-seeking intents win ties so "help" can never
// lose to "scheme" and advice-seeking beats symptom-reporting on ties.
export const INTENT_PRIORITY = [
  "greeting","help","about","what_is","treatment","disease",
  "fertilizer","scheme","weather","price","cultivation",
];

// ─── SOURCE PRIORITY & VERIFIED RECORDS ───────────────────────────────────────
// Records carry an optional source/sourceUrl/provider/origin field. When present
// we rank by trustworthiness (institutional sources first). Curated hand-written
// records (dp_/tr_/symp_/crop_tomato|rice|chilli) are treated as verified even
// without an explicit source tag. Ranking is a small BOOST, never a hard filter:
// relevance and crop match always dominate.
export const SOURCE_PRIORITY = [
  { id: "tnau", label: "TNAU", weight: 8, match: /tnau|tamil\s?nadu\s?agricultural\s?university/i },
  { id: "icar", label: "ICAR", weight: 7, match: /icar|indian\s?council\s?of\s?agricultural/i },
  { id: "state", label: "State Agriculture Dept", weight: 6, match: /state\s?agriculture|agriculture\s?department|agri\s?dept/i },
  { id: "kvk", label: "KVK", weight: 5, match: /kvk|krishi\s?vigyan\s?kendra/i },
  { id: "govt", label: "Government", weight: 4, match: /govt|government|official/i },
  { id: "imd", label: "IMD", weight: 3, match: /imd|meteorological/i },
  { id: "agmarknet", label: "Agmarknet", weight: 2, match: /agmarknet/i },
  { id: "fao", label: "FAO", weight: 1, match: /fao|food\s?and\s?agriculture\s?organization/i },
];

export const CURATED_ID_PATTERNS = [
  /^dp_/, /^tr_/, /^symp_/,
  /^crop_tomato$/, /^crop_rice$/, /^crop_chilli$/,
];

export const SOURCE_BOOST_FACTOR = 2; // max +2 for a top-priority source
export const VERIFIED_BONUS = 1;      // +1 for verified/curated records

/**
 * 0..8 — the highest-priority institutional source a record declares, else 0.
 */
export function getSourcePriority(record) {
  if (!record) return 0;
  const fields = [record.source, record.sourceName, record.sourceUrl, record.provider, record.publisher, record.origin]
    .filter(Boolean)
    .join(" ");
  if (!fields) return 0;
  for (const entry of SOURCE_PRIORITY) {
    if (entry.match.test(fields) || fields.toLowerCase().includes(entry.id)) return entry.weight;
  }
  return 0;
}

/**
 * True when a record is verified. Per the KB provenance policy (KB_SCHEMA_VERSION 2)
 * an id prefix alone (dp_/tr_/symp_/crop_tomato) never implies verification: a
 * record must carry an explicit `verified: true` flag OR a recognised source to
 * be trusted with high-risk content (dosages, spray intervals). Zero-provenance
 * records stay unverified so the ResponseValidator can block their high-risk
 * recommendations.
 */
export function isVerifiedRecord(record) {
  if (!record) return false;
  if (record.verified === true) return true;
  return getSourcePriority(record) > 0;
}

// ─── INVERTED INDEX BUILDER ───────────────────────────────────────────────────
// Built once at warm-up; gives O(k) query time where k = number of query tokens

let _invertedIndex = null;   // token → Set of record IDs
let _recordMap     = null;   // record ID → record object

export function resetIndex() {
  _invertedIndex = null;
  _recordMap = null;
}

export function isQuarantined(record) {
  return Boolean(record && (record.status === "quarantined" || record.recordKind === "synthetic"));
}

export function buildInvertedIndex(stores, opts = {}) {
  const index     = new Map();
  const recordMap = new Map();
  const includeQuarantined = Boolean(opts.includeQuarantined);

  // Resolve cropId ("crop_tomato") → canonical crop name ("tomato") using the
  // crops store, so disease records that only link via cropId still get indexed
  // (and crop-aware ranked) by their actual crop.
  const cropsById = new Map();
  for (const c of stores.crops || []) {
    if (c?.id) cropsById.set(String(c.id).toLowerCase(), c);
  }

  function resolveCrop(record) {
    const direct = record.crop ?? (Array.isArray(record.crops) ? record.crops[0] : null);
    if (direct) return String(direct).toLowerCase();
    if (record.cropId) {
      const crop = cropsById.get(String(record.cropId).toLowerCase());
      if (crop) return String(crop.name || crop.crop || "").toLowerCase();
    }
    return null;
  }

  function indexRecord(record, type) {
    if (!record?.id) return;
    if (!includeQuarantined && isQuarantined(record)) return;
    const resolvedCrop = resolveCrop(record);
    const enriched = {
      ...record,
      _type: type,
      _crop: resolvedCrop,
      _sourcePriority: getSourcePriority(record),
      _verified: isVerifiedRecord(record),
    };
    recordMap.set(record.id, enriched);

    const textParts = [
      record.name, record.description, record.commonName,
      record.hindiName, record.tamilName, record.marathiName,
      record.bengaliName, record.punjabi, record.teluguName,
      // Seed/KB body fields (Phase 3B: symptom `text` and treatment `method`
      // were never indexed, so exact body-text queries retrieved nothing).
      record.text, record.text_ta, record.text_hi,
      record.method, record.method_ta, record.method_hi,
      record.name_ta, record.name_hi,
      record.category, record.type, record.cause, record.symptoms,
      record.prevention, record.action, record.label, record.title,
      Array.isArray(record.crops) ? record.crops.join(" ") : record.crop,
      resolvedCrop,
      Array.isArray(record.symptoms) ? record.symptoms.join(" ") : "",
    ];

    const fullText = textParts.filter(Boolean).join(" ");
    const tokens   = tokenize(fullText);

    // Index all aliases of the resolved crop too ("tamatar" → tomato disease)
    if (resolvedCrop) {
      for (const [alias, canonical] of Object.entries(CROP_ALIASES)) {
        if (canonical === resolvedCrop && !tokens.includes(alias)) tokens.push(alias);
      }
    }

    for (const tok of tokens) {
      if (!index.has(tok)) index.set(tok, new Set());
      index.get(tok).add(record.id);
    }
  }

  (stores.crops      || []).forEach((r) => indexRecord(r, "crop"));
  (stores.symptoms   || []).forEach((r) => indexRecord(r, "symptom"));
  (stores.diseases   || []).forEach((r) => indexRecord(r, "disease"));
  (stores.treatments || []).forEach((r) => indexRecord(r, "treatment"));
  // Edges carry no searchable text (only id pairs) — they are excluded from the
  // answer index; relationship traversal is handled via the relationship index.

  // Also index all crop aliases
  for (const [alias, canonical] of Object.entries(CROP_ALIASES)) {
    if (!index.has(alias)) index.set(alias, new Set());
    // collect all records that match the canonical crop value
    for (const [id, rec] of recordMap) {
      const fieldMatch = [rec.name, rec.crop, rec.crops].flat().filter(Boolean)
        .some((v) => String(v).toLowerCase() === canonical);
      if (fieldMatch) index.get(alias).add(id);
    }
  }

  _invertedIndex = index;
  _recordMap     = recordMap;

  console.log(`[AgriculturalNLP] Inverted index built: ${index.size} tokens → ${recordMap.size} records`);
  return { index, recordMap };
}

// ─── TOKENIZER ─────────────────────────────────────────────────────────────────
export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\u0900-\u097f\u0B80-\u0BFF\s]/g, " ")  // keep Devanagari + Tamil
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

// ─── ALIAS NORMALIZER ─────────────────────────────────────────────────────────
/**
 * Non-Latin keyword/alias matcher (Tamil + Devanagari).
 *
 * Rules, in order:
 *  1. whole-token or token-PREFIX match — never substring, so the तना⊂कितना
 *     class of collisions stays impossible for token starts;
 *  2. case-suffix virama swap: a kw ending in virama (நோய், வாடல்) mutates when
 *     a case suffix attaches (நோய் + ஐ → நோயை, codepoints …baf/bcd → …baf/bc8),
 *     so kw-stem + dependent-vowel-sign also matches.
 */
const DEPENDENT_VOWEL_SIGN = /[\u0BBE-\u0BC8\u093E-\u0948]/;
const TAMIL_VIRAMA = "\u0BCD";
const DEVANAGARI_VIRAMA = "\u094D";
function matchesNonLatin(token, kw) {
  if (token === kw || token.startsWith(kw)) return true;
  if (kw.length > 2 && (kw.endsWith(TAMIL_VIRAMA) || kw.endsWith(DEVANAGARI_VIRAMA))) {
    const stem = kw.slice(0, -1);
    return token.startsWith(stem) && DEPENDENT_VOWEL_SIGN.test(token.charAt(stem.length));
  }
  return false;
}

export function normalizeCrop(token) {
  return CROP_ALIASES[String(token || "").toLowerCase()] || null;
}

/**
 * Latin aliases stay token-exact (short words must never substring-match);
 * non-Latin aliases match whole tokens, token prefixes, and case-suffix
 * mutations (புள்ளிகள் ⊃ புள்ளி, மஞ்சளாகிறது ⊃ மஞ்சள்) — the same morphology
 * the intent classifier already accepts.
 */
export function normalizeSymptom(token) {
  const t = String(token || "").toLowerCase();
  const exact = SYMPTOM_ALIASES[t];
  if (exact) return exact;
  if (!t) return null;
  for (const [alias, canonical] of Object.entries(SYMPTOM_ALIASES)) {
    if (isNonLatin(alias) && matchesNonLatin(t, alias)) return canonical;
  }
  return null;
}

/**
 * Distinct canonical symptoms present in a query (exact/prefix match, no
 * fuzzy). The generic "general" bucket (problem/issue/trouble) is excluded —
 * "a problem" is not a competing disease. Used by the decision engine's
 * differential-ambiguity rule: two or more distinct symptoms in one query =
 * ask which one, never pick one.
 */
export function distinctSymptoms(text) {
  const out = new Set();
  for (const tok of tokenize(text)) {
    const s = normalizeSymptom(tok);
    if (s && s !== "general") out.add(s);
  }
  return out;
}

// ─── INTENT CLASSIFIER ────────────────────────────────────────────────────────
// Boundary/token-aware: phrases need separator boundaries (unicode-aware);
// Latin keywords keep legacy substring behaviour (plurals); short Latin
// (<3 chars, e.g. "hi") and non-Latin keywords match whole tokens / token
// prefixes only — so தனா-style collisions like तना⊂कितना cannot score.
function containsBoundedPhrase(text, phrase) {
  const esc = String(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

const isNonLatin = (s) => [...String(s)].some((c) => c.codePointAt(0) > 0x7f);

export function classifyIntent(text) {
  const t = String(text || "").toLowerCase();
  const tokens = tokenize(t);
  const scores = Object.create(null);
  const hit = (intent, w) => { scores[intent] = (scores[intent] || 0) + w; };

  for (const [intent, phrases] of Object.entries(INTENT_PHRASE_BONUS)) {
    for (const ph of phrases) {
      if (containsBoundedPhrase(t, ph)) hit(intent, 2);
    }
  }

  for (const [intent, keywords] of Object.entries(INTENT_ALIASES)) {
    for (const raw of keywords) {
      const kw = String(raw).toLowerCase();
      if (!kw) continue;
      if (kw.includes(" ")) {
        if (containsBoundedPhrase(t, kw)) hit(intent, 1);
      } else if (isNonLatin(kw)) {
        if (tokens.some((tok) => matchesNonLatin(tok, kw))) hit(intent, 1);
      } else if (kw.length < 3) {
        if (tokens.includes(kw)) hit(intent, 1);
      } else if (t.includes(kw)) {
        hit(intent, 1);
      }
    }
  }

  // Phase 2: symptom-anchored disease reinforcement. A canonical symptom found
  // in the query — exact alias, Tamil/Hindi inflection (normalizeSymptom), or a
  // Latin misspelling within edit distance 1 (4-5 chars) / 2 (6+) — strengthens
  // ONLY the disease intent, capped at +1 total: enough to break a tie with
  // what_is (+2 phrase), never enough to dominate a phrase intent. This is what
  // lets "yeelow"/"blsat"/"yellow" route to disease offline without any LLM.
  {
    const seen = new Set();
    for (const tok of tokens) {
      let canon = normalizeSymptom(tok);
      if (!canon && /^[a-z0-9]+$/.test(tok) && tok.length >= 4) {
        const maxD = tok.length >= 6 ? 2 : 1;
        for (const [alias, canonical] of Object.entries(SYMPTOM_ALIASES)) {
          if (!/^[a-z0-9]+$/.test(alias) || Math.abs(alias.length - tok.length) > maxD) continue;
          if (osaDistance(tok, alias) <= maxD) { canon = canonical; break; }
        }
      }
      if (canon) seen.add(canon);
    }
    if (seen.size) hit("disease", 1);
  }

  const order = [
    ...INTENT_PRIORITY,
    ...Object.keys(INTENT_ALIASES).filter((i) => !INTENT_PRIORITY.includes(i)),
  ];
  let bestIntent = "unknown";
  let bestScore = 0;
  for (const intent of order) {
    const score = scores[intent] || 0;
    if (score > bestScore) { bestScore = score; bestIntent = intent; }
  }

  return bestScore === 0 ? "unknown" : bestIntent;
}

// ─── FAST SEARCH using inverted index ────────────────────────────────────────
/**
 * @param {string} query  - raw farmer text
 * @param {{ type?: string, limit?: number, cropBoost?: number }} opts
 * @returns {{ records: object[], tokens: string[], crop: string|null, symptom: string|null }}
 */
export function fastSearch(query, opts = {}) {
  if (!_invertedIndex || !_recordMap) {
    return { records: [], tokens: [], crop: null, symptom: null };
  }

  const rawText = String(query || "").toLowerCase();
  const rawTokens = tokenize(query);
  let detectedCrop    = null;
  let detectedSymptom = null;

  // Expand tokens via aliases (single-word)
  const expandedTokens = [];
  for (const tok of rawTokens) {
    expandedTokens.push(tok);
    const cropAlias = normalizeCrop(tok);
    if (cropAlias) { expandedTokens.push(cropAlias); detectedCrop = cropAlias; }
    const symAlias = normalizeSymptom(tok);
    if (symAlias)  { expandedTokens.push(symAlias);  detectedSymptom = symAlias; }
  }

  // Expand multi-word aliases ("brown spots", "leaf curl", "bell pepper", ...)
  for (const [alias, canonical] of Object.entries({ ...CROP_ALIASES, ...SYMPTOM_ALIASES })) {
    if (alias.includes(" ") && rawText.includes(alias)) {
      if (!expandedTokens.includes(canonical)) expandedTokens.push(canonical);
      if (canonical in Object.fromEntries(Object.entries(CROP_ALIASES).map(([k, v]) => [v, k]))) {
        detectedCrop = canonical;
      } else {
        detectedSymptom = canonical;
      }
    }
  }

  if (expandedTokens.length === 0) return { records: [], tokens: [], crop: null, symptom: null };

  // Count how many query tokens hit each record
  const hits = new Map();  // record ID → hit count
  for (const tok of expandedTokens) {
    const ids = _invertedIndex.get(tok);
    if (!ids) continue;
    for (const id of ids) {
      hits.set(id, (hits.get(id) || 0) + 1);
    }
  }

  // Filter by type if specified
  const limit  = opts.limit || 10;
  const typeFilter = opts.type || null;

  // Crop-aware re-ranking: when a crop is detected in the query, boost records
  // that belong to that crop and penalize records that explicitly belong to a
  // different crop. This stops "tomato blight" from returning wheat templates.
  const cropBoost = opts.cropBoost ?? 3;

  const ranked = [...hits.entries()]
    .filter(([id]) => !typeFilter || _recordMap.get(id)?._type === typeFilter)
    .map(([id, count]) => {
      const rec = _recordMap.get(id);
      let score = count;
      if (detectedCrop) {
        const recCrops = [rec.crop, rec._crop, ...(Array.isArray(rec.crops) ? rec.crops : [])]
          .filter(Boolean)
          .map((c) => String(c).toLowerCase());
        const recCropsNorm = recCrops.map((c) => CROP_ALIASES[c] || c);
        const matchesCrop =
          recCropsNorm.includes(detectedCrop) ||
          String(rec.name || "").toLowerCase().includes(detectedCrop);
        if (matchesCrop) {
          score += cropBoost * 2;
        } else if (recCropsNorm.length > 0 && !recCropsNorm.includes(detectedCrop)) {
          score -= 4;
        }
      }
      // Small, secondary source-priority + verified bonus (never a hard filter).
      score += (rec._sourcePriority / 8) * SOURCE_BOOST_FACTOR;
      if (rec._verified) score += VERIFIED_BONUS;
      return [id, score, rec];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([, score, rec]) => ({ record: rec, score }))
    .filter((x) => x.record);

  return {
    records: ranked,
    tokens: expandedTokens,
    crop: detectedCrop,
    symptom: detectedSymptom,
  };
}

// ─── PHONETICIZE (simple edit-distance-based fuzzy) ─────────────────────────
// Handles "blait" → "blight", "fungous" → "fungus" etc.
// maxDistance is caller-chosen: crop slots use 1 (a false crop misroutes
// diagnosis and suppresses clarification — e.g. "look" → "aloo"/potato at
// distance 2), symptom slots keep 2 (a wrong symptom only adds context).
export function findFuzzyTokens(token, maxDistance = 2) {
  if (!_invertedIndex || token.length < 4) return [];
  const results = [];
  for (const key of _invertedIndex.keys()) {
    if (Math.abs(key.length - token.length) <= maxDistance && editDistance(token, key) <= maxDistance) {
      results.push(key);
    }
  }
  return results.slice(0, 5);
}

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Optimal string alignment distance: Levenshtein + adjacent transpositions
 * counted as 1 (blsat↔blast, teh↔the). Used only by the intent symptom
 * anchor — crop/symptom parse fuzzy keeps plain editDistance (unchanged
 * production behaviour).
 */
export function osaDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

// ─── QUERY PARSER ─────────────────────────────────────────────────────────────
/**
 * Extracts structured intent, crop, and symptom from ANY farmer text.
 * Farmer may type Hindi, Tamil, broken English, single-word queries.
 */
export function parseQuery(text) {
  const t = (text || "").toLowerCase().trim();
  const tokens = tokenize(t);

  let crop    = null;
  let symptom = null;

  // Pass 1: exact alias matches first — a clear "tomato" must win over any
  // fuzzy false positive like "treat" → "wheat" (edit distance 2).
  for (const tok of tokens) {
    if (!crop    && normalizeCrop(tok))    crop    = normalizeCrop(tok);
    if (!symptom && normalizeSymptom(tok)) symptom = normalizeSymptom(tok);
  }

  // Pass 2: fuzzy fallback for misspellings ONLY for what is still missing
  if (!crop || !symptom) {
    for (const tok of tokens) {
      if (crop && symptom) break;
      if (!crop) {
        for (const f of findFuzzyTokens(tok, 1)) {
          if (!crop && normalizeCrop(f)) crop = normalizeCrop(f);
        }
      }
      if (!symptom) {
        for (const f of findFuzzyTokens(tok, 2)) {
          if (!symptom && normalizeSymptom(f)) symptom = normalizeSymptom(f);
        }
      }
    }
  }

  const intent = classifyIntent(t);
  return { intent, crop, symptom, tokens };
}

export default { tokenize, buildInvertedIndex, fastSearch, parseQuery, classifyIntent, normalizeCrop, normalizeSymptom, distinctSymptoms, CROP_ALIASES, SYMPTOM_ALIASES, INTENT_ALIASES, INTENT_PRIORITY, SOURCE_PRIORITY, getSourcePriority, isVerifiedRecord, isQuarantined, resetIndex };
