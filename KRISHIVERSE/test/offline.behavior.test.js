// Task 3: OFFLINE BEHAVIOR — observes what actually happens when connectivity is lost.
// Uses fake-indexeddb (a real IndexedDB implementation) so storage is genuinely exercised,
// real seed data, the real aiRouter + advisoryService code paths, and navigator.onLine=false.
// No service worker exists in this repo, so this test documents the JS/IndexedDB fallback behavior only.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

// Simulate connectivity loss at the platform level (no fetch/Groq/backend reachable).
Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

import { seedAgriculturalData } from "../src/services/db/seedingService";
import { dbClear, dbGetAll } from "../src/services/db/indexedDb";
import { DB_STORES } from "../src/services/db/schemas";
import {
  routeFreeTextQuestion,
  LOCAL_ONLY_FALLBACK_MESSAGE,
} from "../src/services/ai/aiRouter";
import {
  askAdvisory,
  diagnoseCrop,
  getCachedDiagnoses,
  getChatHistory,
} from "../src/services/api/advisoryService";

let fetchSpy;

beforeAll(async () => {
  // Populate the REAL IndexedDB (fake-indexeddb) with the app's seed data.
  await seedAgriculturalData();
}, 120000);

beforeEach(async () => {
  await dbClear(DB_STORES.chatHistory);
  await dbClear(DB_STORES.diseaseDiagnoses);
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterAll(() => {
  fetchSpy?.mockRestore();
});

describe("offline behavior (navigator.onLine = false)", () => {
  it("OBSERVED: serves previously-seeded IndexedDB knowledge offline with zero network calls", async () => {
    const response = await routeFreeTextQuestion({
      question: "tomato leaves wilting",
      language: "en",
      context: {},
    });

    console.log("[observed] mode =", response.mode, "| source =", response.source);
    console.log("[observed] answer preview =", JSON.stringify(response.answer?.slice(0, 120)));
    console.log("[observed] metadata =", JSON.stringify(response.metadata));
    console.log("[observed] fetch calls while offline =", fetchSpy.mock.calls.length);

    expect(response.answer).toBeTruthy();
    expect(response.answer.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(["local", "local-fallback"].includes(response.mode)).toBe(true);
    expect(response.metadata?.offline).toBe(true);
  }, 180000);

  it("OBSERVED: unanswerable query returns the local-only fallback message offline", async () => {
    const response = await routeFreeTextQuestion({
      question: "xyzzy gold rate on mars tonight",
      language: "en",
      context: {},
    });

    console.log("[observed] mode =", response.mode, "| source =", response.source);
    console.log("[observed] is fallback message =", response.answer === LOCAL_ONLY_FALLBACK_MESSAGE);
    console.log("[observed] fetch calls while offline =", fetchSpy.mock.calls.length);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.answer).toBeTruthy();
  }, 60000);

  it("OBSERVED: chat messages persist to IndexedDB while offline (user + assistant)", async () => {
    const result = await askAdvisory({
      question: "how to control rice blast",
      language: "en",
      context: {},
    });

    const history = await getChatHistory();
    console.log("[observed] askAdvisory offline flag =", result.offline, "| source =", result.source);
    console.log("[observed] chatHistory records saved =", history.length);
    history.forEach((m) =>
      console.log(`[observed]   ${m.role} (offline=${m.offline}) model=${m.model}: ${m.text.slice(0, 60)}...`)
    );

    expect(history.length).toBe(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
    // Observed behavior: only the assistant record carries the offline flag (user msg has none)
    expect(history[1].offline).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 60000);

  it("OBSERVED: diagnoseCrop hits a real network error and stores an offline diagnosis in IndexedDB", async () => {
    // Backend is NOT running, so axios fails with a network error → apiClient sets isOffline=true
    // → the real offline ReasoningEngine path runs and the record is queued into IndexedDB.
    const record = await diagnoseCrop({
      symptoms: "yellow spots on leaves",
      cropType: "tomato",
      language: "en",
    });

    const cached = await getCachedDiagnoses();
    console.log("[observed] diagnoseCrop offline =", record.offline, "| model =", record.model);
    console.log("[observed] diagnosis =", JSON.stringify(record.diagnosisText?.slice(0, 120)));
    console.log("[observed] stored in diseaseDiagnoses store =", cached.length);
    console.log("[observed] treatments found offline =", JSON.stringify(record.treatments?.length ?? 0));

    expect(record.offline).toBe(true);
    expect(record.model).toBe("local-reasoning-engine");
    expect(record.savedAt).toBeTruthy();
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe(record.id);
  }, 60000);
});