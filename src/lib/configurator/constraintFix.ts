import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import {
  DIMENSION_LIMITS,
  DOOR_LEAF_WIDTH,
  DRAWER_LIMITS,
  HANGING_RAIL_LIMITS,
  MAX_SHELF_SPAN_MM,
  MIN_COMPARTMENT_HEIGHT_MM,
  MIN_COMPARTMENT_WIDTH_MM,
  type ConstraintIssue,
  type DimensionKey,
  clampDimension,
  facadeAvailability,
  findConstraintIssues,
  hangingRailAvailability,
  maxPartsFor,
} from './constraints';
import { getChildRatios, isDoorContent, isDrawerContent } from './zoneStats';

/**
 * Correction automatique d'un meuble hors limites de fabrication (bouton « Corriger ») : on garde ce que le
 * client a voulu en le rendant fabricable plutôt qu'en le supprimant.
 * - Trop large pour un tiroir, une porte, une étagère ou une penderie : la partie est partagée en colonnes
 *   identiques (une pile de tiroirs de 1,38 m devient deux piles de 69 cm).
 * - Porte simple trop large : double porte ; double porte trop étroite : porte simple.
 * - Compartiments trop petits : parties remises à égalité, ou moins nombreuses si cela ne suffit pas.
 * - Dimensions hors limites : ramenées à la limite.
 * - Ce qui ne peut pas être sauvé (tiroir trop étroit, penderie trop basse…) est retiré.
 */

type Dims = { width: number; height: number; depth: number };

export interface ConstraintFix {
  root: Zone;
  dims: Dims;
  // Ce qui a été modifié, pour l'annoncer au client
  changes: string[];
  // Problèmes restants (vide si le meuble est désormais fabricable)
  remaining: ConstraintIssue[];
}

const cm = (mm: number) => `${Math.round(mm / 10)} cm`;
const length = (mm: number) => (mm >= 1000 ? `${(mm / 1000).toLocaleString('fr-FR')} m` : cm(mm));

const PLAIN_DOORS: ZoneContent[] = ['door', 'door_right'];
const LEFT_TO_RIGHT: Partial<Record<ZoneContent, ZoneContent>> = {
  door: 'door_right',
  mirror_door: 'mirror_door_right',
  push_door: 'push_door_right',
};
const RIGHT_TO_LEFT = Object.fromEntries(Object.entries(LEFT_TO_RIGHT).map(([left, right]) => [right, left])) as Partial<
  Record<ZoneContent, ZoneContent>
>;

const FACADE_NAMES: Partial<Record<ZoneContent, string>> = {
  door: 'porte',
  door_right: 'porte',
  door_double: 'double porte',
  push_door: 'porte push',
  push_door_right: 'porte push',
  mirror_door: 'porte vitrée',
  mirror_door_right: 'porte vitrée',
  drawer: 'tiroir',
  push_drawer: 'tiroir push',
};

const hasFacade = (content?: ZoneContent) => isDoorContent(content) || isDrawerContent(content);
const hasRail = (zone: Zone) => !!zone.hasDressing || zone.content === 'dressing';
const isLeaf = (zone: Zone) => zone.type === 'leaf' || !zone.children?.length;

function equalRatios(count: number): Pick<Zone, 'splitRatio' | 'splitRatios'> {
  if (count === 2) return { splitRatio: 50, splitRatios: undefined };
  return { splitRatio: undefined, splitRatios: Array.from({ length: count }, () => 100 / count) };
}

// ── Largeur maximale ─────────────────────────────────────────────────────────

type WidthLimit = { max: number; cause: string };
const NO_LIMIT: WidthLimit = { max: Infinity, cause: '' };
const narrowest = (a: WidthLimit, b: WidthLimit) => (b.max < a.max ? b : a);

// Largeur maximale d'une façade ; une porte simple ordinaire peut devenir double porte, elle va donc jusqu'à 1,2 m
function facadeLimit(content?: ZoneContent): WidthLimit {
  if (!hasFacade(content)) return NO_LIMIT;
  if (isDrawerContent(content)) return { max: DRAWER_LIMITS.maxWidth, cause: `tiroirs : ${length(DRAWER_LIMITS.maxWidth)} max` };
  if (content === 'door_double' || PLAIN_DOORS.includes(content!)) {
    return { max: DOOR_LEAF_WIDTH.max * 2, cause: `doubles portes : ${length(DOOR_LEAF_WIDTH.max * 2)} max` };
  }
  return { max: DOOR_LEAF_WIDTH.max, cause: `${FACADE_NAMES[content!] ?? 'porte'} : ${length(DOOR_LEAF_WIDTH.max)} max` };
}

