# Laya Integration (Phase 1 — backend-only, optional decision engine)

Laya is an **optional structured-decision engine** in KrishiVerse. It is NOT the
chatbot, NOT the RAG system, NOT the answer generator, and NOT a replacement
for WebLLM / Groq / Gemini.

```
User → AgriculturalNLP → Local RAG → [decision needed?]
                                              ↓
                                   ┌──────────────────────┐
                                   │ ONLINE + ambiguous   │→ Backend Laya
                                   │ OFFLINE / failure    │→ LocalDecisionEngine
                                   └──────────┬───────────┘
                                              ↓
                                   Structured decision (normalized)
                                              ↓
                                   WebLLM / backend LLM → ResponseValidator → User
```

## 1. Supported tasks (closed set)

`POST /api/v1/decision/laya` accepts ONLY:

| Task | Input | Output |
|---|---|---|
| `intent_classification` | `{ query }` | `{ intent, crop?, symptom? }` |
| `clarification` | `{ query, parsed?, intent? }` | `{ hasEnoughEvidence }` + optional question |
| `candidate_selection` | `{ candidates[], evidence[] }` | `{ selected, ranked[] }` |

Anything else → `400 INVALID_TASK`. This is enforced in **both**
`krishiverse/src/services/ai/decision/decisionSchemas.js` and
`backend/src/validators/schemas.js`.

## 2. Invocation rules

- Simple queries (`What is rice?`, `What is tomato?`, `When is paddy harvested?`,
  `What is drip irrigation?`) NEVER call Laya — efficient local path.
- Laya is attempted only when ALL hold:
  1. `VITE_ENABLE_LAYA_DECISIONS=true` (default `false`),
  2. task is in the allowed set,
  3. connectivity is `ONLINE` or `UNCERTAIN` (never `OFFLINE`),
  4. the query is ambiguous (unknown intent, missing crop/symptom, zero KB hits).
- See `shouldInvokeLaya()` / `isAmbiguousQuery()` in
  `krishiverse/src/services/ai/decision/DecisionEngine.js`.

## 3. Offline fallback

```
Laya fails (timeout/malformed/503/offline) → LocalDecisionEngine → continue
```

- Frontend timeout: 8s (`LAYA_TIMEOUT_MS`). Backend external-model timeout: 6s.
- No error is ever shown to the farmer because Laya is down.
- `LocalDecisionEngine` reuses `AgriculturalNLP` (aliases, intents, inverted
  index) — no duplicate knowledge system. If Laya disappears, the app works.

## 4. Backend deployment

- Route: `backend/src/routes/decision.js`, mounted at `/api/v1/decision`.
- Health: `GET /api/v1/health` → `capabilities.layaEnabled`.
- Env (`backend/.env`, see `backend/.env.example`):
  - `LAYA_ENABLED=true|false` — `false` makes the endpoint return `503`.
  - `LAYA_MODEL_URL=` — empty (default) = deterministic `laya-builtin-decider`,
    no external dependency. Set to a real sidecar base URL to use the model.
  - `LAYA_MODEL=multilingual` — pinned checkpoint id sent to the sidecar.
  - `LAYA_TIMEOUT_MS=8000`.
- Engine tags: real answers carry `engine: "laya-multilingual"`; the fallback
  carries `engine: "laya-builtin-decider"` — never confused with each other.

### 4.1 Verified real checkpoint (2026-09-30, live-verified on this machine)

- **Source**: ConvAI Innovations — GitHub `NandhaKishorM/laya` (PyPI `laya`
  0.3.22 installed and exercised here), Hub `convaiinnovations/laya` family hub,
  site `laya-ai.com`, demo Space `convaiinnovations/laya-demo.
- **Checkpoint**: `convaiinnovations/laya-multilingual` (pinned; sidecar
  revision `55cf4c4e`), mmBERT-base backbone, **322M params**, safetensors
  **~644MB** (+ ~34MB tokenizer), context 1024 (to 8192).
- **Why multilingual, not English**: the English checkpoint (`ModernBERT-large`,
  421M, ~808MB) collapses on non-Latin scripts while staying confident
  (documented upstream: Khmer 0.000 @ 0.95 conf) — unsafe for Tamil/Hindi.
- **License**: **Apache-2.0** open weights (repo LICENSE + site badge) —
  project use permitted.
- **Runtime**: Python 3.10+ (`laya[serve]` → `laya-serve` sidecar, FastAPI).
  Node talks to it over the verified wire protocol
  `POST {LAYA_MODEL_URL}/v1/systemone` with `{state, questions, model}` —
  our adapter implements exactly this schema (the earlier `/decide`
  assumption was replaced, not forced).
- **Measured on this box (CPU, 4 torch threads)**: cold load ~17s cached
  (first download+build ~8min on this network); inference **~450–550ms/call**
  direct, **avg 863ms / p95 2121ms** through the full Node path (n=17);
  sidecar RSS **~1.7GB**; 0 timeouts, 0 shape failures in benchmarking.
- **Sidecar start** (from any dir; model stays out of the PWA entirely):
  `LAYA_MODELS=multilingual LAYA_PRELOAD=1 LAYA_PORT=8001 LAYA_THREADS=4 laya-serve`
  then `LAYA_MODEL_URL=http://localhost:8001` on the Node backend.
