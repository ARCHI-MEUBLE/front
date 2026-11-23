// Vérifications faites dans le navigateur avant d'ouvrir Scene Viewer (Android), pour ne pas lancer une application
// qui se refermerait aussitôt. Elles ne disent pas tout : Scene Viewer tourne dans l'application Google, qui a sa propre
// autorisation d'appareil photo. L'autorisation donnée au navigateur confirme seulement que la caméra arrière existe
// et répond.

// ARCore : connu par WebXR (Chrome, Edge). Firefox et Samsung Internet ne le disent pas : 'unknown'
export type ArSupport = 'supported' | 'unsupported' | 'unknown';
// missing : aucune caméra arrière ; unknown : le navigateur ne permet pas de vérifier
export type CameraAccess = 'granted' | 'denied' | 'missing' | 'unknown';

export interface ArReadiness {
  ar: ArSupport;
  camera: CameraAccess;
}

type XrNavigator = Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> }; brave?: unknown };

// Navigateurs Chromium qui ne sont pas Chrome (Edge, Samsung Internet, Opera, Vivaldi, Yandex, navigateurs des
// fabricants), et vues web d'applications (« ; wv) »)
const NOT_GOOGLE_CHROME = /EdgA\/|SamsungBrowser\/|OPR\/|OPT\/|Vivaldi\/|YaBrowser\/|DuckDuckGo\/|MiuiBrowser\/|HuaweiBrowser\/|HeyTapBrowser\/|UCBrowser\/|; wv\)/;

// Seul Google Chrome répond « non » parce que le téléphone n'a pas ARCore. Les autres navigateurs (Edge, Brave, Opera,
// Vivaldi…) disent « non » parce qu'eux-mêmes n'ont pas la réalité augmentée WebXR, alors que l'application Google
// (Scene Viewer) peut l'ouvrir : leur « non » ne vaut que « inconnu ». Brave envoie l'identifiant de Chrome.
export function isWebXrVerdictReliable(userAgent: string, isBrave: boolean): boolean {
  return /Chrome\/\d+/.test(userAgent) && !NOT_GOOGLE_CHROME.test(userAgent) && !isBrave;
}

export async function checkArSupport(): Promise<ArSupport> {
  const nav = navigator as XrNavigator;
  const xr = nav.xr;
  if (!xr?.isSessionSupported) return 'unknown';
  try {
    if (await xr.isSessionSupported('immersive-ar')) return 'supported';
    return isWebXrVerdictReliable(navigator.userAgent, nav.brave !== undefined) ? 'unsupported' : 'unknown';
  } catch {
    return 'unknown';
  }
}

// Ouvre la caméra arrière le temps de la demande d'autorisation, puis l'éteint aussitôt : rien n'est filmé
export async function checkCameraAccess(): Promise<CameraAccess> {
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) return 'unknown';
  try {
    const stream = await media.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
    return 'unknown';
  }
}

export async function checkArReadiness(): Promise<ArReadiness> {
  const [ar, camera] = await Promise.all([checkArSupport(), checkCameraAccess()]);
  return { ar, camera };
}

// Ce que le bouton propose une fois les vérifications faites : la caméra seulement quand rien ne s'y oppose, sinon le
// meuble en 3D (Scene Viewer sans caméra). Une caméra refusée peut être réautorisée : on propose de revérifier.
export function arLaunchPlan({ ar, camera }: ArReadiness): { offerAr: boolean; canRecheck: boolean } {
  return {
    offerAr: ar !== 'unsupported' && camera !== 'missing' && camera !== 'denied',
    canRecheck: camera === 'denied',
  };
}

// Réalité augmentée dans la page (WebXR) : à appeler dans le clic, sinon Chrome refuse. Chrome demande lui-même
// l'accès à la caméra ; « overlay » reste affiché par-dessus la caméra (consignes, boutons).
export function requestImmersiveAr(overlay: HTMLElement): Promise<XRSession> {
  if (!navigator.xr) return Promise.reject(Object.assign(new Error('WebXR indisponible'), { name: 'NotSupportedError' }));
  return navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlay },
  });
}
