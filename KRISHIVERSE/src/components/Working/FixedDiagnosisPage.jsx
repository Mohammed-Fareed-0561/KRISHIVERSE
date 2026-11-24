import React, { useState } from "react";

export default function FixedDiagnosisPage() {
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setResult({
        name: "Sample Disease",
        crop: "Sample Crop",
        confidence: "85%",
        severity: "moderate"
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-6">Diagnosis Page - Fixed Version</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body">
                <div className="w-full h-64 border-2 border-dashed border-base-300 rounded-xl flex flex-col items-center justify-center bg-base-50">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Leaf to analyze"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-center opacity-50">
                      <div className="text-6xl mb-4">📷</div>
                      <p className="text-base-content/60">Click to upload plant image</p>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  className="btn btn-primary w-full"
                  disabled={!imagePreview || analyzing}
                >
                  {analyzing ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      🔬 Analyze Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {result ? (
              <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                        🌿
                      </div>
                      <div>
                        <h3 className="font-bold">{result.name}</h3>
                        <p className="text-sm text-base-content/60">{result.crop}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success badge-sm">
                        {result.confidence}
                      </span>
                      <span className="badge badge-warning badge-sm">
                        {result.severity}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                      <h4 className="font-medium text-sm mb-1">Causes:</h4>
                      <p className="text-sm text-base-content/80">Sample cause description</p>
                    </div>
                    
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <h4 className="font-medium text-sm mb-2">🌿 Natural Remedies</h4>
                      <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                        <li>Remove affected leaves</li>
                        <li>Apply neem oil spray</li>
                        <li>Improve air circulation</li>
                      </ul>
                    </div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-medium text-sm mb-2">🧪 Chemical Control</h4>
                      <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                        <li>Apply appropriate fungicide</li>
                        <li>Follow dosage instructions</li>
                        <li>Repeat after 7 days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body text-center py-12">
                  <div className="text-6xl mb-4">🌿</div>
                  <h3 className="font-medium text-base-content/60 mb-2">No Analysis Yet</h3>
                  <p className="text-sm text-base-content/40">Upload an image to analyze plant diseases</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
