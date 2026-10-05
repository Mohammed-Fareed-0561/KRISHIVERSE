import { create } from "zustand";
import {
  askAdvisory,
  getChatHistory,
  diagnoseCrop,
  getCachedDiagnoses,
  saveDiagnosisRecord,
} from "../services/api/advisoryService";
import { dbClear } from "../services/db/indexedDb";
import { DB_STORES } from "../services/db/schemas";

// Conversation memory is deliberately bounded: the store keeps only the most
// recent MAX_CHAT_MESSAGES so long sessions cannot grow memory/render cost
// without limit. Full history remains in IndexedDB; the router is single-turn
// (context carries language + optional district only), so meaning is preserved.
export const MAX_CHAT_MESSAGES = 100;

/** Keep the most recent MAX_CHAT_MESSAGES entries (oldest dropped first). */
export function boundMessages(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.length > MAX_CHAT_MESSAGES ? arr.slice(arr.length - MAX_CHAT_MESSAGES) : arr;
}

export const useAdvisoryStore = create((set) => ({
  messages: [],
  diagnoses: [],
  loading: false,
  error: null,
  offline: false,
  ragStatus: "uninitialized",
  setRagStatus: (status) => set({ ragStatus: status }),

  // Load persisted chat history from IndexedDB (bounded in memory)
  loadHistory: async () => {
    try {
      const messages = await getChatHistory();
      set({ messages: boundMessages(messages) });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Load past diagnoses
  loadDiagnoses: async () => {
    try {
      const diagnoses = await getCachedDiagnoses();
      set({ diagnoses });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Send a question to the AI
  ask: async ({ question, displayQuestion, language, context }) => {
    set({ loading: true, error: null, offline: false });
    try {
      const result = await askAdvisory({
        question,
        displayQuestion,
        language,
        context,
      });
      const { userMsg, aiMsg, offline } = result;
      set((state) => ({
        messages: boundMessages([...state.messages, userMsg, aiMsg]),
        loading: false,
        offline: !!offline,
      }));
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Diagnose a crop disease
  diagnose: async ({ symptoms, cropType, language }) => {
    set({ loading: true, error: null });
    try {
      const result = await diagnoseCrop({ symptoms, cropType, language });
      set((state) => ({
        diagnoses: [result, ...state.diagnoses],
        loading: false,
      }));
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Clear all saved diagnoses (both in-store and in IndexedDB)
  clearDiagnoses: async () => {
    try {
      await dbClear(DB_STORES.diseaseDiagnoses);
      set({ diagnoses: [] });
    } catch (err) {
      console.error("Failed to clear diagnoses:", err);
    }
  },

  addDiagnoseRecord: async (data) => {
    try {
      const record = await saveDiagnosisRecord(data);
      set((state) => ({ diagnoses: [record, ...state.diagnoses] }));
      return record;
    } catch (err) {
      console.error(err);
    }
  },

  clearError: () => set({ error: null }),
}));
