// Determine what can ACTUALLY be evaluated with the configured keys.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const URL = 'https://api.groq.com/openai/v1/chat/completions';
const KEY = process.env.GROQ_API_KEY;
const RED_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function call(model, content, label) {
  const t0 = Date.now();
  try {
    const res = await axios.post(
      URL,
      { model, messages: [{ role: 'user', content }], temperature: 0, max_tokens: 60 },
      { headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const out = res.data?.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[OK] ${label} (${model}) ${Date.now() - t0}ms: ${JSON.stringify(out.slice(0, 100))}`);
  } catch (e) {
    console.error(`[FAIL] ${label} (${model}) ${Date.now() - t0}ms:`, (e.response?.data?.error?.message || e.message).slice(0, 160));
  }
}

// Vision capability on models the key CAN access
await call('openai/gpt-oss-120b', [{ type: 'text', text: 'What color is this? One word.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_PNG_B64}` } }], 'vision');
await call('groq/compound', [{ type: 'text', text: 'What color is this? One word.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_PNG_B64}` } }], 'vision');
await call('qwen/qwen3.6-27b', [{ type: 'text', text: 'What color is this? One word.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_PNG_B64}` } }], 'vision');
// Reference: the app's own configured model
await call('llama-3.1-8b-instant', 'Say OK', 'text');