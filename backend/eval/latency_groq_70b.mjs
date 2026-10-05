// Task 2b: raw Groq llama-3.3-70b-versatile latency — 30 real calls, mirroring backend/test-groq.js.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { config } = await import('dotenv');
config({ path: path.resolve(__dirname, '..', '.env') });

const KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const N = 30;
const QUESTION = 'How to grow paddy rice in Tamil Nadu? Give 5 specific steps.';

const log = [];
console.log(`Groq ${MODEL} latency run — ${new Date().toISOString()} (local time ${new Date().toString()})`);

for (let i = 1; i <= N; i++) {
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
  } catch (e) {
    ms = performance.now() - t0;
    status = e.response?.status || 'ERR';
    errMsg = e.response?.data?.error?.message || e.message;
  }
  log.push({ i, status, ms: Math.round(ms * 100) / 100, model, errMsg });
  console.log(`[${i}/${N}] status=${status} ${ms.toFixed(1)}ms ${model ? `model=${model}` : ''}${errMsg ? ` msg="${errMsg.slice(0, 90)}"` : ''}`);
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

const fs = await import('node:fs/promises');
await fs.writeFile(path.join(__dirname, 'task2_groq_70b_latency.json'), JSON.stringify({ runAt: new Date().toISOString(), model: MODEL, n: N, log }, null, 2));