// Limite de largeur d'une zone et de tout ce qui partage sa largeur : façades, étagères d'une pile, penderie.
// Les colonnes d'un groupe vertical sont plus étroites que lui : elles sont vérifiées à leur tour.
function widthLimit(zone: Zone): WidthLimit {
  let limit = facadeLimit(zone.doorContent);
  if (isLeaf(zone)) {
    limit = narrowest(limit, facadeLimit(zone.content));
    if (hasRail(zone)) limit = narrowest(limit, { max: HANGING_RAIL_LIMITS.maxWidth, cause: `penderie : ${length(HANGING_RAIL_LIMITS.maxWidth)} max` });
    return limit;
  }
  if (zone.type === 'horizontal') {
    // Mêmes règles que findConstraintIssues : pas d'étagère entre des tiroirs empilés
    if (!zone.children!.every((child) => isDrawerContent(child.content))) {
      limit = narrowest(limit, { max: MAX_SHELF_SPAN_MM, cause: `étagères : ${length(MAX_SHELF_SPAN_MM)} max` });
    }
    for (const child of zone.children!) {
      limit = narrowest(limit, child.type === 'vertical' ? facadeLimit(child.doorContent) : widthLimit(child));
    }
  }
  return limit;
}

// ── Partage en colonnes ──────────────────────────────────────────────────────

function collectIds(zone: Zone, ids: Set<string>): Set<string> {
  ids.add(zone.id);
  zone.children?.forEach((child) => collectIds(child, ids));
  return ids;
}

function freshId(base: string, taken: Set<string>): string {
  let n = 1;
  while (taken.has(`${base}-${n}`)) n += 1;
  const id = `${base}-${n}`;
  taken.add(id);
  return id;
}

// Copie d'une zone avec de nouveaux identifiants, ses portes simples ouvrant du côté demandé
function copyZone(zone: Zone, side: 'left' | 'right', taken: Set<string>): Zone {
  const turn = (content?: ZoneContent) => {
    if (!content) return content;
    return (side === 'right' ? LEFT_TO_RIGHT[content] : RIGHT_TO_LEFT[content]) ?? content;
  };
  const copy: Zone = { ...zone, id: freshId(zone.id, taken), content: turn(zone.content), doorContent: turn(zone.doorContent) };
  if (copy.content === undefined) delete copy.content;
  if (copy.doorContent === undefined) delete copy.doorContent;
  if (zone.children) copy.children = zone.children.map((child) => copyZone(child, side, taken));
  return copy;
}

// La zone devient `count` colonnes identiques ; les portes de la moitié gauche ouvrent à gauche, les autres à droite
function splitIntoColumns(zone: Zone, count: number, taken: Set<string>): Zone {
  return {
    id: zone.id,
    type: 'vertical',
    ...equalRatios(count),
    children: Array.from({ length: count }, (_, i) => copyZone(zone, i < count / 2 ? 'left' : 'right', taken)),
  };
}

// ── Correction ───────────────────────────────────────────────────────────────

// Façade qui ne tient pas dans `width` : adaptée si possible, sinon retirée (undefined)
function fixFacade(content: ZoneContent, width: number, depth: number, changes: string[]): ZoneContent | undefined {
  if (PLAIN_DOORS.includes(content) && width > DOOR_LEAF_WIDTH.max + 0.5 && width <= DOOR_LEAF_WIDTH.max * 2 + 0.5) {
    changes.push(`Porte de ${cm(width)} remplacée par une double porte.`);
    return 'door_double';
  }
  if (content === 'door_double' && width < DOOR_LEAF_WIDTH.min * 2 - 0.5 && width >= DOOR_LEAF_WIDTH.min - 0.5) {
    changes.push(`Double porte de ${cm(width)} remplacée par une porte simple.`);
    return 'door';
  }
  const availability = facadeAvailability(content, width, depth);
  if (availability.allowed) return content;
  changes.push(`Retiré : ${FACADE_NAMES[content] ?? 'façade'} de ${cm(width)} de large (${availability.reason?.toLowerCase()}).`);
  return undefined;
}

