/**
 * eval/mobile-ai/adapters/decisions.js — decision/clarification arms.
 *
 *  - existingLocal : production LocalDecisionEngine (the code that runs today
 *                    when the Laya flag is off or Laya is unreachable).
 *  - layaLive      : production LayaDecisionEngine against a live backend —
 *                    available ONLY when KV_BENCH_API is set (opt-in, no
 *                    automatic network).
 */
import LocalDecisionEngine from "../../../src/services/ai/decision/LocalDecisionEngine.js";
import LayaDecisionEngine from "../../../src/services/ai/decision/LayaDecisionEngine.js";

export const existingLocal = {
  id: "existing-local-decision",
  label: "Existing decision logic (LocalDecisionEngine)",
  available: () => true,
  decide(task, state, candidates = [], evidence = []) {
    return LocalDecisionEngine.decide({ task, state, candidates, evidence });
  },
};

export const layaLive = {
  id: "laya-live",
  label: "Laya sidecar (live backend, KV_BENCH_API)",
  available: () => Boolean(process.env.KV_BENCH_API),
  skipReason: "set KV_BENCH_API=<backend origin> to run the live Laya arm (requires Laya deployment + network)",
  howToRun: "KV_BENCH_API=http://localhost:5000 npx vitest run eval/mobile-ai/benchmarks/decision.benchmark.test.js",
  async decide(task, state, candidates = [], evidence = []) {
    return LayaDecisionEngine.decide({ task, state, candidates, evidence, apiBase: process.env.KV_BENCH_API });
  },
};

export default { existingLocal, layaLive };

