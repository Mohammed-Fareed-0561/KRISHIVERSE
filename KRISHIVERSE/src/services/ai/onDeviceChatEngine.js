// On-device chat using WebLLM (WebGPU) + Qwen2.5 (0.5B/1.5B/3B) Instruct.
// The model is downloaded once on first use and cached in the browser's cache
// storage, so after that it answers fully offline. The model tier is picked from
// the device's memory so low-end phones still get a working on-device model.
// Falls back gracefully when WebGPU or the model is unavailable.
const ONNX_MLC_MODELS = {
  "0.5b": "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "1.5b": "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "3b": "Qwen2.5-3B-Instruct-q4f16_1-MLC",
};

export function getOnDeviceModelId(deviceMemory) {
  const configured = import.meta.env.VITE_ONDEVICE_LLM_MODEL;
  if (configured) return configured;
  const mem = Number(deviceMemory) || 0;
  if (mem > 0 && mem < 4) return ONNX_MLC_MODELS["0.5b"];
  if (mem >= 4 && mem < 8) return ONNX_MLC_MODELS["1.5b"];
  return ONNX_MLC_MODELS["3b"];
}

export const ONDEVICE_MODEL_ID = getOnDeviceModelId(
  typeof navigator !== "undefined" ? navigator.deviceMemory : undefined
);

let enginePromise = null;
let initProgressHandler = null;

export function isWebGpuSupported() {
  return typeof navigator !== "undefined" && typeof navigator.gpu !== "undefined";
}

export function isOnDeviceEnabled() {
  return (import.meta.env.VITE_ENABLE_ONDEVICE_LLM ?? "auto") !== "false";
}

export function setInitProgressHandler(fn) {
  initProgressHandler = fn;
}

export function isOnDeviceChatReady() {
  return Boolean(enginePromise) || isWebGpuSupported() && engineLoadedFlag;
}

// set once engine finished loading
let engineLoadedFlag = false;

// pure prompt builder (unit-tested)
export function buildLocalChatMessages({ question, context, language, localKnowledge }) {
  const langInstruction =
    language === "ta"
      ? "Respond in simple Tamil using Tamil script."
      : language === "hi"
        ? "Respond in simple Hindi using both script and Roman where helpful."
        : "Respond in simple farmer-friendly English.";

  return [
    {
      role: "system",
      content: `You are KrishiVerse, an agricultural assistant for Indian farmers (especially Tamil Nadu).
Rules:
- Give safe, specific, actionable guidance with quantities and timing
- Prefer integrated pest management; include organic and chemical options when relevant
- Never invent live prices, weather, or government eligibility
- Keep answers under 250 words, use short bullet points
- ${langInstruction}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        question,
        context: context || "Not specified",
        localKnowledge: localKnowledge || "No verified local match was found.",
      }),
    },
  ];
}

export function getOnDeviceEngine({ onProgress } = {}) {
  if (!isWebGpuSupported()) return null;
  if (onProgress) initProgressHandler = onProgress;
  if (!enginePromise) {
    enginePromise = import("@mlc-ai/web-llm")
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(ONDEVICE_MODEL_ID, {
          initProgressCallback: (p) => initProgressHandler?.(p),
        })
      )
      .then((engine) => {
        engineLoadedFlag = true;
        return engine;
      })
      .catch((e) => {
        console.warn("[onDeviceChat] engine init failed:", e);
        enginePromise = null;
        return null;
      });
  }
  return enginePromise;
}

export async function preloadOnDeviceChat({ onProgress } = {}) {
  return getOnDeviceEngine({ onProgress });
}

/**
 * Generates a local LLM answer. Returns null when unavailable/failed so the
 * router can continue to the next tier.
 */
export async function getOnDeviceAnswer({ question, context, language, localKnowledge }) {
  const engine = await getOnDeviceEngine();
  if (!engine) return null;
  try {
    const reply = await engine.chat.completions.create({
      messages: buildLocalChatMessages({ question, context, language, localKnowledge }),
      temperature: 0.35,
      max_tokens: 600,
    });
    const answer = reply?.choices?.[0]?.message?.content?.trim();
    if (!answer) return null;
    return {
      mode: "ondevice",
      source: "ondevice-llm",
      answer,
      confidence: 0.8,
      suggestions: [],
      metadata: {
        model: ONDEVICE_MODEL_ID,
        offline: true,
      },
    };
  } catch (e) {
    console.warn("[onDeviceChat] answer failed:", e);
    return null;
  }
}

export default {
  getOnDeviceAnswer,
  getOnDeviceEngine,
  preloadOnDeviceChat,
  isWebGpuSupported,
  isOnDeviceChatReady,
  isOnDeviceEnabled,
  setInitProgressHandler,
  buildLocalChatMessages,
  ONDEVICE_MODEL_ID,
};
