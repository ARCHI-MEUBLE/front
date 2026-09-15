// Mapping pour les anciens matériaux uniquement (backward compatibility)
export const MATERIAL_LABEL_BY_KEY: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

// Prix par défaut pour les anciens matériaux (backward compatibility)
export const MATERIAL_PRICE_BY_KEY: Record<string, number> = {
  agglomere: 0,
  mdf_melamine: 70,
  plaque_bois: 140,
};

export const DEFAULT_COLOR_HEX = '#D8C7A1';

// Mapping pour les poignées vers codes prompt
export const HANDLE_TYPE_CODE: Record<string, string> = {
  'vertical_bar': '1',
  'horizontal_bar': '2',
  'knob': '3',
  'recessed': '4',
};

// Normalise une clé de matériau - garde la valeur telle quelle pour les nouveaux matériaux
export function normalizeMaterialKey(value: string | null | undefined): string {
  if (!value) return 'agglomere';

  // Normalisation pour comparaison
  const normalized = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // Mapping strict pour la rétrocompatibilité uniquement
  // On ne cherche plus de correspondances partielles comme "bois" qui polluent les nouvelles catégories
  if (normalized === 'agglomere') return 'agglomere';
  if (normalized === 'mdf + revetement (melamine)' || normalized === 'mdf_melamine') return 'mdf_melamine';
  if (normalized === 'plaque bois' || normalized === 'plaque_bois') return 'plaque_bois';

  // Pour tout le reste (nouvelles catégories admin), retourner la valeur originale sans transformation
  return value;
}

export function materialLabelFromKey(key: string): string {
  // Les matériaux sont maintenant gérés dynamiquement via l'API
  return key;
}
