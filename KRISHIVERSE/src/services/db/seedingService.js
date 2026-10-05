import { DB_STORES } from "./schemas";
import { getDb } from "./indexedDb";
import { CROPS } from "../../data/seed/cropData";
import { DISEASE_PESTS, SYMPTOMS } from "../../data/seed/diseaseData";
import { TREATMENTS } from "../../data/seed/treatmentData";
import { KNOWLEDGE_GRAPH_EDGES } from "../../data/seed/edgeData";
import MASSIVE_DATASET from "../../data/seed/massive_dataset.json";

/**
 * Seeds the database with initial agricultural data if stores are empty.
 */
export async function seedAgriculturalData() {
  const db = await getDb();

  const storesToSeed = [
    { key: 'crops', data: [...CROPS, ...MASSIVE_DATASET.crops], storeName: DB_STORES.crops },
    { key: 'symptoms', data: [...SYMPTOMS, ...MASSIVE_DATASET.symptoms], storeName: DB_STORES.symptoms },
    { key: 'diseasePests', data: [...DISEASE_PESTS, ...MASSIVE_DATASET.diseasePests], storeName: DB_STORES.diseasePests },
    { key: 'treatments', data: [...TREATMENTS, ...MASSIVE_DATASET.treatments], storeName: DB_STORES.treatments },
    { key: 'edges', data: [...KNOWLEDGE_GRAPH_EDGES, ...MASSIVE_DATASET.edges], storeName: DB_STORES.edges },
  ];

  for (const item of storesToSeed) {
    const tx = db.transaction(item.storeName, "readwrite");
    const store = tx.objectStore(item.storeName);
    const count = await store.count();

    if (count === 0) {
      console.log(`[Seeding] Populating ${item.key} with ${item.data.length} records...`);
      // Use chunking for very large datasets if needed, but 15k should fit in standard transactions
      const batchSize = 500;
      for (let i = 0; i < item.data.length; i += batchSize) {
        const chunk = item.data.slice(i, i + batchSize);
        const chunkTx = db.transaction(item.storeName, "readwrite");
        const chunkStore = chunkTx.objectStore(item.storeName);
        for (const record of chunk) {
          chunkStore.put(record);
        }
        await chunkTx.done;
      }
      console.log(`[Seeding] ${item.key} populated successfully.`);
    }
  }

  console.log("[Seeding] All agricultural data seeding complete.");
}

