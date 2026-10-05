/**
 * Phase 3C probe: template grounding + validator verdict per bypass template.
 * Read-only measurement (temp file, deleted after use). Not a real test.
 */
import "fake-indexeddb/auto";
import { it } from "vitest";
import { answerFreeText } from "./IndexedDBChatbotEngine.js";
import { seedAgriculturalData } from "../db/seedingService.js";
import { dbClear } from "../db/indexedDb.js";
import { DB_STORES } from "../db/schemas.js";
import {
  validateResponse,
  classifyRecommendationType,
  extractHighRiskClaims,
} from "./ResponseValidator.js";

it("probe", async () => {
  await dbClear(DB_STORES.crops);
  await dbClear(DB_STORES.symptoms);
  await dbClear(DB_STORES.diseasePests);
  await dbClear(DB_STORES.treatments);
  await dbClear(DB_STORES.edges);
  await dbClear(DB_STORES.meta);
  await seedAgriculturalData();

  const PROBES = [
    ["greeting/help/about", "hello"],
    ["fertilizer", "how much urea for paddy"],
    ["scheme", "PM Kisan yojana eligibility"],
    ["weather", "will it rain during monsoon"],
    ["price", "today onion price in mandi"],
    ["cultivation", "how to grow tomato"],
    ["comprehensive-disease (unlisted path)", "tomato leaves have brown spots"],
  ];

  const collectRecords = (r) => {
    const out = [];
    const walk = (o, d = 0) => {
      if (!o || d > 3) return;
      if (Array.isArray(o)) return o.forEach((x) => walk(x, d + 1));
      if (typeof o === "object") {
        if (o.id || o.name) out.push(o);
        for (const v of Object.values(o)) walk(v, d + 1);
      }
    };
    walk(r?.localResult?.data);
    walk(r?.data);
    return out;
  };

  const rows = [];
  for (const [label, q] of PROBES) {
    const r = await answerFreeText(q, {});
    const text = String(r?.response || "");
    const recs = collectRecords(r);
    const v = validateResponse({
      answer: text,
      source: "local-knowledge-base",
      confidence: r?.confidence,
      records: recs,
      evidence: [],
      parsed: {},
      intent: r?.type,
    });
    rows.push({
      label,
      type: r?.type,
      conf: r?.confidence,
      recType: classifyRecommendationType(text),
      highRiskClaims: extractHighRiskClaims(text),
      evidenceRecords: recs.length,
      verdict: v.verdict,
      reasons: v.reasons,
    });
  }

  console.log("PROBE_RESULT " + JSON.stringify(rows, null, 1));
}, 300000);
