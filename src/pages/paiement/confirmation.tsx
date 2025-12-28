import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PaymentConfirmation() {
  const router = useRouter();
  const { payment_intent } = router.query;

  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'processing' | 'failed' | null>(null);

  useEffect(() => {
    if (payment_intent) {
      // Simuler la vérification du paiement
      setTimeout(() => {
        setPaymentStatus('success');
        setIsVerifying(false);
      }, 2000);
    }
  }, [payment_intent]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-indigo-600 mx-auto mb-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xl text-gray-700 font-semibold">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header avec animation */}
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-8 py-12 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative z-10"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-xl">
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="w-14 h-14 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Paiement confirmé !
              </h1>
              <p className="text-green-100 text-lg">
                Votre commande a été payée avec succès
              </p>
            </motion.div>

            {/* Confetti animation background */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -100, x: Math.random() * 100 + '%', opacity: 0 }}
                  animate={{
                    y: 1000,
                    opacity: [0, 1, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 2,
                    repeat: Infinity
                  }}
                  className="absolute w-3 h-3 bg-white rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="space-y-6">
              {/* Info boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-semibold mb-1">Email de confirmation</p>
                      <p className="text-sm text-blue-600">
                        Un email récapitulatif vous a été envoyé
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 font-semibold mb-1">Facture</p>
                      <p className="text-sm text-purple-600">
                        Votre facture sera générée automatiquement
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Étapes suivantes */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Prochaines étapes
                </h3>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Confirmation de commande</span> - Notre équipe va valider votre commande
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Production</span> - Fabrication de votre meuble sur mesure
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Livraison</span> - Vous serez notifié dès l'expédition
                    </p>
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-center hover:shadow-xl transform hover:scale-[1.02] transition-all"
                >
                  Retour à l'accueil
                </Link>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimer
                </button>
              </div>

              {/* Support */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Une question ? Contactez-nous à{' '}
                  <a href="mailto:contact@archimeuble.com" className="text-indigo-600 font-semibold hover:underline">
                    contact@archimeuble.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo en bas */}
        <div className="text-center mt-8">
          <p className="text-gray-600 font-semibold text-lg">ArchiMeuble</p>
          <p className="text-gray-500 text-sm">Merci pour votre confiance</p>
        </div>
      </motion.div>
    </div>
  );
}
