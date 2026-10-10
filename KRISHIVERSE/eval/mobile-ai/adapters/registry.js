/**
 * eval/mobile-ai/adapters/registry.js — the A..P chatbot arm registry (spec §3).
 *
 * Arms are capability compositions of adapters. An arm is "measured" only if
 * every required adapter is available in this environment; otherwise it is
 * recorded as skipped WITH an exact howToRun. Nothing is ever estimated.
 *
 * A–P taxonomy (spec §3):
 *   A baseline · B NLP only · C NLP+KB · D NLP+RAG · E NLP+KB+RAG · F NLP+KB+Decision
 *   G F+Laya · H–M Needle variants · N best+Qwen/WebLLM · O best+smallest local LLM
 *   P best mobile/offline (assigned post-hoc by buildComparison.mjs)
 */
import { needleAvailability } from "./needle.js";
import { smallLlmAvailability } from "./smallLlm.js";
import { existingLocal, layaLive } from "./decisions.js";
import { identifyLanguage } from "./langId.js";
import { agriculturalNlp } from "./agriculturalNlp.js";
import { retrievalArms } from "./kbRag.js";
import { extractPlantPart, extractFarmerContext } from "./ruleExtract.js";

const NEEDLE = needleAvailability();
const SMALL = smallLlmAvailability();

const WEBLLM_SKIP = "WebLLM/Qwen requires a WebGPU browser session; not executable from the node harness";
const WEBLLM_HOW = "open the KrishiVerse PWA in a WebGPU browser with VITE_ENABLE_ONDEVICE_LLM=auto, "
  + "or serve the model via an OpenAI-compatible endpoint and set KV_BENCH_LLM_URL to reuse the same adapter";

const NEEDLE_CAPS = ["language-identification", "intent-classification", "crop-extraction", "symptom-extraction",
  "disease-extraction", "plant-part-extraction", "farmer-context-extraction", "clarification-selection"];

const NLP_CAPS = ["language-identification", "intent-classification", "crop-extraction", "symptom-extraction"];
const NLP_KB_CAPS = [...NLP_CAPS, "kb-retrieval"];
const FULL_LOCAL_CAPS = [...NLP_KB_CAPS, "clarification-selection"];

/**
 * Runnable local composition used by arms A–G (production-equivalent logic).
 * @param {{retrieval?:false|"kb"|"rag"|"kb+rag", decision?:boolean}} opts
 *   retrieval strategy: false = none, "kb" = production lexical fastSearch,
 *   "rag" = alias-expanded RRF prototype, "kb+rag" = RRF fusion of both.
 */
export function localArmRun(opts = {}) {
  const strategy = opts.retrieval || false;
  const retrieve = !strategy
    ? () => []
    : strategy === "kb"
      ? (text, limit = 5) => retrievalArms.existing.run(text, limit)
      : strategy === "rag"
        ? (text, limit = 5) => retrievalArms.hybrid.run(text, limit)
        : (text, limit = 5) => retrievalArms.fused.run(text, limit);
  return {
    lang: (text) => identifyLanguage(text),
    parse: (text) => agriculturalNlp.parse(text),
    retrieve,
    decide: opts.decision
      ? (task, state, candidates) => existingLocal.decide(task, state, candidates, [])
      : null,
    plantPart: null,
    farmerContext: null,
  };
}

const needleArm = (id, label, capabilities) => ({
  id,
  label,
  state: NEEDLE.available ? "measured" : "skipped",
  skipReason: NEEDLE.available ? undefined : NEEDLE.reason,
  howToRun: NEEDLE.howToRun,
  capabilities,
  external: "needle",
});

const needleRequires = (id, label, requires, capabilities) => ({
  id,
  label,
  state: NEEDLE.available ? "measured" : "skipped",
  skipReason: NEEDLE.available ? undefined : `requires ${requires}: ${NEEDLE.reason}`,
  howToRun: NEEDLE.howToRun,
  capabilities,
  external: "needle",
});

