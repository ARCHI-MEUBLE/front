export type ZoneContent = 'empty' | 'drawer' | 'dressing' | 'shelf';

export type Zone = {
  id: string;
  type: 'leaf' | 'horizontal' | 'vertical';
  content?: ZoneContent;
  children?: Zone[];
  height?: number;
  splitRatio?: number;
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
};
