// Appels admin liés aux prix (grille du meuble, prix au m² des matières, ajustement d'un devis, acompte), par le
// proxy du site (/backend/api/... → /api/proxy/...) comme handleModelsApi : même origine, cookies de session admin
// transmis, statut et message d'erreur du backend conservés.

export interface PricingParam {
  id: number;
  category: string;
  item_type: string;
  param_name: string;
  param_value: number;
  // eur, eur_m2, eur_linear_m, coefficient, ratio (0 à 1), mm, percent (0 à 100), count (entier)
  unit: string;
  description: string | null;
  is_active: boolean;
}

export interface MaterialPrice {
  // Texte exact de sample_types.material
  material: string;
  // null : pas de prix propre, la matière est comptée au prix par défaut (materials.default)
  price_per_m2: number | null;
  // Nombre de couleurs (sample_types) de cette matière
  colors: number;
}

export interface MaterialPrices {
  materials: MaterialPrice[];
  defaultPricePerM2: number;
}

export interface PriceEstimateLine {
  key: string;
  label: string;
  amount: number;
}

// Réponse de pricing/estimate : prix du meuble (sans livraison) et livraison d'un meuble, à part
export interface AdminPriceEstimate {
  price: number;
  low: number;
  high: number;
  sigma: number;
  lines: PriceEstimateLine[];
  // Absente tant que le backend n'a pas séparé la livraison
  delivery: number | null;
}

export interface ReferenceModel {
  id: number;
  name: string;
  configData: Record<string, unknown>;
}

export class PricingAdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PricingAdminApiError';
  }
}

export const SERVER_UNREACHABLE = 'Le serveur ne répond pas, réessayez.';

function fallbackMessage(status: number): string {
  if (status === 401 || status === 403) return 'Session admin expirée : reconnectez-vous.';
  if (status === 404) return "Ce service n'est pas disponible sur le serveur (mise à jour du backend à déployer ?).";
  if (status >= 500) return 'Erreur du serveur, réessayez dans un instant.';
  return `Requête refusée par le serveur (${status}).`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (err) {
    // Requête annulée : on laisse passer l'AbortError pour que l'appelant l'ignore
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    // fetch rejeté (backend arrêté, réseau coupé) : le message du navigateur est en anglais
    throw new PricingAdminApiError(SERVER_UNREACHABLE, 0);
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Réponse vide ou non JSON (page d'erreur HTML) : le statut suffit
  }
  // Selon la route, le backend écrit l'erreur dans « error » ou dans « message »
  const body = (data ?? {}) as { success?: boolean; error?: unknown; message?: unknown };
  if (!response.ok || body.success === false || data === null) {
    const message =
      (typeof body.error === 'string' && body.error) ||
      (body.success === false && typeof body.message === 'string' && body.message) ||
      (response.ok ? 'Réponse illisible du serveur.' : fallbackMessage(response.status));
    throw new PricingAdminApiError(message, response.status);
  }
  return data as T;
}

// Les DECIMAL PostgreSQL arrivent en texte (« 95.00 »)
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// PDO renvoie les booléens PostgreSQL en true/false, mais une vieille réponse peut écrire « t » ou 1
export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 't' || value === 'true';
}

function normalizeParam(row: Record<string, unknown>): PricingParam {
  return {
    id: Number(row.id),
    category: String(row.category ?? ''),
    item_type: String(row.item_type ?? ''),
    param_name: String(row.param_name ?? ''),
    param_value: toNumber(row.param_value) ?? 0,
    unit: String(row.unit ?? ''),
    description: typeof row.description === 'string' && row.description.trim() ? row.description : null,
    // Ancienne API : is_active absent = actif
    is_active: row.is_active === undefined || row.is_active === null ? true : asBool(row.is_active),
  };
}

function normalizeEstimate(data: Record<string, unknown>): AdminPriceEstimate {
  const lines = Array.isArray(data.lines) ? (data.lines as Record<string, unknown>[]) : [];
  return {
    price: toNumber(data.price) ?? 0,
    low: toNumber(data.low) ?? 0,
    high: toNumber(data.high) ?? 0,
    sigma: toNumber(data.sigma) ?? 0,
    lines: lines.map((line) => ({
      key: String(line.key ?? ''),
      label: String(line.label ?? line.key ?? ''),
      amount: toNumber(line.amount) ?? 0,
    })),
    delivery: toNumber(data.delivery),
  };
}

