// Calculs de pose des poignées sur une façade (unités en mètres) : longueur bornée et position du centre. Logique pure,
// testée à part ; le dessin est dans StructuralElements.tsx (composant Handle).
import type { HandleFacadeKind, HandleModel, HandleOrientation, HandleShape } from '@/lib/configurator/handles';
import type { HandleType } from '@/components/configurator/ZoneEditor/types';

// Longueur d'un modèle sans longueur renseignée (160 mm, entraxe courant)
export const DEFAULT_HANDLE_LENGTH = 0.16;
// Une poignée ne prend jamais plus de 80 % de la façade, et laisse au moins 3 cm à chaque bout
export const HANDLE_MAX_RATIO = 0.8;
export const HANDLE_END_MARGIN = 0.03;
export const HANDLE_MIN_LENGTH = 0.04;
// Distance entre la poignée d'une porte et son bord d'ouverture
export const DOOR_HANDLE_EDGE_OFFSET = 0.04;
// Finition de repli quand celle du modèle est illisible
export const FALLBACK_FINISH_HEX = '#1C1C1C';
// Anciennes poignées : centre devant la face avant, repris tel quel du rendu d'avant les modèles
export const LEGACY_HANDLE_OFFSET: Record<HandleFacadeKind, number> = { door: 0.001, drawer: 0.005 };

const HEX = /^#[0-9A-Fa-f]{6}$/;

export interface HandleFacade {
  kind: HandleFacadeKind;
  // Porte : côté des charnières ('left' : la porte s'ouvre par son bord droit). Sans objet pour un tiroir.
  hingeSide?: 'left' | 'right';
  width: number;
  height: number;
}

export interface HandleLayout {
  // Centre de la poignée, depuis le centre de la façade
  x: number;
  y: number;
  // Longueur dans le sens de pose, déjà bornée (0 pour une poignée sans sens de pose)
  length: number;
  vertical: boolean;
}

// Longueur d'un modèle de l'admin (mm) en mètres ; absente ou invalide : longueur par défaut
export function modelHandleLength(lengthMm: number | null | undefined): number {
  return typeof lengthMm === 'number' && Number.isFinite(lengthMm) && lengthMm > 0 ? lengthMm / 1000 : DEFAULT_HANDLE_LENGTH;
}

// Longueur qui tient dans la façade : au plus 80 % de la dimension dans le sens de pose et au plus cette dimension moins
// une marge à chaque bout, au moins 4 cm (une façade minuscule garde une poignée qu'on peut saisir)
export function clampHandleLength(length: number, available: number): number {
  const max = Math.min(available * HANDLE_MAX_RATIO, available - 2 * HANDLE_END_MARGIN);
  return Math.max(HANDLE_MIN_LENGTH, Math.min(length, max));
}

// Position de la poignée sur la façade. orientation null : bouton ou poignée encastrée, posés comme une poignée verticale.
// Tiroir : centrée. Porte : près du bord d'ouverture, à mi-hauteur ; une poignée horizontale reste entière sur la façade,
// son bout à 4 cm du bord.
export function layoutHandle(facade: HandleFacade, orientation: HandleOrientation | null, length: number): HandleLayout {
  const vertical = orientation === 'vertical';
  const bounded = orientation ? clampHandleLength(length, vertical ? facade.height : facade.width) : 0;
  if (facade.kind === 'drawer') return { x: 0, y: 0, length: bounded, vertical };

  const opensOnRight = facade.hingeSide !== 'right';
  const fromEdge = orientation === 'horizontal' ? DOOR_HANDLE_EDGE_OFFSET + bounded / 2 : DOOR_HANDLE_EDGE_OFFSET;
  const x = opensOnRight ? facade.width / 2 - fromEdge : -facade.width / 2 + fromEdge;
  return { x, y: 0, length: bounded, vertical };
}

const LEGACY_TYPES: HandleType[] = ['vertical_bar', 'horizontal_bar', 'knob', 'recessed'];

