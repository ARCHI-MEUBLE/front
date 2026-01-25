import type { AppProps } from "next/app";
import Script from "next/script";
import { useEffect } from "react";
import { SampleCartProvider } from "@/contexts/SampleCartContext";
import { CustomerProvider } from "@/context/CustomerContext";

// Fonts
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import "../../styles/globals.css";
import "@/styles/configurator.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Charger le widget Crisp depuis la configuration backend
    const loadCrisp = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          const crispId = data.crisp?.websiteId;

          if (crispId) {
            // Initialiser Crisp
            (window as any).$crisp = [];
            (window as any).CRISP_WEBSITE_ID = crispId;

            const script = document.createElement('script');
            script.src = 'https://client.crisp.chat/l.js';
            script.async = true;
            document.head.appendChild(script);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement de Crisp:', err);
      }
    };

    loadCrisp();
  }, []);

  return (
    <CustomerProvider>
      <SampleCartProvider>
        {/* Load model-viewer globally once for entire app */}
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
          strategy="afterInteractive"
          onError={(e) => {
            console.error('Erreur chargement model-viewer:', e);
          }}
        />
        <Component {...pageProps} />
      </SampleCartProvider>
    </CustomerProvider>
  );
}
