# RAG — Current Pipeline (Phase 3B)

Two independent retrieval stacks exist. They share no code, no index, and no
ranking policy.

## Stack A — frontend offline retrieval (primary, always available)

```
warmUpCache → ensureKbMigration → getDb().getAll × 5 → buildInvertedIndex
parseQuery → isDiseaseSymptomQuery? → ComprehensiveDiseaseDetector (conf > 50)
fastSearch × 4 (disease:5, crop:3, treatment:5, symptom:5)
intent switch (about/fertilizer/scheme/weather/price/cultivation templates)
  else disease → buildDiseaseOnlyResponse (diseaseId-linked treatments)
  else crop → buildCropInfoResponse | symptom → buildSymptomResponse
  else buildFallback
```

- Index: token → Set<recordId>, enriched `_type/_crop/_sourcePriority/_verified`;
  quarantined records excluded unless `includeQuarantined`.
- Ranking: hit count + cropBoost (+6 match / −4 mismatch) + source boost (≤+2)
  + verified bonus (+1). Relevance and crop match dominate by design.
- Aliases: 200+ crop/symptom aliases (EN/HI/TA/translit); intent keywords per
  `docs/chatbot/intent-taxonomy.md`. Tokenizer keeps Devanagari + Tamil only.
- Language behavior: no detector; alias matching routes TA/HI/Tanglish to the
  same English-source records. Localized rendering only where curated
  `*_ta/*_hi` fields exist (treatment methods, names).
- Provenance behavior: `isVerifiedRecord` = `verified===true` OR recognized
  institutional source; ID prefixes never verify. `ResponseValidator` blocks
  unverified high-risk content on every tier; `blockedSafeAnswer` prevents
  fallback leakage.
- Edges: `buildRelationshipIndex` exists but is NOT wired into answers;
  treatment linking is naive `diseaseId` equality (migration-repaired).

## Stack B — backend Python RAG service (online only, optional)

FastAPI :8000 (`backend/rag_service`): `LanguageDetector` (Tamil/Devanagari
ranges + word lists + Tanglish) → spell correction → query expansion → intent +
entities → MiniLM (`all-MiniLM-L6-v2`) embeddings → FAISS top_k=5, cosine
threshold 0.5 → optional Groq fallback. Vector store at
`models/vector_store/` (faiss.index + pkls). Node calls `POST /rag/ask`,
accepts only confidence ≥ 0.6, else Groq → Gemini.

Staleness note (pre-existing, not changed): `rag_engine.py` resolves
`FRONTEND_DIR = <repo>/krishiverse` (lowercase), which does not exist after the
project restructure — verify before relying on its rebuild path.

## Known weaknesses

1. KB is 99.86% synthetic/quarantined (see `kb-quality-audit.md`); only 21
   curated records are searchable — depth is thin outside rice/tomato/chilli.
2. 1,971/3,002 disease records carry no `cropId` (crop-aware ranking cannot
   fire for them); per-crop coverage is ≤7 synthetic records per cropId.
3. 393 migration conflicts (link repair chose edge over field); 8 hand-authored
   edges dangle.
4. Templates for 6 intents bypass retrieval (static text, no grounding).
5. Hardcoded confidences (0.88/0.82/…) uncalibrated; RAG-service 0.5/0.6
   thresholds tuned once by anecdote (config comment).
6. Stack A/B divergence: different languages, intents, thresholds, corpora
   (`rag_service/data/*.json` vs IndexedDB KB). No shared eval.
7. Tokenizer excludes Telugu/Kannada/Malayalam; fuzzy pass is O(vocab).
