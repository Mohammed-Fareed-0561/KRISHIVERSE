import React, { useState } from "react";
import { analyzePlantImageWithGemini } from "../../services/ai/GeminiVisionService.js";
import { detectDisease } from "../../services/enhancedOfflineDiseaseService.js";

export default function FarmerFriendlyDiagnosisPage() {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    
    try {
      // 1. Try passing the original image File to Gemini Vision
      const diagnosisJSON = await analyzePlantImageWithGemini(imageFile);
      setResult(diagnosisJSON);
    } catch (e) {
      console.warn("Gemini Vision failed or offline, using fallback:", e);
      try {
        // 2. Fallback to offline heuristic
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imagePreview;
        });
        const diag = await detectDisease(img, 'hi');
        
        setResult({
          name: diag.name || "Unknown Issue",
          crop: diag.crop || "Unknown Crop",
          confidence: diag.confidence || "Low",
          severity: diag.severity || "moderate",
          recommendations: {
            immediate: typeof diag.causes === 'string' ? diag.causes : "Take immediate care",
            natural: Array.isArray(diag.naturalIndianTreatment) ? diag.naturalIndianTreatment : ["Maintain plant hygiene"],
            chemical: Array.isArray(diag.chemicalTreatment) ? diag.chemicalTreatment : ["Consult local expert"]
          }
        });
      } catch (fallbackErr) {
        console.error("Fallback failed too", fallbackErr);
        setResult({
          name: "Error",
          crop: "",
          confidence: "0%",
          severity: "गंभीर",
          recommendations: { immediate: "Failed to analyze", natural: [], chemical: [] }
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🌱</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">पौधा रोग जांच</h1>
              <p className="text-gray-600 text-sm">अपने पौधे की तस्वीर अपलोड करें और बीमारी का पता लगाएं</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                  <span>📸</span>
                  तस्वीर अपलोड करें
                </h2>
              </div>
              
              <div className="p-6">
                <div className="relative">
                  <div className="w-full h-80 border-3 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="पौधा की पत्ती"
                        className="object-cover w-full h-full rounded-2xl"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-8xl mb-4 opacity-60">📷</div>
                        <p className="text-gray-600 text-lg font-medium mb-2">यहां तस्वीर चुनें</p>
                        <p className="text-gray-500 text-sm">पौधे की पत्ती की साफ तस्वीर लें</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  disabled={!imagePreview || analyzing}
                >
                  {analyzing ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>जांच हो रही है...</span>
                    </>
                  ) : (
                    <>
                      <span>🔬</span>
                      <span>पौधा जांचें</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <span>💡</span>
                उपयोग कैसे करें?
              </h3>
              <ol className="space-y-2 text-blue-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span>पौधे की पत्ती की साफ तस्वीर लें</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span>तस्वीर अपलोड करने के लिए क्लिक करें</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span>"पौधा जांचें" बटन पर क्लिक करें</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span>परिणाम देखें और उपचार करें</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`p-4 ${
                  result.severity.includes('गंभीर') ? 'bg-red-500' : 
                  result.severity.includes('मध्यम') ? 'bg-yellow-500' : 
                  result.severity.includes('कम') ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                    <span>🏥</span>
                    जांच परिणाम
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          result.severity.includes('गंभीर') ? 'bg-red-100' : 
                          result.severity.includes('मध्यम') ? 'bg-yellow-100' : 
                          result.severity.includes('कम') ? 'bg-orange-100' : 'bg-green-100'
                        }`}>
                          <span className="text-2xl">
                            {result.severity.includes('गंभीर') ? '⚠️' : 
                             result.severity.includes('मध्यम') ? '⚡' : 
                             result.severity.includes('कम') ? '🔶' : '✅'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{result.name}</h3>
                          <p className="text-gray-600">{result.crop}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          result.severity.includes('गंभीर') ? 'bg-red-100 text-red-800' : 
                          result.severity.includes('मध्यम') ? 'bg-yellow-100 text-yellow-800' : 
                          result.severity.includes('कम') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {result.severity}
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">विश्वास:</span>
                          <span className="font-bold text-gray-800 ml-1">{result.confidence}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <span>🚨</span>
                        तुरंत कार्रवाई
                      </h4>
                      <p className="text-red-700">{result.recommendations?.immediate}</p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <span>🌿</span>
                        घरेलू उपाय
                      </h4>
                      <ul className="space-y-2 text-green-700">
                        {result.recommendations?.natural?.map((remedy, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span>{remedy}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <span>🧪</span>
                        रासायनिक उपचार
                      </h4>
                      <ul className="space-y-2 text-blue-700">
                        {result.recommendations?.chemical?.map((treatment, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{treatment}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 p-6 text-center">
                  <div className="text-8xl mb-4 opacity-60">🌱</div>
                  <h3 className="font-semibold text-gray-700 text-lg mb-2">अभी जांच नहीं हुई</h3>
                  <p className="text-gray-600">अपने पौधे की तस्वीर अपलोड करें और बीमारी का पता लगाएं</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
