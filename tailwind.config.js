/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0a0a0f", surface: "#14141c", elevated: "#1c1c28", hover: "#252533" },
        accent: { DEFAULT: "#6366f1", hover: "#818cf8", muted: "#4f46e5" },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        muted: "#71717a",
        border: "#2a2a3a",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        "bounce-in": "bounceIn 0.5s ease-out",
        "float-up": "floatUp 2s ease-out forwards",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideDown: { "0%": { transform: "translateY(-20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        pulseRing: { "0%": { transform: "scale(0.8)", opacity: "0.8" }, "100%": { transform: "scale(2)", opacity: "0" } },
        bounceIn: { "0%": { transform: "scale(0.3)", opacity: "0" }, "50%": { transform: "scale(1.05)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        floatUp: { "0%": { transform: "translateY(0) scale(0.5)", opacity: "0" }, "20%": { transform: "translateY(-20px) scale(1.2)", opacity: "1" }, "100%": { transform: "translateY(-200px) scale(0.8)", opacity: "0" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
