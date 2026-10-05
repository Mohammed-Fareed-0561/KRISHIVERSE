import React, { useState, useRef } from "react";
import { 
  Camera, 
  Image as ImageIcon, 
  Warning, 
  ArrowCounterClockwise, 
  Plant,
  CircleNotch,
  ShieldCheck,
  Bug,
  Thermometer
} from "@phosphor-icons/react";
import { analyzePlantImageWithGemini } from "../services/ai/GeminiVisionService";
import { diagnoseFromFile, isClassifierAvailable, validateImageFile } from "../services/ai/onDeviceClassifier";
import { saveDiagnosisRecord } from "../services/api/advisoryService";
import { useOffline } from "../hooks/useOffline";

export default function DiagnosePage() {
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { isOffline } = useOffline();
  
  const fileInputRef = useRef(null);

  const buildOfflineDiagnosis = () => {
    // Honest fallback when neither the on-device model nor cloud vision can run.
    // Never fabricates a specific disease: a photo must never be "matched" to a
    // disease name by a hash. We give unverified, generic guidance instead.
    return {
      name: "Unable to verify",
      crop: "On-device model unavailable",
      confidence: "—",
      severity: "Unknown",
      state: "NO_RESULT",
      unverified: true,
      recommendations: {
        immediate:
          "A disease could not be identified because the on-device AI model is not ready and no cloud connection is available. Keep the photo — reconnect to the internet and scan again, or ask the Chat Assistant for advice.",
        natural: [
          "Remove and dispose of any leaves showing large, spreading spots to slow further spread.",
          "Improve airflow around plants and avoid wetting foliage during watering.",
        ],
        chemical: [
          "Do NOT apply pesticides without a confirmed diagnosis. Consult a local agriculture office or Krishi Vigyan Kendra before any chemical treatment.",
        ],
      },
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setStep(2);
      setErrorMsg(null);
    }
  };

  const persistResult = (diagnosis, { unverified = false, model = "unknown" } = {}) => {
    // Persist every diagnosis outcome (verified or honest fallback) to the
    // diseaseDiagnoses IndexedDB store — mirroring how chatHistory persists
    // every chat turn. Fire-and-forget must never break the UI.
    try {
      const promise = saveDiagnosisRecord({
        name: diagnosis?.name,
        diagnosis: diagnosis?.name,
        crop: diagnosis?.crop,
        cropType: diagnosis?.crop,
        confidence: diagnosis?.confidence,
        severity: diagnosis?.severity,
        recommendations: diagnosis?.recommendations,
        symptoms: diagnosis?.symptoms,
        causes: diagnosis?.causes,
        model,
        offline: isOffline,
        unverified,
        savedAt: Date.now(),
      });
      if (promise?.catch) promise.catch((e) => console.warn("[DiagnosePage] persist failed:", e));
    } catch (e) {
      console.warn("[DiagnosePage] persist failed:", e);
    }
  };

  const handleAnalyze = async () => {
    let isOfflineFallback = false;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      // IMAGE_UNUSABLE gate first: missing/invalid/too-small files get a clear
      // message instead of flowing into inference.
      const usability = validateImageFile(imageFile);
      if (!usability.ok) {
        setErrorMsg(
          usability.reason === "too_large"
            ? "This photo is too large to analyze. Please choose a smaller image."
            : "This image can't be used for diagnosis. Please take a clear, well-lit close-up photo."
        );
        setAnalyzing(false);
        return;
      }
      // 1) On-device EfficientNet-B0 classifier — runs offline, no API key.
      if (await isClassifierAvailable()) {
        const onDevice = await diagnoseFromFile(imageFile);
        if (onDevice) {
          setResult(onDevice);
          persistResult(onDevice, { unverified: Boolean(onDevice.unverified), model: onDevice.model || "efficientnet-b0" });
          setStep(3);
          return;
        }
      }

      // 2) Cloud Gemini vision when online
      if (isOffline) {
        throw new Error("OFFLINE");
      }

      const diagnosis = await analyzePlantImageWithGemini(imageFile);
      setResult(diagnosis);
      persistResult(diagnosis, { unverified: false, model: "gemini-vision" });
      setStep(3);
    } catch (err) {
      const errMsg = String(err?.message || "");
      const shouldUseFallback =
        errMsg === "OFFLINE" ||
        isOffline ||
        /authorization|token|api key|quota|permission|forbidden|unauthorized|failed|invalid/i.test(errMsg.toLowerCase());

      if (shouldUseFallback) {
        isOfflineFallback = true;
        // Graceful fallback for offline/auth/api issues
        setTimeout(() => {
          const fallback = buildOfflineDiagnosis();
          setResult(fallback);
          persistResult(fallback, { unverified: true, model: "unavailable-offline-fallback" });
          setStep(3);
        }, 1500);
      } else {
        setErrorMsg("Analysis failed. Please try again.");
      }
    } finally {
      if (!isOfflineFallback) {
         setAnalyzing(false);
      } else {
         // Offline uses setTimeout so we clear it there.
         setTimeout(() => setAnalyzing(false), 1500);
      }
    }
  };

  const resetDiagnosis = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setAnalyzing(false);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-[22px] font-[var(--font-heading)] font-bold text-[var(--kv-near-black)]">Crop Doctor AI</h1>
        <p className="text-[13px] text-[var(--kv-grey-mid)] mt-1">Get instant disease diagnosis & treatment</p>
      </div>

      {errorMsg && (
         <div className="bg-[var(--kv-red-light)] text-[var(--kv-red)] px-3 py-2 rounded-xl mb-4 text-[13px] font-medium flex items-center gap-2">
           <Warning size={18} weight="bold" />
           {errorMsg}
         </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center gap-6 pb-[25%]">
           <button
             type="button"
             className="w-full aspect-square max-h-[300px] border-2 border-dashed border-[var(--kv-green)] rounded-[24px] flex flex-col items-center justify-center bg-[var(--kv-green-light)] bg-opacity-30 active:bg-opacity-50 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
             aria-label="Take a photo of the crop"
           >
             <div className="w-16 h-16 rounded-full bg-[var(--kv-white)] shadow-sm flex items-center justify-center text-[var(--kv-green)] mb-4">
               <Camera size={32} weight="fill" />
             </div>
             <div className="text-[16px] font-medium text-[var(--kv-near-black)]">Take a photo</div>
             <div className="text-[14px] text-[var(--kv-grey-mid)] mt-1">Tap to open Camera</div>
             
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               capture="environment"
               onChange={handleImageUpload}
               className="hidden"
             />
           </button>
           
           <div className="flex items-center gap-3 px-2">
             <div className="h-[1px] flex-1 bg-[var(--kv-divider)]"></div>
             <span className="text-[12px] text-[var(--kv-grey-mid)] uppercase font-bold tracking-wider">OR</span>
             <div className="h-[1px] flex-1 bg-[var(--kv-divider)]"></div>
           </div>

           <button 
             type="button"
             className="kv-btn-secondary h-12"
             onClick={() => {
                 if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                    setTimeout(() => fileInputRef.current.setAttribute('capture', 'environment'), 100);
                 }
             }}
           >
             <ImageIcon size={20} weight="bold" />
             <span>Select from gallery</span>
           </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="flex-1 flex flex-col gap-6">
           <div className="relative w-full aspect-square max-h-[360px] rounded-[24px] overflow-hidden shadow-sm border border-[var(--kv-divider)]">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Crop to analyze"
                  className="w-full h-full object-cover"
                />
              )}
              {isOffline && (
                 <div className="absolute top-3 right-3 bg-[var(--kv-amber)] text-[var(--kv-amber-light)] px-2 py-1 rounded-md text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-md">
                   <Warning size={12} weight="bold" /> OFFLINE MODE
                 </div>
              )}
           </div>

           <div className="flex flex-col gap-3 mt-auto mb-2">
              <button
                onClick={handleAnalyze}
                type="button"
                disabled={analyzing}
                 className="kv-btn-primary h-14"
              >
                {analyzing ? (
                  <div className="flex items-center gap-2">
                    <CircleNotch size={20} className="animate-spin" weight="bold" />
                    <span className="opacity-90">Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plant size={22} weight="fill" />
                    <span>Diagnose disease</span>
                  </div>
                )}
              </button>
              
              <button
                onClick={() => setStep(1)}
                type="button"
                disabled={analyzing}
                className="kv-btn-secondary border-none bg-transparent text-[var(--kv-grey-dark)] h-12"
              >
                <ArrowCounterClockwise size={18} weight="bold" />
                <span className="text-[14px]">Retake Photo</span>
              </button>
           </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="flex-1 flex flex-col gap-4 pb-4">
           {/* Summary Card */}
           <div className="kv-card border-none bg-[var(--kv-green-light)] p-5 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 text-[var(--kv-green)] opacity-10">
               <Plant size={120} weight="fill" />
             </div>
              <div className="flex items-center gap-2 mb-3">
                <Warning size={24} weight="fill" className="text-[var(--kv-amber)]" />
                <span className="text-[12px] font-bold text-[var(--kv-green)] uppercase tracking-wider">
                  {result.state === "KNOWN_DIAGNOSIS"
                    ? "Disease detected"
                    : result.state === "HEALTHY"
                      ? "Looks healthy"
                      : result.state === "POSSIBLE_DIAGNOSIS"
                        ? "Possible finding — unconfirmed"
                        : "Unverified guidance"}
                </span>
              </div>
              <h2 className="text-[22px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] leading-tight mb-1">
                {result.state === "KNOWN_DIAGNOSIS"
                  ? `This image is consistent with ${result.name}.`
                  : result.state === "POSSIBLE_DIAGNOSIS"
                    ? `This may be ${result.name}.`
                    : result.state === "UNKNOWN_CROP"
                      ? "I couldn't identify the crop reliably enough to diagnose it."
                      : result.state === "INSUFFICIENT_EVIDENCE"
                        ? "I couldn't identify the problem reliably from this image."
                        : result.name}
              </h2>
             <p className="text-[14px] text-[var(--kv-grey-dark)] opacity-80 mb-4">{result.crop}</p>
             
             <div className="flex items-center gap-2">
               <div className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                 <ShieldCheck size={16} className="text-[var(--kv-green)]" weight="fill" />
                 <span className="text-[12px] font-bold text-[var(--kv-green)]">{result.confidence}</span>
               </div>
               <div className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                 <Thermometer size={16} className="text-[var(--kv-red)]" weight="fill" />
                 <span className="text-[12px] font-bold text-[var(--kv-red)]">{result.severity}</span>
               </div>
             </div>
           </div>

           {/* Recommendations */}
           <div className="flex flex-col gap-3">
              <h3 className="kv-section-h mt-2">Treatment Plan</h3>

              {/* Immediate */}
              <div className="kv-card p-4 border border-[var(--kv-red-light)]">
                 <div className="flex items-center gap-2 text-[var(--kv-red)] mb-2">
                    <Warning size={18} weight="fill" />
                    <h4 className="text-[13px] font-bold uppercase tracking-wider">Immediate Action</h4>
                 </div>
                 <p className="text-[15px] leading-relaxed text-[var(--kv-near-black)]">
                   {result.recommendations?.immediate}
                 </p>
              </div>

              {/* Natural */}
              <div className="kv-card p-4 border border-[var(--kv-green-light)]">
                 <div className="flex items-center gap-2 text-[var(--kv-green)] mb-2">
                    <Plant size={18} weight="fill" />
                    <h4 className="text-[13px] font-bold uppercase tracking-wider">Natural Remedies</h4>
                 </div>
                 <ul className="space-y-2">
                   {result.recommendations?.natural?.map((rec, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] mt-2 shrink-0"></div>
                        <span className="text-[14px] leading-relaxed text-[var(--kv-near-black)]">{rec}</span>
                      </li>
                   ))}
                 </ul>
              </div>

              {/* Chemical */}
              <div className="kv-card p-4 border border-[var(--kv-blue-light)]">
                 <div className="flex items-center gap-2 text-[var(--kv-blue)] mb-2">
                    <Bug size={18} weight="fill" />
                    <h4 className="text-[13px] font-bold uppercase tracking-wider">Chemical Control</h4>
                 </div>
                 <ul className="space-y-2">
                   {result.recommendations?.chemical?.map((rec, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-blue)] mt-2 shrink-0"></div>
                        <span className="text-[14px] leading-relaxed text-[var(--kv-near-black)]">{rec}</span>
                      </li>
                   ))}
                 </ul>
              </div>
           </div>

           <div className="mt-4 mb-2">
             <button
                onClick={resetDiagnosis}
                type="button"
                className="kv-btn-secondary"
             >
               <ArrowCounterClockwise size={18} weight="bold" />
               <span>Scan again</span>
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
