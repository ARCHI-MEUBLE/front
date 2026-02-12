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
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function StripeCheckoutWrapper({
  orderId,
  amount,
  onSuccess,
  onError
}: StripeCheckoutWrapperProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentAmount, setCurrentAmount] = useState(amount);

  useEffect(() => {
    if (amount !== currentAmount) {
      setClientSecret('');
      setCurrentAmount(amount);
    }
    createPaymentIntent();
  }, [amount]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/backend/api/stripe/create-payment-intent.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
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
      await fetch(`/backend/api/orders/payment-intent.php?id=${orderId}`, {
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
      <Elements stripe={stripePromise} options={options}>
        <StripeCheckoutForm
          orderId={orderId}
          amount={amount}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
