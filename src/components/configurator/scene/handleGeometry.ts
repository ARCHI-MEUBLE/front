// Calculs de pose des poignées sur une façade (unités en mètres) : longueur bornée et position du centre. Logique pure,
// testée à part ; le dessin est dans StructuralElements.tsx (composant Handle).
import type { HandleFacadeKind, HandleOrientation } from '@/lib/configurator/handles';
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
