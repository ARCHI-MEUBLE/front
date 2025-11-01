/**
 * Page de paiement Stripe - Récapitulatif & Paiement
 *
 * Affiche:
 * - Récapitulatif du panier (gauche)
 * - Bouton de paiement (droite)
 *
 * Stripe Checkout gère:
 * - Collecte de l'adresse de livraison
 * - Saisie des informations de paiement
 * - Validation et traitement du paiement
 *
 * Utilisation:
 * 1. Passer les données du panier via sessionStorage ou context
 * 2. Utilisateur clique "Procéder au paiement"
 * 3. Redirection vers Stripe Checkout
 * 4. Après paiement: redirection vers /payment-success ou /payment-cancel
 */

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { loadStripe } from '@stripe/stripe-js';

/**
 * Article de commande
 */
interface OrderItem {
  name: string;
  price: number; // en euros
  quantity: number;
}

/**
 * Configuration de commande
 */
interface Order {
  items: OrderItem[];
  total: number;
}

export default function StripePaymentPage() {
  const router = useRouter();

  // État de chargement Stripe
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(true);

  // État du panier
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // État des envois de formulaire
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  /**
   * Charger Stripe et le panier au montage du composant
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Charger Stripe
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        );
        setStripePromise(stripe);

        // Charger les données du panier
        const cartData = loadCartData();

        if (!cartData || cartData.items.length === 0) {
          setError('Panier vide');
          setIsLoadingCart(false);
          return;
        }

        setOrder(cartData);
        setIsLoadingCart(false);
        setIsLoadingStripe(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Erreur lors du chargement');
        setIsLoadingStripe(false);
        setIsLoadingCart(false);
      }
    };

    initialize();
  }, []);

  /**
   * Charger les données du panier
   *
   * Option 1: SessionStorage (données simulées ou du panier existant)
   * Option 2: À remplacer par votre API backend
   */
  const loadCartData = (): Order | null => {
    try {
      // Option 1: SessionStorage (passé depuis panier.tsx)
      const sessionCart = sessionStorage.getItem('stripe_checkout_cart');
      if (sessionCart) {
        sessionStorage.removeItem('stripe_checkout_cart');
        return JSON.parse(sessionCart);
      }

      // Option 2: Données simulées pour le test
      // À remplacer par votre API backend
      return {
        items: [
          { name: 'Échantillon de bois', price: 5, quantity: 1 },
          { name: 'Livraison', price: 4, quantity: 1 },
        ],
        total: 9,
      };
    } catch (err) {
      console.error('Error loading cart:', err);
      return null;
    }
  };

  /**
   * Soumettre et rediriger vers Stripe Checkout
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!order) {
      setError('Panier vide');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparer les données de commande pour l'API
      const checkoutData = {
        items: order.items.map((item) => ({
          name: item.name,
          price: Math.round(item.price * 100), // Convertir en centimes
          quantity: item.quantity,
        })),
        // Pas besoin de passer l'adresse ici
        // Stripe Checkout la collectera directement
        customerId: 'unknown',
        orderId: Date.now().toString(),
      };

      // Appeler l'API pour créer la session Stripe
      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const { sessionId, url } = await response.json();

      // Rediriger vers Stripe Checkout
      if (url) {
        // Redirection directe (plus rapide)
        window.location.href = url;
      } else if (stripePromise && sessionId) {
        // Alternative: utiliser Stripe.redirectToCheckout
        const result = await stripePromise.redirectToCheckout({
          sessionId,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
      } else {
        throw new Error('Impossible de rediriger vers Stripe');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du paiement. Veuillez réessayer.'
      );
      setIsSubmitting(false);
    }
  };

  // État de chargement
  if (isLoadingStripe || isLoadingCart) {
    return (
      <>
        <Head>
          <title>Paiement - ArchiMeuble</title>
        </Head>
        <div className="min-h-screen bg-bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-text-secondary">Chargement du panier...</p>
          </div>
        </div>
      </>
    );
  }

  // Panier vide
  if (!order || order.items.length === 0) {
    return (
      <>
        <Head>
          <title>Panier vide - ArchiMeuble</title>
        </Head>
        <div className="min-h-screen bg-bg-light">
          <header className="bg-white border-b border-border-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link href="/" className="text-primary font-bold text-lg hover:text-primary-hover">
                🏠 ArchiMeuble
              </Link>
            </div>
          </header>

          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <h1 className="text-3xl font-bold text-text-primary mb-4">
              Votre panier est vide
            </h1>
            <p className="text-text-secondary mb-8">
              Ajoutez des articles avant de procéder au paiement
            </p>
            <Link
              href="/panier"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover"
            >
              Retour au panier
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
        <meta
          name="description"
          content="Finalisez votre paiement en toute sécurité avec Stripe"
        />
      </Head>

      <div className="min-h-screen bg-bg-light">
        {/* En-tête */}
        <header className="bg-white border-b border-border-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-primary font-bold text-lg hover:text-primary-hover">
              🏠 ArchiMeuble
            </Link>
          </div>
        </header>

        {/* Contenu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Titre */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Finaliser votre paiement
            </h1>
            <p className="text-text-secondary">
              Vérifiez votre commande et procédez au paiement sécurisé
            </p>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-medium">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Récapitulatif du panier (colonne gauche) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-text-primary mb-6">
                    📦 Votre commande
                  </h2>

                  {/* Liste des articles */}
                  <div className="space-y-4 mb-6">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center pb-4 border-b border-border-light last:border-0"
                      >
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {item.name}
                          </h3>
                          {item.quantity > 1 && (
                            <p className="text-sm text-text-secondary">
                              Quantité: {item.quantity}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.quantity > 1 && (
                            <p className="text-sm text-text-secondary">
                              {item.price.toFixed(2)}€ × {item.quantity}
                            </p>
                          )}
                          <p className="text-lg font-bold text-primary">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Informations de sécurité */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      🔒 <strong>Paiement sécurisé par Stripe</strong>
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      À l'étape suivante, vous remplirez votre adresse de livraison et vos informations bancaires de manière entièrement sécurisée.
                    </p>
                  </div>
                </div>
              </div>

              {/* Résumé et bouton (colonne droite) */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                  <h2 className="text-xl font-bold text-text-primary mb-6">
                    💳 Résumé
                  </h2>

                  {/* Total */}
                  <div className="space-y-3 mb-6">
                    {/* Sous-total */}
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Sous-total</span>
                      <span className="font-semibold text-text-primary">
                        {order.total.toFixed(2)}€
                      </span>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-border-light pt-3">
                      <div className="flex justify-between text-lg font-bold text-text-primary">
                        <span>Total à payer</span>
                        <span className="text-primary text-2xl">
                          {order.total.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton de paiement */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-colors ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Traitement...
                      </>
                    ) : (
                      `💳 Procéder au paiement (${order.total.toFixed(2)}€)`
                    )}
                  </button>

                  {/* Lien retour */}
                  <div className="mt-4 text-center">
                    <Link
                      href="/panier"
                      className="text-sm text-primary hover:text-primary-hover font-medium"
                    >
                      ← Retour au panier
                    </Link>
                  </div>

                  {/* Mentions légales */}
                  <div className="mt-6 pt-4 border-t border-border-light">
                    <p className="text-xs text-text-secondary text-center">
                      En cliquant sur "Procéder au paiement",<br />
                      vous acceptez nos{' '}
                      <Link
                        href="/terms"
                        className="text-primary hover:text-primary-hover"
                      >
                        conditions d'utilisation
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
