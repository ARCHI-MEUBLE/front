import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Footer } from '@/components/Footer';
import { MapPin, CreditCard, Package, Truck, Shield, Check, ChevronLeft, AlertTriangle, X } from 'lucide-react';

// Import dynamique pour éviter les problèmes SSR avec Stripe
const StripeCheckoutWrapper = dynamic(
  () => import('@/components/checkout/StripeCheckoutWrapper'),
  { ssr: false }
);

const FacadeCartPreview = dynamic(
  () => import('@/components/facades/FacadeCartPreview'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#F5F5F4] animate-pulse" />
  }
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

interface FacadeDrilling {
  id: string;
  type: string;
  typeName: string;
  x: number;
  y: number;
  diameter: number;
  price: number;
}

interface FacadeCartItem {
  id: number;
  config: {
    width: number;
    height: number;
    depth: number;
    material: {
      id: number;
      name: string;
      color_hex: string;
      texture_url?: string | null;
    } | string;
    materialName?: string;
    hingeType?: string;
    hingeSide?: string;
    hingeCount?: number;
    hinges?: {
      type: string;
      count: number;
      direction: string;
    };
    drillings?: FacadeDrilling[];
  };
  quantity: number;
  unit_price: number;
}

interface FacadeCartData {
  items: FacadeCartItem[];
  total: number;
  count: number;
}

type CheckoutStep = 'shipping' | 'payment';

export default function CheckoutStripe() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [cart, setCart] = useState<CartData | null>({ items: [], total: 0 });
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
  const [catalogueCart, setCatalogueCart] = useState<CatalogueCartData | null>(null);
  const [facadeCart, setFacadeCart] = useState<FacadeCartData | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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
  const [selectedFacade, setSelectedFacade] = useState<FacadeCartItem | null>(null);

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
        router.push('/account?section=orders');
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
      router.push('/account?section=orders');
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

      // Charger les façades
      const facadeResponse = await fetch('/backend/api/cart/facades.php', {
        credentials: 'include',
      });

      let facadeData = null;
      if (facadeResponse.ok) {
        facadeData = await facadeResponse.json();
        setFacadeCart(facadeData);
      }

      // Vérifier que le panier n'est pas vide (configs OU échantillons OU catalogue OU façades)
      const hasConfigs = configData && configData.items && configData.items.length > 0;
      const hasSamples = samplesData && samplesData.items && samplesData.items.length > 0;
      const hasCatalogue = catalogueData && catalogueData.items && catalogueData.items.length > 0;
      const hasFacades = facadeData && facadeData.items && facadeData.items.length > 0;

      if (!hasConfigs && !hasSamples && !hasCatalogue && !hasFacades) {
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
      } else if (result.order.needs_validation) {
        // Commande avec configurations 3D → nécessite validation admin avant paiement
        // Rediriger vers la page compte avec message
        router.push(`/account?section=orders&pending=${result.order.id}`);
      } else {
        // Commande sans configs 3D (catalogue, façades, échantillons) → paiement direct
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

  if ((!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0) && (!catalogueCart || catalogueCart.items.length === 0) && (!facadeCart || facadeCart.items.length === 0)) {
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
  const facadeTotal = facadeCart?.total || 0;
  const grandTotal = (cart?.total || 0) + samplesTotal + catalogueTotal + facadeTotal;

  // Stripe Public Key Check
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey && process.env.NODE_ENV === 'development') {
    console.warn('Stripe Public Key is missing (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Checkout data:', { cart, samplesCart, catalogueCart, facadeCart, grandTotal, orderId });
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

                  {/* Façades */}
                  {facadeCart && facadeCart.items && facadeCart.items.length > 0 && (
                    <div className={`space-y-4 ${ (cart.items && cart.items.length > 0) || (samplesCart && samplesCart.items && samplesCart.items.length > 0) || (catalogueCart && catalogueCart.items && catalogueCart.items.length > 0) ? 'mt-6 border-t border-[#E8E6E3] pt-6' : ''}`}>
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                        Façades sur mesure ({facadeCart.count})
                      </p>
                      {facadeCart.items.map((item) => {
                        const materialObj = typeof item.config.material === 'object' ? item.config.material : null;
                        const materialName = materialObj?.name || item.config.materialName || (typeof item.config.material === 'string' ? item.config.material : 'Matériau');
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedFacade(item)}
                            className="flex w-full items-start gap-3 rounded-lg p-2 -mx-2 text-left transition-colors hover:bg-[#F5F5F4] cursor-pointer"
                          >
                            {/* Aperçu 3D */}
                            <div className="h-14 w-14 flex-shrink-0 border border-[#E8E6E3] overflow-hidden bg-[#F5F5F4]">
                              <FacadeCartPreview
                                width={item.config.width}
                                height={item.config.height}
                                depth={item.config.depth || 19}
                                colorHex={materialObj?.color_hex || '#CCCCCC'}
                                textureUrl={materialObj?.texture_url}
                                drillings={item.config.drillings}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#1A1917]">
                                Façade {item.config.width / 10} × {item.config.height / 10} cm
                              </p>
                              <p className="text-xs text-[#706F6C]">
                                {materialName} | Qté: {item.quantity}
                              </p>
                            </div>
                            <p className="flex-shrink-0 font-mono text-xs text-[#1A1917]">
                              {(item.unit_price * item.quantity).toLocaleString('fr-FR')} €
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-6 border-t border-[#E8E6E3] pt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#706F6C]">Sous-total</span>
                      <span className="font-mono text-[#1A1917]">{(cart?.total || 0).toLocaleString('fr-FR')} €</span>
                    </div>
                    {catalogueTotal > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Articles catalogue</span>
                        <span className="font-mono text-[#1A1917]">{catalogueTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    {samplesTotal > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Échantillons</span>
                        <span className="font-mono text-[#1A1917]">{samplesTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    {facadeTotal > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Façades</span>
                        <span className="font-mono text-[#1A1917]">{facadeTotal.toLocaleString('fr-FR')} €</span>
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

      {/* Modal détails façade */}
      {selectedFacade && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedFacade(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8E6E3] p-6">
              <h3 className="font-serif text-xl text-[#1A1917]">Détails de la façade</h3>
              <button
                type="button"
                onClick={() => setSelectedFacade(null)}
                className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] hover:text-[#1A1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {(() => {
                const materialObj = typeof selectedFacade.config.material === 'object' ? selectedFacade.config.material : null;
                const materialName = materialObj?.name || selectedFacade.config.materialName || (typeof selectedFacade.config.material === 'string' ? selectedFacade.config.material : 'Matériau');
                const hinges = selectedFacade.config.hinges;
                const hingeCount = hinges?.count || selectedFacade.config.hingeCount || 0;
                const hingeType = hinges?.type || selectedFacade.config.hingeType || '';
                const hingeSide = hinges?.direction || selectedFacade.config.hingeSide || '';
                const drillings = selectedFacade.config.drillings || [];

                return (
                  <div className="space-y-6">
                    {/* 3D Preview */}
                    <div className="aspect-square w-full max-w-[200px] mx-auto border border-[#E8E6E3] overflow-hidden bg-[#F5F5F4]">
                      <FacadeCartPreview
                        width={selectedFacade.config.width}
                        height={selectedFacade.config.height}
                        depth={selectedFacade.config.depth || 19}
                        colorHex={materialObj?.color_hex || '#CCCCCC'}
                        textureUrl={materialObj?.texture_url}
                        drillings={drillings}
                      />
                    </div>

                    {/* Info Grid */}
                    <div className="grid gap-4">
                      {/* Dimensions */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Dimensions</span>
                        <span className="text-sm font-medium text-[#1A1917]">
                          {selectedFacade.config.width / 10} × {selectedFacade.config.height / 10} cm · {selectedFacade.config.depth || 19} mm
                        </span>
                      </div>

                      {/* Matériau */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Matériau</span>
                        <div className="flex items-center gap-2">
                          {materialObj?.texture_url ? (
                            <div className="h-5 w-5 border border-[#E8E6E3] overflow-hidden">
                              <img src={materialObj.texture_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : materialObj?.color_hex ? (
                            <div className="h-5 w-5 border border-[#E8E6E3]" style={{ backgroundColor: materialObj.color_hex }} />
                          ) : null}
                          <span className="text-sm font-medium text-[#1A1917]">{materialName}</span>
                        </div>
                      </div>

                      {/* Type de charnière */}
                      <div className="py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C] block mb-3">Charnières</span>
                        <div className="flex items-center gap-3 p-3 bg-[#FAFAF9] rounded-lg">
                          {/* Icône du type de charnière */}
                          <div className="flex-shrink-0">
                            {hingeType === 'no-hole-no-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="16" y="8" width="32" height="48" fill="#D1D5DB" stroke="#1A1917" strokeWidth="2" rx="2"/>
                                <circle cx="40" cy="32" r="2" fill="#6B7280"/>
                                <line x1="12" y1="12" x2="52" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                                <line x1="52" y1="12" x2="12" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-applied-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="6" y="8" width="16" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="20" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="18" y="20" width="8" height="12" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="14" y="22" width="6" height="8" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <circle cx="22" cy="24" r="1.5" fill="#374151"/>
                                <circle cx="22" cy="29" r="1.5" fill="#374151"/>
                                <circle cx="17" cy="26" r="1.5" fill="#374151"/>
                                <circle cx="40" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-twin-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="28" y="8" width="8" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="6" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="36" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="26" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="22" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="32" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="37" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <circle cx="29" cy="24" r="1.2" fill="#374151"/>
                                <circle cx="35" cy="24" r="1.2" fill="#374151"/>
                                <circle cx="20" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
                                <circle cx="44" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-integrated-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="6" y="8" width="20" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="24" y="12" width="4" height="40" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                                <rect x="26" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <circle cx="29" cy="22" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <circle cx="29" cy="32" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <circle cx="29" cy="42" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="27" y="20" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <rect x="27" y="30" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <rect x="27" y="40" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <circle cx="45" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                              </svg>
                            )}
                            {!hingeType && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="16" y="8" width="32" height="48" fill="#D1D5DB" stroke="#1A1917" strokeWidth="2" rx="2"/>
                                <circle cx="40" cy="32" r="2" fill="#6B7280"/>
                                <line x1="12" y1="12" x2="52" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                                <line x1="52" y1="12" x2="12" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1A1917]">
                              {hingeType === 'no-hole-no-hinge' && 'Sans trou, sans charnière'}
                              {hingeType === 'hole-with-applied-hinge' && 'Trou + charnière fournie porte en applique'}
                              {hingeType === 'hole-with-twin-hinge' && 'Trou + charnière fournie porte jumelée'}
                              {hingeType === 'hole-with-integrated-hinge' && 'Trou + charnière fournie porte encastrée'}
                              {!hingeType && 'Sans trou, sans charnière'}
                            </p>
                            {hingeType && hingeType !== 'no-hole-no-hinge' && hingeCount > 0 && (
                              <p className="text-xs text-[#706F6C] mt-1">
                                {hingeCount} charnières · Ouverture {hingeSide === 'left' ? 'gauche' : hingeSide === 'right' ? 'droite' : hingeSide}
                              </p>
                            )}
                            <p className="text-xs text-[#8B7355] mt-1">
                              Prix unit. {!hingeType || hingeType === 'no-hole-no-hinge' ? '0.00' : '34.20'} € TTC
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Perçages */}
                      {drillings.length > 0 && (
                        <div className="py-3 border-b border-[#E8E6E3]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#706F6C]">Perçages</span>
                            <span className="text-sm font-medium text-[#1A1917]">{drillings.length} trou{drillings.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-1 pl-4">
                            {drillings.map((drill, idx) => (
                              <div key={drill.id} className="flex justify-between text-xs">
                                <span className="text-[#706F6C]">
                                  {drill.typeName || `Trou ${idx + 1}`} ({drill.diameter}mm) - Position: {drill.x}×{drill.y} cm
                                </span>
                                {drill.price > 0 && (
                                  <span className="text-[#1A1917]">+{Number(drill.price).toFixed(2)} €</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quantité */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Quantité</span>
                        <span className="text-sm font-medium text-[#1A1917]">{selectedFacade.quantity}</span>
                      </div>

                      {/* Prix unitaire */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Prix unitaire</span>
                        <span className="text-sm font-medium text-[#1A1917]">{selectedFacade.unit_price.toLocaleString('fr-FR')} €</span>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center py-3 bg-[#F5F5F4] px-4 -mx-4">
                        <span className="text-sm font-medium text-[#1A1917]">Total</span>
                        <span className="text-lg font-medium text-[#1A1917]">
                          {(selectedFacade.unit_price * selectedFacade.quantity).toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="border-t border-[#E8E6E3] p-6">
              <button
                type="button"
                onClick={() => setSelectedFacade(null)}
                className="w-full h-12 bg-[#1A1917] text-white text-sm font-medium transition-colors hover:bg-[#2D2B28]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
