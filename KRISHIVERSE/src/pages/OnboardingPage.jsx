import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, MapPin, Plant } from "@phosphor-icons/react";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    location: user?.location || "",
    farmingType: user?.farmingType || "organic",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else if (user?.onboarded) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completeOnboarding(formData);
      navigate("/");
    } catch (err) {
      console.error("Onboarding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Welcome to \n KrishiVerse",
      subtitle: "Let's personalize your experience. What should we call you?",
      icon: <User className="w-10 h-10 text-[var(--kv-green)]" weight="fill" />,
      content: (
        <div className="space-y-4">
          <label htmlFor="onboarding-name" className="sr-only">
            Your full name
          </label>
          <input
            id="onboarding-name"
            type="text"
            placeholder="Your Full Name"
            className="kv-input h-[56px] text-[16px] font-bold text-center !rounded-[16px]"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
        </div>
      ),
    },
    {
      title: "Where are you \n located?",
      subtitle: "This helps us provide local weather and market prices.",
      icon: <MapPin className="w-10 h-10 text-[var(--kv-blue)]" weight="fill" />,
      content: (
        <div className="space-y-4">
          <label htmlFor="onboarding-location" className="sr-only">
            City or village and district
          </label>
          <input
            id="onboarding-location"
            type="text"
            placeholder="City or Village, District"
            className="kv-input h-[56px] text-[16px] font-bold text-center !rounded-[16px]"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            autoFocus
          />
        </div>
      ),
    },
    {
      title: "What do you farm?",
      subtitle: "Choose your primary farming methodology.",
      icon: <Plant className="w-10 h-10 text-[var(--kv-amber)]" weight="fill" />,
      content: (
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Primary farming methodology">
          {["Organic", "Chemical", "Mixed", "Hydroponics"].map((type) => {
             const isSelected = formData.farmingType === type.toLowerCase();
             return (
               <button
                 key={type}
                 type="button"
                 onClick={() => setFormData({ ...formData, farmingType: type.toLowerCase() })}
                 className={`flex items-center justify-between px-6 py-4 rounded-[16px] font-bold text-[15px] border active:scale-[0.98] transition-all ${
                   isSelected
                     ? "bg-[var(--kv-near-black)] text-white border-[var(--kv-near-black)] shadow-[0_8px_20px_rgba(30,30,30,0.15)]"
                     : "bg-white text-[var(--kv-grey-dark)] border-[var(--kv-divider)]"
                 }`}
                 role="radio"
                 aria-checked={isSelected}
                >
                 {type}
                 <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${isSelected ? 'border-transparent bg-white' : 'border-[var(--kv-divider)]'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--kv-near-black)]" />}
                 </div>
               </button>
             );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--kv-off-white)] flex flex-col relative overflow-hidden">
        {/* Progress Bar Header */}
        <div
          className="h-1.5 w-full bg-[var(--kv-divider)]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-label="Onboarding progress"
        >
          <motion.div
            className="h-full bg-[var(--kv-green)]"
            initial={{ width: "33.33%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-20 pt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="w-full max-w-sm mx-auto flex flex-col"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 shadow-sm border border-[var(--kv-divider)] bg-white`}>
                  {steps[step - 1].icon}
                </div>
                <h1 className="text-[28px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] leading-tight whitespace-pre-line mb-2">
                  {steps[step - 1].title}
                </h1>
                <p className="text-[14px] text-[var(--kv-grey-dark)] leading-relaxed font-medium">
                  {steps[step - 1].subtitle}
                </p>
              </div>

              <div className="min-h-[160px] w-full">
                {steps[step - 1].content}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[var(--kv-off-white)] via-[var(--kv-off-white)] to-transparent pt-12 pb-8 flex flex-col gap-4">
             <div className="w-full max-w-sm mx-auto flex gap-3">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    type="button"
                    className="kv-btn-secondary h-[56px] basis-[30%]"
                    disabled={loading}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  type="button"
                  disabled={loading || (step === 1 && !formData.name) || (step === 2 && !formData.location)}
                  className="kv-btn-primary h-[56px] flex-1 shadow-[0_8px_20px_rgba(46,125,82,0.2)]"
                >
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      {step === 3 ? "Complete" : "Continue"}
                      <ArrowRight size={20} weight="bold" />
                    </>
                  )}
                </button>
             </div>
             
             {/* Step Dots */}
             <div className="flex justify-center gap-2 mt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-[var(--kv-green)]" : "w-1.5 bg-[var(--kv-divider)]"
                    }`}
                    aria-hidden="true"
                  />
                ))}
             </div>
          </div>
        </div>
    </div>
  );
};

export default OnboardingPage;
