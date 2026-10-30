import { describe, expect, it } from 'vitest';
import { VIEW_DIRECTIONS, boxCorners, cameraBasis, fitDistance, frameBox } from './cameraFraming';
import type { Box, Vec3 } from './zoneBounds';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Position à l'écran (−1 à 1) d'un point vu par une caméra placée à `position` et visant `target`
function project(point: Vec3, position: Vec3, target: Vec3, fovDeg: number, aspect: number) {
  const direction: Vec3 = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
  const { forward, right, up } = cameraBasis(direction);
  const relative: Vec3 = [point[0] - position[0], point[1] - position[1], point[2] - position[2]];
  const depth = -dot(relative, forward);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  return { x: dot(relative, right) / (depth * tanV * aspect), y: dot(relative, up) / (depth * tanV), depth };
}

const wide: Box = { center: [0, 0.4, 0], size: [2.4, 0.8, 0.4] };

describe('fitDistance', () => {
  it('matches the hand-computed distance for a front view', () => {
    const box: Box = { center: [0, 0, 0], size: [2, 1, 0.5] };
    // Le coin le plus contraignant : x = 1 × 1,1 de marge, plus proche de la caméra de 0,25
    const tanH = Math.tan((35 * Math.PI) / 360) * 1.6;
    expect(fitDistance(box, [0, 0, 0], [0, 0, 1], 35, 1.6)).toBeCloseTo(0.25 + 1.1 / tanH, 6);
  });

  it('keeps every corner inside the screen, whatever the view', () => {
    for (const [name, direction] of Object.entries(VIEW_DIRECTIONS)) {
      for (const aspect of [0.6, 1, 1.78]) {
        const goal = frameBox(wide, direction, 35, aspect);
        for (const corner of boxCorners(wide)) {
          const { x, y, depth } = project(corner, goal.position, goal.target, 35, aspect);
          expect(depth, `${name} ${aspect}`).toBeGreaterThan(0);
          expect(Math.abs(x), `${name} ${aspect} x`).toBeLessThanOrEqual(1);
          expect(Math.abs(y), `${name} ${aspect} y`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('fills the screen instead of leaving the furniture small', () => {
    const goal = frameBox(wide, VIEW_DIRECTIONS.front, 35, 1.2);
    const xs = boxCorners(wide).map((corner) => Math.abs(project(corner, goal.position, goal.target, 35, 1.2).x));
    // Meuble de face : il occupe au moins 80 % de la largeur de l'écran
    expect(Math.max(...xs)).toBeGreaterThan(0.8);
  });

  it('moves further away for bigger furniture and closer for a zoomed zone', () => {
    const big: Box = { center: [0, 0.6, 0], size: [2.8, 1.2, 0.5] };
    const small: Box = { center: [0, 0.4, 0], size: [0.5, 0.4, 0.4] };
    const direction = VIEW_DIRECTIONS.threeQuarter;
    expect(fitDistance(big, big.center, direction, 35, 1.2)).toBeGreaterThan(fitDistance(wide, wide.center, direction, 35, 1.2));
    expect(fitDistance(small, small.center, direction, 35, 1.2)).toBeLessThan(fitDistance(wide, wide.center, direction, 35, 1.2));
  });

  it('respects a minimum distance', () => {
    const tiny: Box = { center: [0, 0, 0], size: [0.05, 0.05, 0.05] };
    const goal = frameBox(tiny, VIEW_DIRECTIONS.front, 35, 1.2, { minDistance: 0.9 });
    expect(Math.hypot(...goal.position)).toBeCloseTo(0.9, 6);
  });
});

describe('cameraBasis', () => {
  it('gives an orthonormal basis, including from straight above', () => {
    for (const direction of Object.values(VIEW_DIRECTIONS)) {
      const { forward, right, up } = cameraBasis(direction);
      expect(Math.hypot(...forward)).toBeCloseTo(1, 6);
      expect(dot(forward, right)).toBeCloseTo(0, 6);
      expect(dot(forward, up)).toBeCloseTo(0, 6);
      expect(dot(right, up)).toBeCloseTo(0, 6);
    }
  });

  it('keeps the furniture upright on screen from the front and from above', () => {
    // De face, le haut du meuble est en haut de l'écran
    expect(cameraBasis(VIEW_DIRECTIONS.front).up[1]).toBeGreaterThan(0.9);
    // Du dessus, le fond du meuble (−z) est en haut de l'écran
    expect(cameraBasis(VIEW_DIRECTIONS.top).up[2]).toBeLessThan(-0.9);
  });
});
