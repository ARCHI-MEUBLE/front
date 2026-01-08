export type ZoneContent = 'empty' | 'drawer' | 'dressing' | 'shelf' | 'door' | 'door_right' | 'door_double' | 'glass_shelf' | 'mirror_door' | 'push_door' | 'push_drawer';

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
    label: 'Porte vitrée',
    shortLabel: 'Vitrée',
    icon: 'V',
    description: 'Porte avec façade vitrée',
  },
  push_door: {
    label: 'Porte Push-to-Open',
    shortLabel: 'Push Door',
    icon: 'PTO',
    description: 'Porte sans poignée, ouverture par pression',
  },
  push_drawer: {
    label: 'Tiroir Push-to-Open',
    shortLabel: 'Push Tiroir',
    icon: 'PTD',
    description: 'Tiroir sans poignée, ouverture par pression',
  },
};
