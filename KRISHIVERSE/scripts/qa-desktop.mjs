// Automated desktop browser QA for the KrishiVerse QA checklist (phone checklist, desktop equivalent).
// Driven entirely by the script — no manual interaction.
//
// Covers docs/testing/QA_PHONE_CHECKLIST.md steps (a)-(e):
//   (a) PWA installability prerequisites (manifest + SW + icons)
//   (b) Airplane-mode equivalent (Playwright context offline)
//   (c) On-device crop diagnosis while offline (known test image)
//   (d) Chatbot offline (WebGPU / Qwen2.5 availability, honest true/false)
//   (e) IndexedDB persistence (diseaseDiagnoses + chatHistory stores)
//
// Usage:
//   npm run build
//   npm run preview -- --port 4173   (must be running first)
//   node scripts/qa-desktop.mjs
//
// Env:
//   QA_BASE_URL  default http://localhost:4173
//   QA_IMAGE     override test image path
//   QA_HEADLESS  "0" for headed, default "1" (headless)
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE_URL || "http://localhost:4173";
const DEFAULT_IMAGE = path.resolve(
  __dirname, "..", "..", "backend", "eval", "dataset", "Tomato___Late_blight", "img1.jpg"
);
const IMAGE = process.env.QA_IMAGE || DEFAULT_IMAGE;
const EXPECTED_LABEL = "Tomato Late Blight";
const HEADLESS = process.env.QA_HEADLESS !== "0";

const evidence = {};
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}
function info(label, value) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  console.log(`[evidence] ${label}: ${String(s).slice(0, 2000)}`);
  evidence[label] = value;
}

