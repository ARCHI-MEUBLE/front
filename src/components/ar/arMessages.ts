import { ApiClientError } from '@/lib/apiClient';

// Textes communs au configurateur et à la page /ar
export const AR_MESSAGES = {
  launch: 'Voir chez moi en réalité augmentée',
  preparing: 'Préparation du modèle 3D…',
  retry: 'Réessayer',
  tip: 'Visez le sol de la pièce et bougez doucement le téléphone : le meuble apparaît à taille réelle.',
  wrongBrowser: 'Pour voir le meuble chez vous, ouvrez cette page dans Safari (iPhone) ou Chrome (Android).',
  unavailable:
    "La réalité augmentée n'est pas disponible sur ce téléphone : elle demande l'application « Services Google Play pour la RA ».",
  failed: "Le modèle 3D n'a pas pu être préparé.",
  connection: "La connexion a été coupée pendant l'envoi du modèle 3D : réessayez.",
  expired: "Ce lien a expiré. Affichez un nouveau QR code depuis le configurateur, à l'étape Finitions.",
} as const;

// Message à montrer pour un échec de préparation : la raison donnée par le serveur quand elle parle à l'utilisateur
// (trop de dépôts, serveur des modèles injoignable), sinon une phrase générale
export function arErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && (error.statusCode === 429 || error.statusCode === 502) && error.message) {
    return error.message;
  }
  // fetch échoue avec une TypeError quand la requête ne part pas (« Failed to fetch », « NetworkError… »,
  // « Load failed » sur Safari)
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) return AR_MESSAGES.connection;
  return AR_MESSAGES.failed;
}

// En développement seulement : la cause exacte, à recopier pour comprendre une panne
export function arErrorDetail(error: unknown): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (error instanceof Error) return `${error.name} : ${error.message}`.slice(0, 300);
  return String(error).slice(0, 300);
}
