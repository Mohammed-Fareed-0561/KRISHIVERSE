// Task 2a: end-to-end latency of the REAL backend chatbot path: POST /api/v1/advisory/ask
// Booting the actual Express app (buildApp + connectDb) and firing 30 real requests.
// Chain: RAG service (:8000) -> Groq llama-3.1-8b-instant -> Gemini fallback.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env explicitly (script lives in backend/eval)
process.env.NODE_ENV = 'development';
const { config } = await import('dotenv');
config({ path: path.resolve(__dirname, '..', '.env') });

const { buildApp, connectDb } = await import(pathToFileURL(path.resolve(__dirname, '..', 'src', 'bootstrap.js')).href);

async function networkBaseline() {
  const host = 'api.groq.com';
  try {
    const out = execFileSync('ping', ['-n', '4', host], { encoding: 'utf8' });
    const m = out.match(/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/);
    return m ? { host, minMs: +m[1], maxMs: +m[2], avgMs: +m[3] } : { host, note: 'no stats line parsed' };
  } catch (e) {
    return { host, error: e.message };
  }
}

const N = 30;
const QUESTION = 'How to control rice blast in paddy? Give specific steps for a farmer in Tamil Nadu.';
const log = [];

console.log(`Backend /advisory/ask latency run — ${new Date().toISOString()} (local time ${new Date().toString()})`);
const baseline = await networkBaseline();
console.log('Network baseline (ping api.groq.com):', JSON.stringify(baseline));

await connectDb();
const app = buildApp();
const server = app.listen(0);
await new Promise((r) => server.on('listening', r));
const port = server.address().port;
console.log(`Backend listening on port ${port}\n`);

for (let i = 1; i <= N; i++) {
  const t0 = performance.now();
  let status = 'ERR', ms, model = null, source = null, errMsg = null;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/advisory/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: QUESTION, language: 'en', context: { district: 'Coimbatore', crop: 'rice' } }),
    });
    ms = performance.now() - t0;
    status = res.status;
    const data = await res.json().catch(() => ({}));
    model = data.model || null;
    source = data.source || null;
    errMsg = data.message || data.error || null;
  } catch (e) {
    ms = performance.now() - t0;
    errMsg = e.message;
  }
  log.push({ i, status, ms: Math.round(ms * 100) / 100, model, source, errMsg });
  console.log(`[${i}/${N}] status=${status} ${ms.toFixed(1)}ms model=${model ?? '-'} source=${source ?? '-'} ${errMsg ? `msg="${errMsg}"` : ''}`);
}

const timings = log.filter((r) => r.status === 200).map((r) => r.ms);
const all = log.map((r) => r.ms).sort((a, b) => a - b);
function pct(arr, p) { return arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0; }
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const summaryText =
  '\n=== SUMMARY (all 30 requests, incl. errors) ===\n' +
  `date/time: ${new Date().toISOString()}\n` +
  `network baseline: ${JSON.stringify(baseline)}\n` +
  `requests: ${log.length}, HTTP 200: ${log.filter((r) => r.status === 200).length}, errors: ${log.filter((r) => r.status !== 200).length}\n` +
  `successful-request latency — mean=${mean(timings).toFixed(1)}ms median=${pct(timings, 50).toFixed(1)}ms p95=${pct(timings, 95).toFixed(1)}ms min=${timings.length ? Math.min(...timings).toFixed(1) : 'n/a'}ms max=${timings.length ? Math.max(...timings).toFixed(1) : 'n/a'}ms\n` +
  `all-requests latency — mean=${mean(all).toFixed(1)}ms median=${pct(all, 50).toFixed(1)}ms p95=${pct(all, 95).toFixed(1)}ms min=${all[0]?.toFixed(1)}ms max=${all[all.length - 1]?.toFixed(1)}ms\n`;

console.log(summaryText);
await (await import('node:fs/promises')).writeFile(path.join(__dirname, 'task2_backend_ask_latency.json'), JSON.stringify({ runAt: new Date().toISOString(), baseline, n: N, log }, null, 2));
await new Promise((res) => process.stdout.write('', res)); // flush stdout so summary survives process.exit
server.closeAllConnections?.();
process.exit(0);