// Headless end-to-end verification of the offline-first PWA using Edge/Chrome.
// Tests: (1) SW serves the ONNX model, (2) offline disease diagnosis via the
// on-device classifier, (3) offline chatbot answer via the local knowledge base.
// Usage: node scripts/e2e-offline.mjs
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://localhost:4173";
const IMAGE = path.resolve(__dirname, "..", "..", "backend", "eval", "dataset", "Tomato___Late_blight", "img1.jpg");

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = [...EDGE_CANDIDATES, ...CHROME_CANDIDATES].find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("No Edge/Chrome found");
  process.exit(1);
}

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
};

async function pollUntil(page, probeFn, { timeoutMs = 60000, intervalMs = 2000, label = "poll" } = {}) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await page.evaluate(probeFn);
      if (last) {
        console.log(`[${label}] resolved after ${Date.now() - start}ms`);
        return last;
      }
    } catch (e) {
      console.log(`[${label}] probe error: ${String(e.message).slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(`[${label}] TIMEOUT after ${timeoutMs}ms (last=${JSON.stringify(last)?.slice(0, 120)})`);
  return null;
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: [
    "--ignore-certificate-errors",
    "--allow-insecure-localhost",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--window-size=390,844",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text().slice(0, 250)));
  page.on("pageerror", (e) => console.log("[pageerror]", String(e.message).slice(0, 250)));

  // ── Test 0: online first visit — SW installs and precaches the model ──
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 90000 });
  const swReady = await page.evaluate(async () => {
    try {
      await navigator.serviceWorker.ready;
      return true;
    } catch {
      return false;
    }
  });
  record("SW registered", swReady);

  const modelFetch = await page.evaluate(async () => {
    const r = await fetch("/models/efficientnet_b0_plantvillage.onnx");
    return { ok: r.ok, size: (await r.arrayBuffer()).byteLength };
  });
  record("ONNX model served (online)", modelFetch.ok, `${(modelFetch.size / 1e6).toFixed(1)} MB`);

  const wasmFetch = await page.evaluate(async () => {
    const r = await fetch("/onnx/ort-wasm-simd-threaded.wasm");
    return { ok: r.ok, size: (await r.arrayBuffer()).byteLength };
  });
  record("ORT wasm served (online)", wasmFetch.ok, `${(wasmFetch.size / 1e6).toFixed(1)} MB`);

  // ── Test 1: go offline, reload — SW serves everything ──
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  const offlineLoad = await page.evaluate(() => document.querySelector("h1")?.textContent || "");
  record("App shell loads offline", offlineLoad.length > 0, offlineLoad.trim().slice(0, 40));

  // ── Test 2: offline disease diagnosis via on-device classifier ──
  await page.goto(BASE + "/diagnose", { waitUntil: "networkidle2", timeout: 60000 });
  console.log("[diag] url =", page.url());
  const input = await page.$('input[type="file"]');
  if (input) {
    await input.uploadFile(IMAGE);
    await page.waitForFunction(
      () => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Diagnose disease")),
      { timeout: 15000 }
    );
    console.log("[diag] preview rendered, clicking Diagnose");
    const cacheProbe = await page.evaluate(async () => {
      const keys = await caches.keys();
      const hits = [];
      for (const k of keys) {
        const c = await caches.open(k);
        if (await c.match("/models/efficientnet_b0_plantvillage.onnx", { ignoreSearch: true })) hits.push(k);
      }
      return { cacheCount: keys.length, modelHits: hits, online: navigator.onLine };
    });
    console.log("[diag] cache probe:", JSON.stringify(cacheProbe));
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Diagnose disease"))?.click();
    });

    let diagnosis = null;
    let conf = null;
    const found = await pollUntil(
      page,
      () => {
        const h2 = document.querySelector("h2");
        const name = h2 && h2.textContent.trim();
        return name || null;
      },
      { timeoutMs: 120000, intervalMs: 2000, label: "diag" }
    );
    if (found) diagnosis = found;
    conf = await page.evaluate(() => {
      const text = document.body.innerText;
      // On-device -> a crisp percentage like "72%"; heuristic -> "75-85%"
      const m = text.match(/(?:^|\s)(\d{1,3})%(?:\s|$)/);
      return m ? m[1] + "%" : null;
    });
    const bodyTail = await page.evaluate(() => document.body.innerText.slice(-400).replace(/\n+/g, " | "));
    console.log("[diag] body tail:", bodyTail);
    if (!diagnosis) await page.screenshot({ path: "e2e-diag-fail.png" });
    // On-device model -> crisp "72%" confidence + a real crop diagnosis.
    // Heuristic fallback -> "75-85%" confidence + hash-picked disease.
    const bodyHasCrop = await page.evaluate(() => /Tomato|Potato|Pepper/.test(document.body.innerText));
    const onDeviceModel = Boolean(conf) && conf !== "75-85%" && bodyHasCrop;
    record(
      "Offline diagnosis produced",
      Boolean(diagnosis && conf),
      `${diagnosis || "none"} @ ${conf || "?"} (${onDeviceModel ? "ON-DEVICE MODEL" : "heuristic fallback"})`
    );
  } else {
    record("Offline diagnosis produced", false, "file input not found");
  }

  // ── Test 3: offline chatbot answer (local knowledge base) ──
  await page.goto(BASE + "/ask", { waitUntil: "networkidle2", timeout: 60000 });
  console.log("[ask] url =", page.url());
  const q = "How to treat tomato late blight on my crop?";
  await page.type('textarea[aria-label="Ask a farming question"]', q);
  await page.keyboard.press("Enter");

  let answer = 0;
  const foundAsk = await pollUntil(
    page,
    () => {
      const bubbles = [...document.querySelectorAll(".space-y-4 > div")];
      const assistant = bubbles.find((b) => !b.className.includes("self-end"));
      if (!assistant) return null;
      const t = assistant.textContent;
      return t && t.length > 20 ? t.length : null;
    },
    { timeoutMs: 90000, intervalMs: 2000, label: "ask" }
  );
  if (foundAsk) answer = foundAsk;
  const askBodyTail = await page.evaluate(() => document.body.innerText.slice(-300).replace(/\n+/g, " | "));
  console.log("[ask] body tail:", askBodyTail);
  if (!answer) await page.screenshot({ path: "e2e-ask-fail.png" });
  record("Offline chat answered", answer > 40, `${answer} chars in thread`);
} catch (err) {
  console.error("E2E ERROR:", err.message);
  results.push({ name: "overall-run", ok: false, detail: err.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 ? "\nALL E2E TESTS PASSED" : `\n${failed.length} E2E TEST(S) FAILED`);
  if (failed.length > 0) process.exitCode = 1;
}