import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { motion } from "framer-motion";
import { TrendingUp, KeyRound, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [cooldown, setCooldown] = useState(60);
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const { verifyOtp, resendOtp, error, clearError, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    clearError();
    // Redirect if already authenticated and has no email in query
    if (isAuthenticated && !email) {
      navigate("/");
    }
  }, [isAuthenticated, navigate, clearError, email]);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if user pasted or typed fast
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input if a value was entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Clear previous input and focus it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Only paste 6-digit number

    const digits = pastedData.split("");
    setOtp(digits);
    // Focus the last input
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6 || !email) return;

    const success = await verifyOtp(email, otpCode);
    if (success) {
      setSuccessMsg("Email verified successfully! Welcome to StockAI.");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    const success = await resendOtp(email);
    if (success) {
      setSuccessMsg("A new verification code has been dispatched to your email.");
      setCooldown(60);
      // Clear OTP inputs
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-premium p-8"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
            <TrendingUp size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verify your Account</h2>
          <p className="text-slate-500 text-sm mt-1 text-center">
            We sent a verification code to <span className="font-semibold text-slate-700">{email || "your email"}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start text-rose-700 text-sm gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start text-emerald-700 text-sm gap-3">
            <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2.5">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join("").length !== 6}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-900 shadow-sm"
          >
            {isLoading ? "Verifying..." : (
              <>
                Verify and Log In <KeyRound size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm">
          Didn't receive the email?{" "}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 focus:outline-none"
          >
            {cooldown > 0 ? (
              <>
                <RefreshCw size={14} className="animate-spin-slow" /> Resend in {cooldown}s
              </>
            ) : (
              "Resend OTP"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
