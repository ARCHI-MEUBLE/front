import { describe, expect, it } from 'vitest';
import { ROUNDED_FOOT_INSET, ROUNDED_PLINTH_INSET, roundedFootPositions, roundedPlinthProfile, type RoundedSide } from './roundedBase';

// Meuble de 2,44 m × 0,55 m, joue gauche de 275 mm, arrondie sur 300 mm
const LEFT: RoundedSide = { outerX: -1.22, innerX: -0.945, furnitureDepth: 0.55, roundDepth: 0.3 };
const RIGHT: RoundedSide = { outerX: 1.22, innerX: 0.67, furnitureDepth: 0.55, roundDepth: 0.3 };

// Le point (x, z) est-il dans le profil de la joue (bloc plein côté mur, quart d'ellipse côté avant) ?
function insideRoundedSide({ outerX, innerX, furnitureDepth, roundDepth }: RoundedSide, [x, z]: [number, number]) {
  const width = Math.abs(innerX - outerX);
  const fromInner = (innerX - x) * Math.sign(innerX - outerX);
  if (fromInner < 0 || fromInner > width || z < -furnitureDepth / 2 || z > furnitureDepth / 2) return false;
  const arcCenterZ = furnitureDepth / 2 - roundDepth;
  if (z <= arcCenterZ) return true;
  return (fromInner / width) ** 2 + ((z - arcCenterZ) / roundDepth) ** 2 <= 1;
}

describe('roundedFootPositions', () => {
  it('puts both metal feet under the rounded side, never outside its curve', () => {
    for (const side of [LEFT, RIGHT, { ...LEFT, outerX: -1.22, innerX: -1.16, roundDepth: 0.06 }]) {
      const feet = roundedFootPositions(side);
      expect(feet).toHaveLength(2);
      feet.forEach((foot) => expect(insideRoundedSide(side, foot)).toBe(true));
    }
  });

  it('keeps the back foot in the outer back corner, like the feet of the carcass', () => {
    const [back] = roundedFootPositions(LEFT);
    expect(back[0]).toBeCloseTo(LEFT.outerX + ROUNDED_FOOT_INSET);
    expect(back[1]).toBeCloseTo(-LEFT.furnitureDepth / 2 + ROUNDED_FOOT_INSET);
    expect(roundedFootPositions(RIGHT)[0][0]).toBeCloseTo(RIGHT.outerX - ROUNDED_FOOT_INSET);
  });
});

describe('roundedPlinthProfile', () => {
  it('sets the wooden base back from the front and the wall like the base of the carcass', () => {
    const profile = roundedPlinthProfile(LEFT);
    expect(profile.wallZ).toBeCloseTo(-0.275 + ROUNDED_PLINTH_INSET);
    expect(profile.frontZ).toBeCloseTo(0.275 - ROUNDED_PLINTH_INSET);
    // Même centre d'arrondi que la joue : le socle suit sa courbe
    expect(profile.frontZ - profile.roundDepth).toBeCloseTo(LEFT.furnitureDepth / 2 - LEFT.roundDepth);
  });
});
