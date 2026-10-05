/**
 * joint-rag-benchmark.mjs — Phase 3C joint Stack A/B benchmark (STEP 5).
 *
 * A = frontend offline retrieval (AgriculturalNLP fastSearch, curated seeds).
 * B = Python FastAPI RAG (:8000/rag/ask). B arm degrades gracefully: if the
 *     sidecar is unreachable, B rows record arm-down and A still reports.
 *
 * Per case: A rank@5 hit?, B entity-mention?, latency + confidence each.
 * Categories: A-only / B-only / both / both-fail. Writes eval/results/joint-rag.json.
 * Expected evidence is never fabricated: A uses real record ids, B uses the
 * record's own EN/TA/HI names as entity mentions.
 *
 * Usage: node scripts/joint-rag-benchmark.mjs [--rag=http://localhost:8000]
 * (backend NOT required; rag_service sidecar required for the B arm)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const ragArg = process.argv.find((a) => a.startsWith("--rag="));
const RAG_URL = ragArg ? ragArg.split("=")[1] : (process.env.KRISHIVERSE_RAG_URL || "http://localhost:8000");

const { buildInvertedIndex, fastSearch, resetIndex } = await import("../src/services/ai/AgriculturalNLP.js");
const { CROPS } = await import("../src/data/seed/cropData.js");
const { DISEASE_PESTS, SYMPTOMS } = await import("../src/data/seed/diseaseData.js");
const { TREATMENTS } = await import("../src/data/seed/treatmentData.js");
const { RETRIEVAL_CASES } = await import("../eval/cases.retrieval.js");

// id -> entity names for B-side mention checks
const ENTITIES = new Map();
for (const r of [...CROPS, ...DISEASE_PESTS, ...SYMPTOMS, ...TREATMENTS]) {
  ENTITIES.set(r.id, [r.name, r.name_ta, r.name_hi, r.text, r.text_ta, r.text_hi, r.method, r.method_ta, r.method_hi]
    .filter((s) => typeof s === "string" && s.trim().length > 1).map((s) => s.toLowerCase()));
}

resetIndex();
buildInvertedIndex({ crops: CROPS, symptoms: SYMPTOMS, diseases: DISEASE_PESTS, treatments: TREATMENTS, edges: [] });

async function askB(query, language, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(`${RAG_URL.replace(/\/+$/, "")}/rag/ask`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, language: ["ta", "hi"].includes(language) ? language : "en", context: {} }),
      signal: ctrl.signal,
    });
    const ms = performance.now() - t0;
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, ms };
    return { ok: true, data: await res.json(), ms };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), ms: performance.now() - t0 };
  } finally {
    clearTimeout(t);
  }
}

const rows = [];
let bDown = 0;
for (const c of RETRIEVAL_CASES) {
  const t0 = performance.now();
  const ids = fastSearch(c.input, { limit: 5 }).records.map((r) => r.record.id);
  const aMs = performance.now() - t0;
  const wanted = new Set(c.expected.recordIds);
  const aHit = ids.some((id) => wanted.has(id));

  const b = await askB(c.input, c.language);
  let bHit = null, bConf = null, bMs = b.ms, bError = b.error || null;
  if (!b.ok) { bDown++; }
  else {
    const ans = String(b.data?.answer || "").toLowerCase();
    bConf = typeof b.data?.confidence === "number" ? b.data.confidence : null;
    const names = c.expected.recordIds.flatMap((id) => ENTITIES.get(id) || []);
    bHit = names.some((n) => ans.includes(n));
  }
  const cat = aHit && bHit ? "both" : aHit ? "A-only" : bHit ? "B-only" : "both-fail";
  rows.push({ id: c.id, language: c.language, topic: c.topic || "general", aHit, bHit, category: cat, aMs: +aMs.toFixed(1), bMs: bMs != null ? +bMs.toFixed(1) : null, bConf, bError });
}

const cat = (k) => rows.filter((r) => r.category === k).length;
const bLat = rows.map((r) => r.bMs).filter((x) => x != null);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const report = {
  generatedAt: new Date().toISOString(),
  origin: "screening joint A/B (A: real ids; B: entity mentions — NOT ground truth)",
  ragUrl: RAG_URL,
  bReachable: bDown < rows.length,
  cases: rows.length,
  categories: { both: cat("both"), aOnly: cat("A-only"), bOnly: cat("B-only"), bothFail: cat("both-fail") },
  aRecallAt5: rows.filter((r) => r.aHit).length / rows.length,
  bEntityMention: rows.filter((r) => r.bHit === true).length / rows.length,
  latencyMs: { aAvg: +avg(rows.map((r) => r.aMs)).toFixed(1), bAvg: +avg(bLat).toFixed(1) },
  rows,
};
mkdirSync(join(ROOT, "eval", "results"), { recursive: true });
writeFileSync(join(ROOT, "eval", "results", "joint-rag.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report, rows: undefined }, null, 1));
