// Totaux affichés au client : panier, commande (confirmation), lien de paiement. Le serveur fait foi : la commande
// enregistre ses articles, ses frais de livraison (shipping_amount) et son total ; le front additionne seulement pour
// présenter des lignes qui tombent juste.

export const roundCents = (value: number): number => Math.round(value * 100) / 100;

// Montant venu de l'API (nombre ou texte d'une colonne DECIMAL) ; 0 si absent ou illisible
export const toAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Booléen venu de l'API : vrai booléen, ou texte de Postgres (« t ») selon la route
export const isTrueFlag = (value: unknown): boolean => value === true || value === 't' || value === 'true' || value === 1 || value === '1';

// Σ prix unitaire × quantité d'une liste d'articles
export function sumItems<T>(items: readonly T[] | null | undefined, unitPrice: (item: T) => unknown, quantity: (item: T) => unknown): number {
  return roundCents((items ?? []).reduce((sum, item) => sum + toAmount(unitPrice(item)) * toAmount(quantity(item)), 0));
}

export interface CartTotals {
  furniture: number;
  facades: number;
  catalogue: number;
  samples: number;
  // Sous-total des articles, livraison non comprise
  items: number;
  // Frais de livraison du serveur ; null s'ils n'ont pas pu être chargés (total alors « hors livraison »)
  shipping: number | null;
  total: number;
}

export function cartTotals(
  parts: { furniture: number; facades: number; catalogue: number; samples: number },
  shipping: number | null,
): CartTotals {
  const items = roundCents(parts.furniture + parts.facades + parts.catalogue + parts.samples);
  return { ...parts, items, shipping, total: roundCents(items + (shipping ?? 0)) };
}

export type OrderPaymentState = 'free' | 'paid' | 'partially_paid' | 'pending';

export interface OrderPayment {
  // Sous-total des articles (total de la commande moins la livraison)
  items: number;
  shipping: number;
  total: number;
  // Déjà encaissé (paiement intégral, ou acompte puis solde)
  paid: number;
  remaining: number;
  state: OrderPaymentState;
}

// Ce que renvoient les API de commande (OrderMapper) pour les montants et l'état du paiement
export interface OrderAmounts {
  total?: unknown;
  total_amount?: unknown;
  shipping_amount?: unknown;
  payment_status?: string | null;
  payment_strategy?: string | null;
  deposit_amount?: unknown;
  remaining_amount?: unknown;
  deposit_payment_status?: string | null;
  balance_payment_status?: string | null;
}

export function orderPayment(order: OrderAmounts): OrderPayment {
  const total = roundCents(toAmount(order.total ?? order.total_amount));
  const shipping = roundCents(toAmount(order.shipping_amount));
  let paid = 0;
  if (order.payment_status === 'paid') {
    paid = total;
  } else if (order.payment_strategy === 'deposit') {
    if (order.deposit_payment_status === 'paid') paid += toAmount(order.deposit_amount);
    if (order.balance_payment_status === 'paid') paid += toAmount(order.remaining_amount);
  }
  paid = roundCents(Math.min(paid, total));
  const remaining = roundCents(Math.max(0, total - paid));
  const state: OrderPaymentState = total === 0 ? 'free' : remaining === 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'pending';
  return { items: roundCents(Math.max(0, total - shipping)), shipping, total, paid, remaining, state };
}

export interface OrderLine {
  key: string;
  label: string;
  detail: string;
  amount: number;
}

type ApiRow = Record<string, any>;

const rows = (value: unknown): ApiRow[] => (Array.isArray(value) ? value.filter((row) => row && typeof row === 'object') : []);

// Montant d'une ligne de commande : total enregistré, sinon prix unitaire × quantité
const rowAmount = (row: ApiRow, unitKey = 'unit_price'): number =>
  row.total_price !== undefined && row.total_price !== null ? roundCents(toAmount(row.total_price)) : roundCents(toAmount(row[unitKey]) * toAmount(row.quantity ?? 1));

const facadeLabel = (row: ApiRow): string => {
  let config = row.config ?? row.config_data;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch {
      config = null;
    }
  }
  const width = toAmount(config?.width);
  const height = toAmount(config?.height);
  return width > 0 && height > 0 ? `Façade ${width / 10} × ${height / 10} cm` : 'Façade sur mesure';
};

// Articles d'une commande vue par le lien de paiement : meubles, façades, catalogue et échantillons, chacun avec son
// prix enregistré dans la commande
export function paymentLinkLines(items: unknown): OrderLine[] {
  const source = (items && typeof items === 'object' ? items : {}) as ApiRow;
  const quantity = (row: ApiRow) => `Quantité : ${toAmount(row.quantity ?? 1)}`;
  return [
    ...rows(source.configurations).map((row, index) => ({
      key: `configuration-${row.id ?? index}`,
      label: String(row.name || 'Configuration personnalisée'),
      detail: quantity(row),
      amount: rowAmount(row),
    })),
    ...rows(source.facades ?? source.facade_items).map((row, index) => ({
      key: `facade-${row.id ?? index}`,
      label: facadeLabel(row),
      detail: quantity(row),
      amount: rowAmount(row),
    })),
    ...rows(source.catalogue ?? source.catalogue_items).map((row, index) => ({
      key: `catalogue-${row.id ?? index}`,
      label: String(row.name || row.item_name || 'Article du catalogue'),
      detail: [row.variation_name, quantity(row)].filter(Boolean).join(' · '),
      amount: rowAmount(row),
    })),
    ...rows(source.samples).map((row, index) => ({
      key: `sample-${row.id ?? index}`,
      label: String(row.name || row.sample_name || 'Échantillon'),
      detail: `Échantillon × ${toAmount(row.quantity ?? 1)}`,
      amount: rowAmount(row, 'price'),
    })),
  ];
}
