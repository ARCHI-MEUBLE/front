import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import { getChildRatios, isDoorContent, isDrawerContent } from './zoneStats';

/**
 * Limites physiques du meuble, appliquées directement dans le configurateur : les options qui ne
 * pourraient pas être fabriquées sont désactivées avec leur raison, et une configuration hors limites
 * (session ancienne, meuble réduit après coup…) est signalée et n'est ni générée ni enregistrée.
 * Toutes les valeurs sont en millimètres et se règlent ici.
 */

// Panneaux utilisés par le générateur : 19 mm d'épaisseur, plaques brutes de 2800 × 2070 mm
export const PANEL_THICKNESS_MM = 19;
export const PANEL_MAX_LENGTH_MM = 2800;

export const DIMENSION_LIMITS = {
  // Le dessus et le dessous sont d'un seul tenant : pas plus long qu'une plaque
  width: { min: 300, max: PANEL_MAX_LENGTH_MM },
  // Hauteur totale, pieds compris
  height: { min: 300, max: 2400 },
  depth: { min: 200, max: 800 },
} as const;

export type DimensionKey = keyof typeof DIMENSION_LIMITS;

// Taille minimale d'une case (relevée sur Pickawood) : une colonne d'au moins 20 cm de large, un casier
// d'au moins 10 cm de haut. C'est elle qui limite le nombre de divisions, pas un nombre fixe ; en dessous,
// la case n'est pas utilisable et le générateur 3D ne sait pas la fabriquer.
export const MIN_COMPARTMENT_WIDTH_MM = 200;
export const MIN_COMPARTMENT_HEIGHT_MM = 100;
// Une étagère de 19 mm plus longue fléchit sous la charge
export const MAX_SHELF_SPAN_MM = 1000;
// Largeur d'un vantail de porte battante (charnières, poids, débattement)
export const DOOR_LEAF_WIDTH = { min: 150, max: 600 } as const;
// Coulisses de tiroir du marché
export const DRAWER_LIMITS = { minWidth: 200, maxWidth: 1200, minDepth: 250 } as const;
// Penderie : hauteur d'un vêtement sur cintre, largeur d'un cintre, flèche de la tringle
export const HANGING_RAIL_LIMITS = { minHeight: 800, minDepth: 500, maxWidth: 1200 } as const;

const cm = (mm: number) => `${Math.round(mm / 10)} cm`;
const length = (mm: number) => (mm >= 1000 ? `${(mm / 1000).toLocaleString('fr-FR')} m` : cm(mm));

export interface Availability {
  allowed: boolean;
  // Raison courte, affichée sur l'option désactivée
  reason?: string;
}

const ALLOWED: Availability = { allowed: true };

export function clampDimension(key: DimensionKey, value: number): number {
  const { min, max } = DIMENSION_LIMITS[key];
  return Math.min(max, Math.max(min, value));
}

export const minPartSize = (direction: 'horizontal' | 'vertical') =>
  direction === 'horizontal' ? MIN_COMPARTMENT_HEIGHT_MM : MIN_COMPARTMENT_WIDTH_MM;

// Nombre de parties possible sur `sizeMm`, en comptant l'épaisseur des séparations
export function maxPartsFor(sizeMm: number, minPartMm: number): number {
  return Math.max(1, Math.floor((sizeMm + PANEL_THICKNESS_MM) / (minPartMm + PANEL_THICKNESS_MM)));
}

// Taille utile de chaque partie quand `sizeMm` est partagé en `parts` parts égales
export function partSize(sizeMm: number, parts: number): number {
  return (sizeMm - (parts - 1) * PANEL_THICKNESS_MM) / parts;
}

