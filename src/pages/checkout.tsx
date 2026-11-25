import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { Header } from '@/components/Header';
import { displayColorName, displayMaterialName } from '@/lib/displayNames';
import { formatPrice } from '@/lib/format';
import { Footer } from '@/components/Footer';
import { MapPin, CreditCard, Package, Truck, Shield, Check, ChevronLeft } from 'lucide-react';
import { fetchCartShipping, shippingLines, type CartShipping, type ShippingLine } from '@/lib/shippingApi';
import { cartTotals, isTrueFlag, orderPayment, sumItems, toAmount, type OrderPayment } from '@/lib/orderTotals';
import FacadeDetailsModal from '@/components/facades/FacadeDetailsModal';

// Import dynamique pour éviter les problèmes SSR avec Stripe
const StripeCheckoutWrapper = dynamic(
  () => import('@/components/checkout/StripeCheckoutWrapper'),
  { ssr: false }
);

const FacadeCartPreview = dynamic(
  () => import('@/components/facades/FacadeCartPreview'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-am-mist/15 animate-pulse" />
  }
);

interface CartItem {
  configuration: {
    id: number;
    name: string;
    price: number;
    // Configurations enregistrées avant que la livraison sorte du prix : leur prix la comprend déjà
    price_includes_delivery?: boolean | string;
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
  const { customer, isAuthenticated, isLoading: authLoading, requireIdentity } = useCustomer();

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
  // Panier : frais de livraison calculés par le serveur (null tant qu'inconnus)
  const [shipping, setShipping] = useState<CartShipping | null>(null);
  const [shippingError, setShippingError] = useState(false);
  // Commande déjà créée (paiement d'un acompte, d'un solde, ou d'une commande validée) : ses montants font foi
  const [orderAmounts, setOrderAmounts] = useState<OrderPayment | null>(null);
  // Montant à payer maintenant, tel que le serveur l'a fixé pour le paiement Stripe (livraison comprise)
  const [dueAmount, setDueAmount] = useState<number | null>(null);

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

    // Sans compte client : on confirme l'email du visiteur avant de charger son panier ou la commande à payer
    if (!isAuthenticated) {
      void requireIdentity().then((confirmed) => {
        if (!confirmed) router.push('/cart');
      });
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
  }, [isAuthenticated, authLoading, customer, router, requireIdentity]);

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
      setOrderAmounts(orderPayment(order));

      // Déterminer le montant à payer (le serveur le confirme à la création du paiement)
      let amountToPay = toAmount(order.total);
      if (order.payment_strategy === 'deposit') {
        if (order.deposit_payment_status !== 'paid') {
          setPaymentType('deposit');
          amountToPay = toAmount(order.deposit_amount);
        } else if (order.balance_payment_status !== 'paid') {
          setPaymentType('balance');
          amountToPay = toAmount(order.remaining_amount);
        }
      }
      setDueAmount(amountToPay);

      // Vérifier que la commande n'est pas déjà payée
      if (order.payment_status === 'paid' || (order.payment_strategy === 'deposit' && order.balance_payment_status === 'paid')) {
        router.push(`/order-confirmation/${existingOrderId}`);
        return;
      }

