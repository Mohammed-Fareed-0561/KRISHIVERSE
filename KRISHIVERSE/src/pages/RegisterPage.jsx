import React from "react";
import { Link } from "react-router-dom";
import { IconLeaf, IconArrowRight } from "@tabler/icons-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-success/5 via-base-100 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            <IconLeaf size={42} className="text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-base-content mb-2">
            Krishi<span className="text-primary">Verse</span>
          </h1>
          <p className="text-base-content/60 font-medium">Join the intelligent farming revolution</p>
        </div>

        <div className="card bg-base-100 shadow-2xl border border-base-200 overflow-hidden">
          <div className="card-body p-8 gap-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Ready to grow?</h2>
              <p className="text-center text-base-content/60 text-sm leading-relaxed">
                Joining KrishiVerse is simple. We use your mobile number to keep your account secure and connected to local market intel.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Link 
                to="/login" 
                className="btn btn-primary btn-lg w-full rounded-2xl group flex justify-between px-6"
              >
                <span>Get Started with OTP</span>
                <IconArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="text-center">
                <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">
                  No passwords to remember • Simple & Secure
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-base-300">
              <p className="text-center text-xs text-base-content/40">
                Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <div className="flex justify-center gap-4 text-xs font-semibold text-base-content/30 uppercase tracking-widest">
            <span>Market Intel</span>
            <span>•</span>
            <span>Smart Forecasts</span>
            <span>•</span>
            <span>Direct Sales</span>
          </div>
          <p className="text-xs text-base-content/40 italic">
            "Empowering South Indian farmers with the power of AI."
          </p>
        </div>
      </div>
    </div>
  );
}
