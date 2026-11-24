import React, { useState, useRef } from "react";
import {
  IconCamera,
  IconUpload,
  IconLeaf,
  IconAlertTriangle,
  IconVolume,
  IconMicrophone
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useDiagnose } from "../../hooks/useAdvisory";
import { useOffline } from "../../hooks/useOffline";
import { useVoice } from "../../hooks/useVoice";

export default function SimpleDiagnosisPage() {
  const { addDiagnose, diagnose } = useDiagnose();
  const { t } = useTranslation();
  const { speak } = useVoice();
  const { isOffline } = useOffline();

  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [textSymptoms, setTextSymptoms] = useState("");
  const [activeTab, setActiveTab] = useState("image");

  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setError(null);
    setResult(null);

    if (!file.type.startsWith('image/')) {
      setError(t("Please upload an image file"));
      return;
    }

    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setSelectedFile(file);
  };

  const handlePredict = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Upload image to server or offline model here. For now we pass a placeholder symptom
      // In the future integrate image model. We'll call diagnose() which handles online/offline paths.
      const symptomText = 'Image analysis result (auto-extracted)';
      const saved = await diagnose({ symptoms: symptomText, cropType: 'unknown' });
      // Set UI result from saved record (diagnose returns the saved record)
      setResult(saved);
      // Keep an extra copy in history (store.save already saved it)
      addDiagnose({
        symptoms: symptomText,
        diagnosis: saved.diagnosis || saved.name || 'Unknown',
        cropType: saved.cropType,
        severity: saved.severity,
        confidence: saved.confidence,
        savedAt: saved.savedAt || new Date().toISOString(),
      });

    } catch (err) {
      console.error(err);
      setError(t("Failed to analyze image. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTextPredict = async () => {
    if (!textSymptoms.trim()) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Use the diagnosis pipeline (will use online backend if available, otherwise offline reasoning)
      const saved = await diagnose({ symptoms: textSymptoms, cropType: 'General' });
      setResult(saved);
      addDiagnose({
        symptoms: textSymptoms,
        diagnosis: saved.diagnosis || saved.name,
        cropType: saved.cropType,
        severity: saved.severity,
        confidence: saved.confidence,
        savedAt: saved.savedAt || new Date().toISOString(),
      });

    } catch (err) {
      console.error(err);
      setError(t("Failed to analyze symptoms. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setTextSymptoms("");
    setAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'badge-error';
      case 'moderate': return 'badge-warning';
      case 'mild': return 'badge-info';
      default: return 'badge-success';
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200/50 backdrop-blur-sm sticky top-0 z-40 border-b border-base-300">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <IconLeaf className="text-primary" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("diagnosis.title", "Plant Disease Diagnosis")}</h1>
                <p className="text-sm text-base-content/60">
                  {t("diagnosis.subtitle", "Upload an image of your crop leaf for instant AI analysis")}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-6">
          <button
            className={`tab flex-1 transition-all ${activeTab === "image" ? "tab-active bg-primary text-primary-content" : ""}`}
            onClick={() => setActiveTab("image")}
          >
            <IconCamera size={16} className="mr-2" />
            {t("diagnosis.imageTab", "Image Analysis")}
          </button>
          <button
            className={`tab flex-1 transition-all ${activeTab === "text" ? "tab-active bg-primary text-primary-content" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <IconMicrophone size={16} className="mr-2" />
            {t("diagnosis.textTab", "Symptom Description")}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6">
            <IconAlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-sm ml-auto">
              ×
            </button>
          </div>
        )}

        {/* Image Analysis Tab */}
        {activeTab === "image" && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Upload */}
            <div className="space-y-4">
              <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body">
                  <div className="w-full h-64 border-2 border-dashed border-base-300 rounded-xl flex flex-col items-center justify-center bg-base-50 relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Leaf to predict" className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-center opacity-50 flex flex-col items-center">
                        <IconCamera size={48} className="mb-3" />
                        <span className="text-base-content/60 font-medium">{t("diagnosis.tapToUpload", "Tap to capture or upload leaf")}</span>
                      </div>
                    )}

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>

                  <button className="btn btn-primary w-full" onClick={handlePredict} disabled={!imagePreview || analyzing}>
                    {analyzing ? (
                      <>
                        <span className="loading loading-spinner loading-sm" /> {t("diagnosis.analyzing", "Analyzing...")}
                      </>
                    ) : (
                      <>
                        <IconUpload size={18} /> {t("diagnosis.analyzeBtn", "Analyze Leaf Image")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">
              {result ? (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <IconLeaf className="text-success" size={16} />
                        </div>
                        <div>
                          <h3 className="font-bold">{result.name}</h3>
                          <p className="text-sm text-base-content/60">{result.crop}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-success badge-sm">{result.confidence}</span>
                        <span className={`badge ${getSeverityColor(result.severity)} badge-sm`}>{result.severity}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      {result.causes && (
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                          <h4 className="font-medium text-sm mb-1">{t("diagnosis.causes", "Causes")}:</h4>
                          <p className="text-sm text-base-content/80">{result.causes}</p>
                        </div>
                      )}

                      {result.naturalIndianTreatment && result.naturalIndianTreatment.length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                          <h4 className="font-medium text-sm mb-2">🌿 {t("diagnosis.naturalIndianRemedies", "Natural Remedies")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.naturalIndianTreatment.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}

                      {result.chemicalTreatment && result.chemicalTreatment.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <h4 className="font-medium text-sm mb-2">🧪 {t("diagnosis.chemicalControl", "Chemical Control")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.chemicalTreatment.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}

                      {result.prevention && result.prevention.length > 0 && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><IconLeaf size={16} />{t("diagnosis.prevention", "Prevention")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.prevention.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-base-200">
                      <div className="flex items-center gap-2">
                        {result.offline && (
                          <span className="badge badge-ghost badge-sm">Offline</span>
                        )}
                        {result.analysisMethod && (
                          <span className="text-xs text-base-content/50">{result.analysisMethod}</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => speak((result.name || '') + '. ' + (result.causes || ''))} className="btn btn-ghost btn-sm">
                          <IconVolume size={14} />{t("diagnosis.listen", "Listen")}
                        </button>
                        <button onClick={handleClear} className="btn btn-ghost btn-sm">
                          <IconUpload size={14} />{t("diagnosis.newAnalysis", "New Analysis")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body text-center py-12">
                    <IconLeaf size={48} className="text-base-content/20 mx-auto mb-4" />
                    <h3 className="font-medium text-base-content/60 mb-2">{t("diagnosis.noResults", "No Analysis Yet")}</h3>
                    <p className="text-sm text-base-content/40">{t("diagnosis.uploadToAnalyze", "Upload an image to analyze plant diseases")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Analysis Tab */}
        {activeTab === "text" && (
          <>
            <div className="max-w-2xl mx-auto">
              <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">{t("diagnosis.describeSymptoms", "Describe what you see on your plant")}</span>
                    </label>
                    <textarea className="textarea textarea-bordered h-32" placeholder="Example: Yellow spots on rice leaves, some leaves are curling..." value={textSymptoms} onChange={(e) => setTextSymptoms(e.target.value)} />
                  </div>

                  <button onClick={handleTextPredict} className="btn btn-primary w-full mt-4" disabled={!textSymptoms.trim() || analyzing}>
                    {analyzing ? (<><span className="loading loading-spinner loading-sm" /> {t("diagnosis.analyzing", "Analyzing...")}</>) : (<><IconLeaf size={18} /> {t("diagnosis.analyzeTextBtn", "Get Diagnosis")}</>)}
                  </button>
                </div>
              </div>
            </div>

            {/* Results for Text Tab */}
            {result && (
              <div className="max-w-2xl mx-auto mt-6">
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center"><IconLeaf className="text-success" size={16} /></div>
                        <div>
                          <h3 className="font-bold">{result.name}</h3>
                          <p className="text-sm text-base-content/60">{result.crop}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2"><span className="badge badge-success badge-sm">{result.confidence}</span><span className={`badge ${getSeverityColor(result.severity)} badge-sm`}>{result.severity}</span></div>
                    </div>

                    <div className="space-y-3">
                      {result.causes && (
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                          <h4 className="font-medium text-sm mb-1">{t("diagnosis.causes", "Causes")}:</h4>
                          <p className="text-sm text-base-content/80">{result.causes}</p>
                        </div>
                      )}

                      {Array.isArray(result.naturalIndianTreatment) && result.naturalIndianTreatment.length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                          <h4 className="font-medium text-sm mb-2">🌿 {t("diagnosis.naturalIndianRemedies", "Natural Remedies")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.naturalIndianTreatment.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(result.chemicalTreatment) && result.chemicalTreatment.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <h4 className="font-medium text-sm mb-2">🧪 {t("diagnosis.chemicalControl", "Chemical Control")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.chemicalTreatment.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(result.prevention) && result.prevention.length > 0 && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><IconLeaf size={16} />{t("diagnosis.prevention", "Prevention")}</h4>
                          <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                            {result.prevention.map((item, idx) => (<li key={idx}>{item}</li>))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-base-200">
                      <div className="flex items-center gap-2">
                        {result.offline && (<span className="badge badge-ghost badge-sm">Offline</span>)}
                        {result.analysisMethod && (<span className="text-xs text-base-content/50">{result.analysisMethod}</span>)}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => speak((result.name || '') + '. ' + (result.causes || ''))} className="btn btn-ghost btn-sm"><IconVolume size={14} />{t("diagnosis.listen", "Listen")}</button>
                        <button onClick={handleClear} className="btn btn-ghost btn-sm"><IconUpload size={14} />{t("diagnosis.newAnalysis", "New Analysis")}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Spacer so it doesn't collide with bottom nav */}
      <div className="h-8"></div>
    </div>
  );
}
