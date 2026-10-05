/**
 * decisionEngine.test.js — Phase 19 coverage for the Laya decision layer.
 *
 * Safety invariants under test:
 *  - Laya can never verify records / create provenance / authorize dosage.
 *  - Offline → Laya is never called; local engine answers.
 *  - Malformed / timeout / invalid-task responses fall back silently.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import DecisionEngine, {
  shouldInvokeLaya,
  isAmbiguousQuery,
} from "./DecisionEngine";
import LocalDecisionEngine from "./LocalDecisionEngine";
import LayaDecisionEngine from "./LayaDecisionEngine";
import { validateDecisionRequest, normalizeDecision } from "./decisionSchemas";
import { validateResponse } from "../ResponseValidator";
import { resetConnectivityCache } from "../connectivity";

const realOnLine = navigator.onLine;
function setNavigatorOnline(value) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

beforeEach(() => {
  resetConnectivityCache();
  setNavigatorOnline(true);
  vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "false");
});

afterEach(() => {
  resetConnectivityCache();
  setNavigatorOnline(realOnLine);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("decisionSchemas", () => {
  it("rejects arbitrary tasks", () => {
    expect(() => validateDecisionRequest({ task: "free_chat" })).toThrow();
    expect(() => validateDecisionRequest({ task: "generate_answer" })).toThrow();
  });
  it("normalizes and drops raw Laya fields", () => {
    const d = normalizeDecision({
      task: "intent_classification",
      decision: { intent: "disease" },
      confidence: 0.9,
      engine: "laya",
      rawLogits: [1, 2, 3],
      verified: true,
    });
    expect(d.task).toBe("intent_classification");
    expect(d).not.toHaveProperty("rawLogits");
    expect(d).not.toHaveProperty("verified");
  });
  it("clamps confidence to 0..1", () => {
    expect(normalizeDecision({ task: "clarification", decision: {}, confidence: 5, engine: "t" }).confidence).toBe(1);
    expect(normalizeDecision({ task: "clarification", decision: {}, confidence: -2, engine: "t" }).confidence).toBe(0);
  });
});

describe("LocalDecisionEngine (offline-first)", () => {
  it("classifies a clear disease query without clarification", async () => {
    const d = await LocalDecisionEngine.decide({
      task: "intent_classification",
      state: { query: "tomato yellow spots on leaves" },
    });
    expect(d.engine).toBe("local");
    expect(d.decision.intent).toBe("disease");
  });
  it("asks for clarification when evidence is insufficient", async () => {
    const d = await LocalDecisionEngine.decide({
      task: "clarification",
      state: { query: "something is wrong with my crop" },
    });
    expect(d.needsClarification).toBe(true);
    expect(d.clarification?.question).toBeTruthy();
  });
  it("selects a valid candidate and drops invalid/duplicate/empty", async () => {
    const d = await LocalDecisionEngine.decide({
      task: "candidate_selection",
      state: { query: "tomato yellow leaves" },
      candidates: [null, { id: "a", name: "Early blight" }, { id: "a", name: "Early blight" }, undefined],
      evidence: [],
    });
    expect(d.decision.selected).toEqual({ id: "a", name: "Early blight" });
    expect(d.decision.ranked).toHaveLength(1);
  });
  it("returns empty-selection with clarification for empty candidates", async () => {
    const d = await LocalDecisionEngine.decide({
      task: "candidate_selection",
      state: { query: "tomato" },
      candidates: [],
    });
    expect(d.decision.selected).toBeNull();
    expect(d.confidence).toBe(0);
  });
  it("rejects invalid tasks", async () => {
    await expect(LocalDecisionEngine.decide({ task: "free_chat", state: {} })).rejects.toThrow();
  });
});

describe("invocation rules (Phase 6)", () => {
  it("never invokes Laya for greeting/help/about", () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    for (const q of ["hello", "help", "what can you do?", "வணக்கம்"]) {
      expect(shouldInvokeLaya({ task: "intent_classification", question: q, state: { query: q } })).toBe(false);
    }
  });
  it("treats what-is/treatment with a crop as non-ambiguous", () => {
    expect(isAmbiguousQuery("What is rice blast?", { parsed: { intent: "what_is", crop: "rice" } })).toBe(false);
    expect(isAmbiguousQuery("What is rice blast?", { parsed: { intent: "what_is", crop: null } })).toBe(true);
  });
  it("never invokes Laya for simple queries", () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    for (const q of ["What is rice?", "What is tomato?", "When is paddy harvested?", "What is drip irrigation?"]) {
      expect(isAmbiguousQuery(q)).toBe(false);
      expect(shouldInvokeLaya({ task: "intent_classification", question: q, state: { query: q } })).toBe(false);
    }
  });
  it("flags ambiguous intent for Laya when enabled + online", () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    expect(shouldInvokeLaya({ task: "intent_classification", question: "leaves look bad, what to do?", state: {} })).toBe(true);
  });
  it("never invokes Laya when flag is off", () => {
    expect(shouldInvokeLaya({ task: "intent_classification", question: "leaves look bad, what to do?", state: {} })).toBe(false);
  });
  it("never invokes Laya when offline", () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    setNavigatorOnline(false);
    expect(shouldInvokeLaya({ task: "intent_classification", question: "leaves look bad, what to do?", state: {} })).toBe(false);
  });
  it("Tamil/Tanglish queries parse without a second language detector", async () => {
    const d = await LocalDecisionEngine.decide({
      task: "intent_classification",
      state: { query: "தக்காளி இலைகளில் brown spots இருக்கு" },
    });
    expect(d.decision.crop).toBe("tomato");
  });
});

describe("engine transparency (no false AI impression)", () => {
  it("preserves the backend real-engine label (laya-multilingual)", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({
        task: "intent_classification",
        decision: { intent: "disease" },
        confidence: 0.78,
        needsClarification: false,
        clarification: null,
        engine: "laya-multilingual",
      }),
    }));
    const d = await LayaDecisionEngine.decide(
      { task: "intent_classification", state: { query: "ambiguous crop problem thing" } },
      { fetcher: fetchMock },
    );
    expect(d.engine).toBe("laya-multilingual");
    expect(d.decision.intent).toBe("disease");
  });
  it("falls back to generic label when backend engine tag is missing", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ task: "clarification", decision: {}, needsClarification: true }),
    }));
    const d = await LayaDecisionEngine.decide(
      { task: "clarification", state: { query: "help" } },
      { fetcher: fetchMock },
    );
    expect(d.engine).toBe("laya");
  });
  it("DecisionEngine surfaces the preserved engine name", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    vi.spyOn(LayaDecisionEngine, "decide").mockResolvedValueOnce({
      version: "laya-decision-v1",
      task: "intent_classification",
      decision: { intent: "disease" },
      confidence: 0.9,
      needsClarification: false,
      clarification: null,
      engine: "laya-multilingual",
    });
    const d = await DecisionEngine.decide({
      task: "intent_classification",
      state: { query: "my crop leaves look bad, what is it?" },
      question: "my crop leaves look bad, what is it?",
    });
    expect(d.engine).toBe("laya-multilingual");
    expect(d.fallback).toBe(false);
  });
});

describe("DecisionEngine fallback (Phase 10)", () => {  it("falls back to local when Laya times out", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    vi.spyOn(LayaDecisionEngine, "decide").mockRejectedValueOnce(new Error("Laya request timed out"));
    const d = await DecisionEngine.decide({
      task: "intent_classification",
      state: { query: "my crop leaves look bad, what is it?" },
      question: "my crop leaves look bad, what is it?",
    });
    expect(d.engine).toBe("local");
    expect(d.task).toBe("intent_classification");
  });
  it("falls back to local on malformed Laya response", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    vi.spyOn(LayaDecisionEngine, "decide").mockRejectedValueOnce(new Error("Malformed Laya response"));
    const d = await DecisionEngine.decide({
      task: "clarification",
      state: { query: "something strange on my plants" },
      question: "something strange on my plants",
    });
    expect(d.engine).toBe("local");
  });
  it("uses local directly when offline without calling Laya", async () => {
    vi.stubEnv("VITE_ENABLE_LAYA_DECISIONS", "true");
    setNavigatorOnline(false);
    const spy = vi.spyOn(LayaDecisionEngine, "decide");
    const d = await DecisionEngine.decide({
      task: "intent_classification",
      state: { query: "tomato yellow leaves" },
      question: "tomato yellow leaves",
    });
    expect(spy).not.toHaveBeenCalled();
    expect(d.engine).toBe("local");
  });
});

describe("safety: Laya cannot bypass ResponseValidator (Phase 12)", () => {
  it("a high Laya-style confidence never verifies an unsourced dosage", () => {
    const v = validateResponse({
      answer: "Spray 2.5ml per litre of pesticide every 7 days before harvest.",
      source: "laya",
      confidence: 0.99,
      records: [],
      evidence: [],
      parsed: { crop: "tomato" },
      intent: "disease",
    });
    expect(v.verdict).toBe("blocked");
  });
});
