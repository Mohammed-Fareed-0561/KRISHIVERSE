// Verify what the configured Gemini key can actually run (text + vision).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const RED_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function call(model, parts, label) {
  const t0 = Date.now();
  try {
    const m = genAI.getGenerativeModel({ model });
    const r = await m.generateContent(parts);
    const text = (await r.response).text();
    console.log(`[OK] ${label} (${model}) ${Date.now() - t0}ms: ${JSON.stringify(text.slice(0, 100))}`);
  } catch (e) {
    console.error(`[FAIL] ${label} (${model}) ${Date.now() - t0}ms:`, e.message.slice(0, 200));
  }
}

await call('gemini-2.5-flash', ['Say OK'], 'text');
await call('gemini-2.5-flash', [
  { text: 'What color is this? One word.' },
  { inlineData: { mimeType: 'image/png', data: RED_PNG_B64 } },
], 'vision');