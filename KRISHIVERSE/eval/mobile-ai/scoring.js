/**
 * eval/mobile-ai/scoring.js — deterministic scoring helpers shared by the
 * mobile-ai benchmark runners. Report-only: benchmark failures are findings,
 * never suite failures (hard safety invariants stay in eval/safety.regression).
 */
import { identifyLanguage } from "./adapters/langId.js";
import { agriculturalNlp } from "./adapters/agriculturalNlp.js";
import { existingLocal } from "./adapters/decisions.js";
import { extractPlantPart, extractFarmerContext } from "./adapters/ruleExtract.js";

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function latencyStats(values) {
  if (!values.length) return { n: 0, avg: null, p95: null, max: null };
  return {
    n: values.length,
    avg: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
    p95: +percentile(values, 95).toFixed(2),
    max: +Math.max(...values).toFixed(2),
  };
}

export function passRate(rows) {
  const scored = rows.filter((r) => r.ok !== null);
  if (!scored.length) return { n: 0, ok: 0, passRate: null };
  const ok = scored.filter((r) => r.ok).length;
  return { n: scored.length, ok, passRate: +(ok / scored.length).toFixed(3) };
}

export function groupPassRate(rows, keyFn) {
  const groups = {};
  for (const r of rows) {
    const k = keyFn(r);
    (groups[k] = groups[k] || []).push(r);
  }
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, passRate(v)]));
}

/**
 * Score one runnable arm (A–G local composition) over the case list.
 * async: LocalDecisionEngine.decide is async — awaiting is mandatory, otherwise
 * needsClarification reads as undefined and every clarification row false-fails.
 * @param {{id:string, build:Function, capabilities:string[]}} armDef
 * @param {Array} cases
 */
export async function scoreLocalArm(armDef, cases) {
  const run = armDef.build();
  const caps = new Set(armDef.capabilities || []);
  const rows = [];
  const lat = [];
  // Component hooks (ablation support): arms may stub parse/lang/retrieve/
  // decide/plantPart/farmerContext; when absent, production behaviour is used.
  const decideFn = (task, state, cands) => (run.decide
    ? run.decide(task, state, cands || [])
    : existingLocal.decide(task, state, cands || [], []));

  for (const c of cases) {
    const t0 = performance.now();
    const push = (task, ok, actual, expected) => {
      rows.push({ arm: armDef.id, caseId: c.id, language: c.language, type: c.type, task, ok, actual, expected });
    };

    try {
      if (c.type === "intent" || c.type === "chatbot") {
        const parsed = run.parse(c.input);

        if (caps.has("language-identification")) {
          push("language-identification", run.lang(c.input) === c.language, run.lang(c.input), c.language);
        }
        if (c.expected?.intent !== undefined) {
          push("intent-classification", parsed.intent === c.expected.intent, parsed.intent, c.expected.intent);
        }
        if (c.expected?.crop !== undefined) {
          push("crop-extraction", (parsed.crop ?? null) === c.expected.crop, parsed.crop ?? null, c.expected.crop);
        }
        if (c.expected?.symptom !== undefined) {
          push("symptom-extraction", parsed.symptom === c.expected.symptom, parsed.symptom, c.expected.symptom);
        }
        if (c.expected?.plantPart !== undefined) {
          const fn = run.plantPart || extractPlantPart;
          const actual = caps.has("plant-part-extraction") ? fn(c.input) : null;
          push("plant-part-extraction", caps.has("plant-part-extraction") ? actual === c.expected.plantPart : null,
            actual, c.expected.plantPart);
        }
        if (c.expected?.farmerContext !== undefined) {
          const fn = run.farmerContext || extractFarmerContext;
          const actual = caps.has("farmer-context-extraction") ? fn(c.input) : null;
          const okNull = actual
            && Object.entries(c.expected.farmerContext).every(([k, v]) => (actual[k] ?? null) === v);
          push("farmer-context-extraction", caps.has("farmer-context-extraction") ? Boolean(okNull) : null,
            actual, c.expected.farmerContext);
        }
        if (c.expected?.needsClarification !== undefined && caps.has("clarification-selection")) {
          const d = await decideFn("clarification", { query: c.input, parsed }, []);
          push("clarification-selection", d.needsClarification === c.expected.needsClarification,
            d.needsClarification, c.expected.needsClarification);
        }
        // unknown-query-handling at answer level is scored in grounding.benchmark (needs answers).
        if (c.expected?.mustNotContain && caps.has("answer-generation")) {
          push("unknown-query-handling", null, "answer-generation not runnable for this arm", "no fabrication");
        }
      } else if (c.type === "rag") {
        // Each arm is scored with ITS OWN retrieval strategy (kb | rag | kb+rag),
        // not a hardcoded one — otherwise arms C/D/E would measure the same thing.
        if (caps.has("kb-retrieval") && typeof run.retrieve === "function") {
          const ids = run.retrieve(c.input, Math.max(c.expected.minTopK || 5, 5));
          const hit = c.expected.recordIds.every((id) => ids.includes(id));
          push("kb-retrieval", hit, ids.slice(0, 5), c.expected.recordIds);
        }
      } else if (c.type === "decision") {
        if (caps.has("clarification-selection")) {
          const d = await decideFn(c.task, c.state, c.candidates || []);
          let ok = null;
          let actual = null;
          if (c.task === "clarification") {
            ok = d.needsClarification === c.expected.needsClarification;
            actual = d.needsClarification;
          } else if (c.task === "intent_classification") {
            ok = d.decision.intent === c.expected.intent;
            actual = d.decision.intent;
          } else if (c.task === "candidate_selection") {
            const sel = d.decision.selected?.id ?? d.decision.selected;
            ok = sel === c.expected.selectedId;
            actual = sel;
          }
          push("clarification-selection", ok, actual, c.expected);
        }
      } else if (c.type === "safety") {
        push("safety", null, "shared ResponseValidator layer — scored in grounding.benchmark.test.js", c.expected.verdict);
      }
    } catch (e) {
      rows.push({ arm: armDef.id, caseId: c.id, language: c.language, type: c.type, task: "error", ok: null, error: String(e?.message || e) });
    }
    lat.push(performance.now() - t0);
  }

  return { arm: armDef.id, rows, latencyMs: latencyStats(lat) };
}

/** Aggregate rows for one arm into task / language breakdowns. */
export function summarizeArm(result) {
  const byTask = {};
  for (const r of result.rows) (byTask[r.task] = byTask[r.task] || []).push(r);
  return {
    arm: result.arm,
    latencyMs: result.latencyMs,
    overall: passRate(result.rows),
    byTask: Object.fromEntries(Object.entries(byTask).map(([k, v]) => [k, passRate(v)])),
    byLanguage: groupPassRate(result.rows, (r) => r.language),
    failures: result.rows.filter((r) => r.ok === false).map((r) => `${r.caseId}:${r.task}`),
  };
}

export { identifyLanguage, agriculturalNlp };
