import type { GetServerSideProps } from "next";
import { fetchBackend } from "@/lib/backendServer";
import { SITE_URL } from "@/lib/seo";

// Pages publiques fixes, de la plus importante à la moins importante
const STATIC_PAGES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1, changefreq: "weekly" },
  { path: "/models", priority: 0.9, changefreq: "weekly" },
  { path: "/realisations", priority: 0.8, changefreq: "monthly" },
  { path: "/catalogue", priority: 0.8, changefreq: "weekly" },
  { path: "/demande-devis", priority: 0.8, changefreq: "yearly" },
  { path: "/samples", priority: 0.6, changefreq: "monthly" },
  { path: "/avis", priority: 0.5, changefreq: "monthly" },
  { path: "/contact-request", priority: 0.5, changefreq: "yearly" },
  { path: "/mentions-legales", priority: 0.1, changefreq: "yearly" },
  { path: "/confidentialite", priority: 0.1, changefreq: "yearly" },
];

type Entry = { path: string; priority: number; changefreq: string };

// Liste d'identifiants du backend. Backend injoignable ou réponse inattendue : liste vide, le plan du site garde les pages fixes.
async function fetchIds(path: string, pick: (data: unknown) => unknown): Promise<number[]> {
  const result = await fetchBackend(path);
  if (result.status !== "ok") return [];
  const list = pick(result.data);
  if (!Array.isArray(list)) return [];
  return list.map((item) => Number((item as { id?: unknown }).id)).filter((id) => Number.isInteger(id) && id > 0);
}

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Plan du site lu par Google (déclaré dans robots.txt) : pages fixes, modèles à configurer et articles de la boutique
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const [modelIds, productIds] = await Promise.all([
    fetchIds("/backend/api/models.php", (data) => (data as { models?: unknown })?.models),
    fetchIds("/backend/api/catalogue.php?action=list&limit=1000", (data) => (data as { data?: unknown })?.data),
  ]);

  const entries: Entry[] = [
    ...STATIC_PAGES,
    ...modelIds.map((id) => ({ path: `/configurator/${id}`, priority: 0.7, changefreq: "monthly" })),
    ...productIds.map((id) => ({ path: `/catalogue/${id}`, priority: 0.6, changefreq: "monthly" })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        ({ path, priority, changefreq }) =>
          `  <url><loc>${escapeXml(SITE_URL + path)}</loc><changefreq>${changefreq}</changefreq><priority>${priority.toFixed(1)}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // Recalculé au plus une fois par heure par le CDN
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
