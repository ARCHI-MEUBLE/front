import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { smoothStep } from './smooth';

// Anime l'objet vers une rotation (porte qui s'ouvre) ; la boucle de rendu de la scène s'en charge
export function useSmoothedRotationY(ref: RefObject<THREE.Object3D | null>, target: number) {
  useFrame((_, delta) => {
    const object = ref.current;
    if (object) object.rotation.y = smoothStep(object.rotation.y, target, delta);
  });
}

// Anime l'objet vers une position en profondeur (tiroir qui sort)
export function useSmoothedPositionZ(ref: RefObject<THREE.Object3D | null>, target: number) {
  useFrame((_, delta) => {
    const object = ref.current;
    if (object) object.position.z = smoothStep(object.position.z, target, delta);
  });
}
