import type { AppProps } from "next/app";
import Script from "next/script";
import Head from "next/head";
import { SampleCartProvider } from "@/contexts/SampleCartContext";
import { CustomerProvider } from "@/context/CustomerContext";

// Polices hébergées par le site (aucune requête vers Google Fonts) : Playfair pour les titres, Geist pour le texte, Geist Mono pour les étiquettes
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";

import "../../styles/globals.css";
import "@/styles/configurator.css";

// Page qui affiche des <model-viewer> (aperçus 3D du panier) : voir cart.tsx
type PageWithModelViewer = AppProps["Component"] & { needsModelViewer?: boolean };

export default function App({ Component, pageProps }: AppProps) {
  // Le script de <model-viewer> n'est chargé que pour ces pages : il embarque sa propre copie de Three.js,
  // qui doublonnait celle des pages 3D (« Multiple instances of Three.js ») quand il était chargé partout.
  // Garder l'import de next/script dans ce fichier : sans lui, Turbopack (dev) perd next/router sur /checkout
  const needsModelViewer = (Component as PageWithModelViewer).needsModelViewer;

  return (
    <>
      <Head>
        <link rel="icon" href="/images/logo.jpg" />
        <link rel="apple-touch-icon" href="/images/logo.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <CustomerProvider>
        <SampleCartProvider>
          {needsModelViewer && (
            <Script
              type="module"
              src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
              strategy="afterInteractive"
              onError={(e) => {
                console.error('Erreur chargement model-viewer:', e);
              }}
            />
          )}
          <Component {...pageProps} />
        </SampleCartProvider>
      </CustomerProvider>
    </>
  );
}
