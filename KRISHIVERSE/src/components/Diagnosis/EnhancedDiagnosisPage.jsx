import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  IconCamera,
  IconUpload,
  IconLeaf,
  IconAlertTriangle,
  IconVolume,
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconDownload,
  IconShare,
  IconHistory,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconLoader,
  IconMicroscope,
  IconActivity
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useDiagnose } from "../../hooks/useAdvisory";
import { useOffline } from "../../hooks/useOffline";
import { detectDiseaseAdvanced } from "../../services/advancedDiseaseDetection";
import { useVoice } from "../../hooks/useVoice";
import { compressImage } from "../../utils/imageCompressor";

export default function EnhancedDiagnosisPage() {
  const { addDiagnose, diagnoses } = useDiagnose();
  const { t, i18n } = useTranslation();
  const { speak } = useVoice();
  const { isOffline } = useOffline();

  // State management
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [analysisMethod, setAnalysisMethod] = useState('advanced');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("image");
  const [imageAnalysis, setImageAnalysis] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize advanced detection
  useEffect(() => {
    // Advanced detection works without model loading
  }, []);

  // Handle image upload with enhanced preview
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setError(null);
    setResult(null);
    setImageAnalysis(null);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError(t("Please upload an image file"));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError(t("Image size should be less than 10MB"));
      return;
    }

    try {
      // Show original preview immediately
      const url = URL.createObjectURL(file);
      setImagePreview(url);

      // Compress in background
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      setSelectedFile(compressedFile);
      
      // Analyze image for visual feedback
      analyzeImageFeatures(url);
      
    } catch (compressErr) {
      console.warn("Image compression failed, using original file", compressErr);
      setSelectedFile(file);
    }
  };

  // Analyze image features for preview
  const analyzeImageFeatures = (imageUrl) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const features = extractBasicFeatures(imageData.data);
      
      setImageAnalysis({
        brightness: features.brightness,
        contrast: features.contrast,
        dominantColors: features.dominantColors,
        hasSymptoms: features.hasSymptoms,
        quality: features.quality
      });
    };
    img.src = imageUrl;
  };

  // Extract basic image features
  const extractBasicFeatures = (data) => {
    let totalR = 0, totalG = 0, totalB = 0;
    let minBrightness = 255, maxBrightness = 0;
    const colorCounts = {};
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalR += r;
      totalG += g;
      totalB += b;
      
      const brightness = (r + g + b) / 3;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
      
      // Simple color classification
      const color = classifyColor(r, g, b);
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
    
    const pixelCount = data.length / 4;
    const avgBrightness = (totalR + totalG + totalB) / (3 * pixelCount);
    const contrast = maxBrightness - minBrightness;
    
    // Get dominant colors
    const dominantColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);
    
    // Check for disease symptoms
    const hasSymptoms = detectSymptoms(data, avgBrightness, contrast);
    
    // Assess image quality
    const quality = assessImageQuality(avgBrightness, contrast, pixelCount);
    
    return {
      brightness: Math.round(avgBrightness),
      contrast: Math.round(contrast),
      dominantColors,
      hasSymptoms,
      quality
    };
  };

  // Classify color
  const classifyColor = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    if (max - min < 30) {
      if (max < 50) return 'black';
      if (max > 200) return 'white';
      return 'gray';
    }
    
    if (r > g && r > b) {
      if (g < 100 && b < 100) return 'red';
      return 'orange';
    }
    if (g > r && g > b) {
      if (r < 100 && b < 100) return 'green';
      return 'yellow';
    }
    if (b > r && b > g) {
      return 'blue';
    }
    
    return 'mixed';
  };

  // Detect disease symptoms
  const detectSymptoms = (data, avgBrightness, contrast) => {
    let symptomPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Look for yellow, brown, or black spots
      if ((r > 150 && g > 150 && b < 100) || // Yellow
          (r > 100 && g < 80 && b < 50) || // Brown
          (r < 50 && g < 50 && b < 50)) { // Black
        symptomPixels++;
      }
    }
    
    const symptomPercentage = (symptomPixels / (data.length / 4)) * 100;
    return symptomPercentage > 5; // More than 5% symptomatic pixels
  };

  // Assess image quality
  const assessImageQuality = (brightness, contrast, pixelCount) => {
    let score = 100;
    
    // Brightness should be between 50 and 200
    if (brightness < 50 || brightness > 200) score -= 20;
    
    // Contrast should be at least 50
    if (contrast < 50) score -= 20;
    
    // Should have enough pixels
    if (pixelCount < 100000) score -= 10;
    
    if (score > 80) return 'excellent';
    if (score > 60) return 'good';
    if (score > 40) return 'fair';
    return 'poor';
  };

  // Enhanced disease prediction
  const handlePredict = useCallback(async () => {
    if (!selectedFile && !imagePreview) return;

    setAnalyzing(true);
    setError(null);
    setAnalysisMethod('advanced');

    try {
      const img = new Image();
      img.src = imagePreview;
      
      await new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            const languageCode = i18n.language || "en";
            const diagnosisResult = await detectDiseaseAdvanced(img, languageCode);
            
            setResult(diagnosisResult);
            
            // Save to history
            addDiagnose({
              symptoms: "Advanced AI Analysis",
              diagnosis: diagnosisResult.name,
              cropType: diagnosisResult.crop,
              severity: diagnosisResult.severity,
              confidence: diagnosisResult.confidence,
              affectedArea: diagnosisResult.affectedArea,
              savedAt: new Date().toISOString(),
              imageUrl: imagePreview,
              analysisMethod: 'advanced'
            });
            
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image."));
      });

    } catch (err) {
      console.error(err);
      
      let userError = t("Failed to analyze the image. Please try again.");
      
      if (err.message.includes('Unable to analyze image')) {
        userError = t("Unable to analyze this image. Please try with a clearer photo of a plant leaf.");
      } else if (err.message.includes('Failed to load image')) {
        userError = t("Failed to load image. Please try uploading again.");
      } else {
        userError = t("Advanced analysis failed. Please try with a different photo.");
      }
      
      setError(userError);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, imagePreview, i18n.language, addDiagnose, t]);

  // Handle text-based diagnosis
  const handleTextPredict = async () => {
    const textSymptoms = document.getElementById('textSymptoms')?.value;
    if (!textSymptoms?.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Simulate text-based diagnosis
      const diagnosisResult = {
        name: "Text-Based Analysis Result",
        crop: "General",
        confidence: "75%",
        severity: "medium",
        affectedArea: "Unknown",
        causes: "Based on symptom description",
        naturalIndianTreatment: [
          "Observe the plant for 2-3 days",
          "Provide proper water and nutrients",
          "Remove affected parts if necessary"
        ],
        chemicalTreatment: [
          "Consult local agricultural expert",
          "Use appropriate pesticides if needed"
        ],
        prevention: [
          "Maintain proper plant hygiene",
          "Monitor regularly for symptoms",
          "Provide optimal growing conditions"
        ]
      };

      setResult(diagnosisResult);
      
      addDiagnose({
        symptoms: textSymptoms,
        diagnosis: diagnosisResult.name,
        cropType: diagnosisResult.crop,
        severity: diagnosisResult.severity,
        confidence: diagnosisResult.confidence,
        savedAt: new Date().toISOString(),
        analysisMethod: 'text'
      });

    } catch (err) {
      console.error(err);
      setError(t("Failed to analyze symptoms. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Clear all
  const handleClear = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setImageAnalysis(null);
    setZoomLevel(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export results
  const handleExport = () => {
    if (!result) return;
    
    const exportData = {
      diagnosis: result,
      timestamp: new Date().toISOString(),
      analysisMethod: analysisMethod,
      imageAnalysis: imageAnalysis
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `diagnosis-${Date.now()}.json`;
    link.click();
  };

  // Share results
  const handleShare = async () => {
    if (!result) return;
    
    const shareText = `Diagnosis: ${result.name}\nCrop: ${result.crop}\nConfidence: ${result.confidence}\nSeverity: ${result.severity}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Plant Disease Diagnosis',
          text: shareText
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      // Show success message
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'badge-error';
      case 'moderate': return 'badge-warning';
      case 'mild': return 'badge-info';
      default: return 'badge-success';
    }
  };

  // Get quality badge color
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'badge-success';
      case 'good': return 'badge-info';
      case 'fair': return 'badge-warning';
      case 'poor': return 'badge-error';
      default: return 'badge-ghost';
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
                <IconMicroscope className="text-primary" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("diagnosis.title", "Plant Disease Diagnosis")}</h1>
                <p className="text-sm text-base-content/60">
                  {t("diagnosis.subtitle", "Advanced AI-powered disease detection")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn btn-ghost btn-sm gap-2"
              >
                <IconHistory size={16} />
                {t("diagnosis.history", "History")}
                {diagnoses.length > 0 && (
                  <span className="badge badge-primary badge-xs">{diagnoses.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Analysis Method Tabs */}
        <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-6">
          <button 
            className={`tab flex-1 transition-all ${activeTab === "image" ? "tab-active bg-primary text-primary-content" : ""}`}
            onClick={() => setActiveTab("image")}
          >
            <IconCamera size={16} className="mr-2" />
            {t("diagnosis.imageAnalysis", "Image Analysis")}
          </button>
          <button 
            className={`tab flex-1 transition-all ${activeTab === "text" ? "tab-active bg-primary text-primary-content" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <IconInfoCircle size={16} className="mr-2" />
            {t("diagnosis.symptomDescription", "Symptom Description")}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6">
            <IconAlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-sm ml-auto">
              <IconX size={16} />
            </button>
          </div>
        )}

        {/* Image Analysis Tab */}
        {activeTab === "image" && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Upload & Preview */}
            <div className="space-y-4">
              {/* Upload Area */}
              {!imagePreview ? (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body">
                    <div 
                      className="w-full h-64 border-2 border-dashed border-base-300 rounded-xl flex flex-col items-center justify-center bg-base-50 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconCamera size={48} className="text-base-content/40 mb-3" />
                      <span className="text-base-content/60 font-medium">
                        {t("diagnosis.uploadPrompt", "Click to upload plant leaf image")}
                      </span>
                      <span className="text-xs text-base-content/40 mt-1">
                        {t("diagnosis.supportedFormats", "JPG, PNG, WebP (Max 10MB)")}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body p-4">
                    {/* Image Preview with Controls */}
                    <div className="relative mb-4">
                      <div className="overflow-hidden rounded-lg bg-base-50">
                        <img
                          ref={imageRef}
                          src={imagePreview}
                          alt="Plant leaf"
                          className="w-full h-64 object-contain transition-transform duration-200"
                          style={{ transform: `scale(${zoomLevel})` }}
                        />
                      </div>
                      
                      {/* Zoom Controls */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={handleZoomOut}
                          className="btn btn-xs btn-circle btn-ghost bg-base-100/80"
                          title="Zoom Out"
                        >
                          <IconZoomOut size={14} />
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="btn btn-xs btn-circle btn-ghost bg-base-100/80"
                          title="Reset Zoom"
                        >
                          {Math.round(zoomLevel * 100)}%
                        </button>
                        <button
                          onClick={handleZoomIn}
                          className="btn btn-xs btn-circle btn-ghost bg-base-100/80"
                          title="Zoom In"
                        >
                          <IconZoomIn size={14} />
                        </button>
                      </div>
                      
                      {/* Image Quality Indicator */}
                      {imageAnalysis && (
                        <div className="absolute bottom-2 left-2">
                          <div className={`badge ${getQualityColor(imageAnalysis.quality)} badge-xs`}>
                            {t("diagnosis.quality", "Quality")}: {imageAnalysis.quality}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Image Analysis Details */}
                    {imageAnalysis && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{t("diagnosis.imageAnalysis", "Image Analysis")}:</span>
                          {imageAnalysis.hasSymptoms && (
                            <span className="badge badge-warning badge-xs">
                              {t("diagnosis.symptomsDetected", "Symptoms Detected")}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-base-50 rounded">
                            <div className="font-medium">{imageAnalysis.brightness}</div>
                            <div className="text-base-content/60">{t("diagnosis.brightness", "Brightness")}</div>
                          </div>
                          <div className="text-center p-2 bg-base-50 rounded">
                            <div className="font-medium">{imageAnalysis.contrast}</div>
                            <div className="text-base-content/60">{t("diagnosis.contrast", "Contrast")}</div>
                          </div>
                          <div className="text-center p-2 bg-base-50 rounded">
                            <div className="font-medium">{imageAnalysis.dominantColors.length}</div>
                            <div className="text-base-content/60">{t("diagnosis.colors", "Colors")}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handlePredict}
                        className="btn btn-primary flex-1"
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <>
                            <IconLoader className="animate-spin" size={16} />
                            {t("diagnosis.analyzing", "Analyzing...")}
                          </>
                        ) : (
                          <>
                            <IconActivity size={16} />
                            {t("diagnosis.analyze", "Analyze")}
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleClear}
                        className="btn btn-ghost"
                      >
                        <IconRefresh size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                        <span className="badge badge-success badge-sm">
                          {result.confidence}
                        </span>
                        <span className={`badge ${getSeverityColor(result.severity)} badge-sm`}>
                          {result.severity}
                        </span>
                      </div>
                    </div>

                    {/* Analysis Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-base-50 rounded">
                        <span className="text-sm font-medium">{t("diagnosis.affectedArea", "Affected Area")}:</span>
                        <span className="text-sm">{result.affectedArea}</span>
                      </div>
                      
                      {result.causes && (
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                          <h4 className="font-medium text-sm mb-1">{t("diagnosis.causes", "Causes")}:</h4>
                          <p className="text-sm text-base-content/80">{result.causes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => speak(result.name + '. ' + result.causes)}
                        className="btn btn-ghost btn-sm flex-1"
                      >
                        <IconVolume size={14} />
                        {t("diagnosis.listen", "Listen")}
                      </button>
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="btn btn-ghost btn-sm flex-1"
                      >
                        {showDetails ? <IconX size={14} /> : <IconInfoCircle size={14} />}
                        {showDetails ? t("diagnosis.hideDetails", "Hide Details") : t("diagnosis.showDetails", "Show Details")}
                      </button>
                    </div>

                    {/* Detailed Information */}
                    {showDetails && (
                      <div className="space-y-3 pt-4 border-t border-base-200">
                        {result.naturalIndianTreatment && result.naturalIndianTreatment.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <span className="text-xl">🌿</span>
                              {t("diagnosis.naturalTreatment", "Natural Treatment")}
                            </h4>
                            <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                              {result.naturalIndianTreatment.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.chemicalTreatment && result.chemicalTreatment.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <span className="text-xl">🧪</span>
                              {t("diagnosis.chemicalTreatment", "Chemical Treatment")}
                            </h4>
                            <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                              {result.chemicalTreatment.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.prevention && result.prevention.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <IconCheck size={16} />
                              {t("diagnosis.prevention", "Prevention")}
                            </h4>
                            <ul className="text-sm space-y-1 text-base-content/80 list-disc list-inside">
                              {result.prevention.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body text-center py-12">
                    <IconMicroscope size={48} className="text-base-content/20 mx-auto mb-4" />
                    <h3 className="font-medium text-base-content/60 mb-2">
                      {t("diagnosis.noResults", "No Analysis Yet")}
                    </h3>
                    <p className="text-sm text-base-content/40">
                      {t("diagnosis.uploadToAnalyze", "Upload an image to analyze plant diseases")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Analysis Tab */}
        {activeTab === "text" && (
          <div className="max-w-2xl mx-auto">
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t("diagnosis.describeSymptoms", "Describe the symptoms")}</span>
                  </label>
                  <textarea
                    id="textSymptoms"
                    className="textarea textarea-bordered h-32"
                    placeholder={t("diagnosis.symptomPlaceholder", "Example: Yellow spots on rice leaves, some leaves are curling...")}
                  />
                </div>
                
                <button
                  onClick={handleTextPredict}
                  className="btn btn-primary w-full mt-4"
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <IconLoader className="animate-spin" size={16} />
                      {t("diagnosis.analyzing", "Analyzing...")}
                    </>
                  ) : (
                    <>
                      <IconActivity size={16} />
                      {t("diagnosis.analyzeSymptoms", "Analyze Symptoms")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export/Share Actions */}
        {result && (
          <div className="fixed bottom-4 right-4 flex gap-2">
            <button
              onClick={handleExport}
              className="btn btn-ghost btn-sm gap-2"
              title={t("diagnosis.export", "Export Results")}
            >
              <IconDownload size={16} />
              {t("diagnosis.export", "Export")}
            </button>
            <button
              onClick={handleShare}
              className="btn btn-ghost btn-sm gap-2"
              title={t("diagnosis.share", "Share Results")}
            >
              <IconShare size={16} />
              {t("diagnosis.share", "Share")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
