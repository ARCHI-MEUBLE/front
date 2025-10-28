import type { AppProps } from "next/app";
import Script from "next/script";
import "../../styles/globals.css";
import "../styles/configurator.css";
import { CustomerProvider } from "@/context/CustomerContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CustomerProvider>
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
    </CustomerProvider>
  );
}