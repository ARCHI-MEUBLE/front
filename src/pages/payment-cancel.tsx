/**
 * Page d'annulation de paiement
 *
 * Affichée quand l'utilisateur annule le paiement Stripe Checkout.
 * Affiche:
 * - Message d'information
 * - Actions pour relancer le paiement
 */

import Link from 'next/link';
import Head from 'next/head';

export default function PaymentCancelPage() {
  return (
    <>
      <Head>
        <title>Paiement annulé - ArchiMeuble</title>
        <meta
          name="description"
          content="Votre paiement a été annulé. Vous pouvez réessayer quand vous le souhaitez."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
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
          {/* Icône d'annulation */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full">
              <svg
                className="w-10 h-10 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-4xl font-bold text-amber-600 mb-3">
            Paiement annulé
          </h1>

          {/* Sous-titre */}
          <p className="text-xl text-text-secondary mb-8">
            Vous avez annulé votre paiement. Aucun montant n'a été prélevé sur
            votre compte.
          </p>

          {/* Card d'informations */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary mb-4">
                Que se passe-t-il maintenant ?
              </h2>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="text-2xl">💾</span>
                  <p className="text-sm text-text-secondary">
                    Votre panier est conservé. Vous pouvez y revenir pour continuer
                    vos achats.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="text-2xl">🔄</span>
                  <p className="text-sm text-text-secondary">
                    Vous pouvez relancer le paiement à tout moment en retournant
                    au panier.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="text-2xl">❓</span>
                  <p className="text-sm text-text-secondary">
                    Si vous avez des questions, n'hésitez pas à nous contacter.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/panier"
              className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors"
            >
              🛒 Retourner au panier
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-200 text-text-primary rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              🏠 Continuer le shopping
            </Link>
          </div>

          {/* Conseils */}
          <div className="mt-12 space-y-4">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>💡 Conseil :</strong> Vérifiez que votre méthode de
                paiement est valide et disposez de fonds suffisants.
              </p>
            </div>

            <div className="p-6 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <strong>🔒 Sécurité :</strong> Aucune de vos données bancaires n'a
                été compromises. Votre paiement a simplement été annulé.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-12 text-center">
            <p className="text-text-secondary mb-4">
              Des problèmes avec votre paiement ?
            </p>
            <Link
              href="/contact"
              className="text-primary hover:text-primary-hover font-bold underline"
            >
              📧 Contactez notre support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
