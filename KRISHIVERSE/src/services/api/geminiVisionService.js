import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI client with the Gemini API Key from environment variables
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Converts a File object to the generative part format expected by Gemini.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
const fileToGenerativePart = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        inlineData: {
          data: reader.result.split(",")[1],
          mimeType: file.type,
        },
      });
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Sends the image to Gemini Vision to diagnose the plant disease.
 * @param {File} file - The image file uploaded by the user.
 * @param {string} language - The selected language code (e.g., 'en', 'hi', 'ta').
 * @returns {Promise<Object>} The parsed diagnosis JSON object.
 */
export const diagnoseCropVision = async (file, language = 'en') => {
  const ai = getAiClient();
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
You are an expert agricultural botanist and plant pathologist.
Analyze this leaf image and identify the crop and any disease present.
Respond STRICTLY in valid JSON format (without markdown block wrappers or extra text). 
All strings in the JSON MUST be deeply translated into this language code: "${language}" (e.g., 'hi' is Hindi, 'ta' is Tamil, 'en' is English).

Required JSON Schema:
{
  "name": "The name of the disease (or 'Healthy' if no disease)",
  "crop": "The name of the crop/plant",
  "confidence": "A percentage string representing your confidence (e.g., '95%')",
  "causes": "A short paragraph explaining the causes of the disease",
  "naturalIndianTreatment": ["List of natural Indian remedies/treatments (item 1)", "item 2"],
  "chemicalTreatment": ["List of modern chemical control measures (item 1)", "item 2"]
}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        imagePart
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsedData = JSON.parse(response.text);
    return parsedData;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    
    // Provide specific error information
    let errorMessage = "Failed to analyze image using Gemini Vision API.";
    
    if (error.message.includes('API key')) {
      errorMessage = "Gemini API key is missing or invalid. Please configure VITE_GEMINI_API_KEY.";
    } else if (error.message.includes('quota') || error.status === 429) {
      errorMessage = "Gemini API quota exceeded. Please try again later.";
    } else if (error.message.includes('network') || error.code === 'NETWORK_ERROR') {
      errorMessage = "Network connection failed. Please check your internet connection.";
    } else if (error.message.includes('invalid') || error.status === 400) {
      errorMessage = "Invalid image format. Please upload a clear image of a plant leaf.";
    }
    
    throw new Error(errorMessage);
  }
};
