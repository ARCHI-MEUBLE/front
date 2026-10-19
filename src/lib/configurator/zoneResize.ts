import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { MIN_COMPARTMENT_HEIGHT_MM, MIN_COMPARTMENT_WIDTH_MM } from './constraints';
import { findParentZone, getChildRatios, getZoneSize } from './zoneStats';

export type ResizeAxis = 'width' | 'height';

// Une zone est réglable dans un axe quand son parent est divisé dans ce sens (colonnes → largeur, étagères → hauteur)
export function canResizeZone(root: Zone, zoneId: string, axis: ResizeAxis): boolean {
  const parent = findParentZone(root, zoneId);
  const direction = axis === 'width' ? 'vertical' : 'horizontal';
  return !!parent && parent.type === direction && (parent.children?.length ?? 0) >= 2;
}

// Fixe la largeur ou la hauteur (mm) d'une zone : le voisin absorbe la différence, sans passer sous la taille minimale
export function setZoneSize(
  root: Zone,
  zoneId: string,
  axis: ResizeAxis,
  sizeMm: number,
  totalWidth: number,
  totalHeight: number
): Zone {
  if (!canResizeZone(root, zoneId, axis)) return root;
  const parent = findParentZone(root, zoneId);
  const parentSize = parent && getZoneSize(root, parent.id, totalWidth, totalHeight);
  if (!parent || !parentSize) return root;

  const siblings = parent.children ?? [];
  const index = siblings.findIndex((child) => child.id === zoneId);
  const neighbor = index < siblings.length - 1 ? index + 1 : index - 1;
  const total = axis === 'width' ? parentSize.width : parentSize.height;
  const min = axis === 'width' ? MIN_COMPARTMENT_WIDTH_MM : MIN_COMPARTMENT_HEIGHT_MM;

  const sizes = getChildRatios(parent).map((ratio) => (ratio / 100) * total);
  const clamped = Math.max(min, Math.min(sizes[index] + sizes[neighbor] - min, sizeMm));
  sizes[neighbor] -= clamped - sizes[index];
  sizes[index] = clamped;
  const splitRatios = sizes.map((size) => (size / total) * 100);

  const visit = (zone: Zone): Zone => {
    if (zone.id === parent.id) return { ...zone, splitRatios };
    return zone.children ? { ...zone, children: zone.children.map(visit) } : zone;
  };
  return visit(root);
}
