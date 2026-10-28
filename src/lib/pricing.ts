import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { formatPrice } from '@/lib/format';

// Estimation renvoyée par le backend (FurniturePriceCalculator) : prix central, écart type, fourchette prix ± écart type
// et détail par poste. Le backend recalcule ce même prix à l'enregistrement : le front ne fait qu'afficher.
export interface PriceEstimate {
  price: number;
  low: number;
  high: number;
  sigma: number;
  lines: { key: string; label: string; amount: number }[];
}

// Ce que le calcul lit dans la configuration, sous la même forme que config_data à l'enregistrement
export interface PricedConfiguration {
  dimensions: { width: number; height: number; depth: number };
  styling: { materialKey: string; finish: string; socle: string };
  features: { doorType: 'none' | 'single' | 'double' };
  advancedZones: Zone;
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
  return body.data as PriceEstimate;
}

// 1290, 1460 -> « 1 290 – 1 460 € »
export function formatPriceRange({ low, high }: Pick<PriceEstimate, 'low' | 'high'>): string {
  return `${formatPrice(low).replace(/\s*€$/, '')} – ${formatPrice(high)}`;
}
