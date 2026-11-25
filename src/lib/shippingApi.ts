// Frais de livraison du panier, calculés par le backend (GET /backend/api/cart/shipping.php) avec les réglages de
// l'admin : livraison des meubles (selon leur taille) et livraison colis (façades, catalogue, échantillons), avec un
// éventuel seuil de gratuité. Ces mêmes frais sont ajoutés au total de la commande par le serveur.
import { formatPrice } from '@/lib/format';

const SHIPPING_ENDPOINT = '/backend/api/cart/shipping.php';

export interface CartShipping {
  // Σ livraison des meubles du panier (hors configurations dont le prix comprend déjà la livraison)
  furniture: number;
  // Livraison colis des autres articles ; 0 s'il n'y en a pas ou au-delà du seuil de gratuité
  parcel: number;
  total: number;
  // Seuil de gratuité de la livraison colis ; null : pas de seuil
  parcelFreeFrom: number | null;
}

const amount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
};

// Réponse de l'API -> CartShipping ; les montants peuvent arriver en texte (colonnes DECIMAL)
export function parseCartShipping(data: any): CartShipping {
  const furniture = amount(data?.furniture);
  const parcel = amount(data?.parcel);
  const freeFrom = amount(data?.parcel_free_from);
  return {
    furniture,
    parcel,
    total: data?.total === undefined || data?.total === null ? Math.round((furniture + parcel) * 100) / 100 : amount(data.total),
    parcelFreeFrom: freeFrom > 0 ? freeFrom : null,
  };
}

export async function fetchCartShipping(signal?: AbortSignal): Promise<CartShipping> {
  const response = await fetch(SHIPPING_ENDPOINT, { credentials: 'include', signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || `Frais de livraison indisponibles (${response.status})`);
  }
  return parseCartShipping(body.data);
}

export interface ShippingLine {
  key: 'furniture' | 'parcel';
  label: string;
  amount: number;
  // Ce qu'affiche la colonne montant : le prix, ou « Offerte » seulement si le montant est 0
  value: string;
  // Précision sous la ligne (seuil de gratuité, livraison comprise dans le prix…)
  note: string | null;
}

export interface ShippingCartContent {
  // Le panier contient des meubles sur mesure
  hasFurniture: boolean;
  // …et dont TOUS les prix comprennent déjà la livraison (configurations enregistrées avant les frais séparés)
  furnitureDeliveryIncluded?: boolean;
  // Le panier contient des façades, des articles du catalogue ou des échantillons (livrés en colis)
  hasParcelItems: boolean;
}

// Lignes « Livraison des meubles » et « Livraison colis » du récapitulatif, pour ce que contient le panier (et toujours
// dès qu'un montant est facturé, pour que les lignes s'additionnent jusqu'au total du serveur)
export function shippingLines(shipping: CartShipping, cart: ShippingCartContent): ShippingLine[] {
  const lines: ShippingLine[] = [];
  if (cart.hasFurniture || shipping.furniture > 0) {
    const included = shipping.furniture === 0 && cart.furnitureDeliveryIncluded === true;
    lines.push({
      key: 'furniture',
      label: 'Livraison des meubles',
      amount: shipping.furniture,
      value: shipping.furniture > 0 ? formatPrice(shipping.furniture) : included ? 'Comprise' : 'Offerte',
      note: included ? 'Déjà comprise dans le prix de vos meubles' : null,
    });
  }
  if (cart.hasParcelItems || shipping.parcel > 0) {
    const freeFrom = shipping.parcelFreeFrom;
    lines.push({
      key: 'parcel',
      label: 'Livraison colis',
      amount: shipping.parcel,
      value: shipping.parcel > 0 ? formatPrice(shipping.parcel) : 'Offerte',
      note: freeFrom === null ? null : shipping.parcel > 0 ? `Offerte dès ${formatPrice(freeFrom)} d'achat` : `Dès ${formatPrice(freeFrom)} d'achat`,
    });
  }
  return lines;
}

// Frais de livraison que le serveur ajoutera, pour ce que contient le panier
export function shippingTotal(shipping: CartShipping, cart: ShippingCartContent): number {
  return Math.round(shippingLines(shipping, cart).reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
}
