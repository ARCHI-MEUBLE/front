// Appels au backend PHP depuis le serveur Next (getServerSideProps, plan du site). Côté navigateur, passer par apiClient.
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";

// not-found : le backend a répondu 404 (la page doit renvoyer une vraie 404 à Google).
// unavailable : backend injoignable, lent ou réponse illisible ; la page se rabat sur le chargement dans le navigateur.
export type BackendResult = { status: "ok"; data: unknown } | { status: "not-found" } | { status: "unavailable" };

// Délai court : la page attend cette réponse avant de s'afficher
const TIMEOUT_MS = 4000;

export async function fetchBackend(path: string): Promise<BackendResult> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };
    return { status: "ok", data: await response.json() };
  } catch {
    return { status: "unavailable" };
  }
}

// Pages publiques rendues sur le serveur : gardées 5 min par le CDN, puis resservies le temps d'être recalculées
export const PUBLIC_PAGE_CACHE = "public, s-maxage=300, stale-while-revalidate=3600";
