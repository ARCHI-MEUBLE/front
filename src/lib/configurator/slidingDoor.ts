// Porte coulissante : 2 ou 3 vantaux qui glissent sur un petit rail plastique noir à deux voies, encastré dans une
// défonce du dessus et du dessous de l'ouverture. Elle est toujours posée à l'intérieur du meuble, quel que soit le
// montage des autres façades. Mêmes valeurs dans le générateur (COULISSANTE_* de procedure_real.py) et dans le prix
// (SlidingDoor.php) : les changer aux trois endroits.

export const SLIDING_DOOR = {
  // Au-delà de cette largeur d'ouverture, 3 vantaux au lieu de 2
  threePanelsAboveMm: 1600,
  // Chevauchement de deux vantaux voisins : fermés, on ne voit pas l'intérieur entre eux
  overlapMm: 30,
  panelThicknessMm: 19,
  // Recul de la voie avant par rapport au chant avant du meuble
  frontSetbackMm: 10,
  // Jeu entre les deux voies du rail
  trackGapMm: 4,
  // Profondeur prise par la porte à l'avant du meuble : les étagères et cloisons derrière elle reculent d'autant
  depthMm: 62,
  // Défonce du rail dans le dessus et le dessous : elle couvre les deux voies, 2 mm de marge de chaque côté
  grooveFromFrontMm: 8,
  grooveWidthMm: 46,
  // Jeu entre le vantail et le dessus ou le dessous (le rail dépasse de 2 mm)
  panelClearanceMm: 3,
  minPanelWidthMm: 300,
  // Les vantaux, le rail et un peu de rangement derrière
  minFurnitureDepthMm: 300,
} as const;

export type SlidingTrack = 'front' | 'back';

export interface SlidingPanel {
  index: number;
  // Bord gauche depuis le bord gauche de l'ouverture, et largeur (mm)
  leftMm: number;
  widthMm: number;
  // Les vantaux alternent : voie avant, voie arrière, voie avant
  track: SlidingTrack;
}

export function slidingPanelCount(openingWidthMm: number): 2 | 3 {
  return openingWidthMm > SLIDING_DOOR.threePanelsAboveMm ? 3 : 2;
}

// Largeur d'ouverture minimale : deux vantaux de largeur minimale qui se chevauchent
export const SLIDING_DOOR_MIN_WIDTH_MM = 2 * SLIDING_DOOR.minPanelWidthMm - SLIDING_DOOR.overlapMm;

// Vantaux d'une ouverture : même largeur pour tous, chevauchement entre voisins, voies alternées
export function slidingPanels(openingWidthMm: number): SlidingPanel[] {
  const count = slidingPanelCount(openingWidthMm);
  const { overlapMm } = SLIDING_DOOR;
  const widthMm = (openingWidthMm + (count - 1) * overlapMm) / count;
  return Array.from({ length: count }, (_, index) => ({
    index,
    leftMm: index * (widthMm - overlapMm),
    widthMm,
    track: index % 2 === 0 ? 'front' : 'back',
  }));
}

// Sens dans lequel la porte s'ouvre : 'right', le vantail de gauche glisse vers la droite ; 'left', celui de droite
// glisse vers la gauche
export type SlidingDirection = 'right' | 'left';

// Ouverture animée : le vantail du bout glisse devant (ou derrière) son voisin, jusqu'au bord de l'ouverture ou
// jusqu'au vantail suivant de sa voie. Décalage signé (mm, positif vers la droite).
export function slidingOpening(openingWidthMm: number, direction: SlidingDirection): { index: number; shiftMm: number } {
  const panels = slidingPanels(openingWidthMm);
  if (direction === 'right') {
    const [first] = panels;
    const nextOnTrack = panels.find((panel) => panel.index > first.index && panel.track === first.track);
    const stopMm = nextOnTrack ? nextOnTrack.leftMm : openingWidthMm;
    return { index: first.index, shiftMm: Math.max(0, stopMm - first.leftMm - first.widthMm) };
  }
  const last = panels[panels.length - 1];
  const previousOnTrack = [...panels].reverse().find((panel) => panel.index < last.index && panel.track === last.track);
  const stopMm = previousOnTrack ? previousOnTrack.leftMm + previousOnTrack.widthMm : 0;
  return { index: last.index, shiftMm: -Math.max(0, last.leftMm - stopMm) };
}

// Ouverture vers la droite (générateur Python, fichier ouvert) : décalage du premier vantail
export function slidingOpenShiftMm(openingWidthMm: number): number {
  return slidingOpening(openingWidthMm, 'right').shiftMm;
}

// Une ouverture sur deux vers la droite, l'autre vers la gauche : le sens change chaque fois que la porte se referme
export function nextSlidingDirection(direction: SlidingDirection, wasOpen: boolean, isOpen: boolean): SlidingDirection {
  if (!wasOpen || isOpen) return direction;
  return direction === 'right' ? 'left' : 'right';
}

// Profondeur du milieu d'un vantail depuis le chant avant du meuble (mm)
export function slidingTrackDepthMm(track: SlidingTrack): number {
  const { frontSetbackMm, panelThicknessMm, trackGapMm } = SLIDING_DOOR;
  const offset = track === 'front' ? 0 : panelThicknessMm + trackGapMm;
  return frontSetbackMm + offset + panelThicknessMm / 2;
}
