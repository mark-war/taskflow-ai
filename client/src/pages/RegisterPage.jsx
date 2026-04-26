import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { authAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const passwordRules = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(1); // 1 = account info, 2 = workspace name
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    teamName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors((ev) => ({ ...ev, [key]: "" }));
    },
  });

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
        teamName: form.teamName || `${form.name}'s Workspace`,
      });
      setAuth(data);
      toast.success(`Workspace created! Welcome, ${data.user.name} 🚀`);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
      if (msg.toLowerCase().includes("email")) {
        setStep(1);
        setErrors({ email: "This email is already registered" });
      }
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = passwordRules.filter((r) => r.test(form.password)).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg">TaskFlow AI</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                  step > s
                    ? "bg-brand-500 text-white"
                    : step === s
                      ? "bg-brand-500/15 text-brand-500 border-2 border-brand-500"
                      : "bg-[var(--color-border)] text-[var(--color-text-subtle)]",
                )}
              >
                {step > s ? <Check size={13} /> : s}
              </div>
              <span
                className={clsx(
                  "text-xs font-medium",
                  step === s
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-text-subtle)]",
                )}
              >
                {s === 1 ? "Account" : "Workspace"}
              </span>
              {s < 2 && (
                <div className="w-8 h-px bg-[var(--color-border)] mx-1" />
              )}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {step === 1 ? "Create your account" : "Name your workspace"}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            {step === 1
              ? "Start managing projects smarter with AI"
              : "This is where your team will collaborate"}
          </p>
        </div>

        <form
          onSubmit={
            step === 1
              ? (e) => {
                  e.preventDefault();
                  handleNext();
                }
              : handleSubmit
          }
          className="space-y-4"
          noValidate
        >
          {step === 1 ? (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Alex Johnson"
                  className={`input ${errors.name ? "border-red-400" : ""}`}
                  autoComplete="name"
                  autoFocus
                  {...field("name")}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  placeholder="alex@company.com"
                  className={`input ${errors.email ? "border-red-400" : ""}`}
                  autoComplete="email"
                  {...field("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className={`input pr-10 ${errors.password ? "border-red-400" : ""}`}
                    autoComplete="new-password"
                    {...field("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}

                {/* Password strength */}
                {form.password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={clsx(
                            "flex-1 h-1 rounded-full transition-all duration-300",
                            i < pwdStrength
                              ? pwdStrength === 1
                                ? "bg-red-400"
                                : pwdStrength === 2
                                  ? "bg-yellow-400"
                                  : "bg-emerald-400"
                              : "bg-[var(--color-border)]",
                          )}
                        />
                      ))}
                    </div>
                    <div className="space-y-1">
                      {passwordRules.map((r, i) => (
                        <div
                          key={i}
                          className={clsx(
                            "flex items-center gap-1.5 text-[11px] transition-colors",
                            r.test(form.password)
                              ? "text-emerald-500"
                              : "text-[var(--color-text-subtle)]",
                          )}
                        >
                          <Check
                            size={10}
                            className={
                              r.test(form.password)
                                ? "opacity-100"
                                : "opacity-0"
                            }
                          />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {/* Workspace name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Workspace name
                </label>
                <input
                  type="text"
                  placeholder={`${form.name}'s Workspace`}
                  className="input"
                  autoFocus
                  {...field("teamName")}
                />
                <p className="text-xs text-[var(--color-text-subtle)] mt-1.5">
                  You can invite teammates after setup
                </p>
              </div>

              {/* Summary card */}
              <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 space-y-2">
                <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                  Account summary
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm">
                    {form.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{form.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {form.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary py-2.5 text-sm px-4"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 justify-center py-2.5 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Creating
                      workspace…
                    </>
                  ) : (
                    "🚀 Create workspace"
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-brand-500 hover:text-brand-600 font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
