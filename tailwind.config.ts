import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand colors
        accent: "#B49272",
        ink: "#2F2A26",
        alabaster: "#F6F1EB",

        // Semantic color mappings
        primary: "#B49272",
        "primary-hover": "#A07A5A",
        "primary-active": "#8D6147",
        secondary: "#2F2A26",
        "secondary-hover": "#1F1A16",
        "secondary-active": "#0F0A06",

        // Background colors
        "bg-light": "#F6F1EB",
        "bg-white": "#FFFFFF",

        // Border colors
        "border-light": "#E0D7CC",
        "border-neutral": "#D7C9B9",

        // Text colors
        "text-primary": "#2F2A26",
        "text-secondary": "#6B6360",
        "text-tertiary": "#9D9490",

        // Status colors
        success: "#16A34A",
        "success-light": "#DCFCE7",
        error: "#DC2626",
        "error-light": "#FEE2E2",
        warning: "#F59E0B",
        "warning-light": "#FEF3C7",
        info: "#3B82F6",
        "info-light": "#DBEAFE"
      },
      fontFamily: {
        sans: ["'Source Sans 3'", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;