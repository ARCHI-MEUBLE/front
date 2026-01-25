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

const FacadeCartPreview = dynamic(
  () => import('@/components/facades/FacadeCartPreview'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#F5F5F4] animate-pulse" />
  }
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
    };
    hinges: {
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

export default function Cart() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [cart, setCart] = useState<CartData | null>(null);
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
  const [catalogueCart, setCatalogueCart] = useState<CatalogueCartData | null>(null);
  const [facadeCart, setFacadeCart] = useState<FacadeCartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [selectedFacade, setSelectedFacade] = useState<FacadeCartItem | null>(null);

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

      // Charger les articles du catalogue
      const catalogueResponse = await fetch('/api/cart/catalogue', {
        credentials: 'include',
      });

      if (catalogueResponse.ok) {
        const catalogueData = await catalogueResponse.json();
        setCatalogueCart(catalogueData);
      }

      // Charger les façades
      const facadeResponse = await fetch('/backend/api/cart/facades.php', {
        credentials: 'include',
      });

      if (facadeResponse.ok) {
        const facadeData = await facadeResponse.json();
        setFacadeCart(facadeData);
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

  const updateCatalogueQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      const res = await fetch('/api/cart/catalogue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: newQuantity }),
      });
      if (res.ok) {
        loadCart();
      }
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const removeCatalogueItem = async (id: number) => {
    try {
      const res = await fetch(`/api/cart/catalogue?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success("Article retiré");
        loadCart();
      }
    } catch (e) {
      toast.error("Erreur lors de la suppression");
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

  const isEmpty = (!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0) && (!catalogueCart || catalogueCart.items.length === 0) && (!facadeCart || facadeCart.items.length === 0);
  const totalItems = (cart?.item_count || 0) + (samplesCart?.count || 0) + (catalogueCart?.items?.reduce((acc, i) => acc + i.quantity, 0) || 0) + (facadeCart?.count || 0);

  const samplesTotal = samplesCart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const catalogueTotal = catalogueCart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const facadeTotal = facadeCart?.total || 0;
  const grandTotal = (cart?.total || 0) + samplesTotal + catalogueTotal + facadeTotal;
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
                {/* Catalogue Items Section */}
                {catalogueCart && catalogueCart.items.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] pb-4">
                      <ShoppingBag className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Articles du catalogue
                      </h2>
                      <span className="ml-auto text-sm text-[#706F6C]">
                        {catalogueCart.items.length} produit{catalogueCart.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {catalogueCart.items.map((item) => (
                        <div
                          key={item.id}
                          className="group relative flex items-center gap-6 border border-[#E8E6E3] bg-white p-5 transition-colors hover:border-[#1A1917]/20"
                        >
                          {/* Image */}
                          <div className="h-20 w-20 flex-shrink-0 border border-[#E8E6E3] overflow-hidden bg-[#F5F5F4]">
                            {item.variation_image || item.item_image ? (
                              <img
                                src={item.variation_image || (item.item_image as string)}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-8 w-8 text-[#C4C2BF]" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-[#1A1917]">
                              {item.name}
                            </h3>
                            {item.variation_name && (
                              <p className="mt-1 text-xs text-[#706F6C]">
                                Finition: {item.variation_name}
                              </p>
                            )}
                            <p className="mt-2 text-sm font-bold text-[#8B7355]">
                              {item.unit_price} €
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-[#E8E6E3] rounded h-9 bg-white">
                              <button
                                onClick={() => updateCatalogueQuantity(item.id, item.quantity - 1)}
                                className="px-2 text-[#706F6C] hover:text-[#1A1917]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCatalogueQuantity(item.id, item.quantity + 1)}
                                className="px-2 text-[#706F6C] hover:text-[#1A1917]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeCatalogueItem(item.id)}
                              className="text-[#706F6C] hover:text-[#1A1917]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Facades Section */}
                {facadeCart && facadeCart.items.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 border-b border-[#E8E6E3] pb-4">
                      <Package className="h-5 w-5 text-[#8B7355]" />
                      <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1917]">
                        Façades sur mesure
                      </h2>
                      <span className="ml-auto text-sm text-[#706F6C]">
                        {facadeCart.count} façade{facadeCart.count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {facadeCart.items.map((facade) => (
                        <div
                          key={facade.id}
                          className="group relative flex items-center gap-6 border border-[#E8E6E3] bg-white p-5 transition-colors hover:border-[#1A1917]/20"
                        >
                          {/* Clickable area for details */}
                          <button
                            type="button"
                            onClick={() => setSelectedFacade(facade)}
                            className="flex flex-1 items-center gap-6 text-left"
                          >
                            {/* 3D Preview */}
                            <div className="h-20 w-20 flex-shrink-0 border border-[#E8E6E3] overflow-hidden">
                              <FacadeCartPreview
                                width={facade.config.width}
                                height={facade.config.height}
                                depth={facade.config.depth}
                                colorHex={facade.config.material?.color_hex || '#CCCCCC'}
                                textureUrl={facade.config.material?.texture_url}
                                drillings={facade.config.drillings}
                              />
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-[#1A1917]">
                                Façade {facade.config.material?.name || 'Sur mesure'}
                              </h3>
                              <p className="mt-1 text-xs text-[#706F6C]">
                                {facade.config.width / 10} × {facade.config.height / 10} cm · {facade.config.depth} mm
                              </p>
                              {facade.config.hinges?.type !== 'no-hole-no-hinge' && (
                                <p className="mt-1 text-xs text-[#706F6C]">
                                  {facade.config.hinges?.count} charnières · Ouverture {facade.config.hinges?.direction === 'left' ? 'gauche' : 'droite'}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-[#8B7355] underline">Voir les détails</p>
                            </div>

                            {/* Quantity & Price */}
                            <div className="text-right">
                              <p className="font-mono text-lg text-[#1A1917]">
                                {(facade.unit_price * facade.quantity).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                              </p>
                              <p className="mt-1 text-xs text-[#706F6C]">
                                {facade.quantity > 1 ? `${facade.quantity} × ${facade.unit_price.toFixed(2)} €` : `${facade.unit_price.toFixed(2)} € / unité`}
                              </p>
                            </div>
                          </button>

                          {/* Remove button */}
                          <button
                            onClick={async () => {
                              if (confirm('Retirer cette façade ?')) {
                                try {
                                  await fetch(`/backend/api/cart/facades.php?id=${facade.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  });
                                  await loadCart();
                                  toast.success('Façade retirée');
                                } catch (err) {
                                  toast.error('Erreur lors de la suppression');
                                }
                              }
                            }}
                            className="text-[#706F6C] hover:text-[#1A1917]"
                          >
                            <Trash2 className="h-4 w-4" />
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
                      {facadeCart && facadeCart.count > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#706F6C]">Façades ({facadeCart.count})</span>
                          <span className="font-mono text-[#1A1917]">
                            {facadeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
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

      {/* Modal détails façade */}
      {selectedFacade && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedFacade(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E8E6E3] bg-white p-6">
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
                const materialObj = selectedFacade.config.material;
                const materialName = materialObj?.name || 'Matériau';
                const hinges = selectedFacade.config.hinges;
                const hingeCount = hinges?.count || 0;
                const hingeType = hinges?.type || '';
                const hingeSide = hinges?.direction || '';
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
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1A1917]">
                              {hingeType === 'no-hole-no-hinge' && 'Sans trou, sans charnière'}
                              {hingeType === 'hole-with-applied-hinge' && 'Trou + charnière fournie porte en applique'}
                              {hingeType === 'hole-with-twin-hinge' && 'Trou + charnière fournie porte jumelée'}
                              {hingeType === 'hole-with-integrated-hinge' && 'Trou + charnière fournie porte encastrée'}
                            </p>
                            {hingeType !== 'no-hole-no-hinge' && hingeCount > 0 && (
                              <p className="text-xs text-[#706F6C] mt-1">
                                {hingeCount} charnières · Ouverture {hingeSide === 'left' ? 'gauche' : hingeSide === 'right' ? 'droite' : hingeSide}
                              </p>
                            )}
                            <p className="text-xs text-[#8B7355] mt-1">
                              Prix unit. {hingeType === 'no-hole-no-hinge' ? '0.00' : '34.20'} € TTC
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
                                  <span className="text-[#1A1917]">+{drill.price.toFixed(2)} €</span>
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
            <div className="sticky bottom-0 border-t border-[#E8E6E3] bg-white p-6">
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
