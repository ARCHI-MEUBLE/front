import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { DIMENSION_LIMITS, PANEL_THICKNESS_MM, clampDimension, type DimensionKey } from './constraints';
import { getZoneInteriorSizeMm, PLINTH_HEIGHT_M } from './zoneBounds';
import { applySplitRatios, moveDivider, type ResizeAxis } from './zoneResize';
import { findParentZone, findZoneById, getChildRatios, getZoneSize } from './zoneStats';

// Saisie d'une cote dans le plan 2D (double-clic sur un nombre). Les cases affichent leur taille intérieure utile
// (planches déduites, voir getZoneInteriorSizeMm) : la valeur saisie est donc une taille intérieure.

const PLINTH_HEIGHT_MM = PLINTH_HEIGHT_M * 1000;

// Cadre du plan : largeur utile (entre les bords arrondis), hauteur totale (socle compris)
export interface PlanFrame {
  usableWidthMm: number;
  heightMm: number;
  hasSocle: boolean;
  // Largeur des bords arrondis actifs, gauche et droite additionnées
  roundedWidthMm: number;
}

export type PlanResize =
  // Une case ou une colonne change de taille, sa voisine absorbe la différence
  | { kind: 'zone'; axis: ResizeAxis; root: Zone; requestedMm: number; appliedMm: number }
  // Rien ne partage la cote dans ce sens : c'est le meuble entier qui grandit ou rétrécit
  | { kind: 'furniture'; axis: ResizeAxis; furnitureMm: number; requestedMm: number; appliedMm: number };

const splitsAlong = (zone: Zone | null, axis: ResizeAxis) =>
  !!zone && zone.type === (axis === 'width' ? 'vertical' : 'horizontal') && (zone.children?.length ?? 0) >= 2;

// La zone qui porte réellement la cote : la case elle-même, ou le premier parent partagé dans ce sens (la largeur
// d'une étagère est celle de sa colonne). null : la cote court sur tout le meuble.
function resizableAncestor(root: Zone, zoneId: string, axis: ResizeAxis): { target: Zone; parent: Zone } | null {
  let target = findZoneById(root, zoneId);
  let parent = target ? findParentZone(root, target.id) : null;
  while (target && parent && !splitsAlong(parent, axis)) {
    target = parent;
    parent = findParentZone(root, parent.id);
  }
  return target && parent ? { target, parent } : null;
}

// Tout ce qui s'ajoute à l'intérieur pour faire la cote extérieure du meuble
function furnitureExtraMm(axis: ResizeAxis, frame: PlanFrame): number {
  const sides = 2 * PANEL_THICKNESS_MM;
  if (axis === 'width') return sides + frame.roundedWidthMm;
  return sides + (frame.hasSocle ? PLINTH_HEIGHT_MM : 0);
}

// Fixe la taille intérieure (mm) d'une zone dans un axe, comme si l'on glissait sa cloison ou son étagère.
// La dernière zone d'un groupe pousse la limite qui la précède.
export function resizeFromPlan(
  root: Zone,
  zoneId: string,
  axis: ResizeAxis,
  interiorMm: number,
  frame: PlanFrame
): PlanResize | null {
  if (!Number.isFinite(interiorMm) || interiorMm <= 0 || !findZoneById(root, zoneId)) return null;
  const requestedMm = Math.round(interiorMm);

  const holder = resizableAncestor(root, zoneId, axis);
  if (!holder) {
    const extra = furnitureExtraMm(axis, frame);
    const furnitureMm = clampDimension(axis, requestedMm + extra);
    return { kind: 'furniture', axis, furnitureMm, requestedMm, appliedMm: furnitureMm - extra };
  }

  const { target, parent } = holder;
  const children = parent.children ?? [];
  const index = children.findIndex((child) => child.id === target.id);
  const sideHeightMm = frame.hasSocle ? frame.heightMm - PLINTH_HEIGHT_MM : frame.heightMm;
  const interior = getZoneInteriorSizeMm(root, parent.id, frame.usableWidthMm, frame.heightMm, frame.hasSocle);
  const nominal = getZoneSize(root, parent.id, frame.usableWidthMm, sideHeightMm);
  if (!interior || !nominal || index < 0) return null;

  // Longueur que se partagent les enfants, séparations déduites (même calcul que la scène 3D)
  const available = interior[axis] - (children.length - 1) * PANEL_THICKNESS_MM;
  if (!(available > 0)) return null;

  const ratios = getChildRatios(parent);
  const share = (requestedMm / available) * 100;
  const before = ratios.slice(0, index).reduce((sum, ratio) => sum + ratio, 0);
  const next =
    index < children.length - 1
      ? moveDivider(parent, index, before + share, nominal[axis])
      : moveDivider(parent, index - 1, 100 - share, nominal[axis]);

  const finalRatios = next ?? ratios;
  return {
    kind: 'zone',
    axis,
    root: next ? applySplitRatios(root, parent.id, next) : root,
    requestedMm,
    appliedMm: Math.round((finalRatios[index] / 100) * available),
  };
}

const AXIS_LABEL: Record<DimensionKey, string> = { width: 'Largeur', height: 'Hauteur', depth: 'Profondeur' };

