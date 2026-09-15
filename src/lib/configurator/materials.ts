export const MATERIAL_LABEL_BY_KEY: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

export const MATERIAL_PRICE_BY_KEY: Record<string, number> = {
  agglomere: 0,
  mdf_melamine: 70,
  plaque_bois: 140,
};

export const DEFAULT_COLOR_HEX = '#D8C7A1';

export const HANDLE_TYPE_CODE: Record<string, string> = {
  'vertical_bar': '1',
  'horizontal_bar': '2',
  'knob': '3',
  'recessed': '4',
};

export function normalizeMaterialKey(value: string | null | undefined): string {
  if (!value) return 'agglomere';

  const normalized = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  if (normalized === 'agglomere') return 'agglomere';
  if (normalized === 'mdf + revetement (melamine)' || normalized === 'mdf_melamine') return 'mdf_melamine';
  if (normalized === 'plaque bois' || normalized === 'plaque_bois') return 'plaque_bois';

  return value;
}

export function materialLabelFromKey(key: string): string {
  return key;
}