      // Convertir la commande en format panier pour réutiliser le récapitulatif : toutes ses lignes, aux prix
      // enregistrés dans la commande
      setOrderId(existingOrderId);
      const orderItems: CartItem[] = (order.items || []).map((item: any) => ({
        configuration: {
          id: item.configuration_id,
          name: item.name || item.configuration?.name || 'Configuration',
          price: toAmount(item.unit_price ?? item.price),
        },
        quantity: toAmount(item.quantity),
      }));
      setCart({
        items: orderItems,
        total: sumItems(orderItems, (item) => item.configuration.price, (item) => item.quantity),
      });
      setSamplesCart({
        items: (order.samples || []).map((sample: any) => ({
          id: sample.id,
          sample_color_id: sample.sample_color_id ?? 0,
          quantity: toAmount(sample.quantity),
          color_name: sample.sample_name,
          hex: sample.hex ?? null,
          image_url: sample.image_url ?? null,
          type_name: sample.sample_type_name ?? '',
          material: sample.material ?? '',
          type_description: null,
          unit_price: toAmount(sample.price),
        })),
        count: (order.samples || []).length,
      });
      setCatalogueCart({
        items: (order.catalogue_items || []).map((item: any) => ({
          id: item.id,
          catalogue_item_id: item.catalogue_item_id,
          variation_id: item.variation_id ?? null,
          quantity: toAmount(item.quantity),
          name: item.name || item.item_name || 'Article',
          unit_price: toAmount(item.unit_price),
          unit: item.unit ?? '',
          item_image: item.image_url ?? null,
          variation_name: item.variation_name ?? null,
          variation_image: null,
        })),
      });
      const facadeItems: FacadeCartItem[] = (order.facade_items || []).map((facade: any) => ({
        id: facade.id,
        config: facade.config || {},
        quantity: toAmount(facade.quantity),
        unit_price: toAmount(facade.unit_price),
      }));
      setFacadeCart({
        items: facadeItems,
        total: sumItems(facadeItems, (item) => item.unit_price, (item) => item.quantity),
        count: facadeItems.length,
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
      router.push('/cart');
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

      // Livraison calculée par le serveur, la même qu'il ajoutera au total de la commande
      try {
        setShipping(await fetchCartShipping());
        setShippingError(false);
      } catch (shippingErr) {
        console.warn('Frais de livraison indisponibles :', shippingErr instanceof Error ? shippingErr.message : shippingErr);
        setShippingError(true);
      }

      // Vérifier que le panier n'est pas vide (configs OU échantillons OU catalogue OU façades)
      const hasConfigs = configData && configData.items && configData.items.length > 0;
      const hasSamples = samplesData && samplesData.items && samplesData.items.length > 0;
      const hasCatalogue = catalogueData && catalogueData.items && catalogueData.items.length > 0;
      const hasFacades = facadeData && facadeData.items && facadeData.items.length > 0;

      if (!hasConfigs && !hasSamples && !hasCatalogue && !hasFacades) {
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
      // Le total de la commande est celui du serveur (articles + livraison) : c'est lui qui sera payé
      const serverTotal = toAmount(result.order.total);
      setDueAmount(serverTotal);

      // Si le total est 0€ (seulement échantillons gratuits, livraison offerte), valider directement
      if (serverTotal === 0) {
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
        router.push(`/order-confirmation/${result.order.id}`);
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
          <meta name="robots" content="noindex" />
        </Head>
        <Header />
        <div className="min-h-screen bg-am-paper">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin border-2 border-black/10 border-t-am-navy" />
              <p className="mt-6 text-sm text-black/65">Chargement...</p>
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
          <meta name="robots" content="noindex" />
        </Head>
        <Header />
        <div className="min-h-screen bg-am-paper flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl text-ink mb-4">Chargement de votre panier...</h2>
            <p className="text-stone">Si ce message persiste, votre panier est peut-être vide.</p>
            <Link href="/cart" className="mt-6 inline-block text-ink underline">Retour au panier</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Articles + livraison. Pour une commande déjà créée, ses montants enregistrés ; pour le panier, la livraison
  // calculée par le serveur (la même qu'il ajoutera à la commande).
  const hasFurniture = (cart?.items.length ?? 0) > 0;
  const hasParcelItems =
    (samplesCart?.items.length ?? 0) > 0 || (catalogueCart?.items.length ?? 0) > 0 || (facadeCart?.items.length ?? 0) > 0;
  const furnitureDeliveryIncluded = hasFurniture && cart!.items.every((item) => isTrueFlag(item.configuration.price_includes_delivery));
  const cartShippingLines = shipping ? shippingLines(shipping, { hasFurniture, hasParcelItems, furnitureDeliveryIncluded }) : [];
  const totals = cartTotals(
    {
      furniture: toAmount(cart?.total),
      facades: toAmount(facadeCart?.total),
      catalogue: sumItems(catalogueCart?.items, (item) => item.unit_price, (item) => item.quantity),
      samples: sumItems(samplesCart?.items, (item) => item.unit_price, (item) => item.quantity),
    },
    shipping ? cartShippingLines.reduce((sum, line) => sum + line.amount, 0) : null,
  );
  const summaryShippingLines: ShippingLine[] = orderAmounts
    ? orderAmounts.shipping > 0
      ? [{ key: 'furniture', label: 'Livraison', amount: orderAmounts.shipping, value: formatPrice(orderAmounts.shipping), note: null }]
      : []
    : cartShippingLines;
  const itemsTotal = orderAmounts ? orderAmounts.items : totals.items;
  const grandTotal = orderAmounts ? orderAmounts.total : totals.total;
  const shippingKnown = orderAmounts !== null || shipping !== null;

  // Stripe Public Key Check
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey && process.env.NODE_ENV === 'development') {
    console.warn('Stripe Public Key is missing (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)');
  }

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Header />

      <div className="min-h-screen bg-am-paper">
        {/* Header */}
        <div className="border-b border-black/10 bg-am-paper">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <h1 className="text-heading text-black">
              Finaliser la commande
            </h1>

            {/* Steps indicator */}
            <div className="mt-8 flex items-center gap-4">
              <div className={`flex items-center gap-3 ${step === 'shipping' ? 'text-black' : 'text-black/65'}`}>
                <div className={`flex h-10 w-10 items-center justify-center border-2 text-sm font-medium transition-colors ${
                  step === 'shipping'
                    ? 'border-am-navy bg-am-navy text-white'
                    : step === 'payment'
                      ? 'border-am-navy bg-am-navy text-white'
                      : 'border-black/10 text-black/65'
                }`}>
                  {step === 'payment' ? <Check className="h-5 w-5" /> : '1'}
                </div>
                <span className="hidden text-sm font-medium sm:block">Livraison</span>
              </div>

              <div className="h-px flex-1 bg-black/10" />

              <div className={`flex items-center gap-3 ${step === 'payment' ? 'text-black' : 'text-black/65'}`}>
                <div className={`flex h-10 w-10 items-center justify-center border-2 text-sm font-medium transition-colors ${
                  step === 'payment'
                    ? 'border-am-navy bg-am-navy text-white'
                    : 'border-black/10 text-black/65'
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
                  <div className="border border-black/10 bg-white">
                    <div className="flex items-center gap-3 border-b border-black/10 p-6">
                      <MapPin className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Adresse de livraison
                      </h2>
                    </div>

                    <div className="space-y-5 p-6">
                      <div>
                        <label className="mb-2 block text-sm text-black/65">
                          Adresse <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="shipping_address"
                          required
                          value={formData.shipping_address}
                          onChange={handleChange}
                          className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                          placeholder="123 Rue Example"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm text-black/65">
                            Code postal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="shipping_postal_code"
                            required
                            value={formData.shipping_postal_code}
                            onChange={handleChange}
                            className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                            placeholder="59000"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-black/65">
                            Ville <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="shipping_city"
                            required
                            value={formData.shipping_city}
                            onChange={handleChange}
                            className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                            placeholder="Lille"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-black/65">
                          Pays <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="shipping_country"
                          required
                          value={formData.shipping_country}
                          onChange={handleChange}
                          className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                          placeholder="France"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="border border-black/10 bg-white">
                    <div className="flex items-center gap-3 border-b border-black/10 p-6">
                      <CreditCard className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
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
                          <div className="h-5 w-5 border border-black/10 bg-white transition-colors peer-checked:border-am-navy peer-checked:bg-am-navy" />
                          <Check className="absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-black">Identique à l&apos;adresse de livraison</span>
                      </label>

                      {!formData.billing_same && (
                        <div className="mt-6 space-y-5">
                          <div>
                            <label className="mb-2 block text-sm text-black/65">
                              Adresse <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="billing_address"
                              required
                              value={formData.billing_address}
                              onChange={handleChange}
                              className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                            />
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm text-black/65">
                                Code postal <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="billing_postal_code"
                                required
                                value={formData.billing_postal_code}
                                onChange={handleChange}
                                className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm text-black/65">
                                Ville <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="billing_city"
                                required
                                value={formData.billing_city}
                                onChange={handleChange}
                                className="h-12 w-full border border-black/10 bg-white px-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border border-black/10 bg-white">
                    <div className="flex items-center gap-3 border-b border-black/10 p-6">
                      <Package className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Notes de livraison
                      </h2>
                      <span className="text-xs text-black/65">(optionnel)</span>
                    </div>

                    <div className="p-6">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={4}
                        className="w-full resize-none border border-black/10 bg-white p-4 text-black placeholder-black/40 transition-colors focus:border-am-navy focus:outline-none"
                        placeholder="Instructions spéciales pour la livraison..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-14 w-full items-center justify-center bg-am-navy text-sm font-medium tracking-wide text-white transition-colors hover:bg-am-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="border border-black/10 bg-white p-6">
                      {paymentType !== 'full' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-800 font-medium">
                            {paymentType === 'deposit'
                              ? `Paiement de l'acompte (${orderData?.deposit_percentage}%)`
                              : `Paiement du solde restant`}
                          </p>
                          {dueAmount !== null && (
                            <p className="text-sm text-amber-700 mt-1">
                              Montant à régler : {formatPrice(dueAmount)}
                            </p>
                          )}
                        </div>
                      )}
                      <StripeCheckoutWrapper
                        orderId={orderId}
                        paymentType={paymentType}
                        onAmount={setDueAmount}
                        onError={(error) => setError(error)}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setStep('shipping')}
                    className="inline-flex items-center gap-2 text-sm text-black/65 transition-colors hover:text-black"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour aux informations de livraison
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="mt-10 lg:col-span-5 lg:mt-0 xl:col-span-4">
              <div className="sticky top-6 border border-black/10 bg-white">
                {/* Header */}
                <div className="border-b border-black/10 p-6">
                  <h2 className="text-xl text-black">
                    Récapitulatif
                  </h2>
                </div>