function fixZone(zone: Zone, w: number, h: number, depth: number, taken: Set<string>, changes: string[]): Zone {
  // Trop large pour ce qu'elle contient : partagée en colonnes, que l'on vérifie ensuite une à une
  if (zone.type !== 'vertical') {
    const limit = widthLimit(zone);
    if (w > limit.max + 0.5) {
      const count = Math.ceil((w - 0.5) / limit.max);
      changes.push(`Partie de ${cm(w)} de large partagée en ${count} colonnes de ${cm(w / count)} (${limit.cause}).`);
      return fixZone(splitIntoColumns(zone, count, taken), w, h, depth, taken, changes);
    }
  }

  let next: Zone = { ...zone };

  if (hasFacade(next.doorContent)) {
    const door = fixFacade(next.doorContent!, w, depth, changes);
    if (door) next.doorContent = door;
    else delete next.doorContent;
  }

  if (isLeaf(next)) {
    if (hasFacade(next.content)) next.content = fixFacade(next.content!, w, depth, changes) ?? 'empty';
    if (hasRail(next)) {
      const rail = hangingRailAvailability(w, h, depth);
      if (!rail.allowed) {
        changes.push(`Retiré : penderie (${rail.reason?.toLowerCase()}).`);
        next.hasDressing = false;
        if (next.content === 'dressing') next.content = 'empty';
      }
    }
    return next;
  }

  // Parties trop petites : remises à égalité, ou moins nombreuses si l'égalité ne suffit pas
  const vertical = next.type === 'vertical';
  const size = vertical ? w : h;
  const min = vertical ? MIN_COMPARTMENT_WIDTH_MM : MIN_COMPARTMENT_HEIGHT_MM;
  const unit = vertical ? 'colonnes' : 'casiers';
  const [equalized, reduced, each] = vertical ? ['remises', 'ramenées', 'chacune'] : ['remis', 'ramenés', 'chacun'];
  const ratios = getChildRatios(next);
  const tooSmall = next.children!.some((child, i) => !(isLeaf(child) && child.isOpenSpace) && (size * ratios[i]) / 100 < min - 0.5);
  if (tooSmall) {
    const count = next.children!.length;
    if (size / count >= min - 0.5) {
      changes.push(`${count} ${unit} ${equalized} à la même taille (${cm(size / count)} ${each}).`);
      next = { ...next, ...equalRatios(count) };
    } else {
      const kept = maxPartsFor(size, min);
      if (kept < 2) {
        changes.push(`Division retirée : trop petite pour plusieurs ${unit}.`);
        const { children: _children, splitRatio: _ratio, splitRatios: _ratios, doorContent, ...rest } = next;
        return fixZone({ ...rest, type: 'leaf', content: doorContent ?? 'empty' }, w, h, depth, taken, changes);
      }
      changes.push(`${count} ${unit} ${reduced} à ${kept} (${cm(min)} minimum ${each}).`);
      next = { ...next, children: next.children!.slice(0, kept), ...equalRatios(kept) };
    }
  }

  const finalRatios = getChildRatios(next);
  next.children = next.children!.map((child, i) => {
    const share = finalRatios[i] / 100;
    return fixZone(child, vertical ? w * share : w, vertical ? h : h * share, depth, taken, changes);
  });
  return next;
}

const DIMENSION_LABELS: Record<DimensionKey, string> = { width: 'Largeur', height: 'Hauteur', depth: 'Profondeur' };

export function fixConstraintIssues(root: Zone, dims: Dims): ConstraintFix {
  const changes: string[] = [];
  const fixedDims = { ...dims };
  (Object.keys(DIMENSION_LIMITS) as DimensionKey[]).forEach((key) => {
    const value = clampDimension(key, dims[key]);
    if (value !== dims[key]) {
      changes.push(`${DIMENSION_LABELS[key]} ramenée à ${cm(value)}.`);
      fixedDims[key] = value;
    }
  });

  // Une correction peut en appeler une autre (colonnes créées, puis façades adaptées) : quelques passes suffisent
  const taken = collectIds(root, new Set());
  let next = root;
  for (let pass = 0; pass < 4 && findConstraintIssues(next, fixedDims).length > 0; pass += 1) {
    next = fixZone(next, fixedDims.width, fixedDims.height, fixedDims.depth, taken, changes);
  }

  return { root: next, dims: fixedDims, changes: [...new Set(changes)], remaining: findConstraintIssues(next, fixedDims) };
}
