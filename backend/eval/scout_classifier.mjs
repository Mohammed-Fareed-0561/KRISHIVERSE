// Minimal Llama 4 Scout Vision classifier — the "endpoint" for image disease detection.
// Mirrors the repo's Groq call style (raw axios to chat/completions, no SDK) but with the
// vision-capable model the paper describes: llama-4-scout-17b-16e.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

export const SCOUT_MODEL = process.env.SCOUT_MODEL || 'llama-4-scout-17b-16e';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const KEY = process.env.GROQ_API_KEY;

export const CLASS_LABELS = [
  'Tomato Early Blight',
  'Tomato Late Blight',
  'Tomato Healthy',
  'Potato Early Blight',
  'Potato Late Blight',
  'Pepper Bell Bacterial Spot',
];

const SYSTEM_PROMPT = `You are an agricultural plant disease classifier. Classify the plant leaf image into EXACTLY ONE of the following classes:
${CLASS_LABELS.map((c) => `- ${c}`).join('\n')}

Respond with ONLY a JSON object, no commentary, no markdown fences:
{"class": "<exact class label from the list>"}`;

export async function classifyImage(imageBase64, mimeType = 'image/jpeg') {
  if (!KEY) throw new Error('GROQ_API_KEY not set');
  const response = await axios.post(
    GROQ_URL,
    {
      model: SCOUT_MODEL,
      temperature: 0,
      max_tokens: 50,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Classify this leaf image.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    },
    { headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  const content = response.data?.choices?.[0]?.message?.content || '';
  const match = content.match(/\{"class"\s*:\s*"([^"]+)"\}/) || content.match(/"class"\s*:\s*"([^"]+)"/);
  if (!match) {
    throw new Error(`Could not parse class from model output: ${content.slice(0, 200)}`);
  }
  return { predicted: match[1], model: response.data?.model || SCOUT_MODEL, raw: content.slice(0, 200) };
}