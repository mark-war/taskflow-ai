import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { authAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      setAuth(data);
      toast.success(`Welcome back, ${data.user.name}! 👋`);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed";
      toast.error(msg);
      if (msg.toLowerCase().includes("credential")) {
        setErrors({ password: "Invalid email or password" });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors((ev) => ({ ...ev, [key]: "" }));
    },
  });

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-br from-brand-600 via-brand-500 to-purple-600 p-10 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">TaskFlow AI</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Your team's work,
              <br />
              managed by AI.
            </h2>
            <p className="text-brand-100 leading-relaxed">
              Just tell your board what to do in plain English. Move tasks,
              create sprints, assign work — all with a single sentence.
            </p>
          </div>

          {/* Feature chips */}
          <div className="space-y-3">
            {[
              { icon: "🧠", text: '"Move all blocked tasks to backlog"' },
              { icon: "📋", text: '"Create a bug for Sarah due Friday"' },
              { icon: "📊", text: '"Generate today\'s standup notes"' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-sm font-mono"
              >
                <span>{f.icon}</span>
                <span className="text-white/90">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-brand-200 text-sm">
          © {new Date().getFullYear()} TaskFlow AI · Built different.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">TaskFlow AI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className={`input ${errors.email ? "border-red-400 focus:ring-red-400/30 focus:border-red-400" : ""}`}
                autoComplete="email"
                {...field("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <a
                  href="#"
                  className="text-xs text-brand-500 hover:text-brand-600"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? "border-red-400 focus:ring-red-400/30 focus:border-red-400" : ""}`}
                  autoComplete="current-password"
                  {...field("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-subtle)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Demo login */}
          <button
            onClick={() => {
              setForm({ email: "demo@taskflow.ai", password: "demo1234" });
              toast("Demo credentials filled in — click Sign in!", {
                icon: "👆",
              });
            }}
            className="btn-secondary w-full justify-center py-2.5 text-sm"
          >
            <Sparkles size={14} />
            Use demo account
          </button>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Create workspace
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
