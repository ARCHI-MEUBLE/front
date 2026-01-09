import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Footer } from '@/components/Footer';
import { MapPin, CreditCard, Package, Truck, Shield, Check, ChevronLeft, AlertTriangle } from 'lucide-react';

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
  price_per_m2: number;
  unit_price: number;
}

interface CartData {
  items: CartItem[];
  total: number;
}

interface SamplesCartData {
  items: SampleCartItem[];
  count: number;
}

interface CatalogueCartItem {
  id: number;
  catalogue_item_id: number;
  variation_id: number | null;
  quantity: number;
  name: string;
  unit_price: number;
  unit: string;
  item_image: string | null;
  variation_name: string | null;
  variation_image: string | null;
}

interface CatalogueCartData {
  items: CatalogueCartItem[];
}

type CheckoutStep = 'shipping' | 'payment';

export default function CheckoutStripe() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [cart, setCart] = useState<CartData | null>({ items: [], total: 0 });
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
  const [catalogueCart, setCatalogueCart] = useState<CatalogueCartData | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [installments, setInstallments] = useState<1 | 3>(1);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit' | 'balance'>('full');
  const [orderData, setOrderData] = useState<any>(null);

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
      router.push('/auth/login?redirect=/checkout');
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

      setOrderData(order);

      // Déterminer le montant à payer
      let amountToPay = order.total || 0;
      if (order.payment_strategy === 'deposit') {
        if (order.deposit_payment_status !== 'paid') {
          setPaymentType('deposit');
          amountToPay = order.deposit_amount;
        } else if (order.balance_payment_status !== 'paid') {
          setPaymentType('balance');
          amountToPay = order.remaining_amount;
        }
      }

      // Vérifier que la commande n'est pas déjà payée
      if (order.payment_status === 'paid' || (order.payment_strategy === 'deposit' && order.balance_payment_status === 'paid')) {
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
        total: amountToPay
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

      // Charger les articles du catalogue
      const catalogueResponse = await fetch('/api/cart/catalogue', {
        credentials: 'include',
      });

      let catalogueData = null;
      if (catalogueResponse.ok) {
        catalogueData = await catalogueResponse.json();
        setCatalogueCart(catalogueData);
      }

      // Vérifier que le panier n'est pas vide (configs OU échantillons OU catalogue)
      const hasConfigs = configData && configData.items && configData.items.length > 0;
      const hasSamples = samplesData && samplesData.items && samplesData.items.length > 0;
      const hasCatalogue = catalogueData && catalogueData.items && catalogueData.items.length > 0;

      if (!hasConfigs && !hasSamples && !hasCatalogue) {
        console.log('Panier vide, mais on reste sur la page pour débug');
        // router.push('/cart');
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

      // Si le total est 0€ (seulement échantillons gratuits), valider directement
      if (grandTotal === 0) {
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

  // Loading state
  if (authLoading || (isLoading && !orderId)) {
    return (
      <>
        <Head>
          <title>Paiement - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-[#FAFAF9]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin border-2 border-[#E8E6E3] border-t-[#1A1917]" />
              <p className="mt-6 text-sm text-[#706F6C]">Chargement...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if ((!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0) && (!catalogueCart || catalogueCart.items.length === 0)) {
    return (
      <>
        <Head>
          <title>Paiement - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-serif text-ink mb-4">Chargement de votre panier...</h2>
            <p className="text-stone">Si ce message persiste, votre panier est peut-être vide.</p>
            <Link href="/cart" className="mt-6 inline-block text-ink underline">Retour au panier</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const samplesTotal = samplesCart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const catalogueTotal = catalogueCart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const grandTotal = (cart?.total || 0) + samplesTotal + catalogueTotal;

  // Stripe Public Key Check
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey && process.env.NODE_ENV === 'development') {
    console.warn('Stripe Public Key is missing (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Checkout data:', { cart, samplesCart, catalogueCart, grandTotal, orderId });
  }

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <div className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Finaliser la commande
            </h1>

            {/* Steps indicator */}
            <div className="mt-8 flex items-center gap-4">
              <div className={`flex items-center gap-3 ${step === 'shipping' ? 'text-[#1A1917]' : 'text-[#706F6C]'}`}>
                <div className={`flex h-10 w-10 items-center justify-center border-2 text-sm font-medium transition-colors ${
                  step === 'shipping'
                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                    : step === 'payment'
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E6E3] text-[#706F6C]'
                }`}>
                  {step === 'payment' ? <Check className="h-5 w-5" /> : '1'}
                </div>
                <span className="hidden text-sm font-medium sm:block">Livraison</span>
              </div>

              <div className="h-px flex-1 bg-[#E8E6E3]" />

              <div className={`flex items-center gap-3 ${step === 'payment' ? 'text-[#1A1917]' : 'text-[#706F6C]'}`}>
                <div className={`flex h-10 w-10 items-center justify-center border-2 text-sm font-medium transition-colors ${
                  step === 'payment'
                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                    : 'border-[#E8E6E3] text-[#706F6C]'
                }`}>
                  2
                </div>
                <span className="hidden text-sm font-medium sm:block">Paiement</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-6 lg:px-8">
            <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">
            {/* Main Content */}
            <div className="lg:col-span-7 xl:col-span-8">
              {step === 'shipping' ? (
                <form onSubmit={handleShippingSubmit} className="space-y-8">
                  {/* Shipping Address */}
                  <div className="border border-[#E8E6E3] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] p-6">
                      <MapPin className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Adresse de livraison
                      </h2>
                    </div>

                    <div className="space-y-5 p-6">
                      <div>
                        <label className="mb-2 block text-sm text-[#706F6C]">
                          Adresse <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="shipping_address"
                          required
                          value={formData.shipping_address}
                          onChange={handleChange}
                          className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                          placeholder="123 Rue Example"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm text-[#706F6C]">
                            Code postal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="shipping_postal_code"
                            required
                            value={formData.shipping_postal_code}
                            onChange={handleChange}
                            className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                            placeholder="59000"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-[#706F6C]">
                            Ville <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="shipping_city"
                            required
                            value={formData.shipping_city}
                            onChange={handleChange}
                            className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                            placeholder="Lille"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-[#706F6C]">
                          Pays <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="shipping_country"
                          required
                          value={formData.shipping_country}
                          onChange={handleChange}
                          className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                          placeholder="France"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="border border-[#E8E6E3] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] p-6">
                      <CreditCard className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Adresse de facturation
                      </h2>
                    </div>

                    <div className="p-6">
                      <label className="group flex cursor-pointer items-center gap-3">
                        <div className="relative flex h-5 w-5 items-center justify-center">
                          <input
                            type="checkbox"
                            name="billing_same"
                            checked={formData.billing_same}
                            onChange={handleChange}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-5 border border-[#E8E6E3] bg-white transition-colors peer-checked:border-[#1A1917] peer-checked:bg-[#1A1917]" />
                          <Check className="absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-[#1A1917]">Identique à l'adresse de livraison</span>
                      </label>

                      {!formData.billing_same && (
                        <div className="mt-6 space-y-5">
                          <div>
                            <label className="mb-2 block text-sm text-[#706F6C]">
                              Adresse <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="billing_address"
                              required
                              value={formData.billing_address}
                              onChange={handleChange}
                              className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                            />
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm text-[#706F6C]">
                                Code postal <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="billing_postal_code"
                                required
                                value={formData.billing_postal_code}
                                onChange={handleChange}
                                className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm text-[#706F6C]">
                                Ville <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="billing_city"
                                required
                                value={formData.billing_city}
                                onChange={handleChange}
                                className="h-12 w-full border border-[#E8E6E3] bg-white px-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border border-[#E8E6E3] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] p-6">
                      <Package className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Notes de livraison
                      </h2>
                      <span className="text-xs text-[#706F6C]">(optionnel)</span>
                    </div>

                    <div className="p-6">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={4}
                        className="w-full resize-none border border-[#E8E6E3] bg-white p-4 text-[#1A1917] placeholder-[#A8A6A3] transition-colors focus:border-[#1A1917] focus:outline-none"
                        placeholder="Instructions spéciales pour la livraison..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-14 w-full items-center justify-center bg-[#1A1917] text-sm font-medium tracking-wide text-white transition-colors hover:bg-[#2D2B28] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting
                      ? 'Création de la commande...'
                      : grandTotal === 0
                      ? 'Valider la commande d\'échantillons'
                      : 'Continuer vers le paiement'
                    }
                  </button>
                </form>
              ) : (
                <div className="space-y-8">
                  {/* Payment Options */}
                  <div className="border border-[#E8E6E3] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] p-6">
                      <CreditCard className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Options de paiement
                      </h2>
                    </div>

                    <div className="space-y-3 p-6">
                      <label className={`group flex cursor-pointer items-start gap-4 border p-5 transition-colors ${
                        installments === 1 ? 'border-[#1A1917]' : 'border-[#E8E6E3] hover:border-[#1A1917]/30'
                      }`}>
                        <div className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <input
                            type="radio"
                            name="installments"
                            value="1"
                            checked={installments === 1}
                            onChange={() => setInstallments(1)}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-5 rounded-full border border-[#E8E6E3] bg-white transition-colors peer-checked:border-[#1A1917]" />
                          <div className="absolute h-2.5 w-2.5 rounded-full bg-[#1A1917] opacity-0 transition-opacity peer-checked:opacity-100" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1A1917]">Paiement en 1 fois</div>
                          <div className="mt-1 text-sm text-[#706F6C]">
                            Payez {grandTotal.toLocaleString('fr-FR')} € maintenant
                          </div>
                        </div>
                      </label>

                      <label className={`group flex cursor-pointer items-start gap-4 border p-5 transition-colors ${
                        installments === 3 ? 'border-[#1A1917]' : 'border-[#E8E6E3] hover:border-[#1A1917]/30'
                      }`}>
                        <div className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <input
                            type="radio"
                            name="installments"
                            value="3"
                            checked={installments === 3}
                            onChange={() => setInstallments(3)}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-5 rounded-full border border-[#E8E6E3] bg-white transition-colors peer-checked:border-[#1A1917]" />
                          <div className="absolute h-2.5 w-2.5 rounded-full bg-[#1A1917] opacity-0 transition-opacity peer-checked:opacity-100" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1A1917]">Paiement en 3 fois</div>
                          <div className="mt-1 text-sm text-[#706F6C]">
                            3 × {(grandTotal / 3).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € par mois
                          </div>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wider text-[#8B7355]">Sans frais</span>
                      </label>
                    </div>
                  </div>

                  {/* Stripe Checkout */}
                  {orderId && (
                    <div className="border border-[#E8E6E3] bg-white p-6">
                      {paymentType !== 'full' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-800 font-medium">
                            {paymentType === 'deposit' 
                              ? `Paiement de l'acompte (${orderData?.deposit_percentage}%)` 
                              : `Paiement du solde restant`}
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            Montant à régler : {cart?.total?.toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      )}
                      <StripeCheckoutWrapper
                        orderId={orderId}
                        amount={grandTotal}
                        installments={installments}
                        onSuccess={() => console.log('Payment success!')}
                        onError={(error) => setError(error)}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setStep('shipping')}
                    className="inline-flex items-center gap-2 text-sm text-[#706F6C] transition-colors hover:text-[#1A1917]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour aux informations de livraison
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="mt-10 lg:col-span-5 lg:mt-0 xl:col-span-4">
              <div className="sticky top-6 border border-[#E8E6E3] bg-white">
                {/* Header */}
                <div className="border-b border-[#E8E6E3] p-6">
                  <h2 className="font-serif text-xl text-[#1A1917]">
                    Récapitulatif
                  </h2>
                </div>

                {/* Items */}
                <div className="p-6">
                  {/* Configurations */}
                  {cart.items && cart.items.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                        Meubles sur mesure
                      </p>
                      {cart.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#1A1917]">
                              {item.configuration.name || `Configuration #${item.configuration.id}`}
                            </p>
                            <p className="mt-1 text-xs text-[#706F6C]">
                              Quantité : {item.quantity}
                            </p>
                          </div>
                          <p className="flex-shrink-0 font-mono text-sm text-[#1A1917]">
                            {(item.configuration.price * item.quantity).toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Samples */}
                  {samplesCart && samplesCart.items && samplesCart.items.length > 0 && (
                    <div className={`space-y-4 ${cart.items && cart.items.length > 0 ? 'mt-6 border-t border-[#E8E6E3] pt-6' : ''}`}>
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                        Échantillons ({samplesCart.count})
                      </p>
                      {samplesCart.items.map((sample) => (
                        <div key={sample.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 flex-shrink-0 border border-[#E8E6E3]"
                              style={{ backgroundColor: sample.image_url ? undefined : (sample.hex || '#EEE') }}
                            >
                              {sample.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sample.image_url}
                                  alt={sample.color_name}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-[#1A1917]">{sample.color_name}</p>
                              <p className="text-xs text-[#706F6C]">{sample.material}</p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-medium ${sample.unit_price > 0 ? 'text-[#1A1917]' : 'text-[#8B7355]'}`}>
                            {sample.unit_price > 0 ? `${sample.unit_price} €` : 'Offert'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Catalogue Items */}
                  {catalogueCart && catalogueCart.items && catalogueCart.items.length > 0 && (
                    <div className={`space-y-4 ${ (cart.items && cart.items.length > 0) || (samplesCart && samplesCart.items && samplesCart.items.length > 0) ? 'mt-6 border-t border-[#E8E6E3] pt-6' : ''}`}>
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                        Catalogue ({catalogueCart.items.length})
                      </p>
                      {catalogueCart.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 flex-shrink-0 border border-[#E8E6E3] bg-[#F5F5F4]">
                              {(item.variation_image || item.item_image) ? (
                                <img
                                  src={item.variation_image || (item.item_image as string)}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Package className="h-4 w-4 text-[#C4C2BF]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-[#1A1917]">{item.name}</p>
                              <p className="text-xs text-[#706F6C]">
                                Qté: {item.quantity} {item.variation_name ? `| ${item.variation_name}` : ''}
                              </p>
                            </div>
                          </div>
                          <p className="flex-shrink-0 font-mono text-xs text-[#1A1917]">
                            {(item.unit_price * item.quantity).toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-6 border-t border-[#E8E6E3] pt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#706F6C]">Sous-total</span>
                      <span className="font-mono text-[#1A1917]">{(cart?.total || 0).toLocaleString('fr-FR')} €</span>
                    </div>
                    {samplesTotal > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Échantillons</span>
                        <span className="font-mono text-[#1A1917]">{samplesTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-[#706F6C]">Livraison</span>
                      <span className="text-sm font-medium text-[#8B7355]">Offerte</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#E8E6E3] pt-4">
                      <span className="text-[#1A1917]">Total</span>
                      <span className="font-mono text-2xl text-[#1A1917]">{grandTotal.toLocaleString('fr-FR')} €</span>
                    </div>
                    <p className="mt-1 text-right text-xs text-[#706F6C]">TVA incluse</p>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="border-t border-[#E8E6E3] p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                      <div>
                        <p className="text-sm font-medium text-[#1A1917]">Paiement sécurisé</p>
                        <p className="text-xs text-[#706F6C]">Vos données sont protégées</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                      <div>
                        <p className="text-sm font-medium text-[#1A1917]">Livraison gratuite</p>
                        <p className="text-xs text-[#706F6C]">Partout en France</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to cart */}
              <Link
                href="/cart"
                className="mt-4 block text-center text-sm text-[#706F6C] underline underline-offset-4 transition-colors hover:text-[#1A1917]"
              >
                Retour au panier
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
