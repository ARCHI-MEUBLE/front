import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Trash2, Edit, ShoppingBag, Package, Truck, Shield, ArrowRight, Minus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

interface CartItem {
  id: number;
  configuration_id: number;
  quantity: number;
  configuration: {
    id: number;
    name: string;
    prompt: string;
    config_data: any;
    glb_url: string | null;
    thumbnail_url: string | null;
    price: number;
    model_id: number | null;
  };
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
  item_count: number;
}

interface SamplesCartData {
  items: SampleCartItem[];
  count: number;
}

export default function Cart() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [cart, setCart] = useState<CartData | null>(null);
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/cart');
      return;
    }

    loadCart();
  }, [isAuthenticated, authLoading, router]);

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
      setCart(configData);

      // Charger les échantillons
      const samplesResponse = await fetch('/api/cart/samples', {
        credentials: 'include',
      });

      if (samplesResponse.ok) {
        const samplesData = await samplesResponse.json();
        setSamplesCart(samplesData);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (configurationId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems(prev => new Set(prev).add(configurationId));

    try {
      const response = await fetch('/backend/api/cart/index.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          configuration_id: configurationId,
          quantity: newQuantity
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      // Recharger le panier
      await loadCart();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(configurationId);
        return newSet;
      });
    }
  };

  const removeItem = async (configurationId: number) => {
    if (!confirm('Retirer cet article du panier ?')) return;

    try {
      const response = await fetch(`/backend/api/cart/index.php?configuration_id=${configurationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Recharger le panier
      await loadCart();
      toast.success('Article retiré du panier');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const clearCart = async () => {
    if (!confirm('Vider tout le panier ?')) return;

    try {
      const response = await fetch('/backend/api/cart/index.php', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du vidage du panier');
      }

      // Recharger le panier
      await loadCart();
      toast.success('Panier vidé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du vidage du panier');
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mon Panier - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-[#FAFAF9]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin border-2 border-[#E8E6E3] border-t-[#1A1917]" />
              <p className="mt-6 text-sm text-[#706F6C]">Chargement du panier...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isEmpty = (!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0);
  const totalItems = (cart?.item_count || 0) + (samplesCart?.count || 0);

  const samplesTotal = samplesCart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const grandTotal = (cart?.total || 0) + samplesTotal;
  const hasPaidSamples = samplesCart?.items.some(item => item.unit_price > 0);

  return (
    <>
      <Head>
        <title>Mon Panier - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero Header */}
        <div className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
                  Mon Panier
                </h1>
                {!isEmpty && (
                  <p className="mt-3 text-[#706F6C]">
                    {totalItems} article{totalItems > 1 ? 's' : ''} dans votre panier
                    {samplesCart && samplesCart.count > 0 && (
                      <span className="ml-2 text-[#8B7355]">
                        · {samplesCart.count} échantillon{samplesCart.count > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {!isEmpty && cart && cart.items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-[#706F6C] underline underline-offset-4 transition-colors hover:text-[#1A1917]"
                >
                  Vider le panier
                </button>
              )}
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
          {isEmpty ? (
            /* Empty State */
            <div className="mx-auto max-w-md py-12 text-center sm:py-16 lg:py-24">
              <div className="mx-auto flex h-20 w-20 items-center justify-center border border-[#E8E6E3] bg-white">
                <ShoppingBag className="h-8 w-8 text-[#706F6C]" />
              </div>
              <h2 className="mt-8 font-serif text-2xl text-[#1A1917]">
                Votre panier est vide
              </h2>
              <p className="mt-3 text-[#706F6C]">
                Créez votre première configuration de meuble sur mesure
              </p>
              <Link
                href="/models"
                className="mt-8 inline-flex h-12 items-center justify-center bg-[#1A1917] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
              >
                Découvrir nos modèles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : (
            /* Cart Content */
            <div className="lg:grid lg:grid-cols-12 lg:gap-12">
              {/* Items List */}
              <div className="lg:col-span-7 xl:col-span-8">
                {/* Samples Section */}
                {samplesCart && samplesCart.items.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] pb-4">
                      <Package className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Échantillons
                      </h2>
                      <span className="ml-auto text-sm text-[#706F6C]">
                        {samplesCart.count} article{samplesCart.count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {samplesCart.items.map((sample) => (
                        <div
                          key={sample.id}
                          className="group relative flex items-center gap-4 border border-[#E8E6E3] bg-white p-4 transition-colors hover:border-[#1A1917]/20"
                        >
                          <div
                            className="h-16 w-16 flex-shrink-0 border border-[#E8E6E3]"
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
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-medium text-[#1A1917]">
                              {sample.color_name}
                            </h3>
                            <p className="mt-1 text-xs text-[#706F6C]">
                              {sample.material}
                            </p>
                            <p className="mt-2 text-xs font-medium text-[#8B7355]">
                              {sample.unit_price > 0 ? `${sample.unit_price} €` : 'Gratuit'}
                            </p>
                            {sample.price_per_m2 > 0 && (
                              <p className="mt-1 text-[10px] text-[#706F6C]">
                                {sample.price_per_m2} € / m²
                              </p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('Retirer cet échantillon ?')) {
                                try {
                                  await fetch('/api/cart/samples', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ item_id: sample.id }),
                                  });
                                  await loadCart();
                                } catch (err) {
                                  toast.error('Erreur lors de la suppression');
                                }
                              }
                            }}
                            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-[#706F6C] opacity-0 transition-opacity hover:text-[#1A1917] group-hover:opacity-100"
                            title="Retirer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Configurations Section */}
                {cart && cart.items.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] pb-4">
                      <ShoppingBag className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Vos configurations
                      </h2>
                      <span className="ml-auto text-sm text-[#706F6C]">
                        {cart.item_count} article{cart.item_count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="divide-y divide-[#E8E6E3]">
                      {cart.items.map((item) => {
                        const isUpdating = updatingItems.has(item.configuration_id);

                        return (
                          <div key={item.id} className="py-6 first:pt-6">
                            {/* Mobile Layout */}
                            <div className="lg:hidden">
                              <div className="flex gap-4">
                                {/* Preview */}
                                <div className="h-24 w-24 flex-shrink-0 border border-[#E8E6E3] bg-[#F5F5F4]">
                                  {item.configuration.glb_url ? (
                                    <model-viewer
                                      src={item.configuration.glb_url}
                                      alt={item.configuration.name}
                                      auto-rotate
                                      camera-controls
                                      style={{ width: '100%', height: '100%' }}
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      <ShoppingBag className="h-8 w-8 text-[#C4C2BF]" />
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-[#1A1917]">
                                    {item.configuration.name}
                                  </h3>
                                  {item.configuration.config_data?.dimensions && (
                                    <p className="mt-1 text-xs text-[#706F6C]">
                                      {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                                    </p>
                                  )}
                                  <p className="mt-2 font-mono text-lg text-[#1A1917]">
                                    {item.configuration.price.toLocaleString('fr-FR')} €
                                  </p>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="mt-4 flex items-center justify-between">
                                {/* Quantity */}
                                <div className="flex items-center border border-[#E8E6E3]">
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity - 1)}
                                    disabled={isUpdating || item.quantity <= 1}
                                    className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-12 text-center font-medium text-[#1A1917]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity + 1)}
                                    disabled={isUpdating}
                                    className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4">
                                  <Link
                                    href={`/configurator/${item.configuration.model_id || 1}?mode=edit&configId=${item.configuration_id}`}
                                    className="text-sm text-[#706F6C] underline underline-offset-4 hover:text-[#1A1917]"
                                  >
                                    Modifier
                                  </Link>
                                  <button
                                    onClick={() => removeItem(item.configuration_id)}
                                    className="text-sm text-[#706F6C] underline underline-offset-4 hover:text-red-600"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>

                              {/* Subtotal */}
                              <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#E8E6E3] pt-4">
                                <span className="text-sm text-[#706F6C]">Sous-total</span>
                                <span className="font-mono text-[#1A1917]">
                                  {(item.configuration.price * item.quantity).toLocaleString('fr-FR')} €
                                </span>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
                              {/* Preview */}
                              <div className="col-span-2">
                                <div className="aspect-square border border-[#E8E6E3] bg-[#F5F5F4]">
                                  {item.configuration.glb_url ? (
                                    <model-viewer
                                      src={item.configuration.glb_url}
                                      alt={item.configuration.name}
                                      auto-rotate
                                      camera-controls
                                      style={{ width: '100%', height: '100%' }}
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      <ShoppingBag className="h-10 w-10 text-[#C4C2BF]" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Info */}
                              <div className="col-span-5">
                                <h3 className="font-medium text-[#1A1917]">
                                  {item.configuration.name}
                                </h3>
                                {item.configuration.config_data?.dimensions && (
                                  <p className="mt-2 text-sm text-[#706F6C]">
                                    Dimensions : {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                                  </p>
                                )}
                                <div className="mt-4 flex items-center gap-4">
                                  <Link
                                    href={`/configurator/${item.configuration.model_id || 1}?mode=edit&configId=${item.configuration_id}`}
                                    className="inline-flex items-center gap-2 text-sm text-[#706F6C] transition-colors hover:text-[#1A1917]"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Modifier
                                  </Link>
                                  <button
                                    onClick={() => removeItem(item.configuration_id)}
                                    className="inline-flex items-center gap-2 text-sm text-[#706F6C] transition-colors hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Retirer
                                  </button>
                                </div>
                              </div>

                              {/* Quantity */}
                              <div className="col-span-2">
                                <div className="inline-flex items-center border border-[#E8E6E3]">
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity - 1)}
                                    disabled={isUpdating || item.quantity <= 1}
                                    className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-12 text-center font-medium text-[#1A1917]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity + 1)}
                                    disabled={isUpdating}
                                    className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="col-span-3 text-right">
                                <p className="font-mono text-lg text-[#1A1917]">
                                  {item.configuration.price.toLocaleString('fr-FR')} €
                                </p>
                                {item.quantity > 1 && (
                                  <p className="mt-1 text-sm text-[#706F6C]">
                                    Total : {(item.configuration.price * item.quantity).toLocaleString('fr-FR')} €
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

                  {/* Details */}
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Sous-total</span>
                        <span className="font-mono text-[#1A1917]">{cart?.total?.toLocaleString('fr-FR') || 0} €</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#706F6C]">Livraison</span>
                        <span className="font-medium text-[#8B7355]">Offerte</span>
                      </div>
                      {samplesCart && samplesCart.count > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#706F6C]">Échantillons</span>
                          <span className={`font-medium ${samplesTotal > 0 ? 'font-mono text-[#1A1917]' : 'text-[#8B7355]'}`}>
                            {samplesTotal > 0 ? `${samplesTotal.toLocaleString('fr-FR')} €` : 'Offerts'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 border-t border-[#E8E6E3] pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1A1917]">Total</span>
                        <span className="font-mono text-2xl text-[#1A1917]">{grandTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                      <p className="mt-1 text-right text-xs text-[#706F6C]">
                        TVA incluse
                      </p>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => router.push('/checkout')}
                      className="mt-6 flex h-14 w-full items-center justify-center bg-[#1A1917] text-sm font-medium tracking-wide text-white transition-colors hover:bg-[#2D2B28]"
                    >
                      Passer commande
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>

                    <Link
                      href="/models"
                      className="mt-4 block text-center text-sm text-[#706F6C] underline underline-offset-4 transition-colors hover:text-[#1A1917]"
                    >
                      Continuer mes achats
                    </Link>
                  </div>

                  {/* Trust Indicators */}
                  <div className="border-t border-[#E8E6E3] p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                        <div>
                          <p className="text-sm font-medium text-[#1A1917]">Livraison gratuite</p>
                          <p className="text-xs text-[#706F6C]">Partout en France métropolitaine</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                        <div>
                          <p className="text-sm font-medium text-[#1A1917]">Fabrication sur mesure</p>
                          <p className="text-xs text-[#706F6C]">Dans notre atelier lillois</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                        <div>
                          <p className="text-sm font-medium text-[#1A1917]">Qualité artisanale</p>
                          <p className="text-xs text-[#706F6C]">Conçu pour durer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1A1917',
            color: '#fff',
            borderRadius: '0',
          },
        }}
      />
    </>
  );
}
