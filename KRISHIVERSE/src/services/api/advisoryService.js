import { v4 as uuidv4 } from "uuid";
import { apiClient } from "./apiClient";
import { dbPut, dbGetAll } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { enqueueSync } from "../sync/syncService";
import { useAdvisoryStore } from "../../store/advisoryStore";
import { queryOfflineBot, initOfflineChatbot } from "../offline/offlineChatbot";
import {
  LOCAL_ONLY_FALLBACK_MESSAGE,
  routeFreeTextQuestion,
} from "../ai/aiRouter";

// Lazy holders for heavy modules
let _reasoningEngine = null;

async function getReasoningEngine() {
  if (_reasoningEngine) return _reasoningEngine;
  const mod = await import("../ReasoningEngine");
  const Impl = mod.ReasoningEngine || mod.default || mod;
  _reasoningEngine = new Impl();
  return _reasoningEngine;
}

// Initialize the offline AI worker globally early so it can download
// the models via Web Worker while user navigates naturally
setTimeout(() => {
  initOfflineChatbot((status) => {
    console.log("Offline RAG Status:", status);
    useAdvisoryStore.getState().setRagStatus?.(status);
  });
}, 0);

// ─── Chat history (persisted to IndexedDB) ────────────────────────────────────

export async function getChatHistory() {
  const rows = await dbGetAll(DB_STORES.chatHistory);
  return (rows ?? []).sort((a, b) => a.timestamp - b.timestamp);
}

async function saveMessage(role, text, meta = {}) {
  const record = { id: uuidv4(), role, text, timestamp: Date.now(), ...meta };
  await dbPut(DB_STORES.chatHistory, record);
  return record;
}

// ─── Ask AI ───────────────────────────────────────────────────────────────────

/**
 * Send a question to the KrishiVerse AI advisory backend.
 * Saves both the user question and AI answer to IndexedDB.
 *
 * @param {{ question, language?, context? }} payload
 * @returns {{ userMsg, aiMsg, answer }}
 */
export async function askAdvisory({ question, displayQuestion = question, language = "en", context = {} }) {
  // Save user message immediately (optimistic)
  const userMsg = await saveMessage("user", displayQuestion, { language });

  try {
    const routed = await routeFreeTextQuestion({
      question,
      language,
      context,
    });

    const aiMsg = await saveMessage("assistant", routed.answer, {
      model: routed.metadata?.model,
      offline: routed.metadata?.offline ?? !["gemini", "groq"].includes(routed.mode),
      router: routed.source,
      confidence: routed.confidence,
      validation: routed.metadata?.validation || null,
    });

    return {
      userMsg,
      aiMsg,
      answer: routed.answer,
      offline: routed.metadata?.offline ?? !["gemini", "groq"].includes(routed.mode),
      confidence: routed.confidence,
      source: routed.source,
    };
  } catch (err) {
    console.warn("AI router failed, using safe offline fallback:", err);
    try {
      const offlineAnswer = await queryOfflineBot(question);
      const offlineMsg = await saveMessage("assistant", offlineAnswer, {
        offline: true,
        model: "local-bot",
      });
      return {
        userMsg,
        aiMsg: offlineMsg,
        answer: offlineAnswer,
        offline: true,
        source: "basic-offline-bot",
      };
    } catch {
      const offlineMsg = await saveMessage("assistant", LOCAL_ONLY_FALLBACK_MESSAGE, {
        offline: true,
        model: "local-fallback",
      });
      return {
        userMsg,
        aiMsg: offlineMsg,
        answer: LOCAL_ONLY_FALLBACK_MESSAGE,
        offline: true,
        source: "local-no-verified-answer",
      };
    }
  }
}

// ─── Diagnose ─────────────────────────────────────────────────────────────────

export async function saveDiagnosisRecord(data) {
  const record = {
    id: uuidv4(),
    ...data,
    savedAt: data.savedAt ? new Date(data.savedAt).getTime() : Date.now(),
  };
  await dbPut(DB_STORES.diseaseDiagnoses, record);
  // Queue for server sync (offline-first outbox)
  await enqueueSync({ storeName: DB_STORES.diseaseDiagnoses, payload: record }).catch(() => {});
  return record;
}

/**
 * Submit plant disease symptoms for AI diagnosis.
 * Saves result to diseaseDiagnoses store.
 *
 * @param {{ symptoms, cropType?, language? }} payload
 * @returns {{ id, diagnosis, savedAt }}
 */
