import type { Mesh } from 'three';

// Ouverture de la réalité augmentée du téléphone, comme le fait <model-viewer>, sans charger son script : il embarque
// sa propre copie de Three.js, que les pages 3D du site chargent déjà (voir _app.tsx).
// - iPhone / iPad : AR Quick Look. Il exploite tout seul le LiDAR des modèles Pro (pose instantanée, meuble masqué
//   par les objets réels). Il lui faut un fichier USDZ, converti ici depuis le GLB.
// - Android : Scene Viewer (ARCore), lancé par l'application Google. Il télécharge lui-même le GLB : son adresse doit
//   être joignable par le téléphone, en https.
// Les deux posent le meuble à taille réelle, sans pincement pour le grandir ou le rétrécir.

export type ArPlatform = 'quick-look' | 'scene-viewer';

// Ce que la détection lit du navigateur, à part pour pouvoir la tester sur des navigateurs réels
export interface BrowserTraits {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  // Vue web d'application (WKWebView) : sur iPhone, Chrome, Edge et Firefox en sont aussi
  inWebView: boolean;
  // Le lien <a rel="ar"> de Quick Look est reconnu (Safari)
  supportsArLinks: boolean;
}

// iPadOS se présente comme un Mac : on le reconnaît à son écran tactile
const isIOSDevice = ({ userAgent, platform, maxTouchPoints }: BrowserTraits) =>
  /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);

const isAndroidDevice = ({ userAgent }: BrowserTraits) => /android/i.test(userAgent);

// iPhone et iPad : mêmes règles que <model-viewer>. Quick Look s'ouvre dans Safari et dans les navigateurs connus
// (Chrome, Edge, Firefox, DuckDuckGo), pas dans les vues web des applications (Instagram, Facebook…) ni dans
// l'application Google. Android : Scene Viewer depuis tous les navigateurs. <model-viewer> écarte encore Firefox, qui
// ouvre pourtant les liens intent:// après avoir demandé la permission d'ouvrir l'application Google.
export function arPlatformFor(traits: BrowserTraits): ArPlatform | null {
  const { userAgent } = traits;
  if (isIOSDevice(traits)) {
    if (/GSA\//.test(userAgent)) return null;
    if (traits.inWebView) return /CriOS\/|EdgiOS\/|FxiOS\/|DuckDuckGo\//.test(userAgent) ? 'quick-look' : null;
    return traits.supportsArLinks ? 'quick-look' : null;
  }
  if (isAndroidDevice(traits) && !/OculusBrowser/i.test(userAgent)) return 'scene-viewer';
  return null;
}

type WebKitWindow = Window & { webkit?: { messageHandlers?: unknown } };

function browserTraits(): BrowserTraits {
  let supportsArLinks = false;
  try {
    supportsArLinks = Boolean(document.createElement('a').relList?.supports?.('ar'));
  } catch {
    // relList.supports lève une erreur dans les navigateurs qui ne connaissent aucune valeur de rel
  }
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    inWebView: Boolean((window as WebKitWindow).webkit?.messageHandlers),
    supportsArLinks,
  };
}

export function isPhoneOrTablet(): boolean {
  const traits = browserTraits();
  return isIOSDevice(traits) || isAndroidDevice(traits);
}

export function getArPlatform(): ArPlatform | null {
  if (typeof window === 'undefined') return null;
  return arPlatformFor(browserTraits());
}

// GLB → USDZ pour Quick Look (adresse blob: à libérer avec URL.revokeObjectURL)
export async function createUsdzUrl(glbPath: string): Promise<string> {
  const [{ GLTFLoader }, { USDZExporter }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/exporters/USDZExporter.js'),
  ]);
  const gltf = await new GLTFLoader().loadAsync(glbPath);
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;
    // Le générateur n'écrit pas de normales : sans elles l'export les met à zéro et Quick Look affiche le meuble noir.
    // Sommets dédoublés par face, pour des arêtes vives au lieu d'un éclairage lissé sur les coins des planches.
    if (mesh.isMesh && !mesh.geometry.getAttribute('normal')) {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      geometry.computeVertexNormals();
      mesh.geometry = geometry;
    }
  });
  gltf.scene.updateMatrixWorld(true);
  const usdz = await new USDZExporter().parseAsync(gltf.scene, { quickLookCompatible: true });
  return URL.createObjectURL(new Blob([usdz], { type: 'model/vnd.usdz+zip' }));
}