// Combien de colonnes (vertical) ou de casiers (horizontal) une zone peut recevoir, et pourquoi pas plus
export function splitAvailability(
  direction: 'horizontal' | 'vertical',
  zoneWidthMm: number,
  zoneHeightMm: number
): { maxParts: number; reason: string } {
  if (direction === 'horizontal' && zoneWidthMm > MAX_SHELF_SPAN_MM + 0.5) {
    return { maxParts: 1, reason: `Étagères de plus de ${length(MAX_SHELF_SPAN_MM)} : divisez d'abord en colonnes.` };
  }
  const min = minPartSize(direction);
  const maxParts = maxPartsFor(direction === 'horizontal' ? zoneHeightMm : zoneWidthMm, min);
  const unit = direction === 'horizontal' ? `un casier d'au moins ${cm(min)} de haut` : `une colonne d'au moins ${cm(min)} de large`;
  return { maxParts, reason: maxParts < 2 ? `Trop petit pour ${unit}.` : `Au plus ${maxParts} : ${unit}.` };
}

// Une porte, un tiroir ou une étagère en verre peut-il occuper une zone de cette taille ?
export function facadeAvailability(content: ZoneContent, zoneWidthMm: number, depthMm: number): Availability {
  if (content === 'door_double') {
    const leaf = zoneWidthMm / 2;
    if (leaf > DOOR_LEAF_WIDTH.max + 0.5) return { allowed: false, reason: `Max ${length(DOOR_LEAF_WIDTH.max * 2)}` };
    if (leaf < DOOR_LEAF_WIDTH.min - 0.5) return { allowed: false, reason: `Min ${cm(DOOR_LEAF_WIDTH.min * 2)}` };
    return ALLOWED;
  }
  if (isDoorContent(content)) {
    if (zoneWidthMm > DOOR_LEAF_WIDTH.max + 0.5) return { allowed: false, reason: `Max ${cm(DOOR_LEAF_WIDTH.max)} : double porte` };
    if (zoneWidthMm < DOOR_LEAF_WIDTH.min - 0.5) return { allowed: false, reason: `Min ${cm(DOOR_LEAF_WIDTH.min)}` };
    return ALLOWED;
  }
  if (isDrawerContent(content)) {
    if (zoneWidthMm > DRAWER_LIMITS.maxWidth + 0.5) return { allowed: false, reason: `Max ${length(DRAWER_LIMITS.maxWidth)}` };
    if (zoneWidthMm < DRAWER_LIMITS.minWidth - 0.5) return { allowed: false, reason: `Min ${cm(DRAWER_LIMITS.minWidth)}` };
    if (depthMm < DRAWER_LIMITS.minDepth - 0.5) return { allowed: false, reason: `Profondeur min ${cm(DRAWER_LIMITS.minDepth)}` };
    return ALLOWED;
  }
  if (content === 'glass_shelf' && zoneWidthMm > MAX_SHELF_SPAN_MM + 0.5) {
    return { allowed: false, reason: `Portée max ${length(MAX_SHELF_SPAN_MM)}` };
  }
  return ALLOWED;
}

export function hangingRailAvailability(zoneWidthMm: number, zoneHeightMm: number, depthMm: number): Availability {
  if (zoneHeightMm < HANGING_RAIL_LIMITS.minHeight - 0.5) return { allowed: false, reason: `Hauteur min ${cm(HANGING_RAIL_LIMITS.minHeight)}` };
  if (depthMm < HANGING_RAIL_LIMITS.minDepth - 0.5) return { allowed: false, reason: `Profondeur min ${cm(HANGING_RAIL_LIMITS.minDepth)}` };
  if (zoneWidthMm > HANGING_RAIL_LIMITS.maxWidth + 0.5) return { allowed: false, reason: `Largeur max ${length(HANGING_RAIL_LIMITS.maxWidth)}` };
  return ALLOWED;
}

// ── Vérification d'une configuration complète ───────────────────────────────

// Étape où l'on corrige chaque type de problème
export type IssueKind = 'dimensions' | 'division' | 'facade' | 'accessory';

