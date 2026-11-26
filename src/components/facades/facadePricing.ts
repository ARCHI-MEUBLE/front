// Prix d'une façade, même formule que le serveur (FacadePriceCalculator) avec les réglages publics de l'admin
// (GET /backend/api/facade-settings.php). Le prix affiché n'est qu'un aperçu : le serveur recalcule le prix de la
// façade à l'ajout au panier, et c'est ce prix-là qui est facturé.
import { useEffect, useState } from 'react';
import type { FacadeConfig } from '@/types/facade';

export const NO_HINGE = 'no-hole-no-hinge';
// Le serveur plafonne le nombre de charnières facturées
const MAX_BILLED_HINGES = 5;
// Limites de dimensions quand l'admin n'en a pas réglé : les mêmes que le serveur
export const FACADE_SIZE_FALLBACK_MM = 3000;
export const FACADE_MIN_SIZE_MM = 50;

// Réglages de l'admin ; null : réglage absent (on n'invente pas de prix)
export interface FacadeSettings {
  materialPricePerM2: number | null;
  hingeBasePrice: number | null;
  hingeCoefficient: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
  fixedDepth: number | null;
  hingeEdgeMargin: number | null;
  hingeHoleDiameter: number | null;
}

export const EMPTY_FACADE_SETTINGS: FacadeSettings = {
  materialPricePerM2: null,
  hingeBasePrice: null,
  hingeCoefficient: null,
  maxWidth: null,
  maxHeight: null,
  fixedDepth: null,
  hingeEdgeMargin: null,
  hingeHoleDiameter: null,
};

const SETTING_KEYS: Record<string, keyof FacadeSettings> = {
  material_price_per_m2: 'materialPricePerM2',
  hinge_base_price: 'hingeBasePrice',
  hinge_coefficient: 'hingeCoefficient',
  max_width: 'maxWidth',
  max_height: 'maxHeight',
  fixed_depth: 'fixedDepth',
  hinge_edge_margin: 'hingeEdgeMargin',
  hinge_hole_diameter: 'hingeHoleDiameter',
};

// Lignes de facade_settings -> FacadeSettings. 0 est une vraie valeur (charnières offertes, pas de majoration) ;
// une valeur négative ou illisible compte comme absente.
export function parseFacadeSettings(rows: unknown): FacadeSettings {
  const settings = { ...EMPTY_FACADE_SETTINGS };
  if (!Array.isArray(rows)) return settings;
  for (const row of rows) {
    const key = SETTING_KEYS[String(row?.setting_key ?? '')];
    const raw = row?.setting_value;
    const value = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
    if (key && Number.isFinite(value) && value >= 0) settings[key] = value;
  }
  return settings;
}

export async function fetchFacadeSettings(signal?: AbortSignal): Promise<FacadeSettings> {
  const response = await fetch('/backend/api/facade-settings.php', { signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || `Réglages des façades indisponibles (${response.status})`);
  }
  return parseFacadeSettings(body.data);
}

// Réglages chargés une fois par page ; en cas d'échec, tous absents (libellés sans prix plutôt qu'un prix faux)
export function useFacadeSettings(): { settings: FacadeSettings; loaded: boolean } {
  const [state, setState] = useState({ settings: EMPTY_FACADE_SETTINGS, loaded: false });
  useEffect(() => {
    const controller = new AbortController();
    fetchFacadeSettings(controller.signal)
      .then((settings) => setState({ settings, loaded: true }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn('Réglages des façades indisponibles :', error instanceof Error ? error.message : error);
        setState({ settings: EMPTY_FACADE_SETTINGS, loaded: true });
      });
    return () => controller.abort();
  }, []);
  return state;
}

// Largeur et hauteur maximales (mm) acceptées par le serveur
export function facadeMaxSize(settings: FacadeSettings): { width: number; height: number } {
  return {
    width: settings.maxWidth && settings.maxWidth > 0 ? settings.maxWidth : FACADE_SIZE_FALLBACK_MM,
    height: settings.maxHeight && settings.maxHeight > 0 ? settings.maxHeight : FACADE_SIZE_FALLBACK_MM,
  };
}

// Message si les dimensions sortent de ce que le serveur accepte ; null sinon
export function facadeSizeIssue(config: Pick<FacadeConfig, 'width' | 'height'>, settings: FacadeSettings): string | null {
  const max = facadeMaxSize(settings);
  if (config.width < FACADE_MIN_SIZE_MM || config.height < FACADE_MIN_SIZE_MM) {
    return `Une façade mesure au moins ${FACADE_MIN_SIZE_MM / 10} cm de côté.`;
  }
  if (config.width > max.width) return `Largeur maximale : ${max.width / 10} cm.`;
  if (config.height > max.height) return `Hauteur maximale : ${max.height / 10} cm.`;
  return null;
}

// Prix au m² retenu pour la matière : le sien, sinon le prix par défaut de l'admin (comme le serveur)
export function facadePricePerM2(material: { price_per_m2?: unknown } | null | undefined, settings: FacadeSettings): number | null {
  const own = Number(material?.price_per_m2);
  if (Number.isFinite(own) && own > 0) return own;
  return settings.materialPricePerM2;
}

// Nombre de charnières facturées : 0 sans charnière
export function billedHinges(hinges: { type?: string; count?: unknown } | null | undefined): number {
  if (!hinges || !hinges.type || hinges.type === NO_HINGE) return 0;
  const count = Math.trunc(Number(hinges.count));
  return Number.isFinite(count) ? Math.max(0, Math.min(MAX_BILLED_HINGES, count)) : 0;
}

export interface FacadePriceBreakdown {
  surfaceM2: number;
  pricePerM2: number;
  surface: number;
  hingeCount: number;
  hinges: number;
  // Majoration : coefficient × nombre de charnières, appliquée à (surface + charnières)
  supplement: number;
  drillings: number;
  // Prix d'une façade, arrondi au centime comme le serveur
  unitPrice: number;
}

const cents = (value: number) => Math.round(value * 100) / 100;

// Détail du prix d'une façade ; null si un réglage nécessaire manque (le prix sera calculé à l'ajout au panier)
export function facadePriceBreakdown(config: FacadeConfig, settings: FacadeSettings): FacadePriceBreakdown | null {
  const pricePerM2 = facadePricePerM2(config.material, settings);
  if (pricePerM2 === null) return null;
  const surfaceM2 = (config.width / 1000) * (config.height / 1000);
  const surface = surfaceM2 * pricePerM2;
  const hingeCount = billedHinges(config.hinges);
  let hinges = 0;
  let supplement = 0;
  if (hingeCount > 0) {
    if (settings.hingeBasePrice === null || settings.hingeCoefficient === null) return null;
    hinges = settings.hingeBasePrice * hingeCount;
    supplement = (surface + hinges) * settings.hingeCoefficient * hingeCount;
  }
  // Seuls les perçages d'un type de l'admin sont facturés (les trous de charnières sont compris)
  const drillings = (config.drillings ?? [])
    .filter((drilling) => Number(drilling.drilling_type_id) > 0)
    .reduce((sum, drilling) => sum + (Number(drilling.price) || 0), 0);
  return {
    surfaceM2,
    pricePerM2,
    surface,
    hingeCount,
    hinges,
    supplement,
    drillings,
    unitPrice: cents(surface + hinges + supplement + drillings),
  };
}
