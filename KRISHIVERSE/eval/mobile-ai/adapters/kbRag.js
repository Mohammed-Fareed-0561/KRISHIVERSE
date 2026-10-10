/**
 * eval/mobile-ai/adapters/kbRag.js — retrieval arms.
 *
 *  - existing : the production lexical path (AgriculturalNLP.fastSearch).
 *  - hybrid   : BENCHMARK-LOCAL prototype — alias-expanded query + reciprocal
 *               rank fusion over the original and expanded result lists.
 *               Never touches production ranking; only used inside eval/.
 *  - fused    : KB + RAG combined arm (spec §3 arm E) — RRF over the
 *               production lexical list and the alias-expanded hybrid list.
 *  - needleEmbeddings / miniLmEmbeddings / backendRag : optional external
 *               arms, activated only via environment (offline by default).
 *
 * No network calls unless KV_BENCH_RAG_URL is explicitly set.
 */
/* global process: readonly */
import { CROP_ALIASES, SYMPTOM_ALIASES, fastSearch, tokenize } from "../../../src/services/ai/AgriculturalNLP.js";

function aliasExpand(query) {
  const extras = new Set();
  const lower = query.toLowerCase();
  for (const [alias, canonical] of Object.entries(CROP_ALIASES)) {
    if (lower.includes(alias)) { extras.add(alias); extras.add(canonical); }
    if (canonical === alias && lower.includes(canonical)) extras.add(alias);
  }
  for (const [alias, canonical] of Object.entries(SYMPTOM_ALIASES)) {
    if (lower.includes(alias)) { extras.add(alias); extras.add(canonical); }
  }
  for (const t of tokenize(query)) {
    if (CROP_ALIASES[t]) extras.add(CROP_ALIASES[t]);
    if (SYMPTOM_ALIASES[t]) extras.add(SYMPTOM_ALIASES[t]);
  }
  return [...extras].join(" ");
}

function rrf(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((rec, idx) => {
      const key = rec.record?.id ?? rec.id ?? JSON.stringify(idx);
      scores.set(key, (scores.get(key) || 0) + 1 / (k + idx + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export const retrievalArms = {
  existing: {
    id: "existing-fastsearch",
    label: "Existing KrishiVerse lexical retrieval (production)",
    run(query, limit = 5) {
      return fastSearch(query, { limit }).records.map((r) => r.record.id);
    },
  },
  hybrid: {
    id: "hybrid-alias-rrf",
    label: "Hybrid: alias-expanded queries + RRF fusion (benchmark-local prototype)",
    run(query, limit = 5) {
      const base = fastSearch(query, { limit }).records.map((r) => r.record);
      const expanded = aliasExpand(query);
      const second = expanded && expanded !== query.toLowerCase()
        ? fastSearch(expanded, { limit }).records.map((r) => r.record)
        : [];
      const fused = rrf([base, second]);
      const byId = new Map(base.concat(second).map((r) => [r.id, r]));
      return fused.map((id) => byId.get(id)).filter(Boolean).slice(0, limit).map((r) => r.id);
    },
  },
  fused: {
    id: "kb-rag-fused",
    label: "KB + RAG: RRF over production lexical list and alias-expanded hybrid list (spec arm E)",
    run(query, limit = 5) {
      const kb = retrievalArms.existing.run(query, limit);
      const rag = retrievalArms.hybrid.run(query, limit);
      return rrf([kb.map((id) => ({ id })), rag.map((id) => ({ id }))]).slice(0, limit);
    },
  },
};

/** Optional external arms — availability via env only (never auto-network). */
export function optionalRetrievalArms() {
  const arms = [];
  if (process.env.KV_BENCH_RAG_URL) {
    arms.push({
      id: "backend-rag",
      label: "Backend Python RAG (KV_BENCH_RAG_URL)",
      external: true,
      async run(query, limit = 5) {
        const res = await fetch(`${process.env.KV_BENCH_RAG_URL}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, top_k: limit }),
        });
        const json = await res.json();
        return (json.results || json.hits || []).map((r) => r.id || r.record?.id).filter(Boolean);
      },
    });
  }
  if (process.env.KV_BENCH_NEEDLE_MODEL) {
    arms.push({
      id: "needle-embeddings",
      label: "Needle embeddings retrieval (KV_BENCH_NEEDLE_MODEL)",
      external: true,
      // Implemented through adapters/needle.js embed pipeline; see docs/ai/needle-evaluation.md.
    });
  }
  return arms;
}

export default retrievalArms;

