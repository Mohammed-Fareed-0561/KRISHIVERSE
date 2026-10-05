// Quick test for Groq API
require('dotenv').config();
const axios = require('axios');

console.log('GROQ_API_KEY loaded:', Boolean(process.env.GROQ_API_KEY));

axios.post('https://api.groq.com/openai/v1/chat/completions', {
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: 'You are a helpful agricultural assistant for Indian farmers.' },
    { role: 'user', content: 'How to grow paddy rice in Tamil Nadu? Give 5 specific steps.' }
  ],
  temperature: 0.35,
  max_tokens: 400,
}, {
  headers: {
    Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})
.then(r => {
  const answer = r.data.choices[0].message.content;
  console.log('\n=== GROQ RESPONSE ===');
  console.log(answer);

  // Test backend /advisory/ask endpoint
  return axios.post('http://localhost:3001/api/v1/advisory/ask', {
    question: 'How to grow paddy rice?',
    language: 'en',
    context: { district: 'Coimbatore', crop: 'rice' }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
})
.then(r => {
  console.log('\n=== BACKEND /advisory/ask RESPONSE ===');
  console.log('Model:', r.data.model);
  console.log('Answer:', r.data.answer);
})
.catch(e => {
  if (e.response) {
    console.error('ERROR:', e.response.status, e.response.data);
  } else {
    console.error('ERROR:', e.message);
  }
});
