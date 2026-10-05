import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import https from 'https';

const key = process.env.GROQ_API_KEY;
if (!key) { console.log('NO KEY'); process.exit(1); }

console.log('Testing GPT OSS 120B...');

try {
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'openai/gpt-oss-120b',
    messages: [{ role: 'user', content: 'How to grow rice? Give 3 steps.' }],
    temperature: 0.35,
    max_completion_tokens: 300,
  }, {
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  console.log('GPT-OSS-120B:', res.data.choices[0].message.content);
} catch (err) {
  if (err.response) {
    console.log('GPT-OST-120B failed:', err.response.data?.error?.message?.slice(0, 120));
  } else {
    console.log('Error:', err.message);
  }
}
