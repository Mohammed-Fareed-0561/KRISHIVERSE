# Current AI Architecture Audit (Phase 1A)

Date: 2026-09-30. Scope: read-only audit of the working tree
(`Downloads/krishiverse version 2.0 - Final_v2.0/`). No behavior was changed
for this document. `VITE_ENABLE_LAYA_DECISIONS=false`.

## 1. Current flow (text question)

```
AskPage → useAdvisory → advisoryStore → advisoryService → aiRouter.routeFreeTextQuestion
  AgriculturalNLP.parseQuery + fastSearch evidence
  → [optional] DecisionEngine (ambiguous only; Laya backend or local)
  → Tier 1 on-device LLM (only if WebGPU-ready, else background warm-up)
  → Tier 2 local KB answerFreeText (needs confidence ≥ 0.45)
  → Tier 3 backend POST /advisory/ask (RAG → Groq → Gemini; skipped OFFLINE)
  → Tier 4 local fallback (never leaks validator-blocked content)
  Every tier → ResponseValidator → user; history persisted to IndexedDB
```

Backend: `POST /advisory/ask|diagnose|sync`, `POST /decision/laya`
(Router: RAG → Groq → Gemini; decision: real Laya sidecar or builtin decider),
health capabilities `{groq,gemini,laya}Enabled`. Crop Doctor (image) is a
separate flow: Diagnose pages → `enhancedOfflineDiseaseService.detectDisease`
(rule-based) and/or `onDeviceClassifier` (ONNX EfficientNet-B0, 6 classes).

## 2. Modules involved

| System | Files |
|---|---|
| Chatbot pipeline | `src/services/ai/aiRouter.js`, `IndexedDBChatbotEngine.js`, `onDeviceChatEngine.js`, `api/advisoryService.js`, `hooks/useAdvisory.js`, `store/advisoryStore.js`, `pages/AskPage.jsx`; legacy (unwired): `HybridChatService.js` (Ollama localhost), `ImprovedChatbotService.js`, `EnhancedAgriculturalChatbot.js` |
| AgriculturalNLP | `src/services/ai/AgriculturalNLP.js` (530 lines; aliases, index, intent) |
| RAG/retrieval | `IndexedDBChatbotEngine.js`, `db/{indexedDb,schemas,kbMigration,kbNormalize,seedingService}.js`, `services/ingestion/`, `data/seed/*`, `data/kb/v2/*.json` |
| Crop Doctor | `ai/onDeviceClassifier.js`, `enhancedOfflineDiseaseService.js`, `advancedDiseaseDetection.js`, `ai/{ComprehensiveDiseaseDetector,DiseaseDetectionOffline}.js`, `data/{comprehensiveDiseaseDB,diseaseDB}.js`, `components/Working/*Diagnosis*.jsx`, `public/models/efficientnet_b0_plantvillage.onnx`, `backend/eval/*` |
| Safety | `ai/ResponseValidator.js`, `ai/treatmentSafety.js` |
| Decision/Laya | `ai/decision/*` (6 files), `backend/src/routes/decision.js`, `backend/src/validators/schemas.js` |
| Connectivity | `ai/connectivity.js` (ONLINE/OFFLINE/UNCERTAIN), `config/appConfig.js`, `vite.config.js` workbox, `public/custom-sw.js`, `OfflineIndicator.jsx` |
| Multilingual | `AgriculturalNLP.js` alias matching (no detector), `i18n/{i18n.js,locales/en,ta,hi.json}` |
| Conversation state | `store/advisoryStore.js` (unbounded, no sessions), context `{language, district}` |

## 3. Strengths

- Offline-first is real: sync connectivity signal, TTL-cached probes, all AI
  tiers degrade without blocking; ONNX + rule-based Crop Doctor ship in the PWA.
- Safety is layered: validator on every tier, `blockedSafeAnswer` prevents
  fallback leakage, treatment sanitizer needs flag+source+URL, KB provenance is
  explicit (ID prefixes never verify — enforced by tests).
