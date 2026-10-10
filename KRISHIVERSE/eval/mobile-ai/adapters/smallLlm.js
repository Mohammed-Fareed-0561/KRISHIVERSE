/**
 * eval/mobile-ai/adapters/smallLlm.js — small local LLM arm via an
 * OpenAI-compatible server. OFFLINE by default: the arm only exists when
 * KV_BENCH_LLM_URL is explicitly set.
 *
 * Compatible with (any one):
 *   - WebLLM's OpenAI-compatible endpoint served from the browser (arm H)
 *   - `cactus serve <model> --host 127.0.0.1 --port 8080 --no-cloud-handoff`
 *     (IMPORTANT: keep --no-cloud-handoff so no query leaves the device)
 *   - llama.cpp `llama-server`, Ollama, or any local /v1/chat/completions
 *
 * Candidate registry (sizes/licenses from public sources, 2026-08):
 * see docs/ai/small-model-evaluation.md — measured metrics come from runs
 * against this adapter, never from vendor benchmark tables.
 */
/* global process: readonly */

export const SMALL_LLM_CANDIDATES = [
  { id: "qwen2.5-0.5b-instruct", params: "0.5B", license: "Apache-2.0 / Qwen license",
    runtime: "WebLLM (WebGPU) — already in production", browser: true, webgpu: true, tamil: "unmeasured",
    note: "current KrishiVerse on-device model (lowest RAM tier)" },
  { id: "qwen2.5-1.5b-instruct", params: "1.5B", license: "Apache-2.0 / Qwen license",
    runtime: "WebLLM (WebGPU) — already in production", browser: true, webgpu: true, tamil: "unmeasured",
    note: "current KrishiVerse mid RAM tier" },
  { id: "qwen3-1.7b", params: "1.7B", license: "Apache-2.0",
    runtime: "cactus / llama.cpp / WebLLM", browser: "partial", webgpu: "partial", tamil: "unmeasured",
    note: "Cactus lists Qwen family as tested; measured 155 tok/s decode on M5 Max per cactus README" },
  { id: "lfm2.5-450m", params: "450M", license: "Liquid AI community license",
    runtime: "cactus", browser: "unmeasured", webgpu: "unmeasured", tamil: "unmeasured",
    note: "Liquid LFM2.5 small; Cactus reports 472 tok/s for the VL-450m variant on M5 Max" },
  { id: "smollm2-135m/360m", params: "135M/360M", license: "Apache-2.0",
    runtime: "WebLLM/llama.cpp", browser: true, webgpu: "partial", tamil: "weak-unmeasured",
    note: "very small general models; Tamil expected weak — must be measured, not assumed" },
  { id: "gemma-3-270m/1b", params: "270M/1B", license: "Gemma license (Google)",
    runtime: "cactus (tested family)", browser: "partial", webgpu: "partial", tamil: "unmeasured",
    note: "Cactus default test family; redistribution terms differ from Apache-2.0 — check before bundling" },
];

export function smallLlmAvailability() {
  const url = process.env.KV_BENCH_LLM_URL;
  if (!url) {
    return {
      available: false,
      reason: "KV_BENCH_LLM_URL not set (no local OpenAI-compatible server configured)",
      howToRun: "cactus serve <model> --host 127.0.0.1 --port 8080 --no-cloud-handoff  # then KV_BENCH_LLM_URL=http://127.0.0.1:8080/v1",
    };
  }
  return { available: true, url };
}

/**
 * @returns {Promise<{ok:boolean, answer?:string, ms?:number, error?:string, usage?:object}>}
 */
export async function runSmallLlm(question, { system = "", temperature = 0.2, maxTokens = 400 } = {}) {
  const avail = smallLlmAvailability();
  if (!avail.available) return { ok: false, error: avail.reason };
  const t0 = performance.now();
  try {
    const res = await fetch(`${avail.url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.KV_BENCH_LLM_MODEL || "local",
        temperature,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: question },
        ],
      }),
    });
    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, answer, ms: performance.now() - t0, usage: json.usage || null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), ms: performance.now() - t0 };
  }
}

export const smallLlmArm = {
  id: "small-llm",
  label: "Small local LLM via OpenAI-compatible server (KV_BENCH_LLM_URL)",
  available: () => smallLlmAvailability().available,
  skipReason: () => smallLlmAvailability().reason,
  howToRun: () => smallLlmAvailability().howToRun,
  run: runSmallLlm,
};

export default smallLlmArm;
