// Gestion du pointeur dans la vue 3D : distinguer un clic d'un glissement, et repérer un double-clic

// Distance maximale (px) entre l'appui et le relâchement pour que ce soit un clic. Au-delà, c'est un
// glissement (par exemple pour tourner autour du meuble) et il ne doit rien sélectionner ni ouvrir.
// Le doigt est moins précis que la souris.
export const CLICK_TOLERANCE_PX = { mouse: 6, touch: 14 } as const;

// Deux clics sur la même zone en moins de ce délai (ms) ouvrent ou ferment la porte / le tiroir
export const DOUBLE_CLICK_MS = 380;

interface ClickLikeEvent {
  // Distance parcourue par le pointeur depuis l'appui (fournie par react-three-fiber)
  delta: number;
  // Événement natif : un PointerEvent précise s'il s'agit d'un doigt ou d'une souris
  nativeEvent?: object;
}

export function isRealClick(event: ClickLikeEvent): boolean {
  const pointerType = (event.nativeEvent as { pointerType?: string } | undefined)?.pointerType;
  return event.delta <= CLICK_TOLERANCE_PX[pointerType === 'touch' ? 'touch' : 'mouse'];
}

// Repère le second clic d'un double-clic sans dépendre de l'événement « dblclick » du navigateur,
// que les écrans tactiles ne déclenchent pas toujours
export function createDoubleClickDetector(windowMs = DOUBLE_CLICK_MS) {
  let last: { id: string; time: number } | null = null;

  return {
    // Enregistre un clic ; vrai si c'est le second d'un double-clic sur la même zone
    register(id: string, now: number): boolean {
      const isDouble = last !== null && last.id === id && now - last.time <= windowMs;
      last = isDouble ? null : { id, time: now };
      return isDouble;
    },
    reset() {
      last = null;
    },
  };
}
