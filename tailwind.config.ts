import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fond
        cream: '#FAF9F7',
        white: '#FFFFFF',

        // Texte
        ink: '#1A1A1A',
        stone: '#57534E',
        muted: '#A8A29E',

        // Accent (ambre fonce - chaleureux, bois)
        accent: '#B45309',
        'accent-hover': '#92400E',

        // Fonctionnel
        border: '#E7E5E4',
        surface: '#F5F5F4',

        // Status colors
        success: '#166534',
        'success-light': '#DCFCE7',
        error: '#DC2626',
        'error-light': '#FEE2E2',
        warning: '#D97706',
        'warning-light': '#FEF3C7',
      },
      fontFamily: {
        serif: ["'Playfair Display'", "'Libre Baskerville'", "Georgia", "serif"],
        sans: ["'DM Sans'", "'IBM Plex Sans'", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "monospace"],
      },
      fontSize: {
        'hero': ['clamp(2.5rem, 5vw, 5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'subtle': '2px',
        'sm': '4px',
        'md': '8px',
      },
    }
  },
  plugins: []
};

export default config;
