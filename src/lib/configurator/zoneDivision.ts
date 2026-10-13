import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { getChildRatios } from './zoneStats';

// Compteurs « Colonnes » et « Étagères » (comme sur Pickawood) : ils règlent directement le nombre de
// parties d'une zone. Changer le nombre repart sur des parties égales ; les parties conservées gardent
// leur contenu, les parties en trop sont retirées.

export type DivisionDirection = 'horizontal' | 'vertical';

function equalRatios(count: number): { splitRatio?: number; splitRatios?: number[] } {
  if (count === 2) return { splitRatio: 50, splitRatios: undefined };
  return { splitRatio: undefined, splitRatios: Array.from({ length: count }, () => 100 / count) };
}

// Ramène une zone divisée à un compartiment unique (la porte qui couvrait le groupe est conservée)
function collapse(zone: Zone): Zone {
  const { children: _children, splitRatio: _ratio, splitRatios: _ratios, doorContent, ...rest } = zone;
  return { ...rest, type: 'leaf', content: doorContent ?? 'empty' };
}

// Colonnes d'une zone : on descend dans les groupes de colonnes jusqu'aux compartiments ou aux piles d'étagères
function shelfColumns(zone: Zone): Zone[] {
  if (zone.type === 'vertical' && zone.children?.length) return zone.children.flatMap(shelfColumns);
  return [zone];
}

// Vrai quand « étagères par colonne » a un sens : chaque colonne est un compartiment ou une simple pile
// d'étagères. Faux dès qu'un sous-groupe est imbriqué dans l'autre sens (colonnes dans une étagère…).
export function isShelfGrid(zone: Zone): boolean {
  if (zone.type === 'leaf' || !zone.children?.length) return true;
  if (zone.type === 'horizontal') return zone.children.every((child) => child.type === 'leaf');
  return zone.children.every(isShelfGrid);
}

// Largeur (mm) de chaque colonne qui recevrait les étagères
export function shelfColumnWidths(zone: Zone, width: number): number[] {
  if (zone.type !== 'vertical' || !zone.children?.length) return [width];
  const ratios = getChildRatios(zone);
  return zone.children.flatMap((child, i) => shelfColumnWidths(child, (width * ratios[i]) / 100));
}

// Nombre de parties dans une direction : 1 pour une zone non divisée dans ce sens, null si les
// sous-zones n'ont pas toutes le même nombre ou si la structure n'est pas une grille simple
export function getDivisionCount(zone: Zone, direction: DivisionDirection): number | null {
  if (direction === 'horizontal') {
    if (!isShelfGrid(zone)) return null;
    const counts = shelfColumns(zone).map((column) => (column.type === 'horizontal' ? column.children?.length ?? 1 : 1));
    return counts.every((count) => count === counts[0]) ? counts[0] : null;
  }

  if (zone.type === 'vertical') return zone.children?.length ?? 1;
  if (zone.type === 'leaf' || !zone.children?.length) return 1;
  const counts = zone.children.map((child) => (child.type === 'vertical' ? child.children?.length ?? 1 : 1));
  return counts.every((count) => count === counts[0]) ? counts[0] : null;
}

function collectIds(zone: Zone, ids: Set<string>): Set<string> {
  ids.add(zone.id);
  zone.children?.forEach((child) => collectIds(child, ids));
  return ids;
}

// Identifiant libre dans tout le meuble (après un regroupement, `parent-2` peut déjà exister ailleurs)
function newLeaf(parentId: string, index: number, taken: Set<string>): Zone {
  let n = index;
  while (taken.has(`${parentId}-${n}`)) n += 1;
  const id = `${parentId}-${n}`;
  taken.add(id);
  return { id, type: 'leaf', content: 'empty' };
}

function resize(zone: Zone, direction: DivisionDirection, count: number, taken: Set<string>): Zone {
  const target = Math.max(1, Math.round(count));

  // Même sens : on ajoute ou retire des parties
  if (zone.type === direction) {
    const children = zone.children ?? [];
    if (target === 1) return collapse(zone);
    if (target === children.length) return zone;
    const kept = children.slice(0, target);
    const added = Array.from({ length: target - kept.length }, (_, i) => newLeaf(zone.id, kept.length + i, taken));
    return { ...zone, children: [...kept, ...added], ...equalRatios(target) };
  }

  // Compartiment : on le partage (son contenu est remplacé par les nouvelles parties)
  if (zone.type === 'leaf' || !zone.children?.length) {
    if (target === 1) return zone;
    return {
      ...zone,
      type: direction,
      content: undefined,
      ...equalRatios(target),
      children: Array.from({ length: target }, (_, i) => newLeaf(zone.id, i, taken)),
    };
  }

  // Groupe dans l'autre sens : chaque sous-zone reçoit ce nombre (ex. N étagères dans chaque colonne)
  return { ...zone, children: zone.children.map((child) => resize(child, direction, target, taken)) };
}

export function setDivisionCount(root: Zone, zoneId: string, direction: DivisionDirection, count: number): Zone {
  const taken = collectIds(root, new Set());
  const visit = (zone: Zone): Zone => {
    if (zone.id === zoneId) return resize(zone, direction, count, taken);
    return zone.children ? { ...zone, children: zone.children.map(visit) } : zone;
  };
  return visit(root);
}
