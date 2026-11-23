/* eslint-env node */
import process from 'node:process';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set. Run with: GEMINI_API_KEY=your_key node test-gemini2.js");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

async function test() {
    console.log("Testing api key...");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: ['Hello!']
        });
        console.log("Response:", response.text);
    } catch (err) {
        console.error("Error:", err);
    }
}
test();