export async function diagnoseCrop({ symptoms, cropType, language = "en" }) {
  try {
    const { data } = await apiClient.post("/advisory/diagnose", {
      symptoms,
      cropType,
      language,
    });

    return saveDiagnosisRecord({
      symptoms,
      cropType: cropType || "unknown",
      diagnosis: data.diagnosis,
      model: data.model,
    });
  } catch (err) {
    const msg = String(err?.message || "").toLowerCase();
    const isAuthError = err?.status === 401 || /missing authorization token|invalid or expired token|unauthorized/.test(msg);
    if (err.isOffline || isAuthError) {
      // Use Reasoning Engine for offline diagnosis. Accept either symptom text or an array of symptom IDs.
      let symptomIds = [];
      try {
        if (Array.isArray(symptoms)) {
          symptomIds = symptoms;
        } else {
          const reasoning = await getReasoningEngine();
          symptomIds = await reasoning.extractSymptomsFromText(String(symptoms || ""));
        }
      } catch (e) {
        console.warn("Failed to extract symptom IDs for offline diagnosis:", e);
        symptomIds = [];
      }

      // Match symptoms using reasoning engine
      const reasoningInst = await getReasoningEngine();
      const matches = await reasoningInst.matchSymptoms(symptomIds);

      let diagnosisText = "No clear match found offline. Please try again with more details or when online.";
      let confidenceValue = null;
      let returnedTreatments = [];
      let diseaseName = null;
      let diseaseObj = null;

      if (Array.isArray(matches) && matches.length > 0) {
        const best = matches[0] || {};
        diseaseObj = best?.disease || {};
        diseaseName = diseaseObj?.name || diseaseObj?.title || "an unknown disease";

        // ReasoningEngine returns a `confidence` percent (rounded) — use it if available
        confidenceValue = typeof best?.confidence === "number" ? best.confidence : null;

        // Normalize treatments into an array
        returnedTreatments = Array.isArray(best?.treatments) ? best.treatments : best?.treatments ? [best.treatments] : [];

        const firstTreatment = returnedTreatments.find((t) => t && (t.action || t.description || t.name)) || returnedTreatments[0];
        const treatmentText = firstTreatment?.action || firstTreatment?.description || firstTreatment?.name || "follow local agronomy practices";

        const confLabel = confidenceValue !== null ? `${confidenceValue}%` : "unknown";
        diagnosisText = `Offline Diagnosis: Likely ${diseaseName} (${confLabel} match).\n\nRecommended Action: ${treatmentText}`;
      }

      // Build UI-friendly fields
      const record = {
        symptoms,
        cropType: cropType || "unknown",
        // Primary display fields
        diagnosis: diseaseName || diagnosisText,
        name: diseaseName || diagnosisText,
        diagnosisText,
        model: "local-reasoning-engine",
        offline: true,
        // Confidence: both raw number and friendly string
        confidence: confidenceValue !== null ? `${confidenceValue}%` : null,
        confidenceRaw: confidenceValue,
        // Disease metadata
        severity: diseaseObj?.severity || null,
        causes: diseaseObj?.cause || diseaseObj?.description || null,
        affectedArea: diseaseObj?.affectedArea || null,
        // Treatments: try to map into natural/chemical buckets if types exist
        treatments: returnedTreatments,
        naturalIndianTreatment: returnedTreatments
          .filter((t) => t && (t.type === "natural" || /neem|cow|ash|organic|home remedy/i.test(String(t.action || t.description || t.name || ""))))
          .map((t) => t.action || t.description || t.name),
        chemicalTreatment: returnedTreatments
          .filter((t) => t && (t.type === "chemical" || /fungicide|insecticide|pesticide|chemical|systemic/i.test(String(t.action || t.description || t.name || ""))))
          .map((t) => t.action || t.description || t.name),
        prevention: diseaseObj?.prevention
          ? (Array.isArray(diseaseObj.prevention) ? diseaseObj.prevention : String(diseaseObj.prevention).split(/\n|\.|;|\r\n/).map(s => s.trim()).filter(Boolean))
          : [],
        analysisMethod: "reasoning-offline",
        savedAt: Date.now(),
      };

      return saveDiagnosisRecord(record);
    }
    throw err;
  }
}

/**
 * Get all saved diagnoses.
 */
export async function getCachedDiagnoses() {
  const rows = await dbGetAll(DB_STORES.diseaseDiagnoses);
  return (rows ?? []).sort((a, b) => b.savedAt - a.savedAt);
}
