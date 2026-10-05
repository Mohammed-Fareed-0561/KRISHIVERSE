// Verify Groq model availability with the configured key (no secrets printed).
// Tests: llama-4-scout-17b-16e (vision-capable) and llama-3.3-70b-versatile (text).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const KEY = process.env.GROQ_API_KEY;
if (!KEY) {
  console.error('FATAL: GROQ_API_KEY not set');
  process.exit(1);
}

const URL = 'https://api.groq.com/openai/v1/chat/completions';

// 1x1 red PNG (base64) to verify vision input is accepted
const RED_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function call(model, content, label) {
  const t0 = Date.now();
  try {
    const res = await axios.post(
      URL,
      { model, messages: [{ role: 'user', content }], temperature: 0, max_tokens: 50 },
      { headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const out = res.data?.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[OK] ${label} (${model}) ${Date.now() - t0}ms: ${JSON.stringify(out.slice(0, 80))}`);
  } catch (e) {
    const body = e.response?.data || {};
    console.error(`[FAIL] ${label} (${model}) ${Date.now() - t0}ms:`, e.message, JSON.stringify(body).slice(0, 300));
  }
}

await call('llama-3.3-70b-versatile', 'Say OK', 'text');
await call('llama-4-scout-17b-16e', 'Say OK', 'text');
await call('llama-4-scout-17b-16e', [
  { type: 'text', text: 'What color is this image? Answer with one word.' },
  { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_PNG_B64}` } },
], 'vision');