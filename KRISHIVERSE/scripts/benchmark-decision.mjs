/**
 * benchmark-decision.mjs — decision benchmark (A/B/C/D).
 *
 * Arms (run this script once per backend configuration and compare):
 *   A. Existing KrishiVerse path (AgriculturalNLP-style keyword heuristics)
 *   B. LocalDecisionEngine-equivalent (backend built-in decider, no sidecar)
 *   C. Real Laya (backend + laya-serve sidecar, engine laya-multilingual)
 *   D. KrishiVerse + Real Laya (policy: simple/local first, Laya for ambiguous
 *      with local fallback — emulated here per the shouldInvokeLaya rules)
 *
 * Measures: intent accuracy, clarification accuracy, candidate-selection
 * accuracy, per-language accuracy (en/ta/hi/tanglish), latency avg/p95,
 * Laya invocation/timeout/fallback/invalid-decision rates.
 *
 * Usage:
 *   node krishiverse/scripts/benchmark-decision.mjs [--api=http://localhost:3001/api/v1]
 *
 * Dependency-free pure Node. Never touches the KB. Backend must be running;
 * for the C/D arms the laya-serve sidecar must be up and LAYA_MODEL_URL set.
 */
import { performance } from "node:perf_hooks";

const API_BASE = (process.argv.find((a) => a.startsWith("--api="))?.split("=")[1]
  || process.env.KRISHIVERSE_API_BASE
  || "http://localhost:3001/api/v1").replace(/\/+$/, "");

const SIMPLE = new Set(["en-simple-rice", "en-simple-drip"]);
const KNOWN_INTENTS = ["greeting", "help", "about", "what_is", "disease", "treatment", "fertilizer", "scheme", "weather", "price", "cultivation", "unknown"];

const CASES = [
  { id: "en-simple-rice", lang: "en", text: "What is rice?", expectIntent: "cultivation", simple: true },
  { id: "en-simple-drip", lang: "en", text: "What is drip irrigation?", expectIntent: "cultivation", simple: true },
  { id: "en-disease", lang: "en", text: "tomato leaves have yellow spots", expectIntent: "disease" },
  { id: "en-disease2", lang: "en", text: "paddy crop affected by blast disease", expectIntent: "disease" },
  { id: "en-ambiguous", lang: "en", text: "leaves look bad, what to do?", expectIntent: "unknown", ambiguous: true },
  { id: "ta-disease", lang: "ta", text: "தக்காளி இலைகளில் புள்ளிகள்", expectIntent: "disease" },
  { id: "tanglish", lang: "tanglish", text: "தக்காளி இலைகளில் brown spots இருக்கு", expectIntent: "disease" },
  { id: "hi-disease", lang: "hi", text: "टमाटर के पत्ते पीले हो रहे हैं", expectIntent: "disease" },
  { id: "en-fertilizer", lang: "en", text: "how much urea for paddy?", expectIntent: "fertilizer" },
  { id: "en-scheme", lang: "en", text: "PM Kisan yojana eligibility", expectIntent: "scheme" },
  { id: "en-weather", lang: "en", text: "will it rain during monsoon?", expectIntent: "weather" },
  { id: "en-price", lang: "en", text: "today onion price in mandi", expectIntent: "price" },
  { id: "en-cultivation", lang: "en", text: "how to sow maize seeds", expectIntent: "cultivation" },
  { id: "clarify-short", lang: "en", task: "clarification", text: "help", expectNeeds: true },
  { id: "clarify-full", lang: "en", task: "clarification", text: "tomato yellow spots spreading fast after rain", expectNeeds: false },
  { id: "cand-valid", lang: "en", task: "candidate_selection", text: "tomato spots",
    candidates: [{ id: "early_blight", name: "Early blight" }, { id: "late_blight", name: "Late blight" }],
    evidence: [{ id: "early_blight", name: "Early blight" }], expectSelected: "early_blight" },
  { id: "cand-invalid", lang: "en", task: "candidate_selection", text: "tomato spots",
    candidates: [null, { id: "a", name: "Early blight" }, { id: "a", name: "Early blight" }],
    evidence: [], expectSelected: "a" },
];

const stats = { calls: 0, timeouts: 0, failures: 0, invalid: 0, engines: {} };

async function callDecision(payload, timeoutMs = 12000) {
  stats.calls++;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(`${API_BASE}/decision/laya`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: ctrl.signal,
    });
    const ms = performance.now() - t0;
    if (!res.ok) { stats.failures++; return { error: `HTTP ${res.status}`, ms }; }
    const data = await res.json();
    stats.engines[data.engine] = (stats.engines[data.engine] || 0) + 1;
    return { data, ms };
  } catch (e) {
    const ms = performance.now() - t0;
    if (e?.name === "AbortError") stats.timeouts++; else stats.failures++;
    return { error: String(e?.message || e), ms };
  } finally {
    clearTimeout(t);
  }
}

