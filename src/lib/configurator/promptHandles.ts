// Poignées dans le texte de génération (« M1(1500,500,730)EbFV2(Pg1(H2(,)),T2) ») : écriture du chiffre de poignée
// après le code de la façade, et relecture des portes de groupe et des chiffres de poignée.
// Le chiffre n'est écrit que si la façade a son propre choix (voir handlePromptCode).

import type { Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import {
  handleFacadeKind,
  handlePromptCode,
  zoneHandleFromPromptCode,
  type HandleDefaults,
  type HandleModel,
} from './handles';

type ZoneHandleFields = Pick<Zone, 'handleOrientation' | 'handleType'>;

// Code de porte d'une zone (porte de groupe, ou porte d'une feuille) : vide pour la porte du meuble entier, que le
// texte porte déjà dans ses options
function doorCodeOf(zone: Zone, door: ZoneContent | null | undefined): string {
  switch (door) {
    case 'door':
      return zone.id === 'root' ? '' : 'Pg';
    case 'door_right':
      return 'Pd';
    case 'door_double':
      return 'P2';
    // Vantaux sur rail encastré : le générateur en déduit 2 ou 3 selon la largeur
    case 'sliding_door':
      return 'Pc';
    // Le format n'a pas de côté pour les portes vitrées et Push : la porte est transmise sans son sens d'ouverture
    case 'mirror_door':
    case 'mirror_door_right':
      return 'Pm';
    case 'push_door':
    case 'push_door_right':
      return 'Po';
    default:
      return '';
  }
}

function leafCodeOf(content: ZoneContent | undefined): string {
  if (content === 'drawer') return 'T';
  if (content === 'push_drawer') return 'To';
  if (content === 'dressing') return 'D';
  return '';
}

// Codes de façade d'une zone : `door` (Pg, Pd, P2, Pm, Po) et `leaf` (T, To, D, feuilles seulement), avec le chiffre
// de poignée accolé à la façade qui porte la poignée (« Pg1 », « P22 », « T2 »)
export function zoneFacadeCodes(
  zone: Zone,
  models: HandleModel[],
  defaults: HandleDefaults
): { door: string; leaf: string } {
  let door = doorCodeOf(zone, zone.doorContent || (zone.type === 'leaf' ? zone.content : null));
  let leaf = zone.type === 'leaf' ? leafCodeOf(zone.content) : '';

  const kind = handleFacadeKind(zone);
  const digit = kind ? handlePromptCode(zone, kind, models, defaults) : '';
  if (digit) {
    if (kind === 'door' && door) door += digit;
    else if (kind === 'drawer' && leaf === 'T') leaf += digit;
  }
  return { door, leaf };
}

// Porte posée sur un groupe : « Pg1(H2(,)) », « P2(V3(,,)) », « G(...) » (groupe sans porte). Les codes longs passent
// avant « P » : « P2( » est une double porte, jamais une porte « P » à poignée horizontale.
const GROUP_DOOR = /^(G|P2|Pc|Pm|Po|Pd|Pg|P)(\d)?(?:\[([^\]]+)\])?\((.*)\)$/;

const GROUP_DOOR_CONTENT: Record<string, ZoneContent | undefined> = {
  G: undefined,
  P2: 'door_double',
  Pc: 'sliding_door',
  Pm: 'mirror_door',
  Po: 'push_door',
  Pd: 'door_right',
  Pg: 'door',
  P: 'door',
};

export interface GroupDoorMatch {
  doorContent: ZoneContent | undefined;
  // Champs de poignée à poser sur le groupe (vide sans chiffre)
  handle: ZoneHandleFields;
  // Ratios écrits entre crochets après le code (anciens textes)
  ratios: string | undefined;
  inner: string;
}

export function matchGroupDoor(str: string): GroupDoorMatch | null {
  const match = GROUP_DOOR.exec(str);
  if (!match) return null;
  const [, code, digit, ratios, inner] = match;
  return {
    doorContent: GROUP_DOOR_CONTENT[code],
    handle: digit ? zoneHandleFromPromptCode(digit) : {},
    ratios,
    inner,
  };
}

// Chiffre de poignée d'une feuille : après T (tiroir) ou après le code d'une porte à poignée (« Pg1 », « P21 »,
// « Pm3 », « Pc2 »). « P2 » seul est une double porte sans chiffre, « To » et « Po » n'ont pas de poignée.
export function leafHandleFromPrompt(str: string): ZoneHandleFields {
  const match = str.match(/(?:T|P2|Pc|Pm|Pd|Pg)(\d)/);
  return match ? zoneHandleFromPromptCode(match[1]) : {};
}
