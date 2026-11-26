// Appuis d'un bord arrondi (joue arrondie) quand le meuble est surélevé : le socle bois et les pieds métal du caisson
// s'arrêtent à la largeur intérieure, et la joue arrondie, posée à côté à la même hauteur, flottait. Calculs purs, en
// mètres, dans le repère de la scène : x vers la droite, z vers l'avant (mur du fond en -depth/2).

// Retrait du socle bois sous la face avant et arrière, comme celui du caisson (profondeur d - 2 cm)
export const ROUNDED_PLINTH_INSET = 0.01;
// Distance entre un pied métal et les bords qu'il longe, comme les pieds du caisson
export const ROUNDED_FOOT_INSET = 0.05;

export interface RoundedSide {
  // Bord extérieur (enveloppe déclarée du meuble) et bord intérieur (contre le caisson)
  outerX: number;
  innerX: number;
  // Profondeur du meuble et profondeur de l'arrondi
  furnitureDepth: number;
  roundDepth: number;
}

// Socle bois sous la joue : même profil que la joue, en retrait à l'avant et à l'arrière comme le socle du caisson
export function roundedPlinthProfile({ furnitureDepth, roundDepth }: RoundedSide) {
  return {
    wallZ: -furnitureDepth / 2 + ROUNDED_PLINTH_INSET,
    frontZ: furnitureDepth / 2 - ROUNDED_PLINTH_INSET,
    roundDepth: Math.max(0.001, roundDepth - ROUNDED_PLINTH_INSET),
  };
}

// Deux pieds métal sous la joue : un dans l'angle arrière extérieur, un sous l'arrondi (à 45°, ramené vers le centre
// de l'arrondi pour rester sous la courbe). Positions [x, z].
export function roundedFootPositions({ outerX, innerX, furnitureDepth, roundDepth }: RoundedSide): [number, number][] {
  const towardInner = innerX > outerX ? 1 : -1;
  const width = Math.abs(innerX - outerX);
  const inset = Math.min(ROUNDED_FOOT_INSET, width / 2);
  const back: [number, number] = [outerX + towardInner * inset, -furnitureDepth / 2 + ROUNDED_FOOT_INSET];
  const arcCenterZ = furnitureDepth / 2 - roundDepth;
  const front: [number, number] = [
    innerX - towardInner * Math.SQRT1_2 * Math.max(0, width - inset),
    arcCenterZ + Math.SQRT1_2 * Math.max(0, roundDepth - ROUNDED_FOOT_INSET),
  ];
  return [back, front];
}
