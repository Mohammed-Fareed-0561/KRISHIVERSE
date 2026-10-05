// Task 2b (accessible path): raw Groq groq/compound latency — 30 real calls.
// groq/compound is a router model; its usage_breakdown shows it internally calls
// llama-3.3-70b-versatile + openai/gpt-oss-120b. Used because llama-3.3-70b-versatile
// is not directly accessible with the configured key.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { config } = await import('dotenv');
config({ path: path.resolve(__dirname, '..', '.env') });

const KEY = process.env.GROQ_API_KEY;
const MODEL = 'groq/compound';
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const N = 30;
const QUESTION = 'How to grow paddy rice in Tamil Nadu? Give 5 specific steps.';
const MAX_DURATION_MS = 12 * 60 * 1000; // stop after 12 minutes wall-clock
const INTER_REQUEST_SLEEP_MS = 3000; // pacing to reduce 429s
const fs = await import('node:fs/promises');
const OUT = path.join(__dirname, 'task2_groq_compound_latency.json');

const log = [];
const startedAt = Date.now();
console.log(`Groq ${MODEL} latency run — ${new Date().toISOString()} (local time ${new Date().toString()})`);
console.log(`pacing: ${INTER_REQUEST_SLEEP_MS}ms between calls, adaptive backoff on 429, max ${MAX_DURATION_MS / 60000} min`);

let backoffMs = 5000;
for (let i = 1; i <= N; i++) {
  if (Date.now() - startedAt > MAX_DURATION_MS) {
    console.log(`[stop] max duration reached after ${i - 1} requests`);
    break;
  }
  const t0 = performance.now();
  let status = 'ERR', ms, model = null, errMsg = null;
  try {
    const res = await axios.post(
      URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful agricultural assistant for Indian farmers.' },
          { role: 'user', content: QUESTION },
        ],
        temperature: 0.35,
        max_tokens: 400,
      },
      { headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    ms = performance.now() - t0;
    status = res.status;
    model = res.data?.model || null;
    backoffMs = 5000; // reset backoff on success
  } catch (e) {
    ms = performance.now() - t0;
    status = e.response?.status || 'ERR';
    errMsg = e.response?.data?.error?.message || e.message;
    if (status === 429) {
      console.log(`[${i}/${N}] rate-limited — backing off ${Math.round(backoffMs / 1000)}s`);
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = Math.min(backoffMs * 2, 60000);
    }
  }
  log.push({ i, status, ms: Math.round(ms * 100) / 100, model, errMsg });
  console.log(`[${i}/${N}] status=${status} ${ms.toFixed(1)}ms ${model ? `model=${model}` : ''}${errMsg ? ` msg="${errMsg.slice(0, 90)}"` : ''}`);

  // Progressive write so a long/partial run still leaves evidence
  await fs.writeFile(OUT, JSON.stringify({ runAt: new Date().toISOString(), model: MODEL, note: 'router -> llama-3.3-70b-versatile + openai/gpt-oss-120b', n: log.length, log }, null, 2));

  if (i < N) await new Promise((r) => setTimeout(r, INTER_REQUEST_SLEEP_MS));
}

const ok = log.filter((r) => r.status === 200).map((r) => r.ms).sort((a, b) => a - b);
const all = log.map((r) => r.ms).sort((a, b) => a - b);
const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

console.log('\n=== SUMMARY ===');
console.log(`date/time: ${new Date().toISOString()}`);
console.log(`requests: ${log.length}, HTTP 200: ${log.filter((r) => r.status === 200).length}, errors: ${log.filter((r) => r.status !== 200).length}`);
console.log(`successful-request latency — mean=${mean(ok).toFixed(1)}ms median=${pct(ok, 50).toFixed(1)}ms p95=${pct(ok, 95).toFixed(1)}ms min=${ok.length ? Math.min(...ok).toFixed(1) : 'n/a'}ms max=${ok.length ? Math.max(...ok).toFixed(1) : 'n/a'}ms`);
console.log(`all-requests latency — mean=${mean(all).toFixed(1)}ms median=${pct(all, 50).toFixed(1)}ms p95=${pct(all, 95).toFixed(1)}ms min=${all[0]?.toFixed(1)}ms max=${all[all.length - 1]?.toFixed(1)}ms`);

await fs.writeFile(OUT, JSON.stringify({ runAt: new Date().toISOString(), model: MODEL, note: 'router -> llama-3.3-70b-versatile + openai/gpt-oss-120b', n: log.length, log }, null, 2));
console.log('wrote', OUT);