export const ARMS = [
  {
    id: "A-baseline",
    label: "A. Baseline: current KrishiVerse local tier (rules + AgriculturalNLP + KB lexical retrieval + local decision, production snapshot)",
    state: "measured",
    capabilities: FULL_LOCAL_CAPS,
    build: () => localArmRun({ retrieval: "kb", decision: true }),
  },
  {
    id: "B-nlp",
    label: "B. NLP only (AgriculturalNLP parse pipeline; no retrieval, no decision engine)",
    state: "measured",
    capabilities: ["intent-classification", "crop-extraction", "symptom-extraction"],
    build: () => localArmRun({ retrieval: false, decision: false }),
  },
  {
    id: "C-nlp-kb",
    label: "C. NLP + local KB (production lexical fastSearch; no decision engine)",
    state: "measured",
    capabilities: NLP_KB_CAPS,
    build: () => localArmRun({ retrieval: "kb", decision: false }),
  },
  {
    id: "D-nlp-rag",
    label: "D. NLP + RAG (alias-expanded query + RRF hybrid retrieval; no decision engine)",
    state: "measured",
    capabilities: NLP_KB_CAPS,
    build: () => localArmRun({ retrieval: "rag", decision: false }),
  },
  {
    id: "E-nlp-kb-rag",
    label: "E. NLP + KB + RAG (RRF fusion of production lexical and alias-expanded hybrid lists; no decision engine)",
    state: "measured",
    capabilities: NLP_KB_CAPS,
    build: () => localArmRun({ retrieval: "kb+rag", decision: false }),
  },
  {
    id: "F-nlp-kb-decision",
    label: "F. NLP + KB + Decision engine (candidate composition; identical to A in the current codebase — baseline already ships this stack)",
    state: "measured",
    capabilities: FULL_LOCAL_CAPS,
    build: () => localArmRun({ retrieval: "kb", decision: true }),
  },
  {
    id: "G-f-laya",
    label: "G. F + Laya (base composition runs local; live Laya decision sub-arm requires KV_BENCH_API)",
    state: "measured",
    capabilities: FULL_LOCAL_CAPS,
    build: () => localArmRun({ retrieval: "kb", decision: true }),
    subArms: [
      { id: "G-laya-live", label: "G live-Laya sub-arm", available: layaLive.available(),
        skipReason: layaLive.available() ? undefined : layaLive.skipReason, howToRun: layaLive.howToRun },
    ],
  },
  needleArm("H-nlp-needle", "H. Needle only (structured extraction / intent / clarification)", NEEDLE_CAPS),
  needleRequires("I-h-kb", "I. Needle + local KB", "arm H", NLP_KB_CAPS.concat(
    ["plant-part-extraction", "farmer-context-extraction", "clarification-selection"])),
  needleRequires("J-i-rag", "J. Needle + KB + RAG", "arm I", NLP_KB_CAPS.concat(
    ["plant-part-extraction", "farmer-context-extraction", "clarification-selection"])),
  {
    ...needleRequires("K-h-kb-decision", "K. Needle + KB + Decision engine (clarification/decision composition)",
      "arm H", FULL_LOCAL_CAPS.concat(["plant-part-extraction", "farmer-context-extraction"])),
    subArms: [
      { id: "K-needle-clarify", label: "K Needle-clarification sub-arm", available: NEEDLE.available,
        skipReason: NEEDLE.available ? undefined : NEEDLE.reason, howToRun: NEEDLE.howToRun },
    ],
  },
  needleRequires("L-k-rag", "L. K + RAG", "arm K", FULL_LOCAL_CAPS.concat(
    ["plant-part-extraction", "farmer-context-extraction"])),
  {
    id: "M-l-laya",
    label: "M. L + Laya (Needle stack + KB/Decision + live Laya)",
    state: "skipped",
    skipReason: `requires arm L (Needle stack): needle[${NEEDLE.reason}] laya[${layaLive.available() ? "ok" : layaLive.skipReason}]`,
    howToRun: NEEDLE.howToRun,
    capabilities: FULL_LOCAL_CAPS,
    external: "needle",
  },
  {
    id: "N-best-webllm",
    label: "N. Best measured arm + Qwen/WebLLM in-browser LLM",
    state: "skipped",
    skipReason: WEBLLM_SKIP,
    howToRun: WEBLLM_HOW,
    capabilities: ["answer-generation", "intent-classification"],
    external: "webllm",
  },
  {
    id: "O-best-small-llm",
    label: "O. Best measured arm + smallest local LLM (OpenAI-compatible local server)",
    state: SMALL.available ? "measured" : "skipped",
    skipReason: SMALL.available ? undefined : SMALL.reason,
    howToRun: SMALL.howToRun,
    capabilities: ["answer-generation", "intent-classification", "language-identification"],
    external: "small-llm",
  },
  {
    id: "P-best-mobile-offline",
    label: "P. Best mobile/offline architecture (assigned after arms A..O produce results)",
    state: "not-applicable",
    skipReason: "assigned after arms A..O produce results (eval/mobile-ai/buildComparison.mjs)",
    capabilities: [],
  },
];

/** Rule-prototype extractor exposed to arms that ask for parts/context. */
export const RULE_EXTRACTORS = { plantPart: extractPlantPart, farmerContext: extractFarmerContext };

export function armById(id) {
  return ARMS.find((a) => a.id === id) || null;
}
