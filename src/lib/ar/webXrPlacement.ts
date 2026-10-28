import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Réalité augmentée dans la page (WebXR, Chrome Android avec ARCore), sans passer par l'application Google :
// le meuble suit le sol visé jusqu'au premier toucher, puis se déplace au doigt et tourne à deux doigts.

// loading : modèle en chargement ; searching : sol pas encore trouvé ; placing : touchez pour poser ;
// estimated : sol introuvable, meuble posé à hauteur estimée devant le visiteur ; placed : posé
export type WebXrPhase = 'loading' | 'searching' | 'placing' | 'estimated' | 'placed';

export interface WebXrPlacement {
  rotate: (radians: number) => void;
  end: () => void;
}

interface Options {
  session: XRSession;
  glbUrl: string;
  onPhase: (phase: WebXrPhase) => void;
  onError: (error: unknown) => void;
  onEnd: () => void;
  // Diagnostic (?debug=1 dans l'adresse) : état du moteur deux fois par seconde, à lire sur le téléphone
  onDebug?: (info: string) => void;
}

// Une surface tournée vers le haut (sol, ou à défaut un tapis, une marche) : pas un mur
const UP = new THREE.Vector3(0, 1, 0);
const normal = new THREE.Vector3();
const isFloorLike = (matrix: THREE.Matrix4) => normal.set(0, 1, 0).transformDirection(matrix).dot(UP) > 0.7;

// Sol toujours pas trouvé après ce délai (pièce sombre, sol uni) : le meuble est posé quand même, à 2 m devant le
// visiteur et 1,4 m sous le téléphone (tenu à hauteur de poitrine), pour qu'il ne reste pas devant un écran vide
const FLOOR_TIMEOUT_MS = 6000;
const ESTIMATED_DISTANCE = 2;
const ESTIMATED_PHONE_HEIGHT = 1.4;

// Premier point d'impact sur une surface tournée vers le haut, dans matrix
function floorHit(poses: (XRPose | undefined)[], matrix: THREE.Matrix4): boolean {
  return poses.some((pose) => pose !== undefined && isFloorLike(matrix.fromArray(pose.transform.matrix)));
}