// À appeler directement dans le clic : iOS n'ouvre Quick Look que sur une action de l'utilisateur
export function openQuickLook(usdzUrl: string) {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  // Quick Look n'accepte le lien que s'il contient une image
  anchor.appendChild(document.createElement('img'));
  anchor.setAttribute('href', `${usdzUrl}#allowsContentScaling=0`);
  anchor.setAttribute('download', 'meuble.usdz');
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

// Ce qui a empêché Scene Viewer de s'ouvrir :
// - unavailable : le navigateur est revenu sur la page, faute d'application Google pour l'ouvrir ;
// - not-opened : la page est restée affichée (vue web d'une application qui ignore le lien, ouverture refusée).
export type SceneViewerIssue = 'unavailable' | 'not-opened';

// Marqueur posé par le navigateur quand Scene Viewer ne peut pas s'ouvrir : il revient alors sur la page
const NO_AR_HASH = '#ar-indisponible';
// Scene Viewer ouvert, la page passe en arrière-plan. Toujours affichée après ce délai : rien ne s'est ouvert
const NOT_OPENED_DELAY_MS = 4000;
// Le retour de secours suit de près le clic (Firefox attend la réponse à sa question) ; plus tard, ce n'est plus lui
const FALLBACK_WATCH_MS = 60000;

let stopWatchingLaunch: (() => void) | null = null;

// À appeler directement dans le clic : les navigateurs bloquent l'ouverture d'une application sans action de
// l'utilisateur. Scene Viewer passe par l'application Google (installée sur presque tous les Android), comme
// <model-viewer> : sans ARCore, il montre le meuble en 3D au lieu d'échouer. onIssue(null) : Scene Viewer s'est ouvert.
export function openSceneViewer(glbPath: string, title: string, onIssue: (issue: SceneViewerIssue | null) => void) {
  // Un seul lancement suivi à la fois : sinon un retour de secours tardif reviendrait plusieurs fois en arrière
  stopWatchingLaunch?.();

  const fallback = new URL(window.location.href);
  fallback.hash = NO_AR_HASH;
  const params = new URLSearchParams({
    file: new URL(glbPath, window.location.href).toString(),
    mode: 'ar_preferred',
    resizable: 'false',
    // Comme <model-viewer> : l'occlusion par la profondeur estimée fait clignoter les bords du meuble contre le mur
    disable_occlusion: 'true',
    title,
  });

  const onHashChange = () => {
    if (window.location.hash !== NO_AR_HASH) return;
    stop();
    window.history.back();
    onIssue('unavailable');
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'hidden') return;
    window.clearTimeout(notOpenedTimer);
    onIssue(null);
  };
  const notOpenedTimer = window.setTimeout(() => {
    if (document.visibilityState === 'visible') onIssue('not-opened');
  }, NOT_OPENED_DELAY_MS);
  const watchTimer = window.setTimeout(() => stop(), FALLBACK_WATCH_MS);
  function stop() {
    window.clearTimeout(notOpenedTimer);
    window.clearTimeout(watchTimer);
    window.removeEventListener('hashchange', onHashChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (stopWatchingLaunch === stop) stopWatchingLaunch = null;
  }
  stopWatchingLaunch = stop;
  window.addEventListener('hashchange', onHashChange);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const anchor = document.createElement('a');
  anchor.href =
    `intent://arvr.google.com/scene-viewer/1.2?${params}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
    `action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end;`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
