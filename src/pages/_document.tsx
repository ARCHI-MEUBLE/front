import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // globals.css active le défilement fluide sur <html> : Next demande de le déclarer pour le désactiver pendant les changements de page
    <Html lang="fr" data-scroll-behavior="smooth">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
