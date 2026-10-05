import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const key = process.env.GROQ_API_KEY;
if (!key) { console.log('NO KEY'); process.exit(1); }

const model = 'llama-3.1-8b-instant';

console.log('Testing Groq with farming question...\n');

try {
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful agricultural assistant for Indian farmers. Give practical advice in simple English.' },
      { role: 'user', content: 'How to grow paddy rice in Tamil Nadu? Give 5 specific steps.' }
    ],
    temperature: 0.35,
    max_tokens: 500,
  }, {
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  console.log('=== GROQ FARMING RESPONSE ===');
  console.log(res.data.choices[0].message.content);
} catch (err) {
  if (err.response) {
    console.error('ERROR:', err.response.status, err.response.data?.error?.message);
  } else {
    console.error('ERROR:', err.message);
  }
}