async function pollEvaluate(page, fnSource, { timeoutMs = 60000, intervalMs = 1500, label = "poll" } = {}) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await page.evaluate(new Function(`return (${fnSource})()`));
      if (last) {
        console.log(`[${label}] satisfied after ${Date.now() - start}ms`);
        return last;
      }
    } catch (e) {
      console.log(`[${label}] probe error: ${String(e?.message || e).slice(0, 140)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(`[${label}] TIMEOUT after ${timeoutMs}ms (last=${JSON.stringify(last)?.slice(0, 200)})`);
  return null;
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

// ── preflight ────────────────────────────────────────────────────────────────
if (!fs.existsSync(IMAGE)) {
  console.error(`FATAL: test image not found: ${IMAGE}`);
  process.exit(2);
}
console.log(`BASE = ${BASE}`);
console.log(`IMAGE = ${IMAGE} (${fs.statSync(IMAGE).size} bytes)`);
console.log(`EXPECTED = "${EXPECTED_LABEL}"`);
console.log(`HEADLESS = ${HEADLESS}`);

// Confirm preview server is up before launching the browser.
let previewOk = false;
for (let i = 0; i < 15; i++) {
  try {
    const r = await fetch(BASE + "/");
    if (r.ok) { previewOk = true; break; }
    console.log(`preview probe ${i}: HTTP ${r.status}, retrying...`);
  } catch (e) {
    console.log(`preview probe ${i}: ${String(e.message).slice(0, 100)}, retrying...`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
if (!previewOk) {
  console.error(`FATAL: preview server not reachable at ${BASE}. Run: npm run build + npm run preview -- --port 4173`);
  process.exit(2);
}
console.log("preview server confirmed running.");

// ── launch ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: HEADLESS,
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
// Router/model trace: collected from console so the (d) verdict never relies
// on eyeballing logs — the summary prints these verbatim.
const aiRouterLogs = [];
const onDeviceLogs = [];
page.on("console", (m) => {
  const text = m.text();
  console.log(`[console.${m.type()}]`, text.slice(0, 220));
  if (text.includes("[aiRouter]")) aiRouterLogs.push(text.slice(0, 300));
  if (text.includes("[onDeviceChat]")) onDeviceLogs.push(text.slice(0, 300));
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e.message).slice(0, 220)));

// Reads the latest assistant chatHistory record (written by askAdvisory) and
// reports its provenance fields: model / router source / offline flag /
// validator verdict. A genuine Qwen2.5/WebLLM answer carries model
// "Qwen2.5-…-MLC" (source "ondevice-llm"); the safety fallback carries model
// "local-router" (source "local-fallback", no validation field — Step 4 of
// aiRouter drops the verdict, the block is only visible in aiRouterLogs).
async function probeChatSource() {
  return page.evaluate(async () => {
    try {
      const openDb = (name) => new Promise((res, rej) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      let db = null;
      let dbUsed = null;
      for (const name of ["KrishiVerse", "krishiverse"]) {
        try { db = await openDb(name); dbUsed = name; break; } catch {}
      }
      if (!db) return { error: "no DB" };
      if (!db.objectStoreNames.contains("chatHistory")) {
        try { db.close(); } catch {}
        return { error: "no chatHistory store" };
      }
      const rows = await new Promise((res, rej) => {
        const rq = db.transaction("chatHistory", "readonly").objectStore("chatHistory").getAll();
        rq.onsuccess = () => res(rq.result || []);
        rq.onerror = () => rej(rq.error);
      });
      try { db.close(); } catch {}
      const assistants = rows.filter((r) => r.role === "assistant").sort((a, b) => a.timestamp - b.timestamp);
      const last = assistants[assistants.length - 1];
      if (!last) return { dbUsed, count: rows.length, error: "no assistant record" };
      return {
        dbUsed,
        count: rows.length,
        model: last.model || null,
        router: last.router || null,
        offline: last.offline ?? null,
        confidence: last.confidence ?? null,
        validationVerdict: last.validation?.verdict ?? null,
        validationReasons: last.validation?.reasons ?? null,
        textHead: String(last.text || "").slice(0, 120),
        ts: last.timestamp,
      };
    } catch (e) {
      return { error: String(e.message || e).slice(0, 140) };
    }
  }).catch((e) => ({ error: "evaluate failed: " + String(e.message).slice(0, 100) }));
}

try {
  // ══ Step 1: launch + navigate (online first, so SW can install) ══
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  info("landing_url", page.url());
  info("landing_title", await page.title().catch(() => ""));

  // ══ Step 2: service worker reaches "activated" (poll, no fixed wait) ══
  const swState = await pollEvaluate(page, `async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return null;
      const sw = reg.active || reg.waiting || reg.installing;
      if (!sw) return null;
      if (sw.state === 'activated') return { state: sw.state, scope: reg.scope, hasController: !!navigator.serviceWorker.controller };
      return null;
    } catch { return null; }
  }`, { timeoutMs: 90000, intervalMs: 1500, label: "sw-activated" });
  info("sw_state", swState);
  check("SW registers and reaches activated", !!swState, swState ? `${swState.state} scope=${swState.scope} controller=${swState.hasController}` : "no activated SW observed");

  // (a) PWA installability prerequisites on desktop
  const pwaInfo = await page.evaluate(async () => {
    const out = {};
    try {
      const r = await fetch("/manifest.webmanifest");
      out.manifestWebmanifest = r.ok ? "ok" : `http-${r.status}`;
    } catch (e) { out.manifestWebmanifest = "fetch-failed:" + String(e.message).slice(0, 60); }
    try {
      const r2 = await fetch("/manifest.json");
      out.manifestJson = r2.ok ? "ok" : `http-${r2.status}`;
    } catch (e) { out.manifestJson = "fetch-failed:" + String(e.message).slice(0, 60); }
    out.manifestLink = !!document.querySelector('link[rel="manifest"]');
    out.themeColor = !!document.querySelector('meta[name="theme-color"]');
    try {
      const m = out.manifestWebmanifest === "ok"
        ? await (await fetch("/manifest.webmanifest")).json()
        : out.manifestJson === "ok" ? await (await fetch("/manifest.json")).json() : null;
      out.manifestName = m ? (m.name || m.short_name || null) : null;
      out.manifestDisplay = m ? (m.display || null) : null;
      out.manifestIcons = m && Array.isArray(m.icons) ? m.icons.length : 0;
      out.manifestStartUrl = m ? (m.start_url || null) : null;
    } catch { out.manifestName = null; }
    return out;
  }).catch((e) => ({ error: String(e.message).slice(0, 120) }));
  info("pwa_manifest", pwaInfo);
  const stepA_ok = !!swState && (pwaInfo.manifestWebmanifest === "ok" || pwaInfo.manifestJson === "ok") && (pwaInfo.manifestIcons || 0) > 0;
  check("(a) PWA installable (desktop proxy: manifest+SW+icons)", stepA_ok,
    `manifest=${pwaInfo.manifestWebmanifest}/${pwaInfo.manifestJson} icons=${pwaInfo.manifestIcons} sw=${swState ? swState.state : "none"}`);

  // ══ Step 3: fully offline via CDP-equivalent ══
  await context.setOffline(true);
  const offlineFlag = await page.evaluate(() => ({ onLine: navigator.onLine })).catch(() => ({}));
  info("offline_flag", offlineFlag);
  check("(b) Airplane-mode equivalent (context offline)", offlineFlag.onLine === false, `navigator.onLine=${offlineFlag.onLine}`);

  // ══ Step 4: Diagnose page offline, upload known image ══
  const offlineRequests = [];
  const offlineResponses = [];
  page.on("request", (req) => {
    offlineRequests.push({ url: req.url(), method: req.method(), type: req.resourceType() });
  });
  page.on("response", (res) => {
    let fromSW = null;
    try { fromSW = res.fromServiceWorker(); } catch { fromSW = null; }
    offlineResponses.push({ url: res.url().slice(0, 140), status: res.status(), fromServiceWorker: fromSW });
  });
  page.on("requestfailed", (req) => {
    console.log(`[net-failed] ${req.method()} ${req.url().slice(0, 140)} :: ${req.failure()?.errorText || ""}`);
  });

  await page.goto(BASE + "/diagnose", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  info("diagnose_url", page.url());
  const fileInputCount = await page.locator('input[type="file"]').count();
  info("diagnose_file_inputs", fileInputCount);
  if (fileInputCount === 0) {
    check("(c) Offline diagnosis returns result", false, "no input[type=file] found on /diagnose");
  } else {
    offlineRequests.length = 0; // count only from the diagnosis interaction onward
    offlineResponses.length = 0;
    await page.locator('input[type="file"]').first().setInputFiles(IMAGE);
    console.log("[diag] image uploaded, waiting for preview/diagnose button...");
    let diagBtn = null;
    try {
      await page.getByRole("button", { name: /diagnose disease/i }).waitFor({ timeout: 20000 });
      diagBtn = "found";
    } catch {
      diagBtn = "NOT-FOUND";
    }
    info("diagnose_button", diagBtn);
    const diagBtnCount = await page.getByRole("button", { name: /diagnose disease/i }).count().catch(() => 0);
    console.log(`[diag] diagnose buttons: ${diagBtnCount}, offline requests so far: ${offlineRequests.length}`);

    let diagResultText = "";
    let diagH2 = "";
    let diagCrop = "";
    let diagConfidence = null;
    if (diagBtn === "found") {
      await page.getByRole("button", { name: /diagnose disease/i }).first().click();
      console.log("[diag] clicked Diagnose, polling for h2 result...");
      const found = await pollEvaluate(page, `() => {
        const h2 = document.querySelector('h2');
        const t = h2 && h2.textContent.trim();
        return (t && t.length > 1) ? t : null;
      }`, { timeoutMs: 180000, intervalMs: 2000, label: "diag-result" });
      diagH2 = found || "";
      // The result card renders <h2>{name}</h2><p>{crop}</p> — e.g. h2 "Late
      // Blight" + crop "Tomato". The expected label must match name+crop, not
      // h2 alone (h2 alone is ambiguous across crops).
      diagCrop = await page.evaluate(() => {
        const h2 = document.querySelector("h2");
        if (!h2) return "";
        const p = h2.nextElementSibling && h2.nextElementSibling.tagName === "P"
          ? h2.nextElementSibling
          : h2.parentElement ? h2.parentElement.querySelector("p") : null;
        return (p ? p.textContent : "").trim();
      }).catch(() => "");
      const bodyInfo = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : "";
        const m = body.match(/(?:^|\s)(\d{1,3})%(?:\s|$)/);
        return { tail: body.slice(-600).replace(/\n+/g, " | "), conf: m ? m[1] + "%" : null, len: body.length };
      }).catch(() => ({ tail: "", conf: null, len: 0 }));
      diagConfidence = bodyInfo.conf;
      diagResultText = bodyInfo.tail;
      info("diagnosis_h2", diagH2);
      info("diagnosis_crop", diagCrop);
      info("diagnosis_confidence", diagConfidence);
      info("diagnosis_body_tail", diagResultText);
      await page.screenshot({ path: "qa-desktop-diag.png" }).catch(() => {});
    } else {
      await page.screenshot({ path: "qa-desktop-diag-nobtn.png" }).catch(() => {});
    }

    const normH2 = normalize((diagH2 || "") + " " + (diagCrop || ""));
    const normExp = normalize(EXPECTED_LABEL);
    const expTokens = normExp.split(" ").filter(Boolean);
    const labelMatch = diagH2 && expTokens.every((t) => normH2.includes(t));
    // Honest comparison: the app is allowed to return "Unable to verify" when the
    // on-device model is unavailable — that is NOT a match for the expected label.
    info("diagnosis_expected", EXPECTED_LABEL);
    info("diagnosis_label_match", labelMatch ? "MATCH" : "MISMATCH");
    check("(c) Offline diagnosis returns result", !!diagH2, `h2="${diagH2}" crop="${diagCrop || "?"}" conf=${diagConfidence || "?"}`);
    check("(c) Diagnosis matches expected label", !!labelMatch, `expected="${EXPECTED_LABEL}" got="${diagH2}${diagCrop ? " / " + diagCrop : ""}"`);
  }

  // ══ Step 5: network request count while offline ══
  // NOTE (measurement correction): Playwright "request" events fire even when
  // the Service Worker fulfils the request from precache/runtime cache with
  // zero network traffic. The genuine-offline criterion is therefore measured
  // on RESPONSES: swServed (fromServiceWorker=true) vs realNetwork
  // (a response that actually came over the wire). blob:/data: URLs never
  // touch the network and are excluded from the network count.
  const diagNetCount = offlineRequests.length;
  const diagNetSample = offlineRequests.slice(0, 15).map((r) => `${r.method} ${r.url.slice(0, 120)}`);
  const swServed = offlineResponses.filter((r) => r.fromServiceWorker === true);
  const realNetwork = offlineResponses.filter((r) =>
    r.fromServiceWorker === false && /^https?:/.test(r.url) && r.status !== 0);
  const failedNoResponse = diagNetCount - offlineResponses.length;
  info("offline_request_count_during_diagnosis", diagNetCount);
  info("offline_request_sample", diagNetSample);
  info("offline_sw_served_count", swServed.length);
  info("offline_sw_served_sample", swServed.slice(0, 10).map((r) => `${r.status} ${r.url.slice(0, 100)}`));
  info("offline_real_network_count", realNetwork.length);
  info("offline_real_network_sample", realNetwork.map((r) => `${r.status} ${r.url.slice(0, 120)}`));
  info("offline_failed_no_response", failedNoResponse);
  check("(c) Zero network requests during offline diagnosis", realNetwork.length === 0,
    `${realNetwork.length} over-wire response(s); ${swServed.length} SW-cache served; ${failedNoResponse} failed w/o network (of ${diagNetCount} request events)`);

  // ══ Step 6: Ask/Chat page + WebGPU ══
  const webgpu = await page.evaluate(() => (typeof navigator !== "undefined" && typeof navigator.gpu !== "undefined")).catch(() => false);
  info("webgpu_available", webgpu);
  console.log(`[ask] WebGPU available = ${webgpu} (honest probe, not assumed)`);

  await page.goto(BASE + "/ask", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  info("ask_url", page.url());
  const askBoxCount = await page.locator('textarea[aria-label="Ask a farming question"]').count().catch(() => 0);
  info("ask_textarea_present", askBoxCount);

  let askResponseText = "";
  let askAnswered = false;
  const TEST_Q = "How do I treat tomato leaf curl?";
  if (webgpu) {
    // WebGPU present: submit the checklist question and capture the real reply.
    if (askBoxCount > 0) {
      const beforeLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
      await page.locator('textarea[aria-label="Ask a farming question"]').first().fill(TEST_Q);
      await page.getByRole("button", { name: /send message/i }).first().click().catch(async () => {
        await page.keyboard.press("Enter");
      });
      console.log("[ask] question submitted, polling for assistant reply...");
      const replyLen = await pollEvaluate(page, `() => {
        const wrap = document.querySelector('.space-y-4');
        if (!wrap) return null;
        const bubbles = [...wrap.querySelectorAll(':scope > div')];
        const assistant = bubbles.filter(b => !b.className.includes('self-end')).pop();
        if (!assistant) return null;
        const t = assistant.textContent || '';
        return t.length > 40 ? t.length : null;
      }`, { timeoutMs: 180000, intervalMs: 2500, label: "ask-reply" });
      if (replyLen) {
        askAnswered = true;
        askResponseText = await page.evaluate(() => {
          const wrap = document.querySelector('.space-y-4');
          const bubbles = [...wrap.querySelectorAll(':scope > div')];
          const assistant = bubbles.filter(b => !b.className.includes('self-end')).pop();
          return (assistant ? assistant.textContent : '').slice(0, 1500);
        }).catch(() => "");
      } else {
        askResponseText = await page.evaluate(() => document.body.innerText.slice(-800).replace(/\\n+/g, " | ")).catch(() => "");
      }
      info("ask_question", TEST_Q);
      info("ask_reply_chars", replyLen || 0);
      info("ask_reply_text", (askResponseText || "").slice(0, 1500));
      await page.screenshot({ path: "qa-desktop-ask.png" }).catch(() => {});
    } else {
      info("ask_question", "SKIPPED — textarea not found");
    }
    check("(d) WebGPU initialized without error", webgpu === true, `navigator.gpu present=${webgpu}`);
    // Provenance: Qwen2.5/WebLLM answers carry model "Qwen2.5-…-MLC"; the
    // validator fallback carries model "local-router". The verdict below is
    // driven by that stored metadata + router console trace — not by reply
    // length alone.
    const askSource = await probeChatSource();
    info("ask_source_detail", askSource);
    info("ask_router_logs", aiRouterLogs.length > 0 ? aiRouterLogs : "(no [aiRouter] lines captured)");
    info("ask_ondevice_logs", onDeviceLogs.length > 0 ? onDeviceLogs : "(no [onDeviceChat] lines captured)");
    const isQwen = /qwen|ondevice-llm|mlc/i.test(String(askSource?.model || "") + " " + String(askSource?.router || ""));
    const onDeviceBlocked = aiRouterLogs.some((l) => l.includes("on-device answer blocked"));
    const localBlocked = aiRouterLogs.some((l) => l.includes("local answer blocked"));
    check("(d) Qwen2.5 responded offline", isQwen,
      isQwen ? `model=${askSource.model} router=${askSource.router}`
        : `NOT Qwen — model=${askSource?.model ?? "?"} router=${askSource?.router ?? "?"} ` +
          `onDeviceBlocked=${onDeviceBlocked} localBlocked=${localBlocked} ` +
          `(Qwen multi-GB engine loads only when ready by design; see ask_router_logs)`);
  } else {
    // Honest N/A path per checklist note, plus one extra local-fallback probe for evidence.
    check("(d) WebGPU initialized without error", false, "navigator.gpu absent in this headless context — Not Supported on This Device (not a code bug)");
    let fallbackReply = "";
    if (askBoxCount > 0) {
      try {
        await page.locator('textarea[aria-label="Ask a farming question"]').first().fill(TEST_Q);
        await page.getByRole("button", { name: /send message/i }).first().click().catch(async () => {
          await page.keyboard.press("Enter");
        });
        const replyLen = await pollEvaluate(page, `() => {
          const wrap = document.querySelector('.space-y-4');
          if (!wrap) return null;
          const bubbles = [...wrap.querySelectorAll(':scope > div')];
          const assistant = bubbles.filter(b => !b.className.includes('self-end')).pop();
          if (!assistant) return null;
          const t = assistant.textContent || '';
          return t.length > 20 ? t.length : null;
        }`, { timeoutMs: 90000, intervalMs: 2500, label: "ask-fallback" });
        if (replyLen) {
          fallbackReply = await page.evaluate(() => {
            const wrap = document.querySelector('.space-y-4');
            const bubbles = [...wrap.querySelectorAll(':scope > div')];
            const assistant = bubbles.filter(b => !b.className.includes('self-end')).pop();
            return (assistant ? assistant.textContent : '').slice(0, 1500);
          }).catch(() => "");
        }
      } catch (e) {
        fallbackReply = "probe-error: " + String(e.message).slice(0, 120);
      }
      info("ask_fallback_reply_text", (fallbackReply || "").slice(0, 1500));
      const askSourceFb = await probeChatSource();
      info("ask_source_detail", askSourceFb);
      info("ask_router_logs", aiRouterLogs.length > 0 ? aiRouterLogs : "(no [aiRouter] lines captured)");
      await page.screenshot({ path: "qa-desktop-ask-fallback.png" }).catch(() => {});
    }
    check("(d) Qwen2.5 responded offline", false, "N/A — WebGPU unavailable, on-device LLM cannot run here; local-bot fallback reply captured separately");
  }

  // ══ Step 7: IndexedDB contents via page.evaluate ══
  const idbDump = await page.evaluate(async () => {
    const summarize = (rows, n = 3) => (rows || []).slice(-n).map((r) => {
      const s = JSON.stringify(r);
      return s.length > 500 ? s.slice(0, 500) + "…(truncated)" : s;
    });
    const out = { dbNames: [], dbUsed: null, version: null, stores: [], diag: null, chat: null, error: null };
    try {
      if (window.indexedDB && indexedDB.databases) {
        try { out.dbNames = (await indexedDB.databases()).map((d) => d.name); } catch {}
      }
      const candidates = [...new Set([...(out.dbNames || []), "KrishiVerse", "krishiverse"])];
      let db = null;
      for (const name of candidates) {
        try {
          db = await new Promise((res, rej) => {
            const req = indexedDB.open(name);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
          out.dbUsed = name;
          out.version = db.version;
          out.stores = [...db.objectStoreNames];
          break;
        } catch { /* try next */ }
      }
      if (!db) { out.error = "no IndexedDB database could be opened"; return out; }
      const getAll = (store) => new Promise((res, rej) => {
        try {
          const tx = db.transaction(store, "readonly");
          const rq = tx.objectStore(store).getAll();
          rq.onsuccess = () => res(rq.result || []);
          rq.onerror = () => rej(rq.error);
        } catch (e) { rej(e); }
      });
      for (const store of ["diseaseDiagnoses", "chatHistory"]) {
        if (!out.stores.includes(store)) continue;
        try {
          const rows = await getAll(store);
          const slot = store === "diseaseDiagnoses" ? "diag" : "chat";
          out[slot] = { count: rows.length, sample: summarize(rows, 3) };
        } catch (e) {
          const slot = store === "diseaseDiagnoses" ? "diag" : "chat";
          out[slot] = { count: -1, error: String(e.message || e).slice(0, 140) };
        }
      }
      try { db.close(); } catch {}
      return out;
    } catch (e) {
      out.error = String(e.message || e).slice(0, 200);
      return out;
    }
  }).catch((e) => ({ error: "evaluate failed: " + String(e.message).slice(0, 140) }));
  info("idb_dump", idbDump);
  const diagCount = idbDump?.diag?.count;
  const chatCount = idbDump?.chat?.count;
  check("(e) Diagnosis record persisted in IndexedDB", typeof diagCount === "number" && diagCount > 0,
    idbDump?.diag ? `${diagCount} record(s) in diseaseDiagnoses` : `store missing (${JSON.stringify(idbDump?.stores)})`);
  check("(e) Chat history persisted in IndexedDB", typeof chatCount === "number" && chatCount > 0,
    idbDump?.chat ? `${chatCount} record(s) in chatHistory` : `store missing (${JSON.stringify(idbDump?.stores)})`);

  // ══ Step 8: final summary matching checklist (a)-(e) ══
  console.log("\n════════════ QA CHECKLIST SUMMARY (desktop, automated) ════════════");
  const byStep = (prefix) => checks.filter((c) => c.name.startsWith(prefix));
  const stepVerdict = (prefix) => {
    const items = byStep(prefix);
    if (items.length === 0) return "NOT-TESTED";
    return items.every((i) => i.ok) ? "PASS" : "FAIL";
  };
  console.log(`(a) PWA install ............ ${stepVerdict("(a)")}`);
  console.log(`(b) Airplane mode .......... ${stepVerdict("(b)")}`);
  console.log(`(c) Offline diagnosis ...... ${stepVerdict("(c)")}`);
  console.log(`(d) Offline chatbot ........ ${stepVerdict("(d)")}`);
  console.log(`(e) IndexedDB persistence .. ${stepVerdict("(e)")}`);
  console.log("──────────────────────────────────────────────────────────────────");
  for (const c of checks) console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name} :: ${c.detail || ""}`);
  console.log("──────────────────────────────────────────────────────────────────");
  console.log("Captured evidence (abridged):");
  console.log(`  SW: ${JSON.stringify(evidence.sw_state)}`);
  console.log(`  Diagnosis h2: "${evidence.diagnosis_h2 || ""}" crop="${evidence.diagnosis_crop || ""}" conf=${evidence.diagnosis_confidence || "?"} match=${evidence.diagnosis_label_match}`);
  console.log(`  Offline: ${evidence.offline_request_count_during_diagnosis} request events, ${evidence.offline_real_network_count} over-wire, ${evidence.offline_sw_served_count} SW-served`);
  console.log(`  WebGPU: ${evidence.webgpu_available}`);
  console.log(`  Ask reply chars: ${evidence.ask_reply_chars ?? "n/a (see ask_fallback_reply_text)"}`);
  console.log(`  Ask source: ${JSON.stringify(evidence.ask_source_detail)}`);
  console.log(`  Ask router logs: ${JSON.stringify(evidence.ask_router_logs)}`);
  console.log(`  IDB diag count: ${diagCount ?? "?"} chat count: ${chatCount ?? "?"}`);
  const failed = checks.filter((c) => !c.ok);
  console.log(failed.length === 0 ? "\nOVERALL: PASS — all steps verified with evidence" : `\nOVERALL: FAIL — ${failed.length} check(s) failed (see above, evidence-backed)`);
  if (failed.length > 0) process.exitCode = 1;
} catch (err) {
  console.error("QA SCRIPT ERROR:", err);
  process.exitCode = 1;
} finally {
  await context.setOffline(false).catch(() => {});
  await browser.close();
}
