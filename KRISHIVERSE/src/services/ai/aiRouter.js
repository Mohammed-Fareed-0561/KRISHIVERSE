import { apiClient } from "../api/apiClient";
import { answerFreeText, diagnoseFromGuide, warmUpCache } from "./IndexedDBChatbotEngine";
import {
  getOnDeviceAnswer,
  getOnDeviceEngine,
  isWebGpuSupported,
  isOnDeviceChatReady,
} from "./onDeviceChatEngine";
import { parseQuery, fastSearch } from "./AgriculturalNLP";
import { validateResponse } from "./ResponseValidator";
import { getConnectivityState, probeConnectivity, CONNECTIVITY_STATES } from "./connectivity";
import DecisionEngine, { shouldInvokeLaya } from "./decision/DecisionEngine";

export { warmUpCache };

const ON_DEVICE_ENABLED =
  (import.meta.env.VITE_ENABLE_ONDEVICE_LLM ?? "auto") !== "false";

// Better fallback that's more helpful than the generic message
export const LOCAL_ONLY_FALLBACK_MESSAGE = `## 🌿 KrishiVerse Farming Assistant

I can help you with:

**🦠 Disease Diagnosis** — "tomato leaves turning yellow"
**💊 Fertilizer Advice** — "how much urea for paddy?"
**🐛 Pest Control** — "white bugs on cotton leaves"
**🏛️ Govt. Schemes** — "PM Kisan yojana eligibility"
**💰 Market Info** — "today's onion price"
**🌧️ Weather Tips** — "what to do before monsoon?"

I understand: English, हिंदी, தமிழ், मराठी

💡 **Just describe your problem** — I'll understand and help!

Type "what can you do?" to see detailed features.`;

let advisoryCapabilitiesPromise = null;

async function getAdvisoryCapabilities() {
  if (!advisoryCapabilitiesPromise) {
    advisoryCapabilitiesPromise = apiClient
      .get("/health", { timeout: 4000 })
      .then(({ data }) => data?.capabilities || {})
      .catch(() => ({}));
  }
  return advisoryCapabilitiesPromise;
}

function isLocalAnswerUsable(result) {
  if (!result) return false;
  if (result.type === "fallback" || result.type === "no_match") return false;
  // If confidence exists, require at least 0.45
  if (typeof result.confidence === "number") {
    return result.confidence >= 0.45;
  }
  return Boolean(result.response);
}

function getLocalAnswerText(localResult) {
  if (!localResult?.response) return "";
  if (localResult.type === "fallback" || localResult.type === "no_match") return "";
  return localResult.response;
}

// Evidence used by the validator to ground LLM answers: the top KB records that
// match the current question.
function getEvidenceRecords(question) {
  try {
    return fastSearch(question, { limit: 5 }).records.map((r) => r.record);
  } catch {
    return [];
  }
}

// Collect the actual KB records a local result was built from.
function collectResultRecords(localResult) {
  if (!localResult?.data) return [];
  const d = localResult.data;
  return [
    d.disease,
    ...(Array.isArray(d.treatments) ? d.treatments : []),
    d.crop,
    ...(Array.isArray(d.diseases) ? d.diseases : []),
    d.symptom,
  ].filter(Boolean);
}

export async function resolveGuidedFlowLocally({ flowId, answers, localQuery, context = {} }) {
  await warmUpCache();

  if (flowId === "cropIssue") {
    const result = await diagnoseFromGuide({
      crop: answers.crop,
      symptom: answers.symptom,
      severity: answers.severity || (answers.recentRain === "yes" ? "moderate" : "mild"),
      rawText: localQuery,
    });

    return {
      source: "local-guided-diagnosis",
      mode: "local",
      result,
    };
  }

  const result = await answerFreeText(localQuery, context);
  return {
    source: "local-guided-search",
    mode: "local",
    result,
  };
}

/**
 * Main router: local KB → backend proxy (Groq/Gemini) → offline fallback.
 */
