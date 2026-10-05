import { GoogleGenAI } from "@google/genai";
import { sanitizeRecommendations } from "./treatmentSafety";

let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      aiInstance = new GoogleGenAI({
        apiKey,
      });
    }
  }

  return aiInstance;
}

export const analyzePlantImageWithGemini = async (imageFile) => {
  const ai = getAI();

  // Offline fallback
  if (!navigator.onLine) {
    throw new Error("OFFLINE");
  }

  if (!ai) {
    throw new Error(
      "Gemini API Key not found. Please configure VITE_GEMINI_API_KEY in your .env file."
    );
  }

  try {
    // Convert image to Base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          resolve(reader.result.split(",")[1]);
        } catch {
          reject(new Error("Failed to convert image."));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(imageFile);
    });

    const prompt = `
You are an expert agricultural plant pathologist.

Analyze the uploaded crop image carefully.

Return ONLY valid JSON.

Do NOT include markdown.
Do NOT include explanations.
Do NOT include code blocks.

Schema:

{
  "name": "Disease Name",
  "crop": "Crop Name",
  "confidence": "95%",
  "severity": "High",
  "recommendations": {
    "immediate": "Immediate action",
    "natural": [
      "Natural remedy 1",
      "Natural remedy 2"
    ],
    "chemical": [
      "Chemical remedy 1",
      "Chemical remedy 2"
    ]
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: imageFile.type,
                data: base64Data,
              },
            },
          ],
        },
      ],

      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    // Debugging
    console.log("Gemini Response:", response);

    // Works with latest SDK
    const text =
      typeof response.text === "function"
        ? response.text()
        : response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    console.log("Gemini Text:", text);

    const cleanJson = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanJson);
      // Route the model's recommendations through the verified-only dosage
      // policy: no Gemini output is verified-backed, so any chemical dose it
      // invents is replaced with the safe message before reaching the farmer.
      if (parsed && typeof parsed === "object") {
        parsed.recommendations = sanitizeRecommendations(parsed.recommendations);
      }
      return parsed;
    } catch (err) {
      console.error("Invalid JSON:", cleanJson);
      throw new Error("Gemini returned invalid JSON.");
    }
  } catch (error) {
    console.error("Gemini Vision processing failed:", error);

    throw new Error(
      error.message || "Unable to analyze the plant image."
    );
  }
};