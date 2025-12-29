export type ZoneContent = 'empty' | 'drawer' | 'dressing' | 'shelf' | 'door' | 'door_right' | 'door_double';

export type Zone = {
  id: string;
  type: 'leaf' | 'horizontal' | 'vertical';
  content?: ZoneContent;
  children?: Zone[];
  height?: number;
  splitRatio?: number; // Pour 2 enfants (0-100 pour le premier)
  splitRatios?: number[]; // Pour 3+ enfants (pourcentages)
  hasLight?: boolean;
  hasCableHole?: boolean;
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
  shelf: {
    label: 'Étagère',
    shortLabel: 'Étagère',
    icon: 'E',
    description: 'Zone dédiée aux étagères fixes',
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
};
