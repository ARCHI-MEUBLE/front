export type ZoneContent = 'empty' | 'drawer' | 'dressing' | 'shelf' | 'door' | 'door_right' | 'door_double' | 'glass_shelf' | 'mirror_door' | 'mirror_door_right' | 'push_door' | 'push_door_right' | 'push_drawer';

export type HandleType = 'vertical_bar' | 'horizontal_bar' | 'knob' | 'recessed';

// Couleur spécifique à une zone (tiroir, porte, etc.)
export interface ZoneColor {
  colorId: number | null;
  hex: string | null;
  imageUrl?: string | null;
}

export type Zone = {
  id: string;
  type: 'leaf' | 'horizontal' | 'vertical';
  content?: ZoneContent;
  doorContent?: ZoneContent; // Portes superposées sur une zone (feuille ou parent)
  children?: Zone[];
  height?: number;
  splitRatio?: number; // Pour 2 enfants (0-100 pour le premier)
  splitRatios?: number[]; // Pour 3+ enfants (pourcentages)
  hasLight?: boolean;
  hasCableHole?: boolean;
  hasDressing?: boolean;
  handleType?: HandleType; // Type de poignée pour portes/tiroirs
  zoneColor?: ZoneColor; // Couleur spécifique pour cette zone (tiroir/porte)
  glassShelfCount?: number; // Nombre d'étagères en verre (1-5, défaut: 1)
  glassShelfPositions?: number[]; // Positions des étagères en % depuis le bas (0-100)
  isOpenSpace?: boolean; // Espace ouvert (pas de fond, pas de haut) pour laisser voir le mur
};

export interface ZoneContentMeta {
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const ZONE_CONTENT_META: Record<ZoneContent, ZoneContentMeta> = {
  empty: {
    label: 'Espace libre',
    shortLabel: 'Vide',
    icon: '—',
    description: 'Laisser la zone vide ou avec des étagères',
  },
  drawer: {
    label: 'Tiroir',
    shortLabel: 'Tiroir',
    icon: 'T',
    description: 'Ajoute un module coulissant',
  },
  dressing: {
    label: 'Penderie',
    shortLabel: 'Penderie',
    icon: 'P',
    description: 'Ajoute une tringle de penderie',
  },
  door: {
    label: 'Porte Gauche',
    shortLabel: 'Porte G',
    icon: 'D',
    description: 'Porte à ouverture gauche',
  },
  door_right: {
    label: 'Porte Droite',
    shortLabel: 'Porte D',
    icon: 'D',
    description: 'Porte à ouverture droite',
  },
  door_double: {
    label: 'Double Porte',
    shortLabel: 'Porte x2',
    icon: 'D2',
    description: 'Deux petites portes battantes',
  },
  glass_shelf: {
    label: 'Étagère en verre',
    shortLabel: 'Verre',
    icon: 'V',
    description: 'Étagère transparente moderne',
  },
  mirror_door: {
    label: 'Porte vitrée gauche',
    shortLabel: 'Vitrée G',
    icon: 'V',
    description: 'Porte vitrée à ouverture gauche',
  },
  mirror_door_right: {
    label: 'Porte vitrée droite',
    shortLabel: 'Vitrée D',
    icon: 'V',
    description: 'Porte vitrée à ouverture droite',
  },
  push_door: {
    label: 'Porte Push gauche',
    shortLabel: 'Push G',
    icon: 'PTO',
    description: 'Porte Push à ouverture gauche',
  },
  push_door_right: {
    label: 'Porte Push droite',
    shortLabel: 'Push D',
    icon: 'PTO',
    description: 'Porte Push à ouverture droite',
  },
  push_drawer: {
    label: 'Tiroir Push-to-Open',
    shortLabel: 'Push Tiroir',
    icon: 'PTD',
    description: 'Tiroir sans poignée, ouverture par pression',
  },
};

// Types pour les panneaux/faces sélectionnables du meuble
export type PanelType = 'left' | 'right' | 'top' | 'bottom' | 'back' | 'separator';

export interface PanelId {
  type: PanelType;
  index?: number; // Pour les séparateurs (sep-0, sep-1, etc.)
}

export interface PanelMeta {
  label: string;
  shortLabel: string;
  icon: string;
}

export const PANEL_META: Record<PanelType, PanelMeta> = {
  left: {
    label: 'Côté gauche',
    shortLabel: 'Gauche',
    icon: '◀',
  },
  right: {
    label: 'Côté droit',
    shortLabel: 'Droite',
    icon: '▶',
  },
  top: {
    label: 'Panneau supérieur',
    shortLabel: 'Haut',
    icon: '▲',
  },
  bottom: {
    label: 'Panneau inférieur',
    shortLabel: 'Bas',
    icon: '▼',
  },
  back: {
    label: 'Panneau arrière',
    shortLabel: 'Dos',
    icon: '■',
  },
  separator: {
    label: 'Séparateur',
    shortLabel: 'Sép.',
    icon: '|',
  },
};

// Fonction utilitaire pour créer un ID de panneau sous forme de string
export function panelIdToString(panel: PanelId): string {
  if (panel.type === 'separator' && panel.index !== undefined) {
    return `panel-separator-${panel.index}`;
  }
  return `panel-${panel.type}`;
}

// Fonction utilitaire pour parser un ID de panneau depuis une string
// Gère les formats: panel-left, panel-left-0, panel-left-0-1, panel-separator-h-root-0, etc.
export function stringToPanelId(str: string): PanelId | null {
  if (!str.startsWith('panel-')) return null;
  const rest = str.substring(6); // Enlever 'panel-'
  
  // Séparateurs: panel-separator-h-{zoneId}-{index} ou panel-separator-v-{zoneId}-{index}
  if (rest.startsWith('separator-')) {
    const index = parseInt(rest.split('-').pop() || '0', 10);
    return { type: 'separator', index: isNaN(index) ? 0 : index };
  }
  
  // Panneaux segmentés: panel-left-0, panel-top-1, panel-right-0-2, etc.
  const parts = rest.split('-');
  const baseType = parts[0];
  
  if (['left', 'right', 'top', 'bottom', 'back'].includes(baseType)) {
    // Extraire l'index du segment si présent (panel-left-0 -> index 0)
    const index = parts.length > 1 ? parseInt(parts[1], 10) : undefined;
    return { type: baseType as PanelType, index: isNaN(index as number) ? undefined : index };
  }
  
  return null;
}
