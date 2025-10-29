import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#B49272",
        ink: "#2F2A26",
        alabaster: "#F6F1EB"
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