                {/* Items */}
                <div className="p-6">
                  {/* Configurations */}
                  {cart && cart.items && cart.items.length > 0 && (
                    <div className="space-y-4">
                      <p className="eyebrow-lg text-black/65">
                        Meubles sur mesure
                      </p>
                      {cart && cart.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-black">
                              {item.configuration.name || `Configuration #${item.configuration.id}`}
                            </p>
                            <p className="mt-1 text-xs text-black/65">
                              Quantité : {item.quantity}
                            </p>
                          </div>
                          <p className="flex-shrink-0 font-mono text-sm text-black">
                            {formatPrice(item.configuration.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Samples */}
                  {samplesCart && samplesCart.items && samplesCart.items.length > 0 && (
                    <div className={`space-y-4 ${cart && cart.items && cart.items.length > 0 ? 'mt-6 border-t border-black/10 pt-6' : ''}`}>
                      <p className="eyebrow-lg text-black/65">
                        Échantillons ({samplesCart.count})
                      </p>
                      {samplesCart.items.map((sample) => (
                        <div key={sample.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 flex-shrink-0 border border-black/10"
                              style={{ backgroundColor: sample.image_url ? undefined : (sample.hex || '#EEE') }}
                            >
                              {sample.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sample.image_url}
                                  alt={displayColorName(sample.color_name)}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-black">{displayColorName(sample.color_name)}</p>
                              <p className="text-xs text-black/65">{displayMaterialName(sample.material)}</p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-medium ${toAmount(sample.unit_price) > 0 ? 'text-black' : 'text-am-navy'}`}>
                            {toAmount(sample.unit_price) > 0 ? formatPrice(toAmount(sample.unit_price) * sample.quantity) : 'Offert'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Catalogue Items */}
                  {catalogueCart && catalogueCart.items && catalogueCart.items.length > 0 && (
                    <div className={`space-y-4 ${ (cart && cart.items && cart.items.length > 0) || (samplesCart && samplesCart.items && samplesCart.items.length > 0) ? 'mt-6 border-t border-black/10 pt-6' : ''}`}>
                      <p className="eyebrow-lg text-black/65">
                        Catalogue ({catalogueCart.items.length})
                      </p>
                      {catalogueCart.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 flex-shrink-0 border border-black/10 bg-am-mist/15">
                              {(item.variation_image || item.item_image) ? (
                                <img
                                  src={item.variation_image || (item.item_image as string)}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Package className="h-4 w-4 text-black/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-black">{item.name}</p>
                              <p className="text-xs text-black/65">
                                Qté: {item.quantity} {item.variation_name ? `| ${item.variation_name}` : ''}
                              </p>
                            </div>
                          </div>
                          <p className="flex-shrink-0 font-mono text-xs text-black">
                            {formatPrice(item.unit_price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Façades */}
                  {facadeCart && facadeCart.items && facadeCart.items.length > 0 && (
                    <div className={`space-y-4 ${ (cart && cart.items && cart.items.length > 0) || (samplesCart && samplesCart.items && samplesCart.items.length > 0) || (catalogueCart && catalogueCart.items && catalogueCart.items.length > 0) ? 'mt-6 border-t border-black/10 pt-6' : ''}`}>
                      <p className="eyebrow-lg text-black/65">
                        Façades sur mesure ({facadeCart.count})
                      </p>
                      {facadeCart.items.map((item) => {
                        const materialObj = typeof item.config.material === 'object' ? item.config.material : null;
                        const materialName = displayColorName(materialObj?.name || item.config.materialName || (typeof item.config.material === 'string' ? item.config.material : '')) || 'Matériau';
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedFacade(item)}
                            className="flex w-full items-start gap-3 rounded-lg p-2 -mx-2 text-left transition-colors hover:bg-am-mist/30 cursor-pointer"
                          >
                            {/* Aperçu 3D */}
                            <div className="h-14 w-14 flex-shrink-0 border border-black/10 overflow-hidden bg-am-mist/15">
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
                              <p className="text-sm text-black">
                                Façade {item.config.width / 10} × {item.config.height / 10} cm
                              </p>
                              <p className="text-xs text-black/65">
                                {materialName} | Qté: {item.quantity}
                              </p>
                            </div>
                            <p className="flex-shrink-0 font-mono text-xs text-black">
                              {formatPrice(item.unit_price * item.quantity)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Total : articles, puis livraison (calculée par le serveur), puis ce qui reste à payer */}
                  <div className="mt-6 border-t border-black/10 pt-6">
                    {hasFurniture && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-black/65">Meubles sur mesure</span>
                        <span className="font-mono text-black">{formatPrice(totals.furniture)}</span>
                      </div>
                    )}
                    {totals.facades > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-black/65">Façades</span>
                        <span className="font-mono text-black">{formatPrice(totals.facades)}</span>
                      </div>
                    )}
                    {totals.catalogue > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-black/65">Articles du catalogue</span>
                        <span className="font-mono text-black">{formatPrice(totals.catalogue)}</span>
                      </div>
                    )}
                    {totals.samples > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-black/65">Échantillons</span>
                        <span className="font-mono text-black">{formatPrice(totals.samples)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-black/10 pt-2 text-sm">
                      <span className="text-black/65">Sous-total articles</span>
                      <span className="font-mono text-black">{formatPrice(itemsTotal)}</span>
                    </div>
                    {summaryShippingLines.map((line) => (
                      <div key={line.key} className="mt-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-black/65">{line.label}</span>
                          <span className={line.amount > 0 ? 'font-mono text-black' : 'font-medium text-am-navy'}>{line.value}</span>
                        </div>
                        {line.note && <p className="mt-0.5 text-right text-xs text-black/65">{line.note}</p>}
                      </div>
                    ))}
                    {!shippingKnown && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-black/65">Livraison</span>
                        <span className="text-black/65">{shippingError ? 'Calculée à la commande' : '…'}</span>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
                      <span className="text-black">{shippingKnown ? 'Total' : 'Total hors livraison'}</span>
                      <span className="font-mono text-2xl text-black">{formatPrice(grandTotal)}</span>
                    </div>
                    <p className="mt-1 text-right text-xs text-black/65">TVA incluse</p>
                    {orderAmounts && orderAmounts.paid > 0 && (
                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-black/65">Déjà payé</span>
                          <span className="font-mono text-black">{formatPrice(orderAmounts.paid)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-black">Reste à payer</span>
                          <span className="font-mono text-black">{formatPrice(orderAmounts.remaining)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="border-t border-black/10 p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-am-navy" />
                      <div>
                        <p className="text-sm font-medium text-black">Paiement sécurisé</p>
                        <p className="text-xs text-black/65">Vos données sont protégées</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-am-navy" />
                      <div>
                        <p className="text-sm font-medium text-black">Livraison à domicile</p>
                        <p className="text-xs text-black/65">Partout en France, frais détaillés ci-dessus</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to cart */}
              <Link
                href="/cart"
                className="mt-4 block text-center text-sm text-black/65 underline underline-offset-4 transition-colors hover:text-black"
              >
                Retour au panier
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Modal détails façade (composant partagé avec le panier) */}
      {selectedFacade && <FacadeDetailsModal facade={selectedFacade} onClose={() => setSelectedFacade(null)} />}
    </>
  );
}