export interface ConstraintIssue {
  kind: IssueKind;
  // Zone à sélectionner pour corriger (null : réglage global du meuble)
  zoneId: string | null;
  message: string;
}

const FACADE_LABELS: Partial<Record<ZoneContent, string>> = {
  door: 'Porte',
  door_right: 'Porte',
  door_double: 'Double porte',
  push_door: 'Porte Push',
  push_door_right: 'Porte Push',
  mirror_door: 'Porte vitrée',
  mirror_door_right: 'Porte vitrée',
  drawer: 'Tiroir',
  push_drawer: 'Tiroir Push',
  glass_shelf: 'Étagère en verre',
};

export function findConstraintIssues(root: Zone, dims: { width: number; height: number; depth: number }): ConstraintIssue[] {
  const issues: ConstraintIssue[] = [];

  (Object.keys(DIMENSION_LIMITS) as DimensionKey[]).forEach((key) => {
    const { min, max } = DIMENSION_LIMITS[key];
    const label = key === 'width' ? 'Largeur' : key === 'height' ? 'Hauteur' : 'Profondeur';
    if (dims[key] > max) issues.push({ kind: 'dimensions', zoneId: null, message: `${label} supérieure à ${length(max)}.` });
    if (dims[key] < min) issues.push({ kind: 'dimensions', zoneId: null, message: `${label} inférieure à ${cm(min)}.` });
  });

  const checkFacade = (zone: Zone, content: ZoneContent | undefined, w: number) => {
    if (!content || content === 'empty') return;
    const availability = facadeAvailability(content, w, dims.depth);
    if (!availability.allowed) {
      issues.push({ kind: 'facade', zoneId: zone.id, message: `${FACADE_LABELS[content] ?? 'Façade'} de ${cm(w)} de large : ${availability.reason}.` });
    }
  };

  const visit = (zone: Zone, parent: Zone | null, w: number, h: number) => {
    if (zone.type === 'leaf' || !zone.children?.length) {
      if (!zone.isOpenSpace && w < MIN_COMPARTMENT_WIDTH_MM - 0.5) {
        issues.push({ kind: 'division', zoneId: parent?.id ?? zone.id, message: `Compartiment de ${cm(w)} de large (min ${cm(MIN_COMPARTMENT_WIDTH_MM)}).` });
      } else if (!zone.isOpenSpace && h < MIN_COMPARTMENT_HEIGHT_MM - 0.5) {
        issues.push({ kind: 'division', zoneId: parent?.id ?? zone.id, message: `Compartiment de ${cm(h)} de haut (min ${cm(MIN_COMPARTMENT_HEIGHT_MM)}).` });
      }
      checkFacade(zone, zone.content, w);
      if (zone.hasDressing || zone.content === 'dressing') {
        const rail = hangingRailAvailability(w, h, dims.depth);
        if (!rail.allowed) issues.push({ kind: 'accessory', zoneId: zone.id, message: `Penderie impossible : ${rail.reason}.` });
      }
      return;
    }

    // Les séparations horizontales sont des étagères, sauf entre tiroirs (pas de tablette entre eux)
    const allDrawers = zone.children.every((child) => isDrawerContent(child.content));
    if (zone.type === 'horizontal' && !allDrawers && w > MAX_SHELF_SPAN_MM + 0.5) {
      issues.push({ kind: 'division', zoneId: zone.id, message: `Étagères de ${length(w)} (max ${length(MAX_SHELF_SPAN_MM)}) : divisez d'abord en colonnes.` });
    }
    checkFacade(zone, zone.doorContent, w);

    const ratios = getChildRatios(zone);
    zone.children.forEach((child, i) => {
      const share = ratios[i] / 100;
      visit(child, zone, zone.type === 'vertical' ? w * share : w, zone.type === 'horizontal' ? h * share : h);
    });
  };

  visit(root, null, dims.width, dims.height);
  return issues;
}
