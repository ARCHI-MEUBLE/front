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

interface SampleCartItem {
  id: number;
  sample_color_id: number;
  quantity: number;
  color_name: string;
  hex: string | null;
  image_url: string | null;
  type_name: string;
  material: string;
  type_description: string | null;
}

interface CartData {
  items: CartItem[];
  total: number;
}

interface SamplesCartData {
  items: SampleCartItem[];
  count: number;
}

type CheckoutStep = 'shipping' | 'payment';

export default function CheckoutStripe() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [cart, setCart] = useState<CartData | null>(null);
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
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

    // Si order_id dans l'URL, charger cette commande pour paiement
    const urlOrderId = router.query.order_id;
    if (urlOrderId) {
      loadExistingOrder(Number(urlOrderId));
    } else {
      loadCart();
    }

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

  const loadExistingOrder = async (existingOrderId: number) => {
    try {
      const response = await fetch(`/backend/api/orders/list.php?id=${existingOrderId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la commande');
      }

      const data = await response.json();
      const order = data.order;

      if (!order) {
        throw new Error('Commande introuvable');
      }

      // Vérifier que la commande n'est pas déjà payée
      if (order.payment_status === 'paid') {
        router.push('/my-orders');
        return;
      }

      // Convertir la commande en format panier pour réutiliser le composant
      setOrderId(existingOrderId);
      setCart({
        items: order.items?.map((item: any) => ({
          configuration: {
            id: item.configuration_id,
            name: item.name || item.configuration?.name || 'Configuration',
            price: item.price || item.unit_price || 0
          },
          quantity: item.quantity
        })) || [],
        total: order.total || 0
      });

      // Pré-remplir les adresses depuis la commande
      setFormData(prev => ({
        ...prev,
        shipping_address: order.shipping_address || '',
        billing_address: order.billing_address || ''
      }));

      // Passer directement à l'étape paiement
      setStep('payment');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      router.push('/my-orders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      // Charger les configurations
      const configResponse = await fetch('/backend/api/cart/index.php', {
        credentials: 'include',
      });

      if (!configResponse.ok) {
        throw new Error('Erreur lors du chargement du panier');
      }

      const configData = await configResponse.json();

      // Charger les échantillons
      const samplesResponse = await fetch('/api/cart/samples', {
        credentials: 'include',
      });

      let samplesData = null;
      if (samplesResponse.ok) {
        samplesData = await samplesResponse.json();
        setSamplesCart(samplesData);
      }

      // Vérifier que le panier n'est pas vide (configs OU échantillons)
      const hasConfigs = configData.items && configData.items.length > 0;
      const hasSamples = samplesData && samplesData.items && samplesData.items.length > 0;

      if (!hasConfigs && !hasSamples) {
        router.push('/cart');
        return;
      }

      setCart(configData);
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
      const response = await fetch('/backend/api/orders/create.php', {
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

      // Si le total est 0€ (seulement échantillons), valider directement
      if (cart && cart.total === 0) {
        // Marquer comme payé et rediriger
        await fetch('/backend/api/orders/validate.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            order_id: result.order.id,
            payment_method: 'free_samples'
          })
        });

        router.push(`/order-confirmation?order_id=${result.order.id}`);
      } else {
        setStep('payment');
      }
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
                    {isSubmitting
                      ? 'Création de la commande...'
                      : cart && cart.total === 0
                      ? 'Valider la commande d\'échantillons'
                      : 'Continuer vers le paiement'
                    }
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
                  {/* Configurations */}
                  {cart.items && cart.items.length > 0 && (
                    <>
                      <div className="text-sm font-semibold text-gray-700 uppercase">Meubles</div>
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
                    </>
                  )}

                  {/* Échantillons */}
                  {samplesCart && samplesCart.items && samplesCart.items.length > 0 && (
                    <>
                      <div className="text-sm font-semibold text-gray-700 uppercase mt-4">
                        Échantillons gratuits ({samplesCart.count})
                      </div>
                      {samplesCart.items.map((sample) => (
                        <div key={sample.id} className="flex justify-between text-sm items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: sample.image_url ? undefined : (sample.hex || '#EEE') }}
                            >
                              {sample.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sample.image_url}
                                  alt={sample.color_name}
                                  className="h-full w-full object-cover rounded"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{sample.color_name}</div>
                              <div className="text-gray-500 text-xs">{sample.material}</div>
                            </div>
                          </div>
                          <div className="font-semibold text-green-600">Gratuit</div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-amber-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cart?.total || 0)}
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