- **Known limits (upstream-documented, confirmed)**: ships over-confident —
  refit temperatures on own data before trusting probabilities; Tamil MASSIVE
  0.250 (weak but usable); **Tanglish is NOT claimed upstream** — our
  Tanglish result (disease 0.94 served) is KrishiVerse-measured, n=1 + benchmark;
  keep `choice` sets small (≤20 options share a fixed head budget).
- **Calibration note**: served confidences differ from raw SDK probabilities
  (server applies per-cardinality handling). They remain ROUTING confidence
  only — never factual confidence; ResponseValidator is still final.

## 5. Feature flag

- Frontend: `VITE_ENABLE_LAYA_DECISIONS=false` (default OFF).
- Enable only after: decision tests pass, benchmark shows improvement,
  performance acceptable, safety verified.
- Backend secrets are NEVER in `VITE_*` vars (only Groq/Gemini via backend).

## 6. Security

- Joi validation on every request; `stripUnknown: true`.
- Candidates/evidence capped at 50 items.
- Raw Laya output never leaves `decision/` — `normalizeDecision()` drops
  unknown fields.

## 7. Model lifecycle

1. Deploy/verify a Laya checkpoint server (multilingual: EN/TA/HI).
2. Set `LAYA_MODEL_URL` on the backend.
3. Set `VITE_ENABLE_LAYA_DECISIONS=true` for a test cohort.
4. Run `decisionEngine.test.js` + `backend/tests/decision.test.js` + benchmark.
5. Roll out only if benchmark shows net improvement.

## 8. Multilingual testing

Reuse `AgriculturalNLP` language handling (no second detector). Covered cases:

- English: `tomato leaves turning yellow`
- Tamil: `தக்காளி இலைகளில் புள்ளிகள்`
- Tanglish / mixed: `தக்காளி இலைகளில் brown spots இருக்கு`
- Hindi: `टमाटर के पत्ते पीले हो रहे हैं`

Measure per-language accuracy in the benchmark — do not assume quality.

## 9. Benchmark

Run `node krishiverse/scripts/benchmark-decision.mjs`
against the backend with and without the sidecar. It reports arms
A (existing heuristics) / B (builtin decider) / C (real Laya) /
D (policy-gated combination), per-language splits, latency avg/p95,
timeout/fallback/invalid rates. If Laya does not improve a task, do not route
that task to Laya.

Measured 2026-09-30 (17 cases, backend on this box):
B (builtin): intent 12/13 → 13/13 after the "what is" rule; clarification 2/2;
candidates 2/2; avg 12ms.
C (real laya-multilingual): intent 11/13 (84.6%); clarification 1/2
("help" noul edge); candidates 2/2 incl. invalid-tolerant; 0 timeouts,
0 invalid, engines all `laya-multilingual`; avg 863ms / p95 2121ms.
D (policy: Laya only when local intent is unknown): 13/13 on this set —
the single gain is `paddy crop affected by blast disease` (A unknown → C
disease 0.97). Net on this small set: +1 case for +1.7GB sidecar.
Verdict: keep `VITE_ENABLE_LAYA_DECISIONS=false` (see §5 gate).
Blocking follow-ups before any enablement: temperature refit on a labeled
KrishiVerse set, `noul` clarification tuning, urea/paddy-style edge review,
fine-tune evaluation per upstream guidance.

## 10. Performance

- No Laya code in the initial bundle beyond the small decision layer.
- No model download, no precache, no PWA install impact.
- Browser-local Laya is explicitly Phase 2 (feature-flagged, lazy, opt-in).

## 11. Limitations

- Built-in decider is rules-only — a placeholder until a verified checkpoint.
- Decision confidence is ROUTING confidence, never factual confidence.
- Laya cannot verify KB records, create provenance, authorize dosages, or
  override `ResponseValidator` (enforced by tests).

## 12. Future (Phase 2, not in scope)

`BrowserLayaDecisionEngine` — lazy-loaded, opt-in, independently disableable,
never required for offline. Do not precache hundreds of MB.
