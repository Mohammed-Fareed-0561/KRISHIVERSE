/**
 * eval/mobile-ai/adapters/ruleExtract.js — rule-based plant-part and
 * farmer-context extraction prototype (benchmark-local, NOT production).
 *
 * Gives the benchmark runnable arms for tasks 6 (plant-part) and 7
 * (farmer-context), which production AgriculturalNLP does not implement, so
 * Needle's structured extraction can later be compared to a deterministic
 * baseline rather than to "nothing".
 */

const PLANT_PARTS = [
  { part: "leaf", patterns: [/leaf/i, /leaves/i, /^foliage$/i, /இலை/i, /\bilai/i, /pattai?\b/i] },
  { part: "stem", patterns: [/stem/i, /stalk/i, /culm/i, /தண்டு/i, /thandu\b/i, /kaandu\b/i] },
  { part: "root", patterns: [/root/i, /வேர்/i, /veru\b/i] },
  { part: "panicle", patterns: [/panicle/i, /ear\b/i, /grain/i, /பானை/i, /manni\b/i, /thanthai\b/i] },
  { part: "flower", patterns: [/flower/i, /பூவ/i, /poo\b/i] },
  { part: "fruit", patterns: [/fruit/i, /கனி/i, /pazham\b/i] },
  { part: "seed", patterns: [/seed/i, /விதை/i, /vithai\b/i] },
  { part: "neck", patterns: [/neck blast/i, /neck\b/i, /கழுத்து/i] },
];

const LOCATION_RE = /\b(thanjavur|tanjore|madurai|trichy|tiruchirappalli|kumbakonam|karur|virudhunagar|salem|erode|coimbatore|cuddalore|nagapattinam|thiruvarur|dharmapuri| Krishnagiri|vellore|thoothukudi|rani|my village|our village|here)\b/i;
const LOCATION_FIXTURES = ["thanjavur", "tanjore", "madurai", "trichy", "tiruchirappalli", "kumbakonam", "karur", "salem", "erode", "coimbatore"];

const SEASON_PATTERNS = [
  { season: "kuruvai", re: /kuruvai|summer crop/i },
  { season: "samba", re: /samba/i },
  { season: "thaladi", re: /thaladi/i },
  { season: "monsoon", re: /monsoon|kadalai|rainy season/i },
  { season: "kharif", re: /kharif/i },
  { season: "rabi", re: /rabi/i },
];

const IRRIGATION_RE = /\b(drip|sprinkler|flood irrigation|canal|borewell|pump set|open well|மின்சார நீர்ப்பாசனம்)\b/i;

export function extractPlantPart(text) {
  const s = String(text || "");
  for (const { part, patterns } of PLANT_PARTS) {
    if (patterns.some((p) => p.test(s))) return part;
  }
  return null;
}

/** @returns {{location:string|null, season:string|null, irrigation:string|null, area:string|null}} */
export function extractFarmerContext(text) {
  const s = String(text || "");
  let location = null;
  const locMatch = LOCATION_RE.exec(s);
  if (locMatch) {
    const raw = locMatch[1].trim().toLowerCase();
    location = LOCATION_FIXTURES.find((f) => raw.startsWith(f)) || raw;
  }
  const season = SEASON_PATTERNS.find((sp) => sp.re.test(s))?.season || null;
  const irrigation = IRRIGATION_RE.test(s) ? IRRIGATION_RE.exec(s)[1].toLowerCase() : null;
  const areaMatch = /(\d+(?:\.\d+)?)\s*(acre|hectare|ha\b|செண்ட்)/i.exec(s);
  return { location, season, irrigation, area: areaMatch ? `${areaMatch[1]}${areaMatch[2].toLowerCase()}` : null };
}

export default { extractPlantPart, extractFarmerContext };
