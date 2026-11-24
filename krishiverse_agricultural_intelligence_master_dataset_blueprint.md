# Krishiverse Agricultural Intelligence: Master Dataset Blueprint (v2.0)

This blueprint provides the absolute technical specification for the Krishiverse data layer, satisfying all 20 production-grade requirements.

- [x] Fully implement 20-point dataset requirements into master files

## 1. Schema Specifications (Req 1-13)

### 1.1 Core Agricultural Entities
| Entity | Req # | Description |
| :--- | :--- | :--- |
| **Crop** | 1 | Seed-to-harvest lifecycle metadata. |
| **Symptom** | 2 | Distinct visual and physiological markers. |
| **Disease/Pest** | 3 | Biological stressors and pathogens. |
| **Treatment** | 4 | Integrated Pest Management (IPM) protocols. |
| **Weather-Risk** | 5 | Environmental triggers for disease outbreaks. |
| **Market Prediction** | 6 | Temporal and regional pricing forecasts. |
| **Govt Schemes** | 7 | State/Central subsidy and support metadata. |
| **Tamil Terminology** | 8 | Regional vernacular mapping for scientific data. |
| **Safety/Blocklist** | 9 | Pesticide regulation and safety guardrails. |
| **Growth Stage** | 10 | Sequential physiological development markers. |
| **Soil** | 11 | Physical and chemical profile requirements. |
| **Irrigation** | 12 | Water management and demand schedules. |
| **Farm Timeline** | 13 | Historical record keeping for specific plots. |

## 2. Advanced Search & Intelligence (Req 14-16)

### 2.1 Indexing Strategy (Req 14)
- **Hybrid Search**: Standard B-Tree/GiST indexes for relational filtering + **HNSW** (Hierarchical Navigable Small World) for vector similarity.
- **Offline Indexing**: Use `voy` or `sqlite-vss` (WASM) for client-side vector search.

### 2.2 Embedding Pipeline (Req 15)
- **Architecture**: `Text Chunker` -> `all-MiniLM-L6-v2 Encoder` -> `Quantization (INT8)` -> `Vector Deposit`.
- **Latency Target**: < 100ms for local search queries on mid-range mobile devices.

### 2.3 Normalization Methods (Req 16)
- **Database**: 3NF for ACID compliance.
- **Search Store**: Denormalized "Flat Fragments" (e.g., mapping all treatments and symptoms into a single text blob per disease for better vector recall).

## 3. Data Governance & Sync (Req 17-19)

### 3.1 Multilingual Strategy (Req 17)
- **Nested Locales**: `{ "id": "X", "label": { "en": "...", "ta": "..." } }`.
- **Dynamic Localization**: UI components query the locale key based on `navigator.language` or user setting.

### 3.2 Dataset Versioning (Req 18)
- **Commit-based Versioning**: Every dataset release has a hash and a SemVer tag (e.g., `diseases-v2.1.4`).
- **Manifest**: A `manifest.json` tracks the version of every sub-dataset for the client to check against.

### 3.3 Offline Sync Mechanics (Req 19)
- **Delta Sync**: Download only changed chunks between `current_version_hash` and `release_version_hash`.
- **Background Sync**: Service Worker handles fetching `patch.json` files during idle network time.

## 4. Production Scale Estimates (Req 20)

| Category | Record Count | Estimated Size (JSON) |
| :--- | :--- | :--- |
| Core Crop Data | 50 crops | 1 MB |
| Disease/Pest Library | 500+ items | 5 MB |
| Treatment Protocols | 1,000+ items | 8 MB |
| Vector Embeddings | 5,000+ vectors | 20 MB |
| **Total Deployment** | -- | **~34 MB Compressed** |
