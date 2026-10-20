import type { Mesh } from 'three';

// Ouverture de la réalité augmentée du téléphone, comme le fait <model-viewer>, sans charger son script : il embarque
// sa propre copie de Three.js, que les pages 3D du site chargent déjà (voir _app.tsx).
// - iPhone / iPad : AR Quick Look. Il exploite tout seul le LiDAR des modèles Pro (pose instantanée, meuble masqué
//   par les objets réels). Il lui faut un fichier USDZ, converti ici depuis le GLB.
// - Android : Scene Viewer (ARCore). Il télécharge lui-même le GLB : son adresse doit être joignable par le téléphone.
// Les deux posent le meuble à taille réelle, sans pincement pour le grandir ou le rétrécir.

export type ArPlatform = 'quick-look' | 'scene-viewer';

type WebKitWindow = Window & { webkit?: { messageHandlers?: unknown } };

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isAndroid = () => /android/i.test(navigator.userAgent);

export const isPhoneOrTablet = () => isIOS() || isAndroid();

// Mêmes règles que <model-viewer> : Quick Look ne s'ouvre pas dans les vues web des applications (Instagram,
// Facebook…), seulement dans Safari et les navigateurs connus ; Scene Viewer ne s'ouvre pas depuis Firefox.
export function getArPlatform(): ArPlatform | null {
  if (typeof window === 'undefined') return null;
  const userAgent = navigator.userAgent;
  if (isIOS()) {
    if ((window as WebKitWindow).webkit?.messageHandlers) {
      return /CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//.test(userAgent) ? 'quick-look' : null;
    }
    return document.createElement('a').relList?.supports?.('ar') ? 'quick-look' : null;
  }
  if (isAndroid() && !/firefox/i.test(userAgent) && !/OculusBrowser/i.test(userAgent)) return 'scene-viewer';
  return null;
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

// Marqueur posé par Chrome quand Scene Viewer est absent (ARCore non installé) : il revient alors sur la page
const NO_AR_HASH = '#ar-indisponible';

// À appeler directement dans le clic : Chrome bloque l'ouverture d'une application sans action de l'utilisateur
export function openSceneViewer(glbPath: string, title: string, onUnavailable: () => void) {
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
  window.addEventListener(
    'hashchange',
    () => {
      if (window.location.hash !== NO_AR_HASH) return;
      window.history.back();
      onUnavailable();
    },
    { once: true }
  );
  const anchor = document.createElement('a');
  anchor.href =
    `intent://arvr.google.com/scene-viewer/1.0?${params}#Intent;scheme=https;package=com.google.ar.core;` +
    `action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end;`;
  anchor.click();
}
