/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f0ff",
          100: "#e0e1ff",
          200: "#c7c8fe",
          300: "#a5a6fc",
          400: "#8183f4",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
        "spin-slow": "spin 2s linear infinite",
        "pulse-fast": "pulse 1s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(-8px)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        slideUp: {
          from: { transform: "translateY(8px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      boxShadow: {
        task: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "task-hover": "0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)",
        modal: "0 20px 60px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
