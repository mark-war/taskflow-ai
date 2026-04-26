import { useState } from "react";
import { User, Moon, Sun, Monitor, LogOut, Save, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { usersAPI, authAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { disconnectSocket } from "@/services/socket";
import toast from "react-hot-toast";
import clsx from "clsx";

const THEMES = [
  { id: "light", Icon: Sun, label: "Light" },
  { id: "dark", Icon: Moon, label: "Dark" },
  { id: "system", Icon: Monitor, label: "System" },
];

export default function SettingsPage() {
  const { user, setUser, logout, refreshToken } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await usersAPI.updateMe({ name });
      setUser(data.user);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout(refreshToken);
    } catch {}
    disconnectSocket();
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm">Profile</h2>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
            {name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Account email cannot be changed
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input text-sm"
            placeholder="Your name"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || name === user?.name}
          className="btn-primary text-sm"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save size={14} /> Save changes
            </>
          )}
        </button>
      </div>

      {/* Theme */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm">Appearance</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={clsx(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150",
                theme === id
                  ? "border-brand-500 bg-brand-500/5 text-brand-500"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-brand-500/40",
              )}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-red-200 dark:border-red-900/40">
        <h2 className="font-semibold text-sm text-red-500 mb-4">Session</h2>
        <button onClick={handleLogout} className="btn-danger text-sm">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
