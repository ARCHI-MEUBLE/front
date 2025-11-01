/**
 * API Stripe Checkout
 * Crée une session Stripe Checkout et retourne l'ID de session
 *
 * Flux:
 * 1. Reçoit les données de commande et d'adresse du frontend
 * 2. Crée une session Stripe avec les line_items et la collection d'adresse
 * 3. Retourne l'ID de session pour redirection
 */

import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Interface pour les données de commande envoyées du frontend
 */
interface CheckoutRequest {
  // Articles à commander (utilise price_data pour les prix dynamiques)
  items: Array<{
    name: string;
    price: number; // en centimes (ex: 500 pour 5€)
    quantity: number;
  }>;
  // Adresse de livraison (collectée du formulaire)
  shippingAddress?: {
    fullName: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  };
  // Métadonnées optionnelles pour le suivi
  customerId?: string;
  orderId?: string;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Accepter uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      items,
      customerId,
      orderId,
      notes,
    } = req.body as CheckoutRequest;

    // Valider les articles
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Convertir les articles en format Stripe line_items
    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          // Les métadonnées peuvent être utiles pour le suivi
          metadata: {
            orderId: orderId || 'unknown',
          },
        },
        unit_amount: item.price, // montant en centimes
      },
      quantity: item.quantity,
    }));

    // Construire les options de session Stripe
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      // Mode de paiement
      payment_method_types: ['card'],
      mode: 'payment',

      // Articles
      line_items: lineItems,

      // Redirection après le paiement
      // ⚠️ Important: Utiliser le domaine du frontend, pas le backend PHP
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payment-cancel`,

      // Collection d'adresse de livraison
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'LU', 'CH'],
      },

      // Options de livraison (optionnel)
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'eur',
            },
            display_name: 'Livraison gratuite',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
      ],

      // Métadonnées pour le suivi côté serveur
      metadata: {
        customerId: customerId || 'anonymous',
        orderId: orderId || 'unknown',
        notes: notes || '',
      },
    };

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Retourner l'ID de session
    res.status(200).json({
      sessionId: session.id,
      url: session.url, // URL de redirection directe (optionnel)
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);

    // Gérer les erreurs Stripe
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
