/**
 * GuidedDiagnosisEngine.js  (v2 — NLP-powered)
 *
 * Claude-style conversation state machine for KrishiVerse chatbot.
 * Now uses AgriculturalNLP for multilingual crop/symptom/intent detection:
 *  - 60+ crop aliases (Hindi, Tamil, Marathi, Punjabi, broken English)
 *  - 80+ symptom aliases (pila, mura, kida, dag, safed, kala…)
 *  - Handles single-word, incomplete-sentence, Hinglish queries
 *
 * Flow: start → detect_intent → (crop?) → (symptom?) → (severity?) → diagnosis
 */
import { classifyIntent, normalizeCrop, normalizeSymptom, parseQuery, tokenize } from './AgriculturalNLP';

// ─── Top crops known by the engine ───────────────────────────────────────────
export const TOP_CROPS = [
  { label: "🌾 Rice / Paddy",    value: "rice" },
  { label: "🌾 Wheat",           value: "wheat" },
  { label: "🍅 Tomato",          value: "tomato" },
  { label: "🧅 Onion",           value: "onion" },
  { label: "🥔 Potato",          value: "potato" },
  { label: "🌿 Cotton",          value: "cotton" },
  { label: "🎋 Sugarcane",       value: "sugarcane" },
  { label: "🥜 Groundnut",       value: "groundnut" },
  { label: "🌻 Sunflower",       value: "sunflower" },
  { label: "🌱 Soybean",         value: "soybean" },
  { label: "🌽 Maize",           value: "maize" },
  { label: "🥦 Vegetables (Other)", value: "vegetables" },
  { label: "🍌 Banana",          value: "banana" },
  { label: "🥭 Mango",           value: "mango" },
  { label: "🍎 Other / Not listed", value: "other" },
];

// ─── Symptom categories ───────────────────────────────────────────────────────
export const SYMPTOM_GROUPS = [
  { label: "🟡 Yellow / pale leaves",  value: "yellowing" },
  { label: "🟤 Brown spots / patches", value: "brown spots" },
  { label: "🍂 Wilting / drooping",    value: "wilting" },
  { label: "🐛 Insects / pests visible", value: "pest" },
  { label: "🌱 Stunted / slow growth", value: "stunted growth" },
  { label: "💧 Rotting / soggy stem",  value: "root rot" },
  { label: "⚪ White powder / mold",   value: "white mold" },
  { label: "🍃 Leaf curl / distortion", value: "leaf curl" },
  { label: "🔴 Red / purple discoloration", value: "discoloration" },
  { label: "⬛ Black lesions / blight", value: "blight" },
  { label: "📉 Flower / fruit drop",  value: "flower drop" },
  { label: "🌿 General poor health (describe)", value: "general" },
];

// ─── Severity options ─────────────────────────────────────────────────────────
const SEVERITY_OPTIONS = [
  { label: "🟢 Just started (few plants)", value: "mild" },
  { label: "🟡 Spreading fast (many plants)", value: "moderate" },
  { label: "🔴 Most of the field is affected", value: "severe" },
];

// ─── Duration options ─────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "⏱ 1–3 days",   value: "1-3 days" },
  { label: "📅 4–7 days",   value: "4-7 days" },
  { label: "📆 More than a week", value: ">1 week" },
];

// ─── Soil / irrigation quick context ─────────────────────────────────────────
const SEASON_OPTIONS = [
  { label: "🌧 Kharif (Jun–Oct)", value: "kharif" },
  { label: "🌾 Rabi (Nov–Mar)",   value: "rabi" },
  { label: "☀️ Summer",           value: "summer" },
];

// ─── NLP-powered intent, crop, and symptom detection ─────────────────────────
// All powered by AgriculturalNLP: 60+ crop aliases, 80+ symptom aliases,
// full Hindi/Tamil/Marathi/Hinglish support

/**
 * Exported for backward-compat. Now delegates to AgriculturalNLP.classifyIntent
 * which covers: disease, fertilizer, scheme, weather, price, cultivation
 * in English, Hindi (bimari, khad, yojana, barish, bhav, kheti) etc.
 */
export function detectIntent(text) {
  const intent = classifyIntent(text);
  return intent === 'unknown' ? 'disease' : intent;
}

/**
 * Detects the canonical crop name from ANY farmer text.
 * Covers: dhan→rice, tamatar→tomato, gehun→wheat, makka→maize,
 *          ganna→sugarcane, moongfali→groundnut + 50 more aliases
 */
export function detectCropInText(text) {
  const tokens = tokenize(text);
  for (const tok of tokens) {
    const crop = normalizeCrop(tok);
    if (crop) return crop;
  }
  // Fallback: check chip values directly
  const t = text.toLowerCase();
  for (const c of TOP_CROPS) {
    if (t.includes(c.value)) return c.value;
  }
  return null;
}

/**
 * Detects canonical symptom from ANY farmer text.
 * Covers: pila/peela→yellowing, kida/keeda→pest, mura→wilting,
 *          dag/dhabbe→brown spots, safed→white mold, kala→blight + 70 more
 */
