# Agricultural Dataset Architecture: Krishiverse 2.0 Production-Grade

This document defines the data structures required to power a production-scale agricultural PWA with offline-first AI and reasoning capabilities.

## 1. Schema Definitions

| Dataset | Core Schema Pattern (JSON) |
| :--- | :--- |
| **1. Crops** | `{ id, name, scientific_name, family, photo_url, climate_zone: [], soil_preference: [] }` |
| **2. Symptoms** | `{ id, description, location (leaf/stem/root), type (spot/hole/wilting), color_ids: [] }` |
| **3. Diseases/Pests** | `{ id, name, crop_ids: [], symptom_ids: [], cause (fungal/viral/pests), severity (1-5) }` |
| **4. Treatments** | `{ id, disease_id, type (cultural/bio/chem), instructions: { step1... }, safety_notes }` |
| **5. Weather-Risk** | `{ id, crop_id, threshold_humidity, threshold_temp, associated_disease_ids: [] }` |
| **6. Market Prediction** | `{ id, crop_id, state_id, district_id, seasonality_index: [], price_trend: "rising/stable/falling" }` |
| **7. Govt Schemes** | `{ id, name, eligibility: { land_size... }, benefits, documents_required: [] }` |
| **8. Tamil Terminology** | `{ scientific_id, local_name: "தமிழ் பெயர்", regional_variants: { "Thanjavur": "..." } }` |
| **9. Safety/Blocklist** | `{ chemical_id, status: "banned/restricted", substitution_ids: [], hazard_rating }` |
| **10. Growth Stages** | `{ crop_id, stage_name, min_das, max_das, critical_needs: [], sensitive_to: [] }` |
| **11. Soil** | `{ type_id, ph_range, nitrogen_level, drainage_quality, recommended_crop_ids: [] }` |
| **12. Irrigation** | `{ crop_id, stage_id, water_frequency_days, method_pref (drip/flood), critical_warnings }` |
| **13. Farm Timeline** | `{ farm_id, activity_log: { date, type, notes }, image_ref, observation_vectors: [] }` |

## 2. AI & Data Pipeline Strategies

| Question | Strategy |
| :--- | :--- |
| **14. Indexing Strategy** | **Multi-Index**: Standard IDs for relational lookup + HNSW (Hierarchical Navigable Small World) for vector similarity search. |
| **15. Embedding Pipe** | **Chunk -> Clean -> Embed -> Quantize -> Store**. Run on CI/CD; push `index.voy` blob to CDN for client download. |
| **16. Normalization** | **Dual-Format**: Relational (3NF) for transactional logic; Flattened/Denormalized for the Semantic Search index. |
| **17. Multilingual** | **Localizable Objects**: Use `locales` keys: `name: { en: "Rice", ta: "நெல்" }`. Allows instant language switching offline. |
| **18. Versioning** | **Dataset SemVer**: v[Major].[Minor].[Patch]. Patch updates are delivered as JSON-diffs (RFC6902) to save data. |
| **19. Sync Strategy** | **Incremental Pull**: Client sends `current_version_hash`. Server responds with `patch_json` or `full_reset` if too outdated. |
| **20. Dataset Sizes** | **Est. Total**: ~30MB - 50MB (compressed). Core knowledge is dense; images remain remote or lazily cached (Progressive Loading). |

## 3. Implementation Recommendations

1.  **Unified ID Space**: Use **ULIDs** (Universally Unique Lexicographically Sortable Identifiers) for records created offline to ensure they sync back to the global database without collisions.
2.  **Asset Bundling**: Bundle the core [Crops](file:///c:/Users/Administrator/OneDrive/documents/krishiverse%20version%202.0%20-%20Antigravity/krishiverse/src/services/api/cropService.js#10-36) and `Safety` datasets in the initial app build. Load `Diseases` and `Market` data asynchronously after installation (lazy hydration).
3.  **Validation**: Every dataset must pass a JSON Schema validation step before being published to the production CDN.
