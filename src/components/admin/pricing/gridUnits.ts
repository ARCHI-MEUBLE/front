// Saisie et affichage des paramètres de la grille de prix, selon leur unité. Mêmes bornes que la validation du
// backend (PUT pricing-config) : l'admin voit l'erreur en ligne avant l'envoi, avec le même sens.
import type { PricingParam } from '@/lib/pricingAdminApi';

export interface UnitSpec {
  // Suffixe affiché dans le champ de saisie
  suffix: string;
  // Bornes et pas de la valeur SAISIE (un ratio se saisit en %, de 0 à 100)
  min: number;
  max: number;
  step: number;
  integer: boolean;
  // Valeur saisie = valeur stockée × factor (100 pour un ratio)
  factor: number;
  // Rappel de l'unité pour une phrase d'erreur (« 100 000 € »)
  describe: (value: number) => string;
}

const number = (value: number, digits = 2) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const euroWhole = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// 600 -> « 600 € », 12.5 -> « 12,50 € »
export function formatEuro(value: number): string {
  return Math.round(value * 100) % 100 === 0 ? euroWhole.format(value) : euro.format(value);
}

export const MONEY_MAX = 100_000;

export function isMoneyUnit(unit: string): boolean {
  return unit.startsWith('eur') || unit.includes('€');
}

function moneySuffix(unit: string): string {
  if (unit === 'eur_m2') return '€/m²';
  if (unit === 'eur_linear_m') return '€/m';
  return '€';
}

// Bornes propres à un paramètre, plus strictes que celles de son unité
const PARAM_OVERRIDES: Record<string, Partial<Pick<UnitSpec, 'min' | 'max'>> & { reason?: string }> = {
  // Un écart nul ferait planter le calcul des pieds (division par zéro)
  'bases.metal.foot_spacing_mm': { min: 100, reason: 'Écart trop petit : 100 mm au minimum.' },
  // Le paiement d'une commande en acompte n'accepte que 1 à 99 %
  'payment.deposit.default_percent': { min: 1, max: 99, reason: "L'acompte doit être compris entre 1 et 99 %." },
};

export function paramKey(param: Pick<PricingParam, 'category' | 'item_type' | 'param_name'>): string {
  return `${param.category}.${param.item_type}.${param.param_name}`;
}

export function unitSpec(param: Pick<PricingParam, 'category' | 'item_type' | 'param_name' | 'unit'>): UnitSpec {
  const { unit } = param;
  let spec: UnitSpec;
  if (isMoneyUnit(unit)) {
    const suffix = moneySuffix(unit);
    spec = { suffix, min: 0, max: MONEY_MAX, step: 0.01, integer: false, factor: 1, describe: (v) => `${number(v)} ${suffix}` };
  } else if (unit === 'ratio') {
    spec = { suffix: '%', min: 0, max: 100, step: 0.1, integer: false, factor: 100, describe: (v) => `${number(v, 1)} %` };
  } else if (unit === 'percent') {
    spec = { suffix: '%', min: 0, max: 100, step: 0.1, integer: false, factor: 1, describe: (v) => `${number(v, 1)} %` };
  } else if (unit === 'coefficient') {
    spec = { suffix: '×', min: 0, max: 10, step: 0.001, integer: false, factor: 1, describe: (v) => `× ${number(v, 3)}` };
  } else if (unit === 'mm') {
    spec = { suffix: 'mm', min: 1, max: 5000, step: 1, integer: false, factor: 1, describe: (v) => `${number(v, 0)} mm` };
  } else if (unit === 'count') {
    spec = { suffix: '', min: 0, max: 20, step: 1, integer: true, factor: 1, describe: (v) => number(v, 0) };
  } else {
    // Unité inconnue : on laisse saisir un nombre positif, le serveur tranchera
    spec = { suffix: unit, min: 0, max: MONEY_MAX, step: 0.01, integer: false, factor: 1, describe: (v) => `${number(v)} ${unit}`.trim() };
  }
  const override = PARAM_OVERRIDES[paramKey(param)];
  if (override?.min !== undefined) spec.min = override.min;
  if (override?.max !== undefined) spec.max = override.max;
  return spec;
}

// Valeur stockée -> texte du champ (0.15 en ratio -> « 15 »)
export function toInputValue(param: Pick<PricingParam, 'category' | 'item_type' | 'param_name' | 'unit' | 'param_value'>): string {
  const spec = unitSpec(param);
  // Arrondi pour effacer les erreurs de virgule flottante (0.07 × 100 = 7.000000000000001)
  return String(Math.round(param.param_value * spec.factor * 10_000) / 10_000);
}

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

// Texte saisi -> valeur à stocker, ou message d'erreur en français
export function parseInput(
  param: Pick<PricingParam, 'category' | 'item_type' | 'param_name' | 'unit'>,
  raw: string
): ParseResult {
  const spec = unitSpec(param);
  const text = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (text === '') return { ok: false, error: 'Indiquez une valeur.' };
  const entered = Number(text);
  if (!Number.isFinite(entered)) return { ok: false, error: 'Nombre attendu, par exemple 12,5.' };
  if (spec.integer && !Number.isInteger(entered)) return { ok: false, error: 'Nombre entier attendu.' };
  const override = PARAM_OVERRIDES[paramKey(param)];
  if (entered < spec.min || entered > spec.max) {
    if (override?.reason) return { ok: false, error: override.reason };
    if (entered < 0 && spec.min === 0) return { ok: false, error: 'La valeur ne peut pas être négative.' };
    return { ok: false, error: `Entre ${spec.describe(spec.min)} et ${spec.describe(spec.max)}.` };
  }
  // Arrondi au pas de stockage (centimes, millièmes) pour ne pas envoyer 0.15000000000000002
  return { ok: true, value: Math.round((entered / spec.factor) * 1_000_000) / 1_000_000 };
}

// Valeur stockée lisible, avec son unité (« 95 €/m² », « 15 % », « × 1,3 »)
export function formatParamValue(param: Pick<PricingParam, 'category' | 'item_type' | 'param_name' | 'unit' | 'param_value'>): string {
  const { unit, param_value: value } = param;
  if (isMoneyUnit(unit)) {
    const suffix = moneySuffix(unit);
    return suffix === '€' ? formatEuro(value) : `${formatEuro(value)}${suffix.slice(1)}`;
  }
  if (unit === 'ratio') return `${number(value * 100, 1)} %`;
  if (unit === 'percent') return `${number(value, 1)} %`;
  if (unit === 'coefficient') return `× ${number(value, 3)}`;
  if (unit === 'mm') return `${number(value, 0)} mm`;
  if (unit === 'count') return number(value, 0);
  return `${number(value)} ${unit}`.trim();
}
