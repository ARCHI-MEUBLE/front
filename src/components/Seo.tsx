import Head from "next/head";
import { useRouter } from "next/router";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

interface SeoProps {
  // Titre complet de l'onglet et du résultat Google (60 caractères environ au plus)
  title: string;
  // Texte du résultat Google (150 à 160 caractères environ)
  description: string;
  // Chemin canonique ; par défaut l'adresse de la page sans paramètres (?partage=, ?mode=… ne créent pas de doublons)
  path?: string;
  // Chemin ou URL absolue de l'image des aperçus de partage
  image?: string | null;
  // Page à ne pas faire apparaître dans les résultats (panier, paiement…)
  noindex?: boolean;
  // Données structurées schema.org, insérées en JSON-LD
  jsonLd?: object | object[];
}

// Balises de référencement d'une page publique : titre, description, adresse canonique, aperçus de partage
export function Seo({ title, description, path, image, noindex = false, jsonLd }: SeoProps) {
  const { asPath } = useRouter();
  const canonical = absoluteUrl(path ?? asPath.split(/[?#]/)[0]);
  const shareImage = absoluteUrl(image || DEFAULT_SHARE_IMAGE);
  const structuredData = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} key="description" />
      {noindex ? (
        <meta name="robots" content="noindex, follow" key="robots" />
      ) : (
        <link rel="canonical" href={canonical} key="canonical" />
      )}
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
      <meta property="og:locale" content="fr_FR" key="og:locale" />
      <meta property="og:title" content={title} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta property="og:image" content={shareImage} key="og:image" />
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      {structuredData.map((data, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          // JSON-LD : "<" échappé pour qu'un texte ne puisse pas fermer la balise script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
      ))}
    </Head>
  );
}
