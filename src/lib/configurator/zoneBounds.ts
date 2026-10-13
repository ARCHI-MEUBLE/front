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