// Cote extérieure du meuble saisie directement (largeur, hauteur, profondeur) : ramenée dans les limites
export function clampFurnitureDimension(key: DimensionKey, requestedMm: number) {
  const requested = Math.round(requestedMm);
  const applied = clampDimension(key, requested);
  const { min, max } = DIMENSION_LIMITS[key];
  return {
    valueMm: applied,
    notice: applied === requested ? null : `${AXIS_LABEL[key]} réglée sur ${applied} mm : le meuble mesure de ${min} à ${max} mm.`,
  };
}

// Valeur tapée dans le plan : « 450 », « 450 mm », « 45 cm », « 1,2 m ». null si ce n'est pas une longueur.
export function parsePlanLength(text: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/i.exec(text.replace(/[\s  ]/g, ''));
  if (!match) return null;
  const factor = { mm: 1, cm: 10, m: 1000 }[(match[2] ?? 'mm').toLowerCase() as 'mm' | 'cm' | 'm'];
  const value = Math.round(Number(match[1].replace(',', '.')) * factor);
  return value > 0 ? value : null;
}

// Segment d'une chaîne de cotes (sous la cote générale) : une colonne, un niveau, un arrondi ou le socle
export interface ChainSegment {
  key: string;
  // Position le long du plan (mm, depuis la gauche ou depuis le haut), enveloppe complète comprise
  startMm: number;
  endMm: number;
  valueMm: number;
  // Nom lu par les lecteurs d'écran et dans l'infobulle
  name: string;
  // Zone à redimensionner quand on saisit la valeur (taille intérieure)
  zoneId?: string;
  // Partie qui ne se règle pas dans le plan
  locked?: 'rounded' | 'socle';
}

// Chaîne de cotes d'un axe : les colonnes (largeur) ou les niveaux (hauteur) du premier découpage, en taille
// intérieure comme dans les cases, puis les bords arrondis ou le socle
export function planChain(
  root: Zone,
  axis: ResizeAxis,
  frame: PlanFrame,
  rounded: { leftMm: number; rightMm: number } = { leftMm: 0, rightMm: 0 }
): ChainSegment[] {
  const isWidth = axis === 'width';
  const carcassStart = isWidth ? rounded.leftMm : 0;
  const carcassLength = isWidth ? frame.usableWidthMm : frame.hasSocle ? frame.heightMm - PLINTH_HEIGHT_MM : frame.heightMm;
  const interior = (zoneId: string) =>
    getZoneInteriorSizeMm(root, zoneId, frame.usableWidthMm, frame.heightMm, frame.hasSocle)?.[axis] ?? 0;

  const segments: ChainSegment[] = [];
  if (isWidth && rounded.leftMm > 0) {
    segments.push({ key: 'rounded-left', startMm: 0, endMm: rounded.leftMm, valueMm: Math.round(rounded.leftMm), name: "Largeur de l'arrondi gauche", locked: 'rounded' });
  }

  const children = root.children ?? [];
  if (splitsAlong(root, axis)) {
    const ratios = getChildRatios(root);
    let position = carcassStart;
    children.forEach((child, index) => {
      const length = (ratios[index] / 100) * carcassLength;
      segments.push({
        key: child.id,
        startMm: position,
        endMm: position + length,
        valueMm: Math.round(interior(child.id)),
        name: isWidth ? `Largeur intérieure de la colonne ${index + 1}` : `Hauteur intérieure du niveau ${index + 1}`,
        zoneId: child.id,
      });
      position += length;
    });
  } else {
    segments.push({
      key: 'carcass',
      startMm: carcassStart,
      endMm: carcassStart + carcassLength,
      valueMm: Math.round(interior(root.id)),
      name: isWidth ? 'Largeur intérieure du meuble' : 'Hauteur intérieure du meuble',
      zoneId: root.id,
    });
  }

  const end = carcassStart + carcassLength;
  if (isWidth && rounded.rightMm > 0) {
    segments.push({ key: 'rounded-right', startMm: end, endMm: end + rounded.rightMm, valueMm: Math.round(rounded.rightMm), name: "Largeur de l'arrondi droit", locked: 'rounded' });
  }
  if (!isWidth && frame.hasSocle) {
    segments.push({ key: 'socle', startMm: end, endMm: frame.heightMm, valueMm: PLINTH_HEIGHT_MM, name: 'Hauteur du socle', locked: 'socle' });
  }
  return segments;
}

// Phrase à montrer quand la valeur saisie a dû être ajustée ; null si elle a été prise telle quelle
export function planResizeNotice(result: PlanResize): string | null {
  if (Math.abs(result.appliedMm - result.requestedMm) < 1) return null;
  const label = AXIS_LABEL[result.axis];
  const tooBig = result.appliedMm < result.requestedMm;
  // Pas de minimum chiffré : il compte les planches, la case non (« 94 mm : au moins 10 cm » serait contradictoire)
  if (result.kind === 'furniture') {
    return `${label} réglée sur ${result.appliedMm} mm : le meuble entier mesure ${tooBig ? 'au plus' : 'au moins'} ${result.furnitureMm} mm.`;
  }
  return tooBig
    ? `${label} réglée sur ${result.appliedMm} mm : la case voisine est déjà à sa taille minimale.`
    : `${label} réglée sur ${result.appliedMm} mm, la plus petite possible pour cette case.`;
}
