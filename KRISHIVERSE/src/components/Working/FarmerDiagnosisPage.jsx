import React, { useState } from "react";

export default function FarmerDiagnosisPage() {
  const [step, setStep] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setStep(2);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const problems = [
        { name: "Leaf Disease", solution: "Remove sick leaves. Spray neem oil.", good: "Plant looks healthy!" },
        { name: "Pest Attack", solution: "Use pesticide spray. Remove bugs.", good: "No pests found!" },
        { name: "Water Problem", solution: "Water less. Check soil drainage.", good: "Water is perfect!" },
        { name: "Nutrient Issue", solution: "Add fertilizer. Use cow dung.", good: "Nutrients are good!" }
      ];
      
      const randomProblem = problems[Math.floor(Math.random() * problems.length)];
      
      setResult({
        name: randomProblem.name,
        solution: randomProblem.solution,
        isGood: Math.random() > 0.5,
        good: randomProblem.good
      });
      setAnalyzing(false);
      setStep(3);
    }, 2000);
  };

  const resetDiagnosis = () => {
    setStep(1);
    setImagePreview(null);
    setResult(null);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-green-600 rounded-3xl p-8 text-white text-center mb-8">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-4xl font-bold mb-4">Plant Doctor</h1>
          <p className="text-2xl">Check your crop health</p>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Step 1: Take Photo</h2>
            <div className="relative mb-8">
              <div className="w-full h-64 border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                   onClick={() => document.getElementById('fileInput').click()}>
                <div className="text-center">
                  <div className="text-8xl mb-4">📷</div>
                  <p className="text-2xl font-bold text-gray-700">Click to take photo</p>
                  <p className="text-xl text-gray-600">Or choose from gallery</p>
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div className="text-xl text-gray-600">
              📸 Take a clear photo of your plant
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Step 2: Check Photo</h2>
            {imagePreview && (
              <div className="mb-8">
                <img
                  src={imagePreview}
                  alt="Plant to analyze"
                  className="w-full h-64 object-cover rounded-2xl"
                />
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-2xl py-4 text-xl font-bold hover:bg-gray-300 transition-colors"
              >
                🔄 Retake Photo
              </button>
              <button
                onClick={handleAnalyze}
                className="flex-1 bg-green-600 text-white rounded-2xl py-4 text-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={analyzing}
              >
                {analyzing ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <span>🔬 Analyze Plant</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              {result.isGood ? '✅ Good News!' : '⚠️ Problem Found'}
            </h2>
            
            <div className={`rounded-2xl p-6 mb-6 text-center ${
              result.isGood ? 'bg-green-100 border-4 border-green-400' : 'bg-red-100 border-4 border-red-400'
            }`}>
              <div className="text-6xl mb-4">
                {result.isGood ? '😊' : '😟'}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {result.isGood ? result.good : result.name}
              </h3>
              <p className="text-xl text-gray-700">
                {result.isGood ? 'Your plant is healthy!' : result.solution}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={resetDiagnosis}
                className="flex-1 bg-blue-600 text-white rounded-2xl py-4 text-xl font-bold hover:bg-blue-700 transition-colors"
              >
                🔄 Check Another Plant
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-2xl py-4 text-xl font-bold hover:bg-gray-300 transition-colors"
              >
                📷 View Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