// config_data enregistré en texte JSON (modèles, configurations) : objet, ou null s'il est vide ou illisible
export function parseConfigData(value: unknown): Record<string, unknown> | null {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
}

// Même condition que FurniturePricing::canEstimate : les trois dimensions sont des nombres
export function isEstimable(configData: Record<string, unknown> | null): configData is Record<string, unknown> {
  const dimensions = configData?.dimensions as Record<string, unknown> | undefined;
  if (!dimensions || typeof dimensions !== 'object') return false;
  return ['width', 'height', 'depth'].every((key) => toNumber(dimensions[key]) !== null);
}

const GRID_URL = '/backend/api/pricing-config/index.php';
const MATERIALS_URL = '/backend/api/admin/material-prices.php';

// Toute la grille, y compris d'éventuelles lignes désactivées (affichées comme telles)
async function fetchGrid(): Promise<PricingParam[]> {
  const res = await call<{ data?: unknown }>(`${GRID_URL}?active_only=false`);
  const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
  return rows.map(normalizeParam);
}

export const pricingAdminApi = {
  grid: fetchGrid,

  async updateParam(id: number, value: number): Promise<void> {
    await call(GRID_URL, { method: 'PUT', body: JSON.stringify({ id, param_value: value }) });
  },

  async materialPrices(): Promise<MaterialPrices> {
    const res = await call<{ data?: { materials?: Record<string, unknown>[]; default_price_per_m2?: unknown } }>(MATERIALS_URL);
    const materials = (res.data?.materials ?? []).map((row) => ({
      material: String(row.material ?? ''),
      price_per_m2: toNumber(row.price_per_m2),
      colors: Number(row.colors ?? 0) || 0,
    }));
    return { materials, defaultPricePerM2: toNumber(res.data?.default_price_per_m2) ?? 0 };
  },

  async setMaterialPrice(material: string, pricePerM2: number): Promise<void> {
    await call(MATERIALS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'set', material, price_per_m2: pricePerM2 }),
    });
  },

  async deleteMaterialPrice(material: string): Promise<void> {
    await call(MATERIALS_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', material }) });
  },

  // Estimation publique, la même que celle du configurateur
  async estimate(configData: Record<string, unknown>, signal?: AbortSignal): Promise<AdminPriceEstimate> {
    const res = await call<{ data?: Record<string, unknown> }>('/backend/api/pricing/estimate.php', {
      method: 'POST',
      body: JSON.stringify({ config_data: configData }),
      signal,
    });
    return normalizeEstimate(res.data ?? {});
  },

  // Modèles du site dont la configuration 3D permet une estimation (meubles de référence de la simulation)
  async referenceModels(): Promise<ReferenceModel[]> {
    const res = await call<{ models?: Record<string, unknown>[] }>('/backend/api/models.php');
    return (res.models ?? []).flatMap((model) => {
      const configData = parseConfigData(model.config_data);
      return isEstimable(configData)
        ? [{ id: Number(model.id), name: String(model.name ?? `Modèle ${model.id}`), configData }]
        : [];
    });
  },

  // Prix fixé à la main sur un devis (remise, geste commercial) ; renvoie le prix enregistré
  async adjustConfigurationPrice(id: number, price: number, note: string): Promise<number> {
    const res = await call<{ price?: unknown }>('/backend/api/admin/configurations/price.php', {
      method: 'POST',
      body: JSON.stringify({ id, price, note }),
    });
    return toNumber(res.price) ?? price;
  },

  // Acompte proposé par défaut (payment.deposit.default_percent), null si le réglage n'existe pas
  async depositDefaultPercent(): Promise<number | null> {
    const params = await fetchGrid();
    const param = params.find(
      (p) => p.category === 'payment' && p.item_type === 'deposit' && p.param_name === 'default_percent'
    );
    return param ? param.param_value : null;
  },

  async setPaymentStrategy(orderId: string | number, strategy: 'full' | 'deposit', depositPercentage = 0): Promise<void> {
    await call('/backend/api/admin/orders/payment-strategy.php', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, strategy, deposit_percentage: depositPercentage }),
    });
  },
};

export function pricingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof PricingAdminApiError) return err.message;
  if (err instanceof TypeError) return SERVER_UNREACHABLE;
  return err instanceof Error && err.message ? err.message : fallback;
}
