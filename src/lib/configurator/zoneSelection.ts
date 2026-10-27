import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import { getChildRatios } from './zoneStats';
import { groupSiblingZones, setZoneFacade, type FacadeChange } from './zoneFacades';

// Sélection de compartiments voisins pour poser une porte commune. Les zones sont ramenées à des
// rectangles (fractions du meuble) : la sélection reste toujours un rectangle, et on la restructure
// au moment de poser la porte pour qu'une seule zone de l'arbre la recouvre.

export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type Axis = 'x' | 'y';

const EPS = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;
const lo = (r: Rect, axis: Axis) => (axis === 'x' ? r.x0 : r.y0);
const hi = (r: Rect, axis: Axis) => (axis === 'x' ? r.x1 : r.y1);

const sameRect = (a: Rect, b: Rect) => near(a.x0, b.x0) && near(a.x1, b.x1) && near(a.y0, b.y0) && near(a.y1, b.y1);
const contains = (outer: Rect, inner: Rect) =>
  inner.x0 >= outer.x0 - EPS && inner.x1 <= outer.x1 + EPS && inner.y0 >= outer.y0 - EPS && inner.y1 <= outer.y1 + EPS;
const overlapLength = (a: Rect, b: Rect, axis: Axis) => Math.min(hi(a, axis), hi(b, axis)) - Math.max(lo(a, axis), lo(b, axis));
const overlaps = (a: Rect, b: Rect) => overlapLength(a, b, 'x') > EPS && overlapLength(a, b, 'y') > EPS;
const bounding = (rects: Rect[]): Rect => ({
  x0: Math.min(...rects.map((r) => r.x0)),
  x1: Math.max(...rects.map((r) => r.x1)),
  y0: Math.min(...rects.map((r) => r.y0)),
  y1: Math.max(...rects.map((r) => r.y1)),
});

// Deux rectangles se touchent par un côté (ils partagent un bord de longueur non nulle)
function touches(a: Rect, b: Rect): boolean {
  const sideBySide = (near(a.x1, b.x0) || near(b.x1, a.x0)) && overlapLength(a, b, 'y') > EPS;
  const stacked = (near(a.y1, b.y0) || near(b.y1, a.y0)) && overlapLength(a, b, 'x') > EPS;
  return sideBySide || stacked;
}

// Rectangle de chaque zone dans le meuble (0 à 1), lignes empilées de haut en bas
export function computeRects(root: Zone): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  const visit = (zone: Zone, rect: Rect) => {
    rects.set(zone.id, rect);
    const children = zone.children;
    if (!children?.length) return;
    const ratios = getChildRatios(zone);
    let position = 0;
    children.forEach((child, i) => {
      const share = ratios[i] / 100;
      if (zone.type === 'horizontal') {
        const height = (rect.y1 - rect.y0) * share;
        visit(child, { ...rect, y0: rect.y0 + position, y1: rect.y0 + position + height });
        position += height;
      } else {
        const width = (rect.x1 - rect.x0) * share;
        visit(child, { ...rect, x0: rect.x0 + position, x1: rect.x0 + position + width });
        position += width;
      }
    });
  };
  visit(root, { x0: 0, x1: 1, y0: 0, y1: 1 });
  return rects;
}

const hasDoor = (zone: Zone) => !!zone.doorContent && zone.doorContent !== 'empty';

// Éléments que l'on sélectionne d'un bloc : un compartiment, ou un groupe qui porte déjà une porte
function listUnits(zone: Zone): Zone[] {
  if (!zone.children?.length || hasDoor(zone)) return [zone];
  return zone.children.flatMap(listUnits);
}

function pathTo(zone: Zone, id: string): Zone[] | null {
  if (zone.id === id) return [zone];
  for (const child of zone.children ?? []) {
    const sub = pathTo(child, id);
    if (sub) return [zone, ...sub];
  }
  return null;
}

// Éléments sélectionnables couverts par une zone (celle d'une porte de groupe si on clique dedans)
function unitsOf(root: Zone, id: string): Zone[] {
  const path = pathTo(root, id);
  if (!path) return [];
  const doorHolder = path.find(hasDoor);
  return doorHolder ? [doorHolder] : listUnits(path[path.length - 1]);
}

// Caisson (colonne du meuble) qui contient la zone
function caissonOf(root: Zone, id: string): string {
  const path = pathTo(root, id);
  return root.type === 'vertical' && path?.[1] ? path[1].id : root.id;
}

// Agrandit le rectangle jusqu'à ne plus couper aucun élément en deux
function snapRect(units: Zone[], rects: Map<string, Rect>, start: Rect): Rect {
  let rect = start;
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of units) {
      const unitRect = rects.get(unit.id)!;
      if (overlaps(unitRect, rect) && !contains(rect, unitRect)) {
        rect = bounding([rect, unitRect]);
        changed = true;
      }
    }
  }
  return rect;
}

