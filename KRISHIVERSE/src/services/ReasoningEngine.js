import { getDb } from "./db/indexedDb";
import { DB_STORES } from "./db/schemas";

/**
 * Agricultural Reasoning Engine for matching symptoms to diseases.
 */
export class ReasoningEngine {
  /**
   * Extracts symptom IDs from natural language text using simple keyword matching.
   * @param {string} text 
   * @returns {Promise<string[]>}
   */
  async extractSymptomsFromText(text) {
    if (!text) return [];
    try {
      const db = await getDb();
      const allSymptoms = (await db.getAll(DB_STORES.symptoms)) || [];
      const normalizedText = String(text).toLowerCase();

      // Simple matching: check if symptom name or description is in text
      // Be defensive: some symptom records may be malformed or missing `name`.
      return allSymptoms
        .filter((s) => {
          if (!s) return false;
          const name = s.name ?? s?.label ?? s?.title;
          if (!name) return false;
          return String(name).length > 0 && normalizedText.includes(String(name).toLowerCase());
        })
        .map((s) => s.id)
        .filter(Boolean);
    } catch (err) {
      console.warn("extractSymptomsFromText failed:", err);
      return [];
    }
  }

  /**
   * Matches a list of symptom IDs against the disease database.
   * @param {string[]} symptomIds 
   * @returns {Promise<Object[]>} Ranked results with disease info and treatments
   */
  async matchSymptoms(symptomIds) {
    if (!symptomIds || symptomIds.length === 0) return [];

    const db = await getDb();
    const allDiseases = await db.getAll(DB_STORES.diseasePests);
    
    const results = [];

    for (const disease of allDiseases) {
      if (!disease || !Array.isArray(disease.symptoms)) continue;
      const matchCount = disease.symptoms.filter((s) => symptomIds.includes(s)).length;
      if (matchCount > 0) {
        const confidence = (matchCount / (disease.symptoms.length || 1)) * 100;

        // Fetch treatments for this disease (defensive)
        let treatments = [];
        try {
          if (db.getAllFromIndex) {
            treatments = await db.getAllFromIndex(DB_STORES.treatments, "byDiseaseId", disease.id);
          } else {
            // Fallback: get all and filter (slower, but safe)
            const allTreatments = await db.getAll(DB_STORES.treatments);
            treatments = (allTreatments || []).filter((t) => t?.diseaseId === disease.id);
          }
        } catch (e) {
          console.warn("Failed fetching treatments for disease", disease.id, e);
        }

        results.push({
          disease,
          matchCount,
          confidence: Math.round(confidence),
          treatments,
        });
      }
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Gets specific crop info.
   * @param {string} cropId 
   */
  async getCropDetails(cropId) {
    const db = await getDb();
    return await db.get(DB_STORES.crops, cropId);
  }

  /**
   * Find diseases by crop.
   */
  async getDiseasesByCrop(cropId) {
    const db = await getDb();
    const all = await db.getAll(DB_STORES.diseasePests);
    return all.filter(d => d.cropId === cropId);
  }
}

export const reasoningEngine = new ReasoningEngine();
