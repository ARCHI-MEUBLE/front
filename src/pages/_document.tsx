import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // globals.css active le défilement fluide sur <html> : Next demande de le déclarer pour le désactiver pendant les changements de page
    <Html lang="fr" data-scroll-behavior="smooth">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