let counter = 0;
const defaultId = () => `group-${Math.random().toString(36).slice(2, 11)}-${counter++}`;

function withoutSplit(zone: Zone): Zone {
  const { splitRatio: _ratio, splitRatios: _ratios, ...rest } = zone;
  return rest;
}

// Un nœud qui répartit `parts` selon `ratios` (en %), ou la partie seule s'il n'y en a qu'une
function combine(type: Zone['type'], parts: Zone[], ratios: number[], makeId: () => string): Zone {
  if (parts.length === 1) return parts[0];
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const normalized = ratios.map((ratio) => (ratio / total) * 100);
  return {
    id: makeId(),
    type,
    children: parts,
    splitRatio: parts.length === 2 ? normalized[0] : undefined,
    splitRatios: parts.length > 2 ? normalized : undefined,
  };
}

interface Carved {
  node: Zone;
  targetId: string;
}

// Restructure `node` pour qu'une zone recouvre exactement `target` ; null si l'arbre ne le permet pas
function carve(node: Zone, rects: Map<string, Rect>, target: Rect, makeId: () => string): Carved | null {
  if (sameRect(rects.get(node.id)!, target)) return { node, targetId: node.id };

  const children = node.children;
  if (!children?.length) return null;

  const holder = children.findIndex((child) => contains(rects.get(child.id)!, target));
  if (holder >= 0) {
    const inner = carve(children[holder], rects, target, makeId);
    if (!inner) return null;
    return { node: { ...node, children: children.map((child, i) => (i === holder ? inner.node : child)) }, targetId: inner.targetId };
  }

  const nodeRect = rects.get(node.id)!;
  const along: Axis = node.type === 'horizontal' ? 'y' : 'x';
  const across: Axis = along === 'y' ? 'x' : 'y';
  const hit = children.map((child, i) => (overlaps(rects.get(child.id)!, target) ? i : -1)).filter((i) => i >= 0);

  // Le rectangle ne peut pas couper un élément dans le sens de la division
  const cutsAlong = hit.some((i) => {
    const r = rects.get(children[i].id)!;
    return lo(r, along) < lo(target, along) - EPS || hi(r, along) > hi(target, along) + EPS;
  });
  if (hit.length < 2 || cutsAlong) return null;

  // Toute la largeur du nœud : des frères côte à côte, donc un simple regroupement
  if (near(lo(target, across), lo(nodeRect, across)) && near(hi(target, across), hi(nodeRect, across))) {
    const grouped = groupSiblingZones(node, hit.map((i) => children[i].id), undefined, makeId);
    return grouped.groupId && !grouped.error ? { node: grouped.root, targetId: grouped.groupId } : null;
  }

  // Une colonne de plusieurs lignes : on transpose les lignes touchées en colonnes (gauche, cible, droite)
  const crossType: Zone['type'] = node.type === 'horizontal' ? 'vertical' : 'horizontal';
  const rowRatios = getChildRatios(node);
  const columns: { before: Zone[]; inside: Zone[]; after: Zone[]; beforeRatios: number[]; insideRatios: number[]; afterRatios: number[] } = {
    before: [], inside: [], after: [], beforeRatios: [], insideRatios: [], afterRatios: [],
  };

  for (const i of hit) {
    const row = children[i];
    if (row.type !== crossType || !row.children?.length || hasDoor(row)) return null;
    const cellRatios = getChildRatios(row);
    const parts = { before: [] as number[], inside: [] as number[], after: [] as number[] };
    row.children.forEach((cell, c) => {
      const r = rects.get(cell.id)!;
      if (hi(r, across) <= lo(target, across) + EPS) parts.before.push(c);
      else if (lo(r, across) >= hi(target, across) - EPS) parts.after.push(c);
      else parts.inside.push(c);
    });
    // Les bords du rectangle doivent tomber sur des séparations de la ligne
    const insideRect = parts.inside.map((c) => rects.get(row.children![c].id)!);
    if (!insideRect.length) return null;
    const span = bounding(insideRect);
    if (!near(lo(span, across), lo(target, across)) || !near(hi(span, across), hi(target, across))) return null;

    const build = (indexes: number[]) => {
      const cells = indexes.map((c) => row.children![c]);
      return combine(crossType, cells, indexes.map((c) => cellRatios[c]), makeId);
    };
    if (parts.before.length) {
      columns.before.push(build(parts.before));
      columns.beforeRatios.push(rowRatios[i]);
    }
    columns.inside.push(build(parts.inside));
    columns.insideRatios.push(rowRatios[i]);
    if (parts.after.length) {
      columns.after.push(build(parts.after));
      columns.afterRatios.push(rowRatios[i]);
    }
  }

  const targetNode = combine(node.type, columns.inside, columns.insideRatios, makeId);
  const nodeSize = hi(nodeRect, across) - lo(nodeRect, across);
  const sections: { zone: Zone; share: number }[] = [];
  if (columns.before.length) {
    sections.push({ zone: combine(node.type, columns.before, columns.beforeRatios, makeId), share: lo(target, across) - lo(nodeRect, across) });
  }
  sections.push({ zone: targetNode, share: hi(target, across) - lo(target, across) });
  if (columns.after.length) {
    sections.push({ zone: combine(node.type, columns.after, columns.afterRatios, makeId), share: hi(nodeRect, across) - hi(target, across) });
  }
  const transposed = combine(crossType, sections.map((s) => s.zone), sections.map((s) => (s.share / nodeSize) * 100), makeId);

  const kept = hit.reduce((sum, i) => sum + rowRatios[i], 0);
  const first = hit[0];
  const last = hit[hit.length - 1];
  const rest = [...children.slice(0, first), ...children.slice(last + 1)];
  if (!rest.length) {
    // Toutes les lignes sont touchées : le nœud lui-même devient la division en colonnes
    return { node: { ...withoutSplit(node), type: crossType, children: transposed.children, splitRatio: transposed.splitRatio, splitRatios: transposed.splitRatios }, targetId: targetNode.id };
  }
  const nextChildren = [...children.slice(0, first), transposed, ...children.slice(last + 1)];
  const nextRatios = [...rowRatios.slice(0, first), kept, ...rowRatios.slice(last + 1)];
  return {
    node: {
      ...withoutSplit(node),
      children: nextChildren,
      splitRatio: nextChildren.length === 2 ? nextRatios[0] : undefined,
      splitRatios: nextChildren.length > 2 ? nextRatios : undefined,
    },
    targetId: targetNode.id,
  };
}