export async function routeFreeTextQuestion({ question, context = {}, language = "en" }) {
  await warmUpCache();

  // Warm the connectivity cache in the background (never blocks the router).
  probeConnectivity().catch(() => {});

  const parsed = parseQuery(question);
  const intent = parsed.intent;
  const evidence = getEvidenceRecords(question);

  // Optional structured-decision layer (Laya OR local fallback).
  // Task-specific: only ambiguous queries consult it; simple queries keep the
  // efficient path. The resolved intent only REFINES validator context — it can
  // never verify records, create provenance, or bypass ResponseValidator.
  // Offline-first: failures are silent; tiers below are unaffected.
  let decision = null;
  try {
    if (shouldInvokeLaya({ task: "intent_classification", question, state: { query: question, parsed } })) {
      decision = await DecisionEngine.decide({
        task: "intent_classification",
        state: { query: question, parsed },
        evidence,
        question,
      });
    }
  } catch {
    decision = null;
  }
  const resolvedIntent = decision?.decision?.intent && decision.decision.intent !== "unknown"
    ? decision.decision.intent
    : intent;

  // When a local/online answer is blocked by the validator (e.g. an unsourced
  // high-risk dosage), keep its safe answer so the best-effort offline fallback
  // never leaks the blocked content back to the farmer.
  let blockedSafeAnswer = null;

  // Step 1: On-device LLM (WebGPU + cached Qwen2.5-3B) — free, private, offline.
  // Only attempted when the engine is already loaded to avoid blocking on a
  // multi-GB first-time download. Otherwise we preload it in the background.
  if (ON_DEVICE_ENABLED && isWebGpuSupported()) {
    if (isOnDeviceChatReady()) {
      const onDevice = await getOnDeviceAnswer({ question, context, language });
      if (onDevice) {
        const validation = validateResponse({
          answer: onDevice.answer,
          source: onDevice.source,
          confidence: onDevice.confidence,
          evidence,
          parsed,
          intent: resolvedIntent,
        });
        if (validation.verdict !== "blocked") {
          return {
            ...onDevice,
            answer: validation.safeAnswer,
            metadata: { ...onDevice.metadata, validation, decision },
          };
        }
        console.warn("[aiRouter] on-device answer blocked by validator:", validation.reasons);
      }
    } else if (getConnectivityState() !== CONNECTIVITY_STATES.OFFLINE) {
      // background warm-up so later queries (and offline use) are fast
      getOnDeviceEngine().catch(() => {});
    }
  }

  // Step 2: Try offline knowledge base first (works 100% of the time)
  const localResult = await answerFreeText(question, context);
  if (isLocalAnswerUsable(localResult)) {
    const validation = validateResponse({
      answer: localResult.response,
      source: "local-knowledge-base",
      confidence: localResult.confidence,
      records: collectResultRecords(localResult),
      evidence,
      parsed,
      intent: resolvedIntent,
    });
    if (validation.verdict !== "blocked") {
      return {
        mode: "local",
        source: "local-knowledge-base",
        answer: validation.safeAnswer,
        confidence: localResult.confidence,
        suggestions: localResult.suggestions,
        localResult,
        metadata: {
          model: "local-router",
          offline: true,
          validation,
          decision,
        },
      };
    }
    console.warn("[aiRouter] local answer blocked by validator:", validation.reasons);
    blockedSafeAnswer = validation.safeAnswer;
  }

  // Step 3: Try the backend proxy — the only online AI tier. It internally
  // routes RAG → Groq → Gemini, so no API key ever needs to live in the browser.
  const connectivity = getConnectivityState();
  const canTryBackend = connectivity !== CONNECTIVITY_STATES.OFFLINE
    && Boolean((await getAdvisoryCapabilities()).groqEnabled !== false);

  if (canTryBackend) {
    try {
      const { data } = await apiClient.post("/advisory/ask", {
        question,
        language,
        context,
      });

      const validation = validateResponse({
        answer: data.answer,
        source: "backend-proxy",
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        evidence,
        parsed,
        intent: resolvedIntent,
      });

      if (validation.verdict !== "blocked") {
        return {
          mode: "backend",
          source: "backend-proxy",
          answer: validation.safeAnswer,
          confidence: typeof data.confidence === "number" ? data.confidence : null,
          suggestions: [],
          metadata: {
            model: data.model || "groq/gemini",
            offline: false,
            validation,
            decision,
          },
        };
      }
      console.warn("[aiRouter] Backend answer blocked by validator:", validation.reasons);
    } catch (backendErr) {
      console.warn("[aiRouter] Backend proxy failed:", backendErr.message);
    }
  }

  // Step 4: Best-effort offline fallback — enrich with local result
  return {
    mode: "local-fallback",
    source: "local-fallback",
    answer: blockedSafeAnswer || getLocalAnswerText(localResult) || LOCAL_ONLY_FALLBACK_MESSAGE,
    confidence: 0,
    suggestions: localResult?.suggestions || [
      "🌱 Ask about a specific crop + problem",
      "📷 Upload a photo for disease diagnosis",
      "📞 Call Kisan Helpline: 1800-180-1551"
    ],
    localResult,
    metadata: {
      model: "local-router",
      offline: getConnectivityState() === CONNECTIVITY_STATES.OFFLINE,
    },
  };
}
