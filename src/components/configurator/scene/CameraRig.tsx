import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VIEW_DIRECTIONS, frameBox, type CameraGoal, type ViewPreset } from '@/lib/configurator/cameraFraming';
import type { Box, Vec3 } from '@/lib/configurator/zoneBounds';

// Ce que l'interface (barre d'outils) peut demander à la caméra
export interface CameraApi {
  setView: (view: ViewPreset) => void;
  zoomBy: (factor: number) => void;
  // Cadre le meuble entier, ou la zone sélectionnée (le meuble entier s'il n'y en a pas)
  frame: (what: 'furniture' | 'selection') => void;
}

// Sous-ensemble utilisé des OrbitControls
interface OrbitControlsLike {
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => unknown;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface CameraRigProps {
  furnitureBox: Box;
  selectionBox: Box | null;
  apiRef: MutableRefObject<CameraApi | null>;
}

// Dernière vue de la caméra. Le plan 2D démonte la scène 3D : on retrouve la même vue au retour.
let savedView: { position: Vec3; target: Vec3 } | null = null;

const FURNITURE_MARGIN = 1.12;
const SELECTION_MARGIN = 1.5;
const SELECTION_MIN_DISTANCE = 0.9;
// Rapidité du déplacement animé (plus grand : plus vif)
const TRAVEL_SPEED = 8;

const toVec3 = (vector: THREE.Vector3): Vec3 => [vector.x, vector.y, vector.z];

export function CameraRig({ furnitureBox, selectionBox, apiRef }: CameraRigProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsLike | null;

  const latest = useRef({ furnitureBox, selectionBox, aspect: 1 });
  latest.current = { furnitureBox, selectionBox, aspect: size.width / Math.max(size.height, 1) };

  // Destination en cours : la caméra s'y rend progressivement (aucune tant qu'on ne demande rien)
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const moveTo = useCallback(
    (next: CameraGoal, animate: boolean) => {
      if (!controls) return;
      const position = new THREE.Vector3(...next.position);
      const target = new THREE.Vector3(...next.target);
      if (animate) {
        goal.current = { position, target };
        return;
      }
      goal.current = null;
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    },
    [camera, controls]
  );

  // Direction actuelle de la caméra par rapport au point visé : on la garde quand on recadre
  const currentDirection = useCallback((): Vec3 => {
    if (!controls) return VIEW_DIRECTIONS.threeQuarter;
    const offset = camera.position.clone().sub(controls.target);
    return offset.lengthSq() > 1e-9 ? toVec3(offset.normalize()) : VIEW_DIRECTIONS.threeQuarter;
  }, [camera, controls]);

  const frameFurniture = useCallback(
    (direction: Vec3, animate: boolean) => {
      const { furnitureBox: box, aspect } = latest.current;
      moveTo(frameBox(box, direction, camera.fov, aspect, { margin: FURNITURE_MARGIN }), animate);
    },
    [camera, moveTo]
  );

  // Placement initial : la vue d'avant si on revient du plan 2D, sinon le meuble cadré en vue ¾.
  // Ensuite la caméra ne bouge plus d'elle-même (pas de recadrage quand les dimensions changent, demande
  // utilisateur) : seuls les gestes et les boutons de la barre d'outils la déplacent, dont « Recentrer sur le meuble ».
  const placed = useRef(false);
  useEffect(() => {
    if (!controls || placed.current) return;
    placed.current = true;

    if (savedView) {
      moveTo({ position: savedView.position, target: savedView.target }, false);
    } else {
      frameFurniture(VIEW_DIRECTIONS.threeQuarter, false);
    }
  }, [controls, moveTo, frameFurniture]);

  // Actions demandées par la barre d'outils
  useEffect(() => {
    if (!controls) return;

    apiRef.current = {
      setView: (view) => frameFurniture(VIEW_DIRECTIONS[view], true),

      zoomBy: (factor) => {
        // On part de la destination en cours pour que des clics rapprochés s'additionnent
        const from = goal.current ?? { position: camera.position, target: controls.target };
        const offset = from.position.clone().sub(from.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
        goal.current = { position: from.target.clone().add(offset), target: from.target.clone() };
      },

      frame: (what) => {
        const { furnitureBox: furniture, selectionBox: selection, aspect } = latest.current;
        if (what === 'selection' && selection) {
          moveTo(
            frameBox(selection, currentDirection(), camera.fov, aspect, {
              margin: SELECTION_MARGIN,
              minDistance: SELECTION_MIN_DISTANCE,
            }),
            true
          );
        } else {
          moveTo(frameBox(furniture, currentDirection(), camera.fov, aspect, { margin: FURNITURE_MARGIN }), true);
        }
      },
    };

    return () => {
      apiRef.current = null;
    };
  }, [controls, camera, apiRef, moveTo, frameFurniture, currentDirection]);

  // Mémorise la vue ; toucher à la caméra à la main annule le déplacement animé en cours
  useEffect(() => {
    if (!controls) return;
    const save = () => {
      savedView = { position: toVec3(camera.position), target: toVec3(controls.target) };
    };
    const cancel = () => {
      goal.current = null;
    };
    controls.addEventListener('change', save);
    controls.addEventListener('start', cancel);
    return () => {
      controls.removeEventListener('change', save);
      controls.removeEventListener('start', cancel);
    };
  }, [controls, camera]);

  useFrame((_, delta) => {
    const destination = goal.current;
    if (!destination || !controls) return;

    const k = 1 - Math.exp(-delta * TRAVEL_SPEED);
    camera.position.lerp(destination.position, k);
    controls.target.lerp(destination.target, k);

    const arrived =
      camera.position.distanceToSquared(destination.position) < 1e-6 &&
      controls.target.distanceToSquared(destination.target) < 1e-6;
    if (arrived) {
      camera.position.copy(destination.position);
      controls.target.copy(destination.target);
      goal.current = null;
    }
    controls.update();
  });

  return null;
}