// Ancien type à dessiner : celui de la zone s'il est connu (le JSON enregistré peut porter autre chose), sinon la barre
// d'avant les modèles dans l'orientation voulue (rendu par défaut quand aucun modèle n'est chargé)
export function legacyHandleType(type: string | null | undefined, orientation: HandleOrientation): HandleType {
  if (type && (LEGACY_TYPES as string[]).includes(type)) return type as HandleType;
  return orientation === 'vertical' ? 'vertical_bar' : 'horizontal_bar';
}

// Anciennes poignées (configurations enregistrées avant les modèles) : longueur d'origine de chaque barre, avant bornage
export function legacyHandleLength(type: HandleType, facade: Pick<HandleFacade, 'width' | 'height'>): number {
  if (type === 'horizontal_bar') return Math.min(facade.width * 0.4, 0.5);
  if (type === 'vertical_bar') return Math.min(facade.height * 0.25, 0.4);
  return 0;
}

export function safeFinishHex(hex: string | null | undefined): string {
  return hex && HEX.test(hex) ? hex : FALLBACK_FINISH_HEX;
}

// Largeur vue de face et saillie (mm) d'un modèle dont le plan n'est pas renseigné : les proportions habituelles de sa
// forme. Une cuvette s'encastre dans la façade : seul son rebord dépasse.
export const SHAPE_DEFAULT_DIMENSIONS: Record<HandleShape, { width: number; projection: number }> = {
  bar: { width: 12, projection: 26 },
  flat_bar: { width: 12, projection: 22 },
  profile: { width: 16, projection: 12 },
  knob: { width: 27, projection: 22 },
  cup: { width: 30, projection: 2 },
  recessed: { width: 52, projection: 4 },
  leather: { width: 14, projection: 22 },
};

// Rivets d'une lanière sans entraxe renseigné : à 8 mm de chaque bout
const LEATHER_END_INSET = 0.008;
// Pieds d'une barre sans entraxe renseigné : à 10 % de chaque bout
const DEFAULT_SPACING_RATIO = 0.8;

export interface HandleDimensions {
  // Distance entre les deux vis : pieds d'une barre, rivets d'une lanière (perçages de la façade)
  spacing: number;
  // Largeur vue de face : diamètre d'une barre ronde ou d'un bouton, largeur d'une barre plate, d'une lanière, d'une cuvette
  width: number;
  // Distance entre la façade et l'avant de la poignée
  projection: number;
}

type DimensionedModel = Pick<HandleModel, 'shape' | 'length_mm' | 'center_distance_mm' | 'width_mm' | 'projection_mm'>;

const positiveMm = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

// Cotes de la poignée dessinée, en mètres : celles du plan du fabricant saisies dans l'admin, sinon celles de sa forme.
// length : longueur réellement posée. Sur une façade trop petite pour la poignée entière, l'entraxe rétrécit d'autant.
export function modelHandleDimensions(model: DimensionedModel, length: number): HandleDimensions {
  const defaults = SHAPE_DEFAULT_DIMENSIONS[model.shape] ?? SHAPE_DEFAULT_DIMENSIONS.bar;
  const fullLength = positiveMm(model.length_mm);
  const scale = fullLength ? Math.min(1, length / (fullLength / 1000)) : 1;
  const ownSpacing = positiveMm(model.center_distance_mm);
  const spacing = ownSpacing
    ? (ownSpacing / 1000) * scale
    : model.shape === 'leather'
      ? Math.max(0, length - 2 * LEATHER_END_INSET)
      : length * DEFAULT_SPACING_RATIO;
  const projection = typeof model.projection_mm === 'number' && model.projection_mm >= 0 ? model.projection_mm : defaults.projection;
  return {
    spacing: Math.min(spacing, length),
    width: (positiveMm(model.width_mm) ?? defaults.width) / 1000,
    projection: projection / 1000,
  };
}
