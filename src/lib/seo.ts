import { CITIES, FAQ } from "@/components/home/homeData";

// Adresse canonique du site : archimeuble.com redirige vers www. Surchargeable pour une préproduction.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.archimeuble.com").replace(/\/+$/, "");
export const SITE_NAME = "ArchiMeuble";
// Image des aperçus de partage (Facebook, WhatsApp, LinkedIn…) quand la page n'en fournit pas
export const DEFAULT_SHARE_IMAGE = "/images/accueil image/img.png";

// URL absolue à partir d'un chemin du site (encode les espaces des noms de fichiers)
export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

const BUSINESS_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "30 Rue Henri Regnault",
  postalCode: "59000",
  addressLocality: "Lille",
  addressCountry: "FR",
};

// Fiche entreprise lue par Google (recherche locale, panneau de l'entreprise). Mêmes informations que le pied de page
// et les mentions légales : à tenir à jour avec eux.
export function businessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": `${SITE_URL}/#entreprise`,
    name: SITE_NAME,
    description:
      "Menuisier à Lille : conception, fabrication et pose de meubles sur mesure (dressings, bibliothèques, buffets, bureaux, meubles TV, placards).",
    url: `${SITE_URL}/`,
    logo: absoluteUrl("/images/logo-icon.png"),
    image: absoluteUrl(DEFAULT_SHARE_IMAGE),
    telephone: "+33601062867",
    email: "pro.archimeuble@gmail.com",
    address: BUSINESS_ADDRESS,
    areaServed: CITIES.map((name) => ({ "@type": "City", name })),
    sameAs: ["https://www.instagram.com/archimeuble"],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE_URL}/#entreprise` },
  };
}

// Fil d'Ariane du résultat Google (« ArchiMeuble › Boutique › … ») : du plus général à la page elle-même
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

// Questions fréquentes affichées sur l'accueil (FaqSection) : le balisage doit reprendre exactement le texte visible
export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
