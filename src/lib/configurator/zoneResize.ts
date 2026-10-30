import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { MIN_COMPARTMENT_HEIGHT_MM, MIN_COMPARTMENT_WIDTH_MM } from './constraints';
import { findParentZone, getChildRatios, getZoneSize } from './zoneStats';

export type ResizeAxis = 'width' | 'height';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Proportions d'un groupe. Les deux champs restent d'accord : selon l'endroit du code, on lit splitRatio
// (deux enfants) ou splitRatios en premier, et un splitRatio périmé masquait un réglage fait dans splitRatios.
export function applySplitRatios(root: Zone, zoneId: string, ratios: number[]): Zone {
  const visit = (zone: Zone): Zone => {
    if (zone.id === zoneId) {
      if (zone.type === 'leaf' || zone.children?.length !== ratios.length) return zone;
      return { ...zone, splitRatios: ratios, splitRatio: ratios.length === 2 ? ratios[0] : undefined };
    }
    return zone.children ? { ...zone, children: zone.children.map(visit) } : zone;
  };
  return visit(root);
}

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
  return applySplitRatios(root, parent.id, sizes.map((size) => (size / total) * 100));
}

// Plus petite taille (mm) d'une zone dans un axe : une case garde la taille minimale d'un compartiment, un groupe
// divisé dans cet axe additionne celles de ses enfants, un groupe divisé dans l'autre sens prend la plus grande.
// Ainsi une colonne qui en contient deux ne descend pas sous deux largeurs minimales.
export function minZoneSizeMm(zone: Zone, axis: ResizeAxis): number {
  const children = zone.children ?? [];
  if (zone.type === 'leaf' || children.length === 0) {
    return axis === 'width' ? MIN_COMPARTMENT_WIDTH_MM : MIN_COMPARTMENT_HEIGHT_MM;
  }
  const sizes = children.map((child) => minZoneSizeMm(child, axis));
  const splitsAlongAxis = zone.type === (axis === 'width' ? 'vertical' : 'horizontal');
  return splitsAlongAxis ? sizes.reduce((sum, size) => sum + size, 0) : Math.max(...sizes);
}

// Déplace la limite entre les enfants `index` et `index + 1` d'un groupe (glisser une cloison ou une étagère,
// dans le plan 2D comme dans la vue 3D). `targetPercent` : part cumulée voulue des enfants qui précèdent la limite.
// Seuls les deux voisins changent ; chacun garde sa taille minimale, et la limite bute dessus au lieu de se figer.
// Une zone déjà plus petite que son minimum (ancienne configuration) peut grandir mais pas rétrécir.
// Renvoie les nouvelles proportions, ou null si la limite bouge de moins de `minStepPercent`.
export function moveDivider(
  group: Zone,
  index: number,
  targetPercent: number,
  groupSizeMm: number,
  minStepPercent = 0
): number[] | null {
  const children = group.children ?? [];
  if (group.type === 'leaf' || index < 0 || index >= children.length - 1 || !(groupSizeMm > 0)) return null;

  const axis: ResizeAxis = group.type === 'vertical' ? 'width' : 'height';
  const ratios = getChildRatios(group);
  const minShare = (i: number) => Math.min(ratios[i], (minZoneSizeMm(children[i], axis) / groupSizeMm) * 100);

  const before = ratios.slice(0, index + 1).reduce((sum, ratio) => sum + ratio, 0);
  const delta = clamp(targetPercent - before, minShare(index) - ratios[index], ratios[index + 1] - minShare(index + 1));
  if (Math.abs(delta) < Math.max(minStepPercent, 1e-6)) return null;

  const next = [...ratios];
  next[index] += delta;
  next[index + 1] -= delta;
  // Haute précision pour éviter les erreurs d'arrondi au mm
  return next.map((ratio) => Math.round(ratio * 10000) / 10000);
}

// Même chose au clavier : décale la limite de `deltaMm` (positif : vers la droite ou vers le bas)
export function nudgeDivider(group: Zone, index: number, deltaMm: number, groupSizeMm: number): number[] | null {
  if (!(groupSizeMm > 0)) return null;
  const before = getChildRatios(group).slice(0, index + 1).reduce((sum, ratio) => sum + ratio, 0);
  return moveDivider(group, index, before + (deltaMm / groupSizeMm) * 100, groupSizeMm);
}
