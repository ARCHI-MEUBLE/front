import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { findParentZone, getChildRatios } from './zoneStats';

// Supprimer une section : la zone disparaît et une voisine du même groupe récupère toute sa place.
// Retirer une planche intérieure revient au même : des deux sections qu'elle sépare, une seule reste.
// (Avant, la planche était seulement cachée : les deux sections restaient distinctes, avec leurs
// décorations posées sur une planche absente.)

export type RemovalError = 'root' | 'not-found' | 'both-divided';

export type RemovalResult =
  | { root: Zone; keptId: string; error?: undefined }
  | { root?: undefined; keptId?: undefined; error: RemovalError };

function ratioFields(ratios: number[]): Pick<Zone, 'splitRatio' | 'splitRatios'> {
  if (ratios.length === 2) return { splitRatio: ratios[0], splitRatios: undefined };
  return { splitRatio: undefined, splitRatios: ratios };
}

// Le groupe n'a plus qu'une partie : elle prend sa place. Elle garde l'identifiant du groupe (son parent
// et la sélection y font référence) et la porte qui couvrait tout le groupe.
function replaceGroupByChild(group: Zone, child: Zone): Zone {
  const groupDoor = group.doorContent && group.doorContent !== 'empty' ? group.doorContent : undefined;
  const merged: Zone = { ...child, id: group.id };
  if (!merged.handleType && group.handleType) merged.handleType = group.handleType;
  if (!merged.zoneColor && group.zoneColor) merged.zoneColor = group.zoneColor;
  if (!groupDoor) return merged;
  if (child.type === 'leaf') {
    return !child.content || child.content === 'empty' ? { ...merged, content: groupDoor } : merged;
  }
  return { ...merged, doorContent: child.doorContent ?? groupDoor };
}

// Retire la partie `index` du groupe ; la partie `absorberIndex` s'agrandit d'autant
function removeChild(group: Zone, index: number, absorberIndex: number): Zone {
  const ratios = getChildRatios(group);
  const children = (group.children ?? []).filter((_, i) => i !== index);
  if (children.length === 1) return replaceGroupByChild(group, children[0]);
  const nextRatios = ratios
    .map((ratio, i) => (i === absorberIndex ? ratio + ratios[index] : ratio))
    .filter((_, i) => i !== index);
  return { ...group, children, ...ratioFields(nextRatios) };
}

function replaceZone(root: Zone, id: string, next: Zone): Zone {
  if (root.id === id) return next;
  return root.children ? { ...root, children: root.children.map((child) => replaceZone(child, id, next)) } : root;
}

function remove(root: Zone, group: Zone, index: number, absorberIndex: number): RemovalResult {
  const children = group.children ?? [];
  const keptId = children.length === 2 ? group.id : children[absorberIndex].id;
  return { root: replaceZone(root, group.id, removeChild(group, index, absorberIndex)), keptId };
}

// Supprime la section `zoneId` : la voisine du dessus (ou de gauche), sinon celle du dessous (ou de
// droite), prend sa place
export function removeSection(root: Zone, zoneId: string): RemovalResult {
  if (root.id === zoneId) return { error: 'root' };
  const group = findParentZone(root, zoneId);
  const index = group?.children?.findIndex((child) => child.id === zoneId) ?? -1;
  if (!group || index < 0) return { error: 'not-found' };
  return remove(root, group, index, index > 0 ? index - 1 : index + 1);
}

const isDivided = (zone: Zone) => zone.type !== 'leaf' && !!zone.children?.length;

const isEmptyLeaf = (zone: Zone) =>
  zone.type === 'leaf' &&
  (!zone.content || zone.content === 'empty') &&
  !zone.hasLight &&
  !zone.hasCableHole &&
  !zone.hasDressing;