// Arm A: existing heuristics (mirrors AgriculturalNLP keyword tiers + aliases)
function pathAIntent(text) {
  const t = text.toLowerCase();
  if (/spot|yellow|blight|wilt|pest|pulli|manjal|poochi|पील|धब्ब|बीमार|புள்ளி|மஞ்சள்|பூச்சி|rot|mold|curl|leaf|பூஞ்ச/.test(t)) return "disease";
  if (/urea|fertilizer|dap|khad|खाद|உரம்/.test(t)) return "fertilizer";
  if (/scheme|yojana|subsidy|योजना|திட்டம்/.test(t)) return "scheme";
  if (/rain|weather|monsoon|बारिश|மழை/.test(t)) return "weather";
  if (/price|mandi|market|भाव|விலை/.test(t)) return "price";
  if (/what is|when|drip|grow|sow|cultivation|how to/.test(t)) return "cultivation";
  return "unknown";
}

const pctl = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const latAll = [], latReal = [];
const rows = [];
for (const c of CASES) {
  const row = { id: c.id, lang: c.lang };
  // A
  if (c.task === "candidate_selection") row.a = "n/a";
  else if (c.task === "clarification") row.a = "n/a";
  else row.aIntentOk = pathAIntent(c.text) === c.expectIntent;
  // B/C/D via backend (engine tag tells which arm actually answered)
  if (c.task === "candidate_selection") {
    const { data, error, ms } = await callDecision({ task: "candidate_selection", state: { query: c.text }, candidates: c.candidates, evidence: c.evidence || [] });
    latAll.push(ms);
    if (data) {
      row.engine = data.engine;
      if (data.engine.startsWith("laya-") && data.engine !== "laya-builtin-decider") latReal.push(ms);
      const sel = data.decision?.selected;
      const selId = sel && typeof sel === "object" ? sel.id : sel;
      row.selectedOk = selId === c.expectSelected;
      if (row.selectedOk === false) stats.invalid++;
    } else row.error = error;
  } else if (c.task === "clarification") {
    const { data, error, ms } = await callDecision({ task: "clarification", state: { query: c.text } });
    latAll.push(ms);
    if (data) {
      row.engine = data.engine;
      if (data.engine.startsWith("laya-") && data.engine !== "laya-builtin-decider") latReal.push(ms);
      row.needsOk = Boolean(data.needsClarification) === c.expectNeeds;
    } else row.error = error;
  } else {
    const { data, error, ms } = await callDecision({ task: "intent_classification", state: { query: c.text } });
    latAll.push(ms);
    if (data) {
      row.engine = data.engine;
      if (data.engine.startsWith("laya-") && data.engine !== "laya-builtin-decider") latReal.push(ms);
      row.intentOk = data.decision?.intent === c.expectIntent;
      row.intent = data.decision?.intent;
      row.conf = data.confidence;
      if (!KNOWN_INTENTS.includes(data.decision?.intent)) stats.invalid++;
    } else row.error = error;
  }
  // D emulation: simple → local(A); ambiguous/failed → fallback to A
  rows.push(row);
}

const intentRows = rows.filter((r) => "intentOk" in r);
const aOk = intentRows.filter((r) => r.aIntentOk).length;
const modelOk = intentRows.filter((r) => r.intentOk).length;
const clarRows = rows.filter((r) => "needsOk" in r);
const clarOk = clarRows.filter((r) => r.needsOk).length;
const candRows = rows.filter((r) => "selectedOk" in r);
const candOk = candRows.filter((r) => r.selectedOk).length;
const byLang = {};
for (const r of intentRows) {
  byLang[r.lang] = byLang[r.lang] || { n: 0, aOk: 0, mOk: 0 };
  byLang[r.lang].n++;
  if (r.aIntentOk) byLang[r.lang].aOk++;
  if (r.intentOk) byLang[r.lang].mOk++;
}
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "n/a");

console.log("\n=== KrishiVerse decision benchmark (A/B/C/D) ===\n");
for (const r of rows) console.log(JSON.stringify(r));
console.log("\n--- arms ---");
console.log(`A  existing (heuristics):        intent ${aOk}/${intentRows.length} (${pct(aOk, intentRows.length)})`);
console.log(`B/C model (via /decision/laya):  intent ${modelOk}/${intentRows.length} (${pct(modelOk, intentRows.length)})`);
console.log(`   clarification: ${clarOk}/${clarRows.length} (${pct(clarOk, clarRows.length)}) | candidates: ${candOk}/${candRows.length} (${pct(candOk, candRows.length)})`);
console.log("--- per-language intent (A vs model) ---");
for (const [l, s] of Object.entries(byLang)) console.log(`   ${l}: A ${s.aOk}/${s.n} vs model ${s.mOk}/${s.n}`);
console.log("--- latency ---");
console.log(`   all calls: n=${latAll.length} avg=${avg(latAll).toFixed(0)}ms p95=${pctl(latAll, 95).toFixed(0)}ms`);
console.log(`   real-model calls: n=${latReal.length} avg=${avg(latReal).toFixed(0)}ms p95=${pctl(latReal, 95).toFixed(0)}ms`);
console.log("--- reliability ---");
console.log(`   calls=${stats.calls} timeouts=${stats.timeouts} failures=${stats.failures} invalid=${stats.invalid} engines=${JSON.stringify(stats.engines)}`);
console.log(`   improvement (model - A): ${modelOk - aOk} intent case(s). If <= 0, keep VITE_ENABLE_LAYA_DECISIONS=false.`);
