# Agricultural Reasoning Engine Design: Krishiverse 2.0

This design focuses on the "Logic Layer"—translating raw agricultural data and AI predictions into actionable, safe, and expert-validated advice for farmers.

## 1. Core Reasoning Architecture

| Question | Recommendation |
| :--- | :--- |
| **1. Symptom Logic** | **Decision Tree + Probability**. Use a flow-based logic: (Part Affected -> Symptom Type -> Color/Texture -> Timing). Match against a pre-defined symptom-disease matrix. |
| **2. Growth Stage** | **Days After Sowing (DAS) Tracking**. Store crop stage definitions (Vegetative, Flowering, Ripening). Filter recommendations based on current DAS stored in `advisoryStore`. |
| **3. Knowledge Graphs** | **JSON-LD triples** stored in IndexedDB. Entities: [Crop](file:///c:/Users/Administrator/OneDrive/documents/krishiverse%20version%202.0%20-%20Antigravity/krishiverse/src/services/api/cropService.js#37-53), `Pest`, `Active Ingredient`, `WeatherCondition`. Relationships: `attacks`, `treats`, `aggravated_by`. |
| **4. Weather + Disease** | **Risk Scoring Formula**: High Humidity (>80%) + Temp (20-30°C) + Spore Presence = "High Risk" for Blight. Push notifications based on these thresholds. |
| **5. Confidence Scoring** | **Weighted average**: [(0.4 * ImageMatch) + (0.3 * SymptomMatch) + (0.2 * WeatherAlignment) + (0.1 * Seasonality)](file:///c:/Users/Administrator/OneDrive/documents/krishiverse%20version%202.0%20-%20Antigravity/krishiverse/src/store/advisoryStore.js#39-58). |
| **6. Safety Guardrails** | **Hard-Coded Blocklist**: Before displaying any chemical recommendation, scan a local "Banned/Restricted" list. Never recommend chemicals for organic-tagged farms. |
| **7. Semantic + Rules** | **The "Verify" Pattern**: Use Semantic Search to find matching documents, then pipe those through a Rule Engine (e.g., `json-rules-engine`) to validate if they fit the current farm context. |
| **8. Multi-Symptom** | **Bayesian Network**. Handle cases where a leaf has both "Yellow spots" and "Holes". Determine which symptom is primary and which is a secondary infection. |
| **9. Uncertain Diagnosis** | **Differential Diagnosis UI**. If confidence < 60%, show top 3 possibilities with "Distinguishing Features" (e.g., "Check undersides of leaves for X"). |
| **10. Tamil Terminology** | **Vernacular Mapping Table**. Map scientific names (e.g., *Aphis gossypii*) to specific local Tamil names (*Asuvini*). Use these names in the UI for better tribal/rural trust. |
| **11. District-Specific** | **Soil/Climatic Zoning**. Use the user's GPS to find their `DistrictCode`. Cross-reference with district-wise crop protocols from data stores. |
| **12. DB Schema** | **Graph-Relational**. Tables for static [Crops](file:///c:/Users/Administrator/OneDrive/documents/krishiverse%20version%202.0%20-%20Antigravity/krishiverse/src/services/api/cropService.js#10-36), `Symptoms`, `Treatments`; a `Links` table for the Knowledge Graph relationships. |
| **13. Treatment Logic** | **Step-wise Protocol**: 1. Cultural (Plowing/Pruning) -> 2. Biological (Neem Oil) -> 3. Chemical (Last resort, if user enables). |
| **14. Reduce Danger** | **Pre-Advice Validation**: Every recommendation is checked against a "Human-in-the-loop" validated dataset. LLM is only used to *format* verified facts, not *invent* them. |
| **15. Hybrid Intel Arch** | **Edge-Core-Cloud**: **Edge**: Quick symptom checks; **Core**: Rule-based validation against local DB; **Cloud**: Multi-modal complex forensic diagnosis. |

## 2. Implementation Strategy

1.  **Rule Engine Integration**: Install `json-rules-engine` to allow complex farming "Expert Rules" to be written in JSON format and executed offline.
2.  **Safety Middleware**: Create a central wrapper for the chatbot and advisory systems that intercepts all "Treatment" strings and validates them against the safety blocklist.
3.  **Terminology Layer**: Implement a `useTranslation` enhancement that looks up local names first if the language is set to 'ta' or 'hi'.
