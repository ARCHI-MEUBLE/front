/**
 * Utilitaires pour Stripe
 *
 * Fonctions réutilisables pour:
 * - Créer des sessions Stripe
 * - Formater les données pour Stripe
 * - Gérer les adresses
 */

/**
 * Article de commande
 */
export interface OrderItem {
  name: string;
  price: number; // en euros
  quantity: number;
}

/**
 * Adresse de livraison
 */
export interface ShippingAddress {
  fullName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

/**
 * Données de commande pour Stripe Checkout
 */
export interface CheckoutOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  customerId?: string;
  orderId?: string;
  notes?: string;
}

/**
 * Valider une adresse de livraison
 */
export function validateShippingAddress(
  address: ShippingAddress
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!address.fullName?.trim()) {
    errors.push('Le nom complet est requis');
  }

  if (!address.address?.trim()) {
    errors.push("L'adresse est requise");
  }

  if (!address.postalCode?.trim()) {
    errors.push('Le code postal est requis');
  }

  if (!address.city?.trim()) {
    errors.push('La ville est requise');
  }

  if (!address.country?.trim()) {
    errors.push('Le pays est requis');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valider des articles de commande
 */
export function validateOrderItems(items: OrderItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Au moins un article est requis');
    return { valid: false, errors };
  }

  items.forEach((item, idx) => {
    if (!item.name?.trim()) {
      errors.push(`Article ${idx + 1}: le nom est requis`);
    }

    if (!item.price || item.price < 0) {
      errors.push(`Article ${idx + 1}: le prix doit être supérieur à 0`);
    }

    if (!item.quantity || item.quantity < 1) {
      errors.push(`Article ${idx + 1}: la quantité doit être au moins 1`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculer le total d'une commande
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Formater le prix en centimes pour Stripe
 */
export function formatPriceForStripe(price: number): number {
  return Math.round(price * 100);
}

/**
 * Formater le prix pour l'affichage
 */
export function formatPrice(price: number): string {
  return `${price.toFixed(2)}€`;
}

/**
 * Créer les données de checkout pour l'API
 */
export function createCheckoutPayload(
  items: OrderItem[],
  address: ShippingAddress,
  customerId?: string,
  orderId?: string
) {
  // Valider les données
  const itemsValidation = validateOrderItems(items);
  if (!itemsValidation.valid) {
    throw new Error(itemsValidation.errors.join('; '));
  }

  const addressValidation = validateShippingAddress(address);
  if (!addressValidation.valid) {
    throw new Error(addressValidation.errors.join('; '));
  }

  // Formater pour Stripe
  return {
    items: items.map((item) => ({
      name: item.name,
      price: formatPriceForStripe(item.price),
      quantity: item.quantity,
    })),
    shippingAddress: address,
    customerId: customerId || 'anonymous',
    orderId: orderId || Date.now().toString(),
  };
}

/**
 * Pays supportés par Stripe Checkout pour la livraison
 */
export const SUPPORTED_COUNTRIES = [
  { code: 'FR', name: 'France', emoji: '🇫🇷' },
  { code: 'BE', name: 'Belgique', emoji: '🇧🇪' },
  { code: 'LU', name: 'Luxembourg', emoji: '🇱🇺' },
  { code: 'CH', name: 'Suisse', emoji: '🇨🇭' },
];

/**
 * Obtenir le code pays depuis le nom
 */
export function getCountryCode(countryName: string): string | null {
  const country = SUPPORTED_COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country?.code || null;
}

/**
 * Obtenir le nom du pays depuis le code
 */
export function getCountryName(code: string): string | null {
  const country = SUPPORTED_COUNTRIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  return country?.name || null;
}
