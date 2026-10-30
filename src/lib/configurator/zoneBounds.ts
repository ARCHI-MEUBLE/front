import { ZONE_CONTENT_META, type Zone } from '@/components/configurator/ZoneEditor/types';
import { findZoneById, getChildRatios, getZoneFacade, getZoneSize, listLeafZones } from './zoneStats';

// Position des zones dans la scène 3D (mètres). Reproduit le découpage fait par la scène : l'intérieur du
// meuble se partage entre les compartiments selon leurs proportions.

export type Vec3 = [number, number, number];

export interface Box {
  center: Vec3;
  size: Vec3;
}

export interface FurnitureLayout {
  // Largeur et profondeur extérieures
  width: number;
  depth: number;
  // Hauteur du caisson, socle exclu, et hauteur du socle
  sideHeight: number;
  yOffset: number;
  // Épaisseur des panneaux
  thickness: number;
}

// Épaisseur des panneaux et hauteur du socle de la scène 3D
export const PANEL_THICKNESS_M = 0.019;
export const PLINTH_HEIGHT_M = 0.1;

// Dimensions du meuble dans la scène : le socle est compris dans la hauteur totale
export function getFurnitureLayout(widthMm: number, heightMm: number, depthMm: number, hasSocle: boolean): FurnitureLayout {
  const height = (heightMm || 730) / 1000;
  return {
    width: (widthMm || 1500) / 1000,
    depth: (depthMm || 500) / 1000,
    sideHeight: hasSocle ? height - PLINTH_HEIGHT_M : height,
    yOffset: hasSocle ? PLINTH_HEIGHT_M : 0,
    thickness: PANEL_THICKNESS_M,
  };
}

// Boîte d'une zone (un compartiment ou un groupe) ; null si la zone n'existe pas
export function getZoneBox(root: Zone, zoneId: string, layout: FurnitureLayout): Box | null {
  const visit = (zone: Zone, cx: number, cy: number, width: number, height: number): Box | null => {
    if (zone.id === zoneId) return { center: [cx, cy, 0], size: [width, height, layout.depth] };

    const children = zone.children;
    if (!children?.length) return null;

    const ratios = getChildRatios(zone);
    let position = 0;
    for (let i = 0; i < children.length; i++) {
      const share = ratios[i] / 100;
      let found: Box | null;
      if (zone.type === 'horizontal') {
        const childHeight = height * share;
        found = visit(children[i], cx, cy + height / 2 - position - childHeight / 2, width, childHeight);
        position += childHeight;
      } else {
        const childWidth = width * share;
        found = visit(children[i], cx - width / 2 + position + childWidth / 2, cy, childWidth, height);
        position += childWidth;
      }
      if (found) return found;
    }
    return null;
  };

  return visit(
    root,
    0,
    layout.sideHeight / 2 + layout.yOffset,
    layout.width - 2 * layout.thickness,
    layout.sideHeight - 2 * layout.thickness
  );
}

// Plus petite boîte contenant toutes les boîtes données
export function unionBoxes(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const { center, size } of boxes) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], center[axis] - size[axis] / 2);
      max[axis] = Math.max(max[axis], center[axis] + size[axis] / 2);
    }
  }
  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

// Enveloppe extérieure du meuble, socle compris (du sol à sa hauteur totale)
export function getFurnitureBox(layout: FurnitureLayout): Box {
  const height = layout.sideHeight + layout.yOffset;
  return { center: [0, height / 2, 0], size: [layout.width, height, layout.depth] };
}

// Une limite entre deux enfants d'un groupe, telle que la scène 3D la dessine (cloison ou étagère)
export interface Divider {
  // Groupe dont on déplace la limite entre les enfants `index` et `index + 1`
  zoneId: string;
  index: number;
  // 'x' : cloison, elle se déplace de gauche à droite ; 'y' : étagère, de haut en bas
  axis: 'x' | 'y';
  // Milieu du séparateur, sur la face avant du meuble
  center: Vec3;
  // Longueur du séparateur : hauteur d'une cloison, largeur d'une étagère
  length: number;
  // Bord du groupe d'où l'on compte (gauche pour une cloison, haut pour une étagère) et longueur que se
  // partagent ses enfants, épaisseur des séparateurs déduite
  start: number;
  available: number;
  thickness: number;
  // Identifiant du panneau dans la scène (outil « Retirer planches »)
  panelId: string;
  // Le séparateur est derrière une porte de groupe : invisible tant qu'elle est fermée
  behindDoor: boolean;
}

