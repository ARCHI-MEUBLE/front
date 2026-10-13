import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';

const SINGLE_DOOR_CONTENTS: ZoneContent[] = [
  'door',
  'door_right',
  'push_door',
  'push_door_right',
  'mirror_door',
  'mirror_door_right',
];

const DRAWER_CONTENTS: ZoneContent[] = ['drawer', 'push_drawer'];

// Façades sans poignée : ouverture par pression
const PUSH_CONTENTS: ZoneContent[] = ['push_door', 'push_door_right', 'push_drawer'];

export function isDoorContent(content?: ZoneContent): boolean {
  return !!content && (content === 'door_double' || SINGLE_DOOR_CONTENTS.includes(content));
}

export function isDrawerContent(content?: ZoneContent): boolean {
  return !!content && DRAWER_CONTENTS.includes(content);
}

export function isPushContent(content?: ZoneContent): boolean {
  return !!content && PUSH_CONTENTS.includes(content);
}

// Une façade (porte ou tiroir) est posée sur la zone, directement ou via un groupe parent
export function getZoneFacade(zone: Zone): ZoneContent | undefined {
  if (zone.type === 'leaf') {
    return isDoorContent(zone.content) || isDrawerContent(zone.content) ? zone.content : undefined;
  }
  return zone.doorContent && zone.doorContent !== 'empty' ? zone.doorContent : undefined;
}

export interface ZoneStats {
  compartments: number;
  doors: number;
  drawers: number;
  glassShelves: number;
  lights: number;
  cableHoles: number;
  dressings: number;
}

export function computeZoneStats(root: Zone): ZoneStats {
  const stats: ZoneStats = {
    compartments: 0,
    doors: 0,
    drawers: 0,
    glassShelves: 0,
    lights: 0,
    cableHoles: 0,
    dressings: 0,
  };

  const countDoors = (content?: ZoneContent) => {
    if (content === 'door_double') return 2;
    return isDoorContent(content) ? 1 : 0;
  };

  const visit = (zone: Zone) => {
    stats.doors += countDoors(zone.doorContent);

    if (zone.type === 'leaf') {
      if (!zone.isOpenSpace) stats.compartments += 1;
      stats.doors += countDoors(zone.content);
      if (isDrawerContent(zone.content)) stats.drawers += 1;
      if (zone.content === 'glass_shelf') stats.glassShelves += zone.glassShelfCount || 1;
      if (zone.hasLight) stats.lights += 1;
      if (zone.hasCableHole) stats.cableHoles += 1;
      if (zone.hasDressing) stats.dressings += 1;
      return;
    }

    zone.children?.forEach(visit);
  };

  visit(root);
  return stats;
}

// Compartiments dans l'ordre de lecture du plan (même numérotation que le plan 2D)
export function listLeafZones(root: Zone): Zone[] {
  if (root.type === 'leaf') return [root];
  return (root.children ?? []).flatMap(listLeafZones);
}

// Part (en %) de chaque enfant d'une zone divisée
export function getChildRatios(zone: Zone): number[] {
  const children = zone.children ?? [];
  if (zone.splitRatios?.length === children.length) return zone.splitRatios;
  if (children.length === 2 && zone.splitRatio !== undefined) return [zone.splitRatio, 100 - zone.splitRatio];
  return children.map(() => 100 / children.length);
}

// Dimensions (mm) d'une zone, déduites des proportions de chaque division
export function getZoneSize(
  zone: Zone,
  targetId: string,
  width: number,
  height: number
): { width: number; height: number } | null {
  if (zone.id === targetId) return { width, height };
  const children = zone.children;
  if (!children?.length) return null;

  const ratios = getChildRatios(zone);
  for (let i = 0; i < children.length; i++) {
    const share = ratios[i] / 100;
    const found = getZoneSize(
      children[i],
      targetId,
      zone.type === 'vertical' ? width * share : width,
      zone.type === 'horizontal' ? height * share : height
    );
    if (found) return found;
  }
  return null;
}

// Parent direct d'une zone (null pour la racine ou une zone inconnue)
export function findParentZone(root: Zone, id: string): Zone | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findParentZone(child, id);
    if (found) return found;
  }
  return null;
}

// Zone de l'arbre portant cet identifiant
export function findZoneById(root: Zone, id: string): Zone | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findZoneById(child, id);
    if (found) return found;
  }
  return null;
}
