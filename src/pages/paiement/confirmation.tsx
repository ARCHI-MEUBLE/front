import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import toast, { Toaster } from 'react-hot-toast';

export default function PaymentConfirmation() {
  const router = useRouter();
  const { payment_intent, payment_intent_client_secret } = router.query;

  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'processing' | 'failed' | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (payment_intent && typeof payment_intent === 'string') {
      verifyPayment(payment_intent);
    }
  }, [payment_intent]);

  const verifyPayment = async (paymentIntentId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/backend/api/payment-link/verify-payment.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentStatus('success');
        setOrderNumber(data.order_number || null);

        // Afficher un toast de succès
        if (!data.already_paid) {
          toast.success('Paiement confirmé avec succès !');
        }
      } else {
        setPaymentStatus('failed');
        toast.error(data.error || 'Erreur lors de la vérification du paiement');
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setPaymentStatus('failed');
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-primary mx-auto mb-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xl text-muted-foreground font-semibold">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Toaster position="top-center" />
        <div className="max-w-md w-full">
          <Card className="border-2 border-destructive">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/10 rounded-full mx-auto">
                <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-3xl mb-2">Erreur de paiement</CardTitle>
                <CardDescription className="text-base">
                  Une erreur est survenue lors de la vérification du paiement
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Si vous avez été débité, veuillez contacter notre support.
              </p>
              <div className="flex flex-col gap-4">
                <Link href="/" className="w-full">
                  <Button className="w-full" size="lg">
                    Retour à l'accueil
                  </Button>
                </Link>
                <a href="mailto:contact@archimeuble.com">
                  <Button variant="outline" className="w-full" size="lg">
                    Contacter le support
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Toaster position="top-center" />
      <div className="max-w-2xl w-full">
        <Card className="border-2">
          {/* Header */}
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-3xl mb-2">Paiement confirmé !</CardTitle>
              <CardDescription className="text-base">
                Votre commande {orderNumber && `#${orderNumber}`} a été payée avec succès
              </CardDescription>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="space-y-6">
            {/* Info boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Email de confirmation</p>
                      <p className="text-sm text-muted-foreground">
                        Un email récapitulatif vous a été envoyé
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Facture</p>
                      <p className="text-sm text-muted-foreground">
                        Votre facture sera générée automatiquement
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Étapes suivantes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Prochaines étapes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Confirmation de commande</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Notre équipe va valider votre commande
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Production</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fabrication de votre meuble sur mesure
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Livraison</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vous serez notifié dès l'expédition
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/" className="flex-1">
                <Button className="w-full h-12" size="lg">
                  Retour à l'accueil
                </Button>
              </Link>
              {payment_intent && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    window.open(`${apiUrl}/backend/api/payment-link/download-invoice.php?payment_intent_id=${payment_intent}`, '_blank');
                  }}
                  className="flex-1 h-12"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Télécharger la facture
                </Button>
              )}
            </div>

            <Separator />

            {/* Support */}
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Une question ? Contactez-nous à{' '}
                <a href="mailto:contact@archimeuble.com" className="text-primary font-semibold hover:underline">
                  contact@archimeuble.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo en bas */}
        <div className="text-center mt-8">
          <p className="text-foreground font-semibold text-lg">ArchiMeuble</p>
          <p className="text-muted-foreground text-sm">Merci pour votre confiance</p>
        </div>
      </div>
    </div>
  );
}
