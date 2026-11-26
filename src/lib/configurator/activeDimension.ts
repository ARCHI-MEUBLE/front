import { useSyncExternalStore } from 'react';

// Dimension que l'utilisateur est en train de régler, pour que le plan 2D l'éclaire :
// - meuble entier (champs Largeur et Hauteur de l'étape Dimensions) : la ligne de cote générale ;
// - zone (champs Largeur et Hauteur de la zone sélectionnée, cloison ou étagère glissée dans le plan) : le nombre
//   correspondant dans la case sélectionnée.
// Partagée au niveau du module : le plan et les champs sont dans des composants distincts.
export type DimensionAxis = 'width' | 'height';
export type DimensionScope = 'furniture' | 'zone';

export interface ActiveDimension {
  scope: DimensionScope;
  axis: DimensionAxis;
}

let active: ActiveDimension | null = null;
const listeners = new Set<() => void>();

export function setActiveDimension(next: ActiveDimension | null): void {
  if (next?.scope === active?.scope && next?.axis === active?.axis) return;
  active = next ? { scope: next.scope, axis: next.axis } : null;
  listeners.forEach((notify) => notify());
}

export function getActiveDimension(): ActiveDimension | null {
  return active;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useActiveDimension(): ActiveDimension | null {
  return useSyncExternalStore(subscribe, getActiveDimension, () => null);
}

// L'axe éclairé pour une portée donnée, ou null
export function activeAxis(dimension: ActiveDimension | null, scope: DimensionScope): DimensionAxis | null {
  return dimension?.scope === scope ? dimension.axis : null;
}

// Glisser une cloison change des largeurs, glisser une étagère des hauteurs
export function dimensionForDivider(groupType: string): ActiveDimension | null {
  if (groupType === 'vertical') return { scope: 'zone', axis: 'width' };
  if (groupType === 'horizontal') return { scope: 'zone', axis: 'height' };
  return null;
}

// Gestionnaires à poser sur le bloc d'un champ : la dimension s'éclaire au survol et pendant la saisie, et s'éteint
// quand le pointeur et le focus l'ont tous deux quitté
export function dimensionFieldHandlers(dimension: ActiveDimension) {
  return {
    onPointerEnter: () => setActiveDimension(dimension),
    onPointerLeave: (event: { currentTarget: HTMLElement }) => {
      if (!event.currentTarget.contains(document.activeElement)) setActiveDimension(null);
    },
    onFocus: () => setActiveDimension(dimension),
    onBlur: (event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveDimension(null);
    },
  };
}

// Cote « hauteur × largeur » découpée pour éclairer l'un des deux nombres. Les formats viennent de layoutLeafText :
// « 313 × 513 mm » ou, dans une petite case, « 313×513 ».
export function splitDimsText(text: string): { height: string; separator: string; width: string; suffix: string } | null {
  const match = /^(\d+)(\s?×\s?)(\d+)(\s*mm)?$/.exec(text);
  if (!match) return null;
  return { height: match[1], separator: match[2], width: match[3], suffix: match[4] ?? '' };
}