export function detectSymptomInText(text) {
  const tokens = tokenize(text);
  for (const tok of tokens) {
    const sym = normalizeSymptom(tok);
    if (sym && sym !== 'general') return sym;
  }
  // Scan the full lowered text for multi-word symptom phrases
  const t = text.toLowerCase();
  for (const s of SYMPTOM_GROUPS) {
    if (t.includes(s.value)) return s.value;
  }
  return null;
}

// ─── STATE MACHINE ────────────────────────────────────────────────────────────

/**
 * State shape:
 * {
 *   step: 'start' | 'ask_crop' | 'ask_symptom' | 'ask_severity' | 'ask_season' | 'diagnosing' | 'done',
 *   intent: string,
 *   crop: string | null,
 *   symptom: string | null,
 *   severity: string | null,
 *   season: string | null,
 *   rawText: string,
 * }
 */

export const INITIAL_STATE = {
  step: "start",
  intent: null,
  crop: null,
  symptom: null,
  severity: null,
  season: null,
  rawText: "",
};

/**
 * Main transition function.
 * @param {object} state   current conversation state
 * @param {string} input   user's free text OR a chip value
 * @returns {{ newState, botTurn }}
 */
export function transition(state, input) {
  const text = String(input || "").trim();

  // ── STEP: start ──────────────────────────────────────────────────────────
  if (state.step === "start") {
    const intent = detectIntent(text);
    const crop   = detectCropInText(text);
    const symptom = detectSymptomInText(text);

    // Non-disease pathways → immediate answer
    if (["fertilizer", "scheme", "weather", "price"].includes(intent)) {
      return {
        newState: { ...state, step: "done", intent, rawText: text },
        botTurn: { type: "free_query", intent, query: text },
      };
    }

    // Disease / cultivation path
    const newState = {
      ...state,
      step: crop ? (symptom ? "ask_severity" : "ask_symptom") : "ask_crop",
      intent: intent === "unknown" ? "disease" : intent,
      crop,
      symptom,
      rawText: text,
    };

    if (!crop) {
      return {
        newState,
        botTurn: {
          type: "options",
          message: "Which crop are you growing? 🌱",
          options: TOP_CROPS,
          step: "ask_crop",
        },
      };
    }

    if (!symptom) {
      return {
        newState,
        botTurn: {
          type: "options",
          message: `What symptom are you seeing on your **${crop}**? 🔍`,
          options: SYMPTOM_GROUPS,
          step: "ask_symptom",
        },
      };
    }

    // Both crop and symptom extracted — ask severity
    return {
      newState,
      botTurn: {
        type: "options",
        message: `How bad is the **${symptom}** on your **${crop}**?`,
        options: SEVERITY_OPTIONS,
        step: "ask_severity",
      },
    };
  }

  // ── STEP: ask_crop ───────────────────────────────────────────────────────
  if (state.step === "ask_crop") {
    const crop = detectCropInText(text) || text;
    const symptom = detectSymptomInText(text);
    const newState = {
      ...state,
      crop,
      symptom,
      step: symptom ? "ask_severity" : "ask_symptom",
    };

    if (!symptom) {
      return {
        newState,
        botTurn: {
          type: "options",
          message: `What symptom are you seeing on your **${crop}**? 🔍`,
          options: SYMPTOM_GROUPS,
          step: "ask_symptom",
        },
      };
    }

    return {
      newState,
      botTurn: {
        type: "options",
        message: `How bad is the **${symptom}** on your **${crop}**?`,
        options: SEVERITY_OPTIONS,
        step: "ask_severity",
      },
    };
  }

  // ── STEP: ask_symptom ────────────────────────────────────────────────────
  if (state.step === "ask_symptom") {
    const symptom = detectSymptomInText(text) || text;
    const newState = { ...state, symptom, step: "ask_severity" };
    return {
      newState,
      botTurn: {
        type: "options",
        message: `How severe is the problem on your **${state.crop}**?`,
        options: SEVERITY_OPTIONS,
        step: "ask_severity",
      },
    };
  }

  // ── STEP: ask_severity ───────────────────────────────────────────────────
  if (state.step === "ask_severity") {
    const severity = text; // value from chip
    const newState = { ...state, severity, step: "diagnosing" };
    return {
      newState,
      botTurn: {
        type: "diagnosing",
        crop: state.crop,
        symptom: state.symptom,
        severity,
        rawText: state.rawText,
      },
    };
  }

  // Catch-all reset
  return {
    newState: { ...INITIAL_STATE },
    botTurn: { type: "free_query", intent: "unknown", query: text },
  };
}

export const GREETING = {
  type: "options",
  message: "Hello! 👋 I'm your KrishiVerse farming assistant. I know about **15,000 crops, diseases, pests, and treatments**. How can I help you today?",
  options: [
    { label: "🔬 Diagnose crop problem",    value: "diagnose_start" },
    { label: "💊 Fertilizer advice",          value: "fertilizer advice" },
    { label: "🏛 Government schemes",         value: "government schemes" },
    { label: "💰 Today's mandi prices",       value: "mandi prices" },
    { label: "🌧 Weather farming advice",     value: "weather farming advice" },
    { label: "🌱 How to grow a crop",         value: "crop cultivation guide" },
  ],
  step: "start",
};

export default { transition, detectIntent, detectCropInText, detectSymptomInText, INITIAL_STATE, GREETING, TOP_CROPS, SYMPTOM_GROUPS };
