import type { Zone } from '@/components/configurator/ZoneEditor/types';
import type { HandleDefaults } from '@/lib/configurator/handles';
import { formatPrice } from '@/lib/format';
import { isTrueFlag } from '@/lib/orderTotals';

// Estimation renvoyée par le backend (FurniturePriceCalculator) : prix central du meuble seul, écart type, fourchette
// prix ± écart type et détail par poste. La livraison n'est plus dans le prix : c'est un frais à part, ajouté au panier
// (delivery, livraison d'un meuble à l'euro). Le backend recalcule ce même prix à l'enregistrement : le front ne fait
// qu'afficher.
export interface PriceEstimate {
  price: number;
  low: number;
  high: number;
  sigma: number;
  lines: { key: string; label: string; amount: number }[];
  // null : le backend n'a pas donné la livraison (ancienne version) ; on n'affiche alors rien plutôt qu'un montant faux
  delivery: number | null;
}

// Couleur d'une partie du meuble : le backend en déduit la matière, donc le prix au m² de cette partie
type PartColor = { colorId: number | null; hex?: string | null; imageUrl?: string | null };

// Ce que le calcul lit dans la configuration, sous la même forme que config_data à l'enregistrement : le prix affiché
// est ainsi celui que le backend recalcule en enregistrant
export interface PricedConfiguration {
  dimensions: { width: number; height: number; depth: number };
  styling: { materialKey: string; finish: string; socle: string; colorId?: number | null };
  features: { doorType: 'none' | 'single' | 'double'; mountingStyle?: 'applique' | 'encastre' };
  advancedZones: Zone;
  // Poignée du meuble : prix des façades qui n'ont pas leur propre modèle
  handles: HandleDefaults;
  // Une couleur par partie (structure, fond, étagères, portes, tiroirs, socle) : chaque partie est comptée au prix de
  // sa matière. Sans useMultiColor, tout le meuble suit styling.colorId.
  useMultiColor?: boolean;
  componentColors?: Record<string, PartColor>;
  // Panneaux retirés du caisson
  deletedPanelIds?: string[];
}

const toNumber = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

// Réponse du backend -> PriceEstimate ; les montants peuvent arriver en texte
export function parsePriceEstimate(data: any): PriceEstimate {
  const delivery = data?.delivery;
  return {
    price: toNumber(data?.price),
    low: toNumber(data?.low),
    high: toNumber(data?.high),
    sigma: toNumber(data?.sigma),
    lines: Array.isArray(data?.lines)
      ? data.lines.map((line: any) => ({ key: String(line?.key ?? ''), label: String(line?.label ?? ''), amount: toNumber(line?.amount) }))
      : [],
    delivery: delivery === null || delivery === undefined || !Number.isFinite(Number(delivery)) ? null : Number(delivery),
  };
}

export async function fetchPriceEstimate(config: PricedConfiguration, signal?: AbortSignal): Promise<PriceEstimate> {
  const response = await fetch('/backend/api/pricing/estimate.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config_data: config }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || `Estimation du prix impossible (${response.status})`);
  }
  return parsePriceEstimate(body.data);
}

// 1290, 1460 -> « 1 290 – 1 460 € »
export function formatPriceRange({ low, high }: Pick<PriceEstimate, 'low' | 'high'>): string {
  return `${formatPrice(low).replace(/\s*€$/, '')} – ${formatPrice(high)}`;
}

// Ligne livraison sous le prix du meuble : frais à part, ajoutés au panier
export function deliveryLabel(delivery: number | null): string | null {
  if (delivery === null) return null;
  return delivery > 0 ? `Livraison : ${formatPrice(delivery)} (ajoutée au panier)` : 'Livraison offerte';
}

// Prix d'une configuration enregistrée (le devis), tel que le renvoie l'API : c'est lui qui est payé, pas l'estimation
export interface SavedQuote {
  price: number;
  // Prix fixé à la main par l'atelier
  adjusted: boolean;
  // Note de l'atelier sur ce prix (affichée à l'admin seulement)
  note: string | null;
  // Configurations enregistrées avant que la livraison sorte du prix : leur prix la comprend déjà
  includesDelivery: boolean;
}

// Configuration renvoyée par l'API -> SavedQuote ; null si elle n'a pas de prix
export function savedQuoteFrom(configuration: any): SavedQuote | null {
  const price = Number(configuration?.price);
  if (configuration?.price === null || configuration?.price === undefined || !Number.isFinite(price)) return null;
  const note = typeof configuration?.price_note === 'string' && configuration.price_note.trim() ? configuration.price_note.trim() : null;
  return {
    price,
    adjusted: isTrueFlag(configuration?.price_adjusted),
    note,
    includesDelivery: isTrueFlag(configuration?.price_includes_delivery),
  };
}

// Estimation actuelle comparable au devis (livraison ajoutée si le devis la comprend), ou null si elle est identique
// (à l'euro près) ou inconnue : la consultation ne la montre que si la grille a changé depuis le devis
export function currentEstimateIfDifferent(quote: SavedQuote, estimate: PriceEstimate | null): number | null {
  if (!estimate) return null;
  if (quote.includesDelivery && estimate.delivery === null) return null;
  const comparable = estimate.price + (quote.includesDelivery ? (estimate.delivery ?? 0) : 0);
  return Math.abs(comparable - quote.price) >= 1 ? comparable : null;
}
