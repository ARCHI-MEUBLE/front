import { materialLabelFromKey } from '@/lib/configurator/materials';

const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

// La base enregistre ces teintes sans accents : on les corrige à l'affichage, les identifiants ne changent pas
const COLOR_NAMES: Record<string, string> = {
  'chene naturel': 'Chêne naturel',
  'bleu mineral': 'Bleu minéral',
  'pourpre imperial': 'Pourpre impérial',
  'blush peche': 'Blush pêche',
  'noisette caramelisee': 'Noisette caramélisée',
  'noyer fume': 'Noyer fumé',
  'saule poudre': 'Saule poudré',
  'vert foret profonde': 'Vert forêt profonde',
};

export function displayColorName(name: string | null | undefined): string {
  if (!name) return '';
  return COLOR_NAMES[stripAccents(name).toLowerCase().trim()] ?? name;
}

export function displayMaterialName(name: string | null | undefined): string {
  if (!name) return '';
  return materialLabelFromKey(name);
}