- Retrieval is O(k) inverted-index with crop-aware rerank and quarantine filter;
  migration is idempotent, backed-up, never deletes.
- Decision layer is strictly optional: closed task set, normalized output,
  silent local fallback, engine labels distinguish model from placeholder.

## 4. Weaknesses & known failure modes

1. **KB is 99.86% synthetic**: 15,021 records, 15,000 quarantined synthetic, 21
   curated, **0 with source, 0 verified, 2 with dosage (both blocked)**. The
   local KB can therefore inform but never authorize treatment — correct, but it
   caps answer depth.
2. **Crop Doctor is narrow + partly non-deterministic**: ONNX covers 6
   classes (tomato/potato/pepper only; 3 map to no KB disease); heuristic
   detectors use unevaluated magic thresholds and `Math.random()` mocks
   (`detectTargetPattern`, wilting, irregular patches); demo Diagnose pages
   present random picks as diagnoses; only `Working*` pages use the real path.
3. **NLP gaps**: tokenizer keeps only Devanagari+Tamil (Telugu/Bengali/Punjabi
   names indexed but unsearchable); multi-word crop loop mis-sets symptom;
   intent keywords English-heavy (`help` alone → zero tokens → fallback);
   missing crops (pomegranate, papaya, turmeric, grapes, coconut); edges built
   but not wired into answers; hardcoded confidences (0.88 etc.) uncalibrated.
4. **Dead code / bit-rot**: Ollama/Mistral localhost paths, unused response
   cache, clock-mixing perf metrics, hardcoded `district:Coimbatore`,
   unbounded chat history, stale `advisoryCapabilitiesPromise`, duplicate
   symptom/crop matchers with divergent coverage (18 vs 4 records).
5. **Laya (real, but off)**: zero-shot intent 11/13 vs heuristics 12/13 on the
   17-case set; over-confident errors upstream-documented; `noul`
   clarification 1/2; CPU p95 2.1s; 1.7GB sidecar; Tamil MASSIVE 0.250.
   Net vs existing: −1 head-to-head, +1 as unknown-only fallback.

## 5. Current measurable metrics

| Metric | Value | Source |
|---|---|---|
| Frontend tests | 150/150 | `npx vitest run` |
| Backend tests | 42/42 | `npm test` (mocha) |
| Vite build + PWA SW | PASS | `npm run build` |
| ONNX eval (120 img, 20/class, PlantVillage) | 95%, Wilson [0.895, 0.977] | `models/onnx_eval_results.json` |
| ONNX public snapshot | 86.7% (30 img — stale) | `public/models/onnx_eval_results.json` |
| Decision benchmark (17 cases) | A 12/13, builtin 13/13, real-Laya 11/13, policy-gated 13/13; clarif 1–2/2; cand 2/2; real avg 863ms/p95 2121ms; 0 timeouts | `scripts/benchmark-decision.mjs` + 2026-09-30 runs |
| KB counts | 15,021 total; 21 curated; 0 sourced/verified | `data/kb/v2/manifest.json`, `kbMigration.test.js` |
| Laya live probe | load 17s cached; ~0.5s/infer CPU; TA✅ HI✅ Tanglish✅ (0.94) | 2026-09-30 session notes |

## 6. Missing metrics

- Chatbot intent/retrieval/grounding accuracy on a labeled set (none exists).
- Per-disease / per-crop image accuracy beyond 6 ONNX classes; calibration
  curves for rule-based confidences; image-quality rejection rate.
- Per-language extraction metrics (intent/crop/symptom/clarification/retrieval).
- Real-Laya temperature calibration on KrishiVerse data; `noul` threshold tuning.
- Latency distributions for tiers (router tiers, RAG, Groq) in production.
- Conversation-level metrics (multi-turn resolution, history usefulness).
