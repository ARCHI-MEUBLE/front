/**
 * EXEMPLE : Intégration de stripe-payment.tsx avec le panier existant
 *
 * Ce fichier montre comment adapter la page de paiement Stripe
 * pour travailler avec votre système de panier existant.
 *
 * INSTRUCTIONS:
 * 1. Copiez la logique pertinente depuis ce fichier
 * 2. Adaptez-la à votre contexte de panier
 * 3. Supprimez ce fichier une fois l'intégration faite
 */

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { loadStripe } from '@stripe/stripe-js';

/**
 * OPTION 1: Récupérer le panier depuis votre API existante
 */
const loadCartFromAPI = async () => {
  try {
    const response = await fetch(
      'http://localhost:8000/backend/api/cart/index.php',
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Erreur lors du chargement du panier');
    }

    const cartData = await response.json();

    // Transformer le format de votre API au format attendu par Stripe
    return {
      items: cartData.items.map((item: any) => ({
        name: item.configuration.name,
        price: item.configuration.price,
        quantity: item.quantity,
      })),
      total: cartData.total,
    };
  } catch (error) {
    console.error('Error loading cart:', error);
    throw error;
  }
};

/**
 * OPTION 2: Récupérer le panier depuis sessionStorage
 * (Utile si vous passez les données depuis panier.tsx)
 */
const loadCartFromStorage = () => {
  const cartData = sessionStorage.getItem('stripe_checkout_cart');
  if (cartData) {
    sessionStorage.removeItem('stripe_checkout_cart');
    return JSON.parse(cartData);
  }
  return null;
};

/**
 * OPTION 3: Récupérer le panier depuis un contexte React
 */
import { useContext } from 'react'; // Si vous avez un CartContext
// import { CartContext } from '@/context/CartContext';

export default function StripePaymentWithCartExample() {
  const router = useRouter();

  // État du formulaire d'adresse
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France',
  });

  // État du panier
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // État Stripe
  const [stripePromise, setStripePromise] = useState<any>(null);

  /**
   * ÉTAPE 1: Charger Stripe et le panier au montage
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Charger Stripe
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        );
        setStripePromise(stripe);

        // Charger le panier depuis OPTION 1
        const cartData = await loadCartFromAPI();

        // Alternative : OPTION 2
        // const cartData = loadCartFromStorage();
        // if (!cartData) {
        //   router.push('/panier'); // Rediriger si panier vide
        //   return;
        // }

        setOrder(cartData);

        // Pré-remplir l'adresse si utilisateur authentifié
        // (À adapter selon votre système d'authentification)
        // if (customer) {
        //   setFormData(prev => ({
        //     ...prev,
        //     fullName: `${customer.first_name} ${customer.last_name}`,
        //     address: customer.address || '',
        //     postalCode: customer.postal_code || '',
        //     city: customer.city || '',
        //     country: customer.country || 'France',
        //   }));
        // }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Erreur lors du chargement');
        setIsLoading(false);
      }
    };

    initialize();
  }, [router]);

  /**
   * Gérer les changements de formulaire
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Soumettre et rediriger vers Stripe Checkout
   *
   * C'est ici que la magie se passe :
   * 1. Valider le formulaire
   * 2. Envoyer les données de commande + adresse à l'API
   * 3. Créer une session Stripe
   * 4. Rediriger vers Stripe Checkout
   * 5. Après paiement: redirection vers /payment-success ou /payment-cancel
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Valider
    if (
      !formData.fullName ||
      !formData.address ||
      !formData.postalCode ||
      !formData.city
    ) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparer les données pour l'API Stripe
      const checkoutData = {
        // Items du panier formatés pour Stripe (en centimes)
        items: order.items.map((item: any) => ({
          name: item.name,
          price: Math.round(item.price * 100), // Convertir en centimes
          quantity: item.quantity,
        })),

        // Adresse de livraison
        shippingAddress: formData,

        // Métadonnées (optionnel)
        customerId: 'USER_ID_FROM_AUTH', // À remplacer par l'ID réel
        orderId: Date.now().toString(),
      };

      // Appeler l'API de création de session Stripe
      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du paiement');
      }

      const { sessionId, url } = await response.json();

      // Rediriger vers Stripe Checkout
      if (url) {
        window.location.href = url;
      } else if (stripePromise && sessionId) {
        const result = await stripePromise.redirectToCheckout({
          sessionId,
        });
        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du paiement'
      );
      setIsSubmitting(false);
    }
  };

  // État de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
      </Head>

      <div className="min-h-screen bg-bg-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Finaliser votre paiement</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulaire */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded shadow p-6">
                  <h2 className="text-xl font-bold mb-4">Adresse de livraison</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Adresse *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Code postal *
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Ville *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border rounded"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Pays *
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded"
                        required
                      >
                        <option value="France">France</option>
                        <option value="Belgium">Belgique</option>
                        <option value="Luxembourg">Luxembourg</option>
                        <option value="Switzerland">Suisse</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded shadow p-6 sticky top-4">
                  <h2 className="text-xl font-bold mb-6">Récapitulatif</h2>

                  <div className="space-y-3 mb-6">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-semibold">
                          {(item.price * item.quantity).toFixed(2)}€
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{order.total.toFixed(2)}€</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary text-white rounded font-bold hover:bg-primary-hover"
                  >
                    {isSubmitting
                      ? 'Traitement...'
                      : `Procéder au paiement (${order.total.toFixed(2)}€)`}
                  </button>

                  <Link
                    href="/panier"
                    className="block mt-4 text-center text-primary hover:text-primary-hover"
                  >
                    ← Retour au panier
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