export interface SelectionExtension {
  ids: string[];
  rect: Rect;
}

// Sélection obtenue en ajoutant `clickedId` à `selectedIds`, ou null si ce n'est pas un voisin (de côté,
// au-dessus ou en dessous), s'il est dans un autre caisson ou si l'ensemble ne peut pas recevoir de porte
export function extendSelection(root: Zone, selectedIds: string[], clickedId: string): SelectionExtension | null {
  if (!selectedIds.length || selectedIds.includes(clickedId)) return null;
  if (caissonOf(root, selectedIds[0]) !== caissonOf(root, clickedId)) return null;

  const rects = computeRects(root);
  const selected = selectedIds.flatMap((id) => unitsOf(root, id));
  const added = unitsOf(root, clickedId);
  if (!selected.length || !added.length) return null;

  const current = bounding(selected.map((unit) => rects.get(unit.id)!));
  if (!added.some((unit) => touches(current, rects.get(unit.id)!))) return null;

  const units = listUnits(root);
  const rect = snapRect(units, rects, bounding([current, ...added.map((unit) => rects.get(unit.id)!)]));
  if (!carve(root, rects, rect, () => 'probe')) return null;

  return { ids: units.filter((unit) => contains(rect, rects.get(unit.id)!)).map((unit) => unit.id), rect };
}

// Éléments voisins de la sélection que l'on peut lui ajouter (pour les signaler dans la vue 3D)
export function selectableNeighborIds(root: Zone, selectedIds: string[]): string[] {
  if (!selectedIds.length) return [];
  const selected = new Set(selectedIds.flatMap((id) => unitsOf(root, id).map((unit) => unit.id)));
  return listUnits(root)
    .filter((unit) => !selected.has(unit.id) && extendSelection(root, selectedIds, unit.id))
    .map((unit) => unit.id);
}

// Dimensions (mm) du rectangle couvert par la sélection
export function selectionSizeMm(root: Zone, ids: string[], width: number, height: number): { width: number; height: number } | null {
  const rects = computeRects(root);
  const covered = ids.flatMap((id) => unitsOf(root, id)).map((unit) => rects.get(unit.id)!);
  if (!covered.length) return null;
  const rect = bounding(covered);
  return { width: (rect.x1 - rect.x0) * width, height: (rect.y1 - rect.y0) * height };
}

export type SelectionGroupError = 'not-groupable';

export interface SelectionGroupResult extends FacadeChange {
  groupId: string | null;
  error?: SelectionGroupError;
}

// Fait recouvrir la sélection par une seule zone de l'arbre, y pose éventuellement une porte
export function groupSelection(
  root: Zone,
  ids: string[],
  content?: ZoneContent,
  makeId: () => string = defaultId
): SelectionGroupResult {
  const rects = computeRects(root);
  const covered = ids.flatMap((id) => unitsOf(root, id));
  if (!covered.length) return { root, removed: 0, groupId: null, error: 'not-groupable' };

  const rect = snapRect(listUnits(root), rects, bounding(covered.map((unit) => rects.get(unit.id)!)));
  const carved = carve(root, rects, rect, makeId);
  if (!carved) return { root, removed: 0, groupId: null, error: 'not-groupable' };

  if (!content) return { root: carved.node, removed: 0, groupId: carved.targetId };
  return { ...setZoneFacade(carved.node, carved.targetId, content), groupId: carved.targetId };
}
