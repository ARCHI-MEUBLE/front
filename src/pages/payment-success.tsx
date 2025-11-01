/**
 * Page de succès de paiement
 *
 * Affichée après un paiement réussi via Stripe Checkout.
 * Affiche:
 * - Message de confirmation
 * - ID de session Stripe (pour vérification)
 * - Actions suivantes (retour à l'accueil, mes commandes, etc.)
 */

import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [copied, setCopied] = useState(false);

  /**
   * Copier l'ID de session dans le presse-papiers
   */
  const copySessionId = () => {
    if (session_id) {
      navigator.clipboard.writeText(session_id as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Head>
        <title>Paiement réussi - ArchiMeuble</title>
        <meta
          name="description"
          content="Votre paiement a été traité avec succès"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        {/* En-tête */}
        <header className="bg-white border-b border-border-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-primary font-bold text-lg hover:text-primary-hover">
              🏠 ArchiMeuble
            </Link>
          </div>
        </header>

        {/* Contenu */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Icône de succès */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-4xl font-bold text-green-600 mb-3">
            Paiement réussi !
          </h1>

          {/* Sous-titre */}
          <p className="text-xl text-text-secondary mb-8">
            Merci pour votre commande. Vous recevrez un e-mail de confirmation
            dans les prochaines minutes.
          </p>

          {/* Card de confirmation */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary mb-4">
                Détails de votre paiement
              </h2>

              {/* Session ID */}
              {session_id && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-text-secondary mb-2">
                    ID de session Stripe :
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-text-primary font-mono bg-white p-2 rounded border border-border-light overflow-auto">
                      {session_id}
                    </code>
                    <button
                      onClick={copySessionId}
                      className="px-3 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
                    >
                      {copied ? '✅ Copié' : '📋 Copier'}
                    </button>
                  </div>
                </div>
              )}

              {/* Prochaines étapes */}
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  ✅ Votre paiement a été traité
                </p>
                <p className="text-sm text-text-secondary">
                  ✅ Une confirmation a été envoyée à votre adresse e-mail
                </p>
                <p className="text-sm text-text-secondary">
                  ✅ Vous pouvez suivre votre commande dans votre compte
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/my-orders"
              className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors"
            >
              📦 Mes commandes
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-200 text-text-primary rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              🏠 Retour à l'accueil
            </Link>
          </div>

          {/* Information de contact */}
          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Besoin d'aide ?</strong> Consultez notre{' '}
              <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline">
                page de contact
              </Link>{' '}
              ou appelez-nous au <strong>+33 1 23 45 67 89</strong>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