// Séparateurs de la scène 3D. Contrairement à getZoneBox, l'épaisseur des séparateurs est déduite comme dans
// la scène (collectSeparators de ThreeCanvas) : une poignée posée ici tombe pile sur la planche.
export function getDividers(root: Zone, layout: FurnitureLayout): Divider[] {
  const t = layout.thickness;
  const dividers: Divider[] = [];

  const visit = (zone: Zone, cx: number, cy: number, width: number, height: number, path: string, doorAbove: boolean) => {
    const children = zone.children;
    if (!children?.length) return;

    const zoneDoor = zone.doorContent || zone.content;
    const behindDoor = doorAbove || (typeof zoneDoor === 'string' && zoneDoor.includes('door'));

    if (children.length === 1) {
      visit(children[0], cx, cy, width, height, `${path}c0-`, behindDoor);
      return;
    }

    const ratios = getChildRatios(zone);
    if (zone.type === 'vertical') {
      const available = width - (children.length - 1) * t;
      const left = cx - width / 2;
      let x = left;
      children.forEach((child, i) => {
        const childWidth = (available * ratios[i]) / 100;
        if (i < children.length - 1) {
          dividers.push({
            zoneId: zone.id, index: i, axis: 'x',
            center: [x + childWidth + t / 2, cy, layout.depth / 2],
            length: height, start: left, available, thickness: t,
            panelId: `separator-v-${path}v${i}-0`, behindDoor,
          });
        }
        visit(child, x + childWidth / 2, cy, childWidth, height, `${path}c${i}-`, behindDoor);
        x += childWidth + t;
      });
    } else if (zone.type === 'horizontal') {
      const available = height - (children.length - 1) * t;
      const top = cy + height / 2;
      let y = top;
      children.forEach((child, i) => {
        const childHeight = (available * ratios[i]) / 100;
        if (i < children.length - 1) {
          dividers.push({
            zoneId: zone.id, index: i, axis: 'y',
            center: [cx, y - childHeight - t / 2, layout.depth / 2],
            length: width, start: top, available, thickness: t,
            panelId: `separator-h-${path}h${i}-0`, behindDoor,
          });
        }
        visit(child, cx, y - childHeight / 2, width, childHeight, `${path}r${i}-`, behindDoor);
        y -= childHeight + t;
      });
    }
  };

  visit(root, 0, layout.sideHeight / 2 + layout.yOffset, layout.width - 2 * layout.thickness, layout.sideHeight - 2 * layout.thickness, '', false);
  return dividers;
}

// Part cumulée (%) des enfants qui précèdent la limite quand le milieu de son séparateur est à `coord`
// (x d'une cloison, y d'une étagère). Inverse du placement fait par getDividers.
export function dividerPercentAt(divider: Divider, coord: number): number {
  const { start, available, thickness, index } = divider;
  const offset = divider.axis === 'x' ? coord - start : start - coord;
  return ((offset - index * thickness - thickness / 2) / available) * 100;
}

export interface ZoneDescription {
  title: string;
  // Contenu et dimensions : « Tiroir · 567 × 730 mm »
  detail: string;
  // La zone porte une porte ou un tiroir qui peut s'ouvrir
  openable: boolean;
}

// Texte affiché dans l'infobulle d'une zone survolée dans la vue 3D
export function describeZone(root: Zone, zoneId: string, widthMm: number, heightMm: number): ZoneDescription | null {
  const zone = findZoneById(root, zoneId);
  if (!zone) return null;

  const leaves = listLeafZones(root);
  const isLeaf = zone.type === 'leaf' || !zone.children?.length;

  let title = 'Meuble entier';
  let content: string | null = null;
  if (isLeaf) {
    if (leaves.length > 1) title = `Compartiment ${leaves.findIndex((leaf) => leaf.id === zone.id) + 1} sur ${leaves.length}`;
    content = !zone.content || zone.content === 'empty' ? 'Vide' : ZONE_CONTENT_META[zone.content]?.label ?? null;
  } else {
    if (zone.id !== 'root') title = `Groupe · ${zone.children!.length} ${zone.type === 'horizontal' ? 'niveaux' : 'colonnes'}`;
    if (zone.doorContent && zone.doorContent !== 'empty') content = ZONE_CONTENT_META[zone.doorContent]?.label ?? null;
  }

  const size = getZoneSize(root, zoneId, widthMm, heightMm);
  const dimensions = size ? `${Math.round(size.width)} × ${Math.round(size.height)} mm` : null;

  return {
    title,
    detail: [content, dimensions].filter(Boolean).join(' · '),
    openable: !!getZoneFacade(zone),
  };
}
