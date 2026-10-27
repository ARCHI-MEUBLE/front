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

type XrNavigator = Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } };

export async function checkArSupport(): Promise<ArSupport> {
  const xr = (navigator as XrNavigator).xr;
  if (!xr?.isSessionSupported) return 'unknown';
  try {
    return (await xr.isSessionSupported('immersive-ar')) ? 'supported' : 'unsupported';
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
