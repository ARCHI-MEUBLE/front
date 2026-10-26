import { ApiClientError } from '@/lib/apiClient';
import type { SceneViewerIssue } from '@/lib/ar/launchAr';

// Textes communs au configurateur et à la page /ar
export const AR_MESSAGES = {
  launch: 'Voir chez moi en réalité augmentée',
  preparing: 'Préparation du modèle 3D…',
  retry: 'Réessayer',
  tip: 'Visez le sol de la pièce et bougez doucement le téléphone : le meuble apparaît à taille réelle.',
  wrongBrowser:
    "Pour voir le meuble chez vous, ouvrez cette page dans le navigateur du téléphone (Safari, Chrome, Firefox…) : la réalité augmentée ne s'ouvre pas depuis l'application où vous êtes.",
  unavailable:
    "La réalité augmentée n'a pas pu s'ouvrir : sur Android, elle passe par l'application Google, absente ou désactivée sur ce téléphone.",
  notOpened:
    "Rien ne s'est ouvert ? Si le navigateur demande d'ouvrir l'application Google, acceptez. Sinon, ouvrez cette page dans Chrome.",
  failed: "Le modèle 3D n'a pas pu être préparé.",
  connection: "La connexion a été coupée pendant l'envoi du modèle 3D : réessayez.",
  expired: "Ce lien a expiré. Affichez un nouveau QR code depuis le configurateur, à l'étape Finitions.",
} as const;

// Message sous le bouton quand Scene Viewer (Android) ne s'est pas ouvert
export const sceneViewerIssueMessage = (issue: SceneViewerIssue) =>
  issue === 'unavailable' ? AR_MESSAGES.unavailable : AR_MESSAGES.notOpened;

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
