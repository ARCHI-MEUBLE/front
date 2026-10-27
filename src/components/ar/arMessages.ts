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
  closedQuickly:
    "La réalité augmentée s'est refermée aussitôt. Le plus souvent, l'application Google n'a pas accès à l'appareil photo : Paramètres > Applications > Google > Autorisations > Appareil photo > Autoriser. Mettez aussi à jour « Services Google Play pour la RA » dans le Play Store, puis relancez. En attendant, le meuble s'ouvre en 3D sans caméra.",
  check: 'Vérifier mon téléphone',
  checking: 'Vérification du téléphone…',
  checkIntro: "Avant d'ouvrir la caméra, on vérifie que votre téléphone est prêt : il vous demandera l'accès à l'appareil photo.",
  launchAr: 'Lancer la réalité augmentée',
  launch3d: 'Voir le meuble en 3D',
  launch3dLink: 'Voir en 3D sans caméra',
  recheck: 'Vérifier à nouveau',
  googleCamera: "L'application Google va s'ouvrir et vous demander à son tour l'accès à l'appareil photo : acceptez.",
  failed: "Le modèle 3D n'a pas pu être préparé.",
  webXrIntro: "Chrome va vous demander l'accès à l'appareil photo : acceptez, puis visez le sol.",
  webXrDenied:
    "L'accès à l'appareil photo a été refusé : autorisez-le pour ce site (cadenas à gauche de l'adresse > Autorisations > Appareil photo), puis relancez.",
  webXrFailed: "La réalité augmentée n'a pas pu démarrer dans la page. Essayez avec l'application Google ou en 3D, ci-dessous.",
  webXrModel: "Le meuble n'a pas pu être chargé en réalité augmentée : relancez, ou affichez-le en 3D.",
  openWithGoogle: "Ouvrir avec l'application Google",
  connection: "La connexion a été coupée pendant l'envoi du modèle 3D : réessayez.",
  expired: "Ce lien a expiré. Affichez un nouveau QR code depuis le configurateur, à l'étape Finitions.",
} as const;

// Message sous le bouton quand Scene Viewer (Android) ne s'est pas ouvert
export const sceneViewerIssueMessage = (issue: SceneViewerIssue) =>
  issue === 'unavailable' ? AR_MESSAGES.unavailable : issue === 'closed-quickly' ? AR_MESSAGES.closedQuickly : AR_MESSAGES.notOpened;

// Ligne de la liste de vérification, avant le lancement sur Android
export const AR_CHECK_LABELS = {
  ar: {
    supported: 'Réalité augmentée compatible (ARCore)',
    unsupported: "Ce téléphone n'est pas compatible avec la réalité augmentée (ARCore)",
    unknown: 'Compatibilité ARCore non vérifiable dans ce navigateur',
  },
  camera: {
    granted: 'Appareil photo arrière disponible',
    denied:
      "Accès à l'appareil photo refusé : autorisez-le pour ce site (cadenas à gauche de l'adresse > Autorisations > Appareil photo), puis vérifiez à nouveau",
    missing: 'Aucun appareil photo arrière trouvé',
    unknown: 'Appareil photo non vérifiable dans ce navigateur',
  },
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

// Consigne affichée par-dessus la caméra pendant la réalité augmentée dans la page
export const WEBXR_PHASE_MESSAGES = {
  starting: 'Ouverture de la caméra…',
  loading: 'Chargement du meuble…',
  searching: 'Visez le sol et bougez doucement le téléphone pour le détecter.',
  placing: "Touchez l'écran pour poser le meuble ici.",
  placed: "Faites glisser le meuble du doigt pour le déplacer, tournez-le à deux doigts. Capture d'écran pour garder la photo.",
} as const;