export async function runWebXrPlacement({ session, glbUrl, onPhase, onError, onEnd, onDebug }: Options): Promise<WebXrPlacement> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  // Hors de la vue (seule la caméra et l'overlay s'affichent pendant la session), mais attaché à la page comme dans
  // les exemples Three.js : certains navigateurs n'affichent rien d'un canvas détaché
  Object.assign(renderer.domElement.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(0.6, 3, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 6 });

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;

  // Le meuble et son ombre au sol, déplacés ensemble ; la lumière suit pour garder l'ombre sous le meuble
  const furniture = new THREE.Group();
  furniture.visible = false;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.3 }));
  shadow.receiveShadow = true;
  furniture.add(shadow, sun, sun.target);
  scene.add(reticle, furniture);

  let model: THREE.Object3D | null = null;
  let placed = false;
  let rotatedByUser = false;
  let dragging = false;
  let estimated = false;
  let searchingSince = 0;
  let phase: WebXrPhase | null = null;
  const setPhase = (next: WebXrPhase) => {
    if (next !== phase) onPhase((phase = next));
  };

  await renderer.xr.setSession(session);
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const centerHits = await session.requestHitTestSource?.({ space: viewerSpace });
  const touchHits = await session.requestHitTestSourceForTransientInput?.({ profile: 'generic-touchscreen' });
  if (!centerHits) throw new Error('hit-test indisponible');

  new GLTFLoader()
    .loadAsync(glbUrl)
    .then((gltf) => {
      model = gltf.scene;
      model.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) object.castShadow = true;
      });
      model.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes++;
      });
      furniture.add(model);
    })
    .catch((error) => {
      onError(error);
      void session.end().catch(() => undefined);
    });

  // Un toucher pose le meuble ; ensuite, un doigt qui glisse le déplace (selectstart → selectend)
  session.addEventListener('selectstart', () => {
    dragging = placed;
  });
  session.addEventListener('selectend', () => {
    dragging = false;
  });
  session.addEventListener('select', () => {
    if (placed || !model || !furniture.visible) return;
    placed = true;
    reticle.visible = false;
  });

  const cameraPosition = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const hitMatrix = new THREE.Matrix4();
  const xrCamera = renderer.xr.getCamera();

  const faceVisitor = () => {
    if (rotatedByUser) return;
    xrCamera.getWorldPosition(cameraPosition);
    furniture.rotation.y = Math.atan2(cameraPosition.x - furniture.position.x, cameraPosition.z - furniture.position.z);
  };

  let frames = 0;
  let lastDebug = 0;
  let meshes = 0;
  const gl = renderer.getContext();
  const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(gl.getParameter(gpuInfo ? gpuInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));

  // Cube rouge sans éclairage posé à 1 m devant le téléphone : s'il ne s'affiche pas, aucun dessin WebGL n'atteint
  // l'écran, et le meuble n'y est pour rien
  const testCube = onDebug ? new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0xff0000 })) : null;
  if (testCube) {
    testCube.visible = false;
    scene.add(testCube);
  }

  // Couche dans laquelle Three.js dessine : XRWebGLLayer classique, ou couche de projection (WebXR Layers)
  const layerInfo = () => {
    const layer = renderer.xr.getBaseLayer();
    if (!layer) return 'couche ?';
    return 'framebufferWidth' in layer
      ? `WebGLLayer ${layer.framebufferWidth}×${layer.framebufferHeight}`
      : `projection ${layer.textureWidth}×${layer.textureHeight}`;
  };

  // Dans le champ de la caméra : boîte du meuble (ou position du cube) dans le cône de vue de l'image précédente
  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const box = new THREE.Box3();
  const onScreen = (object: THREE.Object3D) => {
    frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(xrCamera.projectionMatrix, xrCamera.matrixWorldInverse));
    return frustum.intersectsBox(box.setFromObject(object)) ? 'oui' : 'non';
  };

  const debug = (time: number, onFloor: boolean) => {
    if (!onDebug || time - lastDebug < 500) return;
    lastDebug = time;
    xrCamera.getWorldPosition(cameraPosition);
    const p = furniture.position;
    const fmt = (v: THREE.Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
    onDebug(
      `images ${frames} · pièces ${meshes} · visible ${furniture.visible ? 'oui' : 'non'} · sol ${onFloor ? 'oui' : 'non'} · anneau ${reticle.visible ? 'oui' : 'non'}
` +
        `meuble ${fmt(p)} · téléphone ${fmt(cameraPosition)} · distance ${p.distanceTo(cameraPosition).toFixed(2)} m
` +
        `à l'écran : meuble ${model && furniture.visible ? onScreen(model) : '-'} · cube ${testCube?.visible ? onScreen(testCube) : '-'}
` +
        `XR ${renderer.xr.isPresenting ? 'oui' : 'non'} · ${session.environmentBlendMode ?? '?'} · overlay ${session.domOverlayState?.type ?? 'non'} · ${layerInfo()} · ${gpu}`
    );
  };

  renderer.setAnimationLoop((time, frame) => {
    frames++;
    // La pose de la caméra n'est connue qu'après quelques images rendues
    if (testCube && !testCube.visible && frames > 10) {
      xrCamera.getWorldPosition(cameraPosition);
      xrCamera.getWorldDirection(forward);
      testCube.position.copy(cameraPosition).addScaledVector(forward, 1);
      testCube.visible = true;
    }
    const space = renderer.xr.getReferenceSpace();
    if (frame && space) {
      const onFloor = floorHit(frame.getHitTestResults(centerHits).map((hit) => hit.getPose(space)), hitMatrix);
      if (onFloor) estimated = false;

      if (!placed) {
        reticle.visible = onFloor;
        if (onFloor) reticle.matrix.copy(hitMatrix);
        if (!model || onFloor) searchingSince = time;
        if (model && !onFloor && time - searchingSince > FLOOR_TIMEOUT_MS) estimated = true;

        if (model && onFloor) {
          furniture.visible = true;
          furniture.position.setFromMatrixPosition(hitMatrix);
          faceVisitor();
        } else if (model && estimated) {
          xrCamera.getWorldPosition(cameraPosition);
          xrCamera.getWorldDirection(forward).setY(0);
          if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
          furniture.visible = true;
          furniture.position
            .copy(cameraPosition)
            .addScaledVector(forward.normalize(), ESTIMATED_DISTANCE)
            .setY(cameraPosition.y - ESTIMATED_PHONE_HEIGHT);
          faceVisitor();
        }
      } else if (dragging && touchHits) {
        // Un seul doigt : à deux doigts, le visiteur tourne le meuble, il ne le déplace pas
        const touches = frame.getHitTestResultsForTransientInput(touchHits);
        if (touches.length === 1 && floorHit(touches[0].results.map((hit) => hit.getPose(space)), hitMatrix)) {
          furniture.position.setFromMatrixPosition(hitMatrix);
        }
      }

      setPhase(!model ? 'loading' : placed ? 'placed' : onFloor ? 'placing' : estimated ? 'estimated' : 'searching');
      debug(time, onFloor);
    }
    renderer.render(scene, camera);
  });

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
    centerHits.cancel();
    touchHits?.cancel();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    onEnd();
  });

  return {
    rotate: (radians) => {
      rotatedByUser = true;
      furniture.rotation.y += radians;
    },
    end: () => void session.end().catch(() => undefined),
  };
}
