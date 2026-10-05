import { GoogleGenAI } from '@google/genai';
import ImprovedChatbotService from './ImprovedChatbotService.js';

let aiInstance = null;
const fallbackBot = new ImprovedChatbotService();

function getAI() {
  if (!aiInstance) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (key) {
      aiInstance = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiInstance;
}

export const askGeminiChatbot = async (question) => {
    let ai = getAI();
    
    // Check if offline or no keys
    if (!navigator.onLine || !ai) {
        console.log("Using offline fallback chatbot.");
        const res = await fallbackBot.getResponse(question);
        return res.response || "No response available offline.";
    }

    try {
        const prompt = `You are KrishiVerse AI, an expert agricultural assistant designed for Indian farmers. 
Provide a highly accurate, brief, and practical response to the following question. 
Use a friendly, professional tone. If the user asks in Hindi, answer in Hindi. If English, answer in English. 

Question: ${question}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
           contents: prompt,
           config: {
               temperature: 0.2, // Low temperature for high precision/farming accuracy
               topK: 40
           }
        });

        return response.text();
    } catch (e) {
        console.error("Gemini Chat failed, falling back to ImprovedChatbotService", e);
        const res = await fallbackBot.getResponse(question);
        return res.response || "Request failed. Please try again.";
    }
};
