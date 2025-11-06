'use client';

import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import StripeCheckoutForm from './StripeCheckoutForm';

// Charger Stripe avec la clé publishable
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutWrapperProps {
  orderId: number;
  amount: number;
  installments?: 1 | 3; // Paiement en 1 ou 3 fois
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function StripeCheckoutWrapper({
  orderId,
  amount,
  installments = 1,
  onSuccess,
  onError
}: StripeCheckoutWrapperProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    createPaymentIntent();
  }, [amount, installments]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:8000/backend/api/stripe/create-payment-intent.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          installments,
          currency: 'eur'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const data = await response.json();

      if (!data.clientSecret) {
        throw new Error('Client secret manquant');
      }

      // Mettre à jour la commande avec le payment intent ID
      await fetch(`http://localhost:8000/backend/api/orders/${orderId}/payment-intent.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payment_intent_id: data.paymentIntentId
        })
      });

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'initialisation du paiement');
      if (onError) {
        onError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#d97706', // amber-600
        colorBackground: '#ffffff',
        colorText: '#111827',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
    locale: 'fr',
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="text-gray-600">Initialisation du paiement sécurisé...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Erreur d'initialisation
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={createPaymentIntent}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div>
      {installments === 3 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Paiement en 3 fois
              </h4>
              <p className="text-sm text-blue-800">
                Vous allez payer{' '}
                <span className="font-semibold">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 3)}
                </span>{' '}
                aujourd'hui, puis 2 autres versements les mois suivants.
              </p>
            </div>
          </div>
        </div>
      )}

      <Elements stripe={stripePromise} options={options}>
        <StripeCheckoutForm
          orderId={orderId}
          amount={installments === 3 ? amount / 3 : amount}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
