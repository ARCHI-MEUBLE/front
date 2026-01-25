'use client';

import { useState, FormEvent } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/router';

interface StripeCheckoutFormProps {
  orderId: number;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function StripeCheckoutForm({ orderId, amount, onSuccess, onError }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage('');

    try {
      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation/${orderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Erreur lors de la confirmation
        setMessage(error.message || 'Une erreur est survenue lors du paiement');
        if (onError) {
          onError(error.message || 'Erreur de paiement');
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Paiement réussi !
        setMessage('Paiement réussi ! Redirection...');
        if (onSuccess) {
          onSuccess();
        }

        // Mettre à jour la commande avec le payment intent ID
        await fetch(`/backend/api/orders/payment-confirmed.php?id=${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            payment_status: 'paid'
          })
        });

        // Vider le panier (ne pas bloquer en cas d'erreur)
        try {
          const cartResponse = await fetch('/backend/api/cart/index.php', {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!cartResponse.ok) {
            console.error('Erreur lors du vidage du panier:', await cartResponse.text());
          }
        } catch (cartError) {
          console.error('Erreur lors du vidage du panier:', cartError);
        }

        // Rediriger vers la page de confirmation
        setTimeout(() => {
          router.push(`/order-confirmation/${orderId}`);
        }, 1500);
      }
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors du traitement du paiement');
      if (onError) {
        onError(err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informations de paiement
        </h3>

        <PaymentElement />
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('réussi')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-900">Total à payer</span>
          <span className="text-2xl font-bold text-amber-600">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)}
          </span>
        </div>

        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="w-full bg-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Traitement en cours...' : 'Payer maintenant'}
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Paiement sécurisé par Stripe. Vos informations bancaires sont protégées.
        </p>
      </div>
    </form>
  );
}
