import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import { getChildRatios, isDoorContent, isDrawerContent } from './zoneStats';

// Une façade (porte ou tiroir) occupe tout l'avant d'une zone : deux façades ne peuvent jamais
// se recouvrir. Ces fonctions garantissent qu'il n'y en a qu'une sur chaque partie du meuble.

const isFacade = (content?: ZoneContent) => isDoorContent(content) || isDrawerContent(content);

const hasGroupDoor = (zone: Zone) => !!zone.doorContent && zone.doorContent !== 'empty';

function withoutDoorContent(zone: Zone): Zone {
  const { doorContent: _removed, ...rest } = zone;
  return rest;
}

export interface FacadeChange {
  root: Zone;
  // Nombre de façades retirées parce qu'elles auraient recouvert ou été recouvertes par la nouvelle
  removed: number;
}

// Retire toutes les façades d'une zone et de ce qu'elle contient
function stripFacades(zone: Zone, counter: { removed: number }): Zone {
  let next = zone;
  if (hasGroupDoor(next)) {
    counter.removed += 1;
    next = withoutDoorContent(next);
  }
  if (next.type === 'leaf') {
    if (isFacade(next.content)) {
      counter.removed += 1;
      return { ...next, content: 'empty' };
    }
    return next;
  }
  return next.children ? { ...next, children: next.children.map((child) => stripFacades(child, counter)) } : next;
}

/**
 * Pose `content` sur la zone `zoneId` :
 * - sur un compartiment, `content` remplace son contenu (porte, tiroir, étagère, vide) ;
 * - sur un groupe, `content` devient la porte du groupe ('empty' la retire).
 * Une porte ou un tiroir posé retire les portes des groupes parents et, pour une porte de groupe,
 * les façades des compartiments qu'elle couvre.
 */
export function setZoneFacade(root: Zone, zoneId: string, content: ZoneContent): FacadeChange {
  const counter = { removed: 0 };
  const placing = isFacade(content);

  const visit = (zone: Zone): { zone: Zone; found: boolean } => {
    if (zone.id === zoneId) {
      // Un compartiment porte sa façade dans `content` : on nettoie un éventuel ancien `doorContent`,
      // et on remet un fond puisque choisir une façade quitte l'état « fond vide »
      if (zone.type === 'leaf') return { zone: { ...withoutDoorContent(zone), content, noBack: false }, found: true };

      const group = withoutDoorContent(zone);
      if (!placing) return { zone: group, found: true };
      return {
        zone: {
          ...group,
          doorContent: content,
          children: group.children?.map((child) => stripFacades(child, counter)),
        },
        found: true,
      };
    }

    if (!zone.children) return { zone, found: false };

    let found = false;
    const children = zone.children.map((child) => {
      const result = visit(child);
      found = found || result.found;
      return result.zone;
    });
    if (!found) return { zone, found: false };

    // Parent de la zone modifiée : sa porte recouvrirait la nouvelle façade
    if (placing && hasGroupDoor(zone)) {
      counter.removed += 1;
      return { zone: { ...withoutDoorContent(zone), children }, found: true };
    }
    return { zone: { ...zone, children }, found: true };
  };

  return { root: visit(root).zone, removed: counter.removed };
}

export type GroupError = 'not-siblings' | 'not-adjacent';

export interface GroupResult extends FacadeChange {
  // Zone qui porte désormais la porte commune (nouveau groupe, ou parent si tous ses enfants sont choisis)
  groupId: string | null;
  error?: GroupError;
}

function findParentOf(zone: Zone, ids: string[]): Zone | null {
  if (!zone.children) return null;
  if (ids.every((id) => zone.children!.some((child) => child.id === id))) return zone;
  for (const child of zone.children) {
    const found = findParentOf(child, ids);
    if (found) return found;
  }
  return null;
}

function replaceZone(zone: Zone, target: Zone): Zone {
  if (zone.id === target.id) return target;
  return zone.children ? { ...zone, children: zone.children.map((child) => replaceZone(child, target)) } : zone;
}

/**
 * Regroupe des compartiments voisins (même parent, côte à côte) dans un nouveau groupe et y pose
 * éventuellement une porte commune.
 */
export function groupSiblingZones(
  root: Zone,
  ids: string[],
  content?: ZoneContent,
  makeId: () => string = () => `group-${Math.random().toString(36).slice(2, 11)}`
): GroupResult {
  const parent = ids.length > 1 ? findParentOf(root, ids) : null;
  if (!parent?.children) return { root, removed: 0, groupId: null, error: 'not-siblings' };

  const indices = ids.map((id) => parent.children!.findIndex((child) => child.id === id)).sort((a, b) => a - b);
  const start = indices[0];
  const end = indices[indices.length - 1];
  if (end - start + 1 !== indices.length) return { root, removed: 0, groupId: null, error: 'not-adjacent' };

  // Tous les enfants choisis : la porte se pose directement sur le parent
  if (indices.length === parent.children.length) {
    if (!content) return { root, removed: 0, groupId: parent.id };
    return { ...setZoneFacade(root, parent.id, content), groupId: parent.id };
  }

  const ratios = getChildRatios(parent);
  const groupedRatios = ratios.slice(start, end + 1);
  const groupedTotal = groupedRatios.reduce((sum, ratio) => sum + ratio, 0);
  const innerRatios = groupedRatios.map((ratio) => (ratio / groupedTotal) * 100);
  const grouped = parent.children.slice(start, end + 1);

  const groupId = makeId();
  const group: Zone = {
    id: groupId,
    type: parent.type,
    children: grouped,
    splitRatio: grouped.length === 2 ? innerRatios[0] : undefined,
    splitRatios: grouped.length > 2 ? innerRatios : undefined,
  };

  const children = [...parent.children.slice(0, start), group, ...parent.children.slice(end + 1)];
  const parentRatios = [...ratios.slice(0, start), groupedTotal, ...ratios.slice(end + 1)];
  const newParent: Zone = {
    ...parent,
    children,
    splitRatio: children.length === 2 ? parentRatios[0] : undefined,
    splitRatios: children.length > 2 ? parentRatios : undefined,
  };

  const regrouped = replaceZone(root, newParent);
  if (!content) return { root: regrouped, removed: 0, groupId };
  return { ...setZoneFacade(regrouped, groupId, content), groupId };
}
