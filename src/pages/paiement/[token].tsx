import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  IconLock,
  IconClock,
  IconShoppingCart,
  IconMail,
  IconPhone,
  IconUser,
  IconLoader,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE');

interface OrderData {
  order: {
    order_number: string;
    total_amount: number;
    amount: number;
    payment_type?: string;
    deposit_percentage?: number;
    status: string;
    payment_status: string;
    created_at: string;
    shipping_address: string;
    billing_address: string;
  };
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items: {
    configurations: any[];
    samples: any[];
  };
  payment_link: {
    token: string;
    expires_at: string;
    status: string;
  };
}

function CheckoutForm({ token, orderData }: { token: string; orderData: OrderData }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [installments, setInstallments] = useState<1 | 3>(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    createPaymentIntent();
  }, [installments]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/backend/api/payment-link/create-payment-intent.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          installments
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      setClientSecret(data.data.clientSecret);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la préparation du paiement');
      console.error('Error creating payment intent:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/paiement/confirmation`,
        },
      });

      if (error) {
        toast.error(error.message || 'Erreur lors du paiement');
      }
    } catch (err: any) {
      toast.error('Erreur lors du traitement du paiement');
      console.error('Payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const baseAmount = orderData.order.amount || orderData.order.total_amount;
  const amountToPay = installments === 3
    ? Math.ceil(baseAmount / 3)
    : baseAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Options de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Options de paiement</CardTitle>
          <CardDescription>Choisissez votre mode de paiement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setInstallments(1)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                installments === 1
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold cursor-pointer">Paiement en 1 fois</Label>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  installments === 1 ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {installments === 1 && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(baseAmount)}</p>
              <p className="text-sm text-muted-foreground mt-1">Sans frais</p>
            </div>

            <div
              onClick={() => setInstallments(3)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                installments === 3
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold cursor-pointer">Paiement en 3 fois</Label>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  installments === 3 ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {installments === 3 && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(amountToPay)}
                <span className="text-sm font-normal text-muted-foreground"> /mois</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                3 × {formatCurrency(amountToPay)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Payment Element */}
      {clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de paiement</CardTitle>
            <CardDescription>Entrez vos coordonnées bancaires</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentElement />
          </CardContent>
        </Card>
      )}

      {/* Bouton de paiement */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-12 text-base"
        size="lg"
      >
        {isProcessing ? (
          <>
            <IconLoader className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <IconLock className="w-5 h-5 mr-2" />
            Payer {formatCurrency(amountToPay)}
          </>
        )}
      </Button>

      {/* Sécurité */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <IconLock className="w-4 h-4 text-green-600" />
        <span>Paiement sécurisé par Stripe</span>
      </div>
    </form>
  );
}

export default function PaymentLinkPage() {
  const router = useRouter();
  const { token } = router.query;

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (token && typeof token === 'string') {
      loadOrderData(token);
    }
  }, [token]);

  const loadOrderData = async (linkToken: string) => {
    try {
      const response = await fetch(`/backend/api/payment-link/index.php?token=${linkToken}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lien de paiement invalide');
      }

      setOrderData(data.data);
      await createInitialPaymentIntent(linkToken);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('Error loading order data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialPaymentIntent = async (linkToken: string) => {
    try {
      const response = await fetch('/backend/api/payment-link/create-payment-intent.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: linkToken,
          installments: 1
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setClientSecret(data.data.clientSecret);
      }
    } catch (err) {
      console.error('Error creating initial payment intent:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <IconLoader className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <IconShoppingCart className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Lien invalide</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  const options = {
    clientSecret: clientSecret || '',
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        borderRadius: '0.5rem',
      },
    },
  };

  return (
    <>
      <Head>
        <title>Paiement sécurisé - Commande #{orderData.order.order_number}</title>
      </Head>

      <div className="min-h-screen bg-background py-8 px-4 sm:py-12">
        <Toaster position="top-center" />

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">ArchiMeuble</h1>
            <p className="text-muted-foreground">Finaliser votre commande</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Récapitulatif */}
            <div className="lg:col-span-2">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Numéro de commande */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Numéro de commande</Label>
                    <p className="text-lg font-semibold">#{orderData.order.order_number}</p>
                  </div>

                  <Separator />

                  {/* Client */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Client</Label>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <IconUser className="w-4 h-4 text-muted-foreground" />
                        <span>{orderData.customer.first_name} {orderData.customer.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconMail className="w-4 h-4" />
                        <span>{orderData.customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconPhone className="w-4 h-4" />
                        <span>{orderData.customer.phone}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Articles */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-3 block">Articles commandés</Label>
                    <div className="space-y-2">
                      {orderData.items.configurations.map((config, idx) => (
                        <div key={idx} className="flex justify-between items-start py-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{config.name || 'Configuration personnalisée'}</p>
                            <p className="text-xs text-muted-foreground">Quantité : {config.quantity}</p>
                          </div>
                          <p className="font-semibold text-sm">
                            {formatCurrency(config.total_price)}
                          </p>
                        </div>
                      ))}

                      {orderData.items.samples.map((sample, idx) => (
                        <div key={idx} className="flex justify-between items-start py-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{sample.name}</p>
                            <p className="text-xs text-muted-foreground">Échantillon × {sample.quantity}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">Gratuit</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Total commande</span>
                      <span>{formatCurrency(orderData.order.total_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-primary">
                        {orderData.order.payment_type === 'deposit' 
                          ? `Acompte (${orderData.order.deposit_percentage}%)` 
                          : orderData.order.payment_type === 'balance' 
                            ? 'Solde restant' 
                            : 'Total à régler'}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(orderData.order.amount || orderData.order.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Expiration */}
                  <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <IconClock className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Lien valide jusqu'au
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            {new Date(orderData.payment_link.expires_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>

            {/* Formulaire de paiement */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Paiement sécurisé</CardTitle>
                  <CardDescription>Complétez votre paiement en toute sécurité</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientSecret && (
                    <Elements stripe={stripePromise} options={options}>
                      <CheckoutForm token={token as string} orderData={orderData} />
                    </Elements>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
