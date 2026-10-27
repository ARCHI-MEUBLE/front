import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Réalité augmentée dans la page (WebXR, Chrome Android avec ARCore), sans passer par l'application Google :
// le meuble suit le sol visé jusqu'au premier toucher, puis se déplace au doigt et tourne à deux doigts.

// loading : modèle en chargement ; searching : sol pas encore trouvé ; placing : touchez pour poser ; placed : posé
export type WebXrPhase = 'loading' | 'searching' | 'placing' | 'placed';

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
}

// Le sol seulement : un mur ou le dessus d'une table ne servent pas à poser un meuble
const UP = new THREE.Vector3(0, 1, 0);
const isFloorLike = (matrix: THREE.Matrix4) =>
  new THREE.Vector3(0, 1, 0).transformDirection(matrix).dot(UP) > 0.9;

export async function runWebXrPlacement({ session, glbUrl, onPhase, onError, onEnd }: Options): Promise<WebXrPlacement> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');

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
  const hitMatrix = new THREE.Matrix4();
  const hitPosition = new THREE.Vector3();

  renderer.setAnimationLoop((_time, frame) => {
    const space = renderer.xr.getReferenceSpace();
    if (frame && space) {
      const pose = frame.getHitTestResults(centerHits).map((hit) => hit.getPose(space)).find(Boolean);
      const onFloor = pose ? isFloorLike(hitMatrix.fromArray(pose.transform.matrix)) : false;

      if (!placed) {
        reticle.visible = onFloor;
        if (onFloor) reticle.matrix.copy(hitMatrix);
        if (onFloor && model) {
          furniture.visible = true;
          furniture.position.setFromMatrixPosition(hitMatrix);
          // Face au visiteur tant qu'il ne l'a pas tourné lui-même
          if (!rotatedByUser) {
            renderer.xr.getCamera().getWorldPosition(cameraPosition);
            furniture.rotation.y = Math.atan2(cameraPosition.x - furniture.position.x, cameraPosition.z - furniture.position.z);
          }
        }
      } else if (dragging && touchHits) {
        // Un seul doigt : à deux doigts, le visiteur tourne le meuble, il ne le déplace pas
        const touches = frame.getHitTestResultsForTransientInput(touchHits);
        const touchPose = touches.length === 1 ? touches[0].results[0]?.getPose(space) : undefined;
        if (touchPose && isFloorLike(hitMatrix.fromArray(touchPose.transform.matrix))) {
          furniture.position.copy(hitPosition.setFromMatrixPosition(hitMatrix));
        }
      }

      setPhase(!model ? 'loading' : placed ? 'placed' : onFloor ? 'placing' : 'searching');
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
