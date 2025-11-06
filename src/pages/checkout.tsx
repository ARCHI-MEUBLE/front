import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';

// Import dynamique pour éviter les problèmes SSR avec Stripe
const StripeCheckoutWrapper = dynamic(
  () => import('@/components/checkout/StripeCheckoutWrapper'),
  { ssr: false }
);

interface CartItem {
  configuration: {
    id: number;
    name: string;
    price: number;
  };
  quantity: number;
}

interface CartData {
  items: CartItem[];
  total: number;
}

type CheckoutStep = 'shipping' | 'payment';

export default function CheckoutStripe() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [cart, setCart] = useState<CartData | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [installments, setInstallments] = useState<1 | 3>(1);

  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'France',
    billing_same: true,
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: 'France',
    notes: ''
  });

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout-stripe');
      return;
    }

    loadCart();

    if (customer) {
      setFormData(prev => ({
        ...prev,
        shipping_address: customer.address || '',
        shipping_city: customer.city || '',
        shipping_postal_code: customer.postal_code || '',
        shipping_country: customer.country || 'France'
      }));
    }
  }, [isAuthenticated, authLoading, customer, router]);

  const loadCart = async () => {
    try {
      const response = await fetch('http://localhost:8000/backend/api/cart/index.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du panier');
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        router.push('/cart');
        return;
      }

      setCart(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleShippingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.shipping_address || !formData.shipping_city || !formData.shipping_postal_code) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.billing_same && (!formData.billing_address || !formData.billing_city || !formData.billing_postal_code)) {
      setError('Veuillez remplir l\'adresse de facturation');
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingAddress = `${formData.shipping_address}, ${formData.shipping_postal_code} ${formData.shipping_city}, ${formData.shipping_country}`;
      const billingAddress = formData.billing_same
        ? shippingAddress
        : `${formData.billing_address}, ${formData.billing_postal_code} ${formData.billing_city}, ${formData.billing_country}`;

      // Créer la commande
      const response = await fetch('http://localhost:8000/backend/api/orders/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          payment_method: 'stripe',
          notes: formData.notes || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la commande');
      }

      const result = await response.json();
      setOrderId(result.order.id);
      setStep('payment');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Paiement - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-text-secondary">Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  if (!cart) return null;

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Panier', href: '/cart' },
              { label: 'Paiement' }
            ]}
          />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-4">
              Finaliser la commande
            </h1>

            {/* Steps indicator */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step === 'shipping' ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span>Livraison</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200" />
              <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span>Paiement</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {step === 'shipping' ? (
                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  {/* Shipping Address */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-text-primary mb-4">
                      Adresse de livraison
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adresse *
                        </label>
                        <input
                          type="text"
                          name="shipping_address"
                          required
                          value={formData.shipping_address}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="123 Rue Example"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Code postal *
                          </label>
                          <input
                            type="text"
                            name="shipping_postal_code"
                            required
                            value={formData.shipping_postal_code}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="75001"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ville *
                          </label>
                          <input
                            type="text"
                            name="shipping_city"
                            required
                            value={formData.shipping_city}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Paris"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pays *
                        </label>
                        <input
                          type="text"
                          name="shipping_country"
                          required
                          value={formData.shipping_country}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="France"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-text-primary mb-4">
                      Adresse de facturation
                    </h2>

                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="billing_same"
                          checked={formData.billing_same}
                          onChange={handleChange}
                          className="w-5 h-5 accent-amber-600"
                        />
                        <span className="text-text-primary">Identique à l'adresse de livraison</span>
                      </label>
                    </div>

                    {!formData.billing_same && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Adresse *
                          </label>
                          <input
                            type="text"
                            name="billing_address"
                            required
                            value={formData.billing_address}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Code postal *
                            </label>
                            <input
                              type="text"
                              name="billing_postal_code"
                              required
                              value={formData.billing_postal_code}
                              onChange={handleChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ville *
                            </label>
                            <input
                              type="text"
                              name="billing_city"
                              required
                              value={formData.billing_city}
                              onChange={handleChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-text-primary mb-4">
                      Notes (optionnel)
                    </h2>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Instructions spéciales pour la livraison..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Création de la commande...' : 'Continuer vers le paiement'}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Payment Method Selection */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-text-primary mb-4">
                      Options de paiement
                    </h2>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                        <input
                          type="radio"
                          name="installments"
                          value="1"
                          checked={installments === 1}
                          onChange={() => setInstallments(1)}
                          className="mt-1 w-5 h-5 accent-amber-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Paiement en 1 fois</div>
                          <div className="text-sm text-gray-600">
                            Payez {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cart.total)} maintenant
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                        <input
                          type="radio"
                          name="installments"
                          value="3"
                          checked={installments === 3}
                          onChange={() => setInstallments(3)}
                          className="mt-1 w-5 h-5 accent-amber-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Paiement en 3 fois</div>
                          <div className="text-sm text-gray-600">
                            3 × {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cart.total / 3)} par mois
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Stripe Checkout */}
                  {orderId && (
                    <StripeCheckoutWrapper
                      orderId={orderId}
                      amount={cart.total}
                      installments={installments}
                      onSuccess={() => console.log('Payment success!')}
                      onError={(error) => setError(error)}
                    />
                  )}

                  <button
                    onClick={() => setStep('shipping')}
                    className="text-gray-600 hover:text-gray-900 underline"
                  >
                    ← Retour aux informations de livraison
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg border border-gray-200 sticky top-8">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Récapitulatif
                </h2>

                <div className="space-y-4">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.configuration.name || `Configuration #${item.configuration.id}`}
                        </div>
                        <div className="text-gray-500">Quantité: {item.quantity}</div>
                      </div>
                      <div className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.configuration.price * item.quantity)}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-amber-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cart.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