// Des deux sections séparées par une planche, celle qui reste : une zone découpée plutôt qu'un simple
// compartiment, un compartiment équipé plutôt qu'un vide, sinon la plus grande (la première à égalité)
function survivorIndex(group: Zone, before: number): number | null {
  const children = group.children ?? [];
  const a = children[before];
  const b = children[before + 1];
  if (isDivided(a) && isDivided(b)) return null;
  if (isDivided(a) !== isDivided(b)) return isDivided(a) ? before : before + 1;
  if (isEmptyLeaf(a) !== isEmptyLeaf(b)) return isEmptyLeaf(a) ? before + 1 : before;
  const ratios = getChildRatios(group);
  return ratios[before + 1] > ratios[before] ? before + 1 : before;
}

// Identifiant d'une planche intérieure dans la vue 3D : `separator-h-<chemin>h<i>-<morceau>` (ou `v`).
// Le chemin descend depuis le meuble (`c2-r0-` : 3e colonne puis 1re rangée) jusqu'au groupe découpé ;
// la planche sépare ses parties i et i+1. Le morceau ne compte pas : retirer un morceau retire la planche.
const SEPARATOR_ID = /^separator-([hv])-((?:[cr]\d+-)*)([hv])(\d+)-\d+$/;

export interface SeparatorSides {
  groupId: string;
  beforeId: string;
  afterId: string;
}

export function findSeparatorSides(root: Zone, separatorId: string): SeparatorSides | null {
  const match = SEPARATOR_ID.exec(separatorId);
  if (!match || match[1] !== match[3]) return null;
  const [, axis, path, , indexText] = match;

  let group: Zone | undefined = root;
  for (const step of path.match(/[cr]\d+/g) ?? []) {
    group = group?.children?.[Number(step.slice(1))];
  }
  const index = Number(indexText);
  const expectedType = axis === 'h' ? 'horizontal' : 'vertical';
  const before = group?.children?.[index];
  const after = group?.children?.[index + 1];
  if (!group || group.type !== expectedType || !before || !after) return null;
  return { groupId: group.id, beforeId: before.id, afterId: after.id };
}

// Retire les planches choisies dans la vue 3D. Elles sont toutes repérées avant la première fusion :
// chaque fusion décale les chemins des suivantes.
export function removeSeparators(
  root: Zone,
  separatorIds: string[]
): { root: Zone; removed: number; blocked: number; blockedIds: string[] } {
  // Les morceaux d'une même planche donnent les mêmes côtés : une seule fusion
  const planks = new Map<string, { side: SeparatorSides; ids: string[] }>();
  for (const id of separatorIds) {
    const side = findSeparatorSides(root, id);
    if (!side) continue;
    const key = `${side.beforeId}|${side.afterId}`;
    const plank = planks.get(key);
    if (plank) plank.ids.push(id);
    else planks.set(key, { side, ids: [id] });
  }

  // Une section fusionnée vit sous l'identifiant de celle qui l'a absorbée
  const renamed = new Map<string, string>();
  const resolve = (id: string) => {
    let current = id;
    while (renamed.has(current)) current = renamed.get(current)!;
    return current;
  };

  let current = root;
  let removed = 0;
  let blocked = 0;
  // Planches impossibles à retirer : elles restent en place
  const blockedIds: string[] = [];
  for (const { side, ids } of planks.values()) {
    const beforeId = resolve(side.beforeId);
    const afterId = resolve(side.afterId);
    const group = findParentZone(current, beforeId);
    const index = group?.children?.findIndex((child) => child.id === beforeId) ?? -1;
    if (!group || index < 0 || group.children?.[index + 1]?.id !== afterId) continue;

    const kept = survivorIndex(group, index);
    if (kept === null) {
      blocked += 1;
      blockedIds.push(...ids);
      continue;
    }
    const gone = kept === index ? index + 1 : index;
    const result = remove(current, group, gone, kept);
    if (!result.root) continue;

    const goneId = group.children![gone].id;
    const keptChildId = group.children![kept].id;
    renamed.set(goneId, result.keptId);
    if (keptChildId !== result.keptId) renamed.set(keptChildId, result.keptId);
    current = result.root;
    removed += 1;
  }

  return { root: current, removed, blocked, blockedIds };
}
