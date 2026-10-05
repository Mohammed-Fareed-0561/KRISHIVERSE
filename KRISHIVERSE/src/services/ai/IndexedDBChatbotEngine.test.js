/**
 * IndexedDBChatbotEngine.test.js — Phase 2 routing + treatment localization.
 *
 * - greeting/help reach the shared capabilities (about) response
 * - treatment/what_is fall through to KB search (no template trap)
 * - treatmentMethod() serves curated method_ta/method_hi with EN fallback
 * - Tamil treatment rendering uses curated text (facts unchanged)
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";
import { answerFreeText, treatmentMethod } from "./IndexedDBChatbotEngine.js";
import { seedAgriculturalData } from "../db/seedingService.js";
import { dbClear } from "../db/indexedDb.js";
import { DB_STORES } from "../db/schemas.js";

beforeAll(async () => {
  await dbClear(DB_STORES.crops);
  await dbClear(DB_STORES.symptoms);
  await dbClear(DB_STORES.diseasePests);
  await dbClear(DB_STORES.treatments);
  await dbClear(DB_STORES.edges);
  await dbClear(DB_STORES.meta);
  await seedAgriculturalData();
}, 120000);

describe("chatbot routing (Phase 2 intents)", () => {
  it("routes help requests to the capabilities response, not scheme", async () => {
    for (const q of ["help", "how can you help me?", "உதவி", "मदद"]) {
      const r = await answerFreeText(q, {});
      expect(r.type).toBe("about");
      expect(r.response).toContain("What I Can Do");
    }
  }, 90000);

  it("routes greetings to the capabilities response", async () => {
    for (const q of ["hello", "வணக்கம்", "नमस्ते"]) {
      const r = await answerFreeText(q, {});
      expect(r.type).toBe("about");
    }
  });

  it("lets what-is queries fall through to KB search", async () => {
    const r = await answerFreeText("What is rice blast?", {});
    expect(["disease_info", "crop_info", "fallback", "no_match"]).toContain(r.type);
    expect(r.type).not.toBe("about");
  });

  it("renders Tamil treatment text from curated method_ta", async () => {
    const r = await answerFreeText("தக்காளி கருகல் நோய்", { language: "ta" });
    expect(r.type).toBe("disease_info");
    expect(r.response).toContain("வேப்பிலை");
  });
});

describe("template grounding (Phase 3C)", () => {
  it("about response makes no verified-data claim", async () => {
    const r = await answerFreeText("help", {});
    expect(r.type).toBe("about");
    expect(r.response).not.toMatch(/verified agricultural data/i);
  });

  it("fertilizer response carries a soil-test/KVK pointer (static dose is validator-gated downstream)", async () => {
    const r = await answerFreeText("how much urea for paddy", {});
    expect(r.type).toBe("fertilizer_info");
    expect(r.response).toMatch(/soil test|KVK|1800-180-1551/i);
  });

  it("scheme response grounds to official source links", async () => {
    const r = await answerFreeText("PM Kisan yojana eligibility", {});
    expect(r.type).toBe("scheme_info");
    expect(r.response).toMatch(/pmkisan\.gov\.in|agricoop/i);
  });

  it("weather response points to live sources and carries no dosage", async () => {
    const r = await answerFreeText("will it rain during monsoon", {});
    expect(r.type).toBe("weather_advice");
    expect(r.response).toMatch(/imd\.gov\.in|Weather tab/i);
    expect(r.response).not.toMatch(/\d+\s*(kg|g|ml|litre|acre)/i);
  });

  it("price response never invents live prices", async () => {
    const r = await answerFreeText("today onion price in mandi", {});
    expect(r.type).toBe("price_info");
    expect(r.response).toMatch(/agmarknet/i);
    expect(r.response).not.toMatch(/₹[\d,]+/);
  });

  it("cultivation response grounds crop facts from the KB record", async () => {
    const r = await answerFreeText("how to grow tomato", {});
    expect(r.type).toBe("cultivation_info");
    expect(r.response).toMatch(/tomato/i);
  });
});

describe("treatmentMethod", () => {
  const rec = {
    method: "Spray 10% Neem leaf extract.",
    method_ta: "10% வேப்பிலை சாற்றைத் தெளிக்கவும்.",
    method_hi: "10% नीम के पत्तों के अर्क का छिड़काव करें।",
  };
  it("serves curated Tamil/Hindi text when available", () => {
    expect(treatmentMethod(rec, "ta")).toBe(rec.method_ta);
    expect(treatmentMethod(rec, "hi")).toBe(rec.method_hi);
  });
  it("falls back to English precedence otherwise", () => {
    expect(treatmentMethod(rec, "en")).toBe(rec.method);
    expect(treatmentMethod({ method: "X" }, "ta")).toBe("X");
    expect(treatmentMethod("plain string", "ta")).toBe("plain string");
    expect(treatmentMethod(null, "ta")).toBe("");
  });
});
