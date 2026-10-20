// Fichiers du générateur 3D (« meuble_<uniqid>.glb », servis par le backend sous /models) : ce sont les seuls noms
// que la route /api/ar-model et la page /ar acceptent, pour qu'elles ne relaient rien d'autre.
const AR_MODEL_FILE = /^meuble_[A-Za-z0-9]+\.glb$/;

export const isArModelFile = (name: string) => AR_MODEL_FILE.test(name);

// « /models/meuble_x.glb » (adresse renvoyée par le générateur) → « meuble_x.glb »
export function arModelFileFromUrl(url: string | null | undefined): string | null {
  const name = url?.split(/[?#]/)[0].split('/').pop() ?? '';
  return isArModelFile(name) ? name : null;
}

// Version du GLB corrigée pour la réalité augmentée (voir lib/ar/arModel.ts)
export const arModelPath = (file: string) => `/api/ar-model/${file}`;
