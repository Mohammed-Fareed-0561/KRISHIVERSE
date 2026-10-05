import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plant,
  LockKey,
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  Warning
} from "@phosphor-icons/react";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOtp, verifyOtp, loading, error, clearError } = useAuthStore();

  const from = location.state?.from || "/";

  const [step, setStep] = useState("phone"); // 'phone' or 'otp'
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fieldErr, setFieldErr] = useState("");

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    if (!phone || phone.length < 10) {
      setFieldErr("Please enter a valid 10-digit mobile number");
      return;
    }
    setFieldErr("");
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch {
      // error shown via store
    }
  }

  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setFieldErr("Please enter the 6-digit OTP");
      return;
    }
    setFieldErr("");
    try {
      const data = await verifyOtp(phone, otp);
      if (data.user.isNew) {
        navigate("/onboarding");
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      // error shown via store
    }
  }

  return (
    <div className="min-h-screen bg-[var(--kv-off-white)] flex flex-col pt-8 pb-8 px-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[var(--kv-green-light)] opacity-30 pointer-events-none blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full bg-[var(--kv-amber-light)] opacity-30 pointer-events-none blur-3xl"></div>

      <div className="w-full max-w-sm mx-auto relative z-10 flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-[var(--kv-green)] rounded-[20px] mb-5 shadow-[0_8px_24px_rgba(46,125,82,0.25)] flex items-center justify-center">
            <Plant size={44} weight="fill" className="text-white" />
          </div>
          <h1 className="text-[32px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] tracking-tight">KrishiVerse</h1>
          <p className="text-[14px] text-[var(--kv-grey-mid)] mt-1.5 font-medium tracking-wide">
            Smart farming for South India
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full">
          <div className="mb-8 text-center">
            <h2 className="text-[24px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] mb-1">
              {step === "phone" ? "Namaste! 🙏" : "Verify OTP"}
            </h2>
            <p className="text-[14px] text-[var(--kv-grey-dark)]">
              {step === "phone" 
                ? "Enter your mobile number to get started" 
                : `Enter the code sent to ${phone}`}
            </p>
          </div>

          {/* Backend error */}
          {error && (
            <div className="bg-[var(--kv-red-light)] border border-[var(--kv-red)] border-opacity-30 rounded-[16px] p-3 mb-6 flex items-start gap-2 text-[var(--kv-red)]">
              <Warning size={18} weight="bold" className="mt-0.5 shrink-0" />
              <span className="text-[13px] font-medium leading-snug">{error}</span>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[var(--kv-grey-dark)] ml-1">
                  Mobile Number
                </label>
                <div className={`flex items-center bg-white border ${fieldErr ? 'border-[var(--kv-red)]' : 'border-[var(--kv-divider)]'} rounded-[16px] overflow-hidden focus-within:border-[var(--kv-green)] transition-colors h-[56px] shadow-sm`}>
                  <span className="text-[15px] font-bold text-[var(--kv-grey-mid)] pl-4 pr-3 border-r border-[var(--kv-divider)] py-2 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    className="flex-1 h-full px-4 text-[16px] font-bold tracking-widest text-[var(--kv-near-black)] placeholder:text-[var(--kv-divider)] focus:outline-none bg-transparent"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (error) clearError();
                      if (fieldErr) setFieldErr("");
                    }}
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
                {fieldErr && (
                  <span className="text-[12px] font-bold text-[var(--kv-red)] ml-1">{fieldErr}</span>
                )}
              </div>

              <button
                type="submit"
                className="kv-btn-primary h-[56px] w-full text-[16px] shadow-[0_8px_20px_rgba(46,125,82,0.2)]"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    Request OTP
                    <ArrowRight size={20} weight="bold" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end ml-1 mr-1">
                  <label className="text-[13px] font-bold text-[var(--kv-grey-dark)]">6-Digit Code</label>
                  <button 
                    type="button" 
                    onClick={() => setStep("phone")}
                    className="text-[12px] text-[var(--kv-green)] font-bold active:scale-95 transition-transform"
                  >
                    Change Number
                  </button>
                </div>
                <div className={`flex items-center bg-white border ${fieldErr ? 'border-[var(--kv-red)]' : 'border-[var(--kv-divider)]'} rounded-[16px] overflow-hidden focus-within:border-[var(--kv-green)] transition-colors h-[56px] shadow-sm px-4`}>
                  <LockKey size={22} className="text-[var(--kv-grey-mid)] shrink-0" weight="fill" />
                  <input
                    type="text"
                    inputMode="numeric"
                    className="flex-1 w-full text-center text-[22px] font-black tracking-[0.4em] text-[var(--kv-near-black)] placeholder:text-[var(--kv-divider)] focus:outline-none bg-transparent pl-4"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                      if (error) clearError();
                      if (fieldErr) setFieldErr("");
                    }}
                    autoFocus
                    disabled={loading}
                  />
                </div>
                {fieldErr && (
                   <span className="text-[12px] font-bold text-[var(--kv-red)] ml-1">{fieldErr}</span>
                )}
              </div>

              <div className="flex flex-col gap-4 pt-2">
                <button
                  type="submit"
                  className="kv-btn-primary h-[56px] w-full text-[16px] shadow-[0_8px_20px_rgba(46,125,82,0.2)]"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      Verify & Login
                      <CheckCircle size={20} weight="bold" />
                    </>
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={handleSendOtp}
                  className="flex items-center justify-center gap-2 text-[13px] font-bold text-[var(--kv-grey-mid)] h-10 w-full active:bg-[var(--kv-divider)] rounded-xl transition-colors"
                  disabled={loading}
                >
                  <ArrowsClockwise size={16} weight="bold" />
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Footer Terms */}
      <div className="mt-auto pt-8">
         <p className="text-center text-[11px] text-[var(--kv-grey-mid)] font-medium leading-relaxed max-w-[240px] mx-auto">
            By signing in, you agree to KrishiVerse's <span className="text-[var(--kv-green)] font-bold">Terms</span> and <span className="text-[var(--kv-green)] font-bold">Privacy Policy</span>
         </p>
      </div>
    </div>
  );
}
