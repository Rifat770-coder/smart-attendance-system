import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
        },
        navy: {
          DEFAULT: "#0F172A",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        success: {
          DEFAULT: "#16A34A",
          50: "#F0FDF4",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          600: "#F59E0B",
          700: "#B45309",
        },
        danger: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
          600: "#EF4444",
          700: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
