import type { Box, Vec3 } from './zoneBounds';

// Cadrage de la caméra 3D : à quelle distance placer la caméra pour qu'une boîte remplisse la vue

export type ViewPreset = 'front' | 'threeQuarter' | 'side' | 'top';

// Direction depuis le centre du meuble vers la caméra (le meuble regarde vers +z)
export const VIEW_DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0.1, 1],
  threeQuarter: [0.58, 0.28, 0.76],
  side: [1, 0.1, 0.02],
  top: [0, 1, 0.02],
};

export const VIEW_LABELS: Record<ViewPreset, string> = {
  front: 'Face',
  threeQuarter: '¾',
  side: 'Côté',
  top: 'Dessus',
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

export function boxCorners({ center, size }: Box): Vec3[] {
  const corners: Vec3[] = [];
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) {
        corners.push([center[0] + sx * size[0], center[1] + sy * size[1], center[2] + sz * size[2]]);
      }
    }
  }
  return corners;
}

// Repère de la caméra : avant (vers la caméra), droite et haut
export function cameraBasis(direction: Vec3): { forward: Vec3; right: Vec3; up: Vec3 } {
  const forward = normalize(direction);
  // Vue du dessus : l'axe vertical du monde est dégénéré, on s'appuie sur la profondeur
  const reference: Vec3 = Math.abs(forward[1]) > 0.98 ? [0, 0, -1] : [0, 1, 0];
  const right = normalize(cross(reference, forward));
  return { forward, right, up: cross(forward, right) };
}

/**
 * Distance entre la caméra et le point visé pour que toute la boîte rentre dans la vue.
 * `margin` agrandit la boîte (1,1 : 10 % de marge autour). Tient compte du ratio de l'écran et de la
 * perspective : chaque coin doit rester dans le champ de vision.
 */
export function fitDistance(box: Box, target: Vec3, direction: Vec3, verticalFovDeg: number, aspect: number, margin = 1.1): number {
  const { forward, right, up } = cameraBasis(direction);
  const tanVertical = Math.tan((verticalFovDeg * Math.PI) / 360);
  const tanHorizontal = tanVertical * aspect;

  let distance = 0;
  for (const corner of boxCorners(box)) {
    const relative: Vec3 = [corner[0] - target[0], corner[1] - target[1], corner[2] - target[2]];
    const depth = dot(relative, forward); // vers la caméra : plus il est grand, plus le coin est proche
    distance = Math.max(
      distance,
      depth + (Math.abs(dot(relative, right)) * margin) / tanHorizontal,
      depth + (Math.abs(dot(relative, up)) * margin) / tanVertical
    );
  }
  return Math.max(distance, 0.1);
}

export interface CameraGoal {
  position: Vec3;
  target: Vec3;
}

// Position et point visé pour cadrer une boîte depuis une direction
export function frameBox(
  box: Box,
  direction: Vec3,
  verticalFovDeg: number,
  aspect: number,
  { margin = 1.1, minDistance = 0 }: { margin?: number; minDistance?: number } = {}
): CameraGoal {
  const distance = Math.max(fitDistance(box, box.center, direction, verticalFovDeg, aspect, margin), minDistance);
  const unit = normalize(direction);
  return {
    target: box.center,
    position: [
      box.center[0] + unit[0] * distance,
      box.center[1] + unit[1] * distance,
      box.center[2] + unit[2] * distance,
    ],
  };
}
