/**
 * Helper pour construire les URLs API
 * Si NEXT_PUBLIC_API_URL est vide -> utilise /api (proxy local)
 * Sinon -> utilise l'URL complète vers le backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiUrl(path: string): string {
  if (!API_URL || API_URL === '') {
    // Mode proxy: appelle /api/* qui sera proxifié par Next.js
    return `/api/${path}`;
  }

  // Mode direct: appelle directement le backend
  return `${API_URL}/backend/api/${path}`;
}

// Pour compatibilité avec l'ancien code
export const API_BASE_URL = API_URL ? `${API_URL}/backend/api` : '';
