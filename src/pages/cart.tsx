import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { Header } from '@/components/Header';
import { Trash2, Edit, ShoppingBag, Package, Truck, Shield, ArrowRight, Minus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayColorName, displayMaterialName } from '@/lib/displayNames';
import { formatPrice } from '@/lib/format';
import { countCartItems, notifyCartChanged } from '@/lib/cartCount';
import { fetchCartShipping, shippingLines, type CartShipping } from '@/lib/shippingApi';
import { cartTotals, isTrueFlag, sumItems, toAmount } from '@/lib/orderTotals';
import FacadeDetailsModal from '@/components/facades/FacadeDetailsModal';
import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
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
    // Configurations enregistrées avant que la livraison sorte du prix : leur prix la comprend déjà
    price_includes_delivery?: boolean | string;
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
  const { customer, isAuthenticated, isLoading: authLoading, requireIdentity } = useCustomer();

  const [cart, setCart] = useState<CartData | null>(null);
  const [samplesCart, setSamplesCart] = useState<SamplesCartData | null>(null);
  const [catalogueCart, setCatalogueCart] = useState<CatalogueCartData | null>(null);
  const [facadeCart, setFacadeCart] = useState<FacadeCartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [selectedFacade, setSelectedFacade] = useState<FacadeCartItem | null>(null);
  // Frais de livraison calculés par le serveur ; null tant qu'ils ne sont pas connus, shippingError s'ils n'ont pas pu
  // être chargés (le total s'affiche alors hors livraison)
  const [shipping, setShipping] = useState<CartShipping | null>(null);
  const [shippingError, setShippingError] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Sans email confirmé, aucun panier n'est rattaché au visiteur : on lui propose de le retrouver avec un code
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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

      // Livraison : relue à chaque changement du panier (elle dépend des meubles et du montant des autres articles)
      try {
        setShipping(await fetchCartShipping());
        setShippingError(false);
      } catch (shippingErr) {
        console.warn('Frais de livraison indisponibles :', shippingErr instanceof Error ? shippingErr.message : shippingErr);
        setShipping(null);
        setShippingError(true);
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

  const totalItems = countCartItems({ configurations: cart, samples: samplesCart, catalogue: catalogueCart, facades: facadeCart });

  // Le compteur du header suit les ajouts et retraits faits sur cette page
  useEffect(() => {
    if (isAuthenticated && !isLoading) notifyCartChanged(totalItems);
  }, [isAuthenticated, isLoading, totalItems]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mon Panier - ArchiMeuble</title>
          <meta name="robots" content="noindex" />
        </Head>
        <Header />
        <div className="min-h-screen bg-am-paper">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin border-2 border-black/10 border-t-am-navy" />
              <p className="mt-6 text-sm text-black/65">Chargement du panier...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isEmpty = (!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0) && (!catalogueCart || catalogueCart.items.length === 0) && (!facadeCart || facadeCart.items.length === 0);

  // Total = articles (meubles, façades, catalogue, échantillons) + livraison calculée par le serveur
  const hasFurniture = (cart?.items.length ?? 0) > 0;
  const hasParcelItems =
    (samplesCart?.items.length ?? 0) > 0 || (catalogueCart?.items.length ?? 0) > 0 || (facadeCart?.items.length ?? 0) > 0;
  const furnitureDeliveryIncluded =
    hasFurniture && cart!.items.every((item) => isTrueFlag(item.configuration.price_includes_delivery));
  const lines = shipping ? shippingLines(shipping, { hasFurniture, hasParcelItems, furnitureDeliveryIncluded }) : [];
  const totals = cartTotals(
    {
      furniture: toAmount(cart?.total),
      facades: toAmount(facadeCart?.total),
      catalogue: sumItems(catalogueCart?.items, (item) => item.unit_price, (item) => item.quantity),
      samples: sumItems(samplesCart?.items, (item) => item.unit_price, (item) => item.quantity),
    },
    shipping ? lines.reduce((sum, line) => sum + line.amount, 0) : null,
  );

  return (
    <>
      <Head>
        <title>Mon Panier - ArchiMeuble</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Header />

      <div className="min-h-screen bg-am-paper">
        {/* Hero Header */}
        <div className="border-b border-black/10 bg-am-paper">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-heading text-black">
                  Mon Panier
                </h1>
                {!isEmpty && (
                  <p className="mt-3 text-black/65">
                    {totalItems} article{totalItems > 1 ? 's' : ''} dans votre panier
                    {samplesCart && samplesCart.count > 0 && (
                      <span className="ml-2 text-am-navy">
                        · {samplesCart.count} échantillon{samplesCart.count > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {!isEmpty && cart && cart.items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-black/65 underline underline-offset-4 transition-colors hover:text-black"
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
              <div className="mx-auto flex h-20 w-20 items-center justify-center border border-black/10 bg-white">
                <ShoppingBag className="h-8 w-8 text-black/65" />
              </div>
              {isAuthenticated ? (
                <>
                  <h2 className="mt-8 text-2xl text-black">
                    Votre panier est vide
                  </h2>
                  <p className="mt-3 text-black/65">
                    Échantillons, façades et produits de la boutique s&apos;ajoutent ici. Un meuble sur mesure se valide avec un menuisier depuis le configurateur.
                  </p>
                  <Link
                    href="/catalogue"
                    className="mt-8 inline-flex h-12 items-center justify-center bg-am-navy px-8 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  >
                    Découvrir la boutique
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <p className="mt-5 text-sm text-black/65">
                    <Link href="/samples" className="underline underline-offset-4 transition-colors hover:text-black">Commander des échantillons</Link>
                    {' · '}
                    <Link href="/facades" className="underline underline-offset-4 transition-colors hover:text-black">Configurer des façades</Link>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-8 text-2xl text-black">
                    Retrouvez votre panier
                  </h2>
                  <p className="mt-3 text-black/65">
                    Votre panier est enregistré avec votre adresse e-mail. Confirmez-la avec le code que nous vous envoyons pour le retrouver.
                  </p>
                  <button
                    type="button"
                    onClick={() => void requireIdentity()}
                    className="mt-8 inline-flex h-12 items-center justify-center bg-am-navy px-8 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  >
                    Retrouver mon panier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                  <p className="mt-5 text-sm text-black/65">
                    <Link href="/catalogue" className="underline underline-offset-4 transition-colors hover:text-black">Découvrir la boutique</Link>
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Cart Content */
            <div className="lg:grid lg:grid-cols-12 lg:gap-12">
              {/* Items List */}
              <div className="lg:col-span-7 xl:col-span-8">
                {/* Catalogue Items Section */}
                {catalogueCart && catalogueCart.items.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 border-b border-black/10 pb-4">
                      <ShoppingBag className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Articles du catalogue
                      </h2>
                      <span className="ml-auto text-sm text-black/65">
                        {catalogueCart.items.length} produit{catalogueCart.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {catalogueCart.items.map((item) => (
                        <div
                          key={item.id}
                          className="group relative flex items-center gap-6 border border-black/10 bg-white p-5 transition-colors hover:border-am-navy/20"
                        >
                          {/* Image */}
                          <div className="h-20 w-20 flex-shrink-0 border border-black/10 overflow-hidden bg-am-mist/15">
                            {item.variation_image || item.item_image ? (
                              <img
                                src={item.variation_image || (item.item_image as string)}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-8 w-8 text-black/30" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-black">
                              {item.name}
                            </h3>
                            {item.variation_name && (
                              <p className="mt-1 text-xs text-black/65">
                                Finition: {item.variation_name}
                              </p>
                            )}
                            <p className="mt-2 text-sm font-semibold text-am-navy">
                              {formatPrice(item.unit_price)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-black/10 rounded h-9 bg-white">
                              <button
                                onClick={() => updateCatalogueQuantity(item.id, item.quantity - 1)}
                                className="px-2 text-black/65 hover:text-black"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCatalogueQuantity(item.id, item.quantity + 1)}
                                className="px-2 text-black/65 hover:text-black"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeCatalogueItem(item.id)}
                              className="text-black/65 hover:text-black"
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
                    <div className="flex items-center gap-3 border-b border-black/10 pb-4">
                      <Package className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Échantillons
                      </h2>
                      <span className="ml-auto text-sm text-black/65">
                        {samplesCart.count} article{samplesCart.count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {samplesCart.items.map((sample) => (
                        <div
                          key={sample.id}
                          className="group relative flex items-center gap-4 border border-black/10 bg-white p-4 transition-colors hover:border-am-navy/20"
                        >
                          <div
                            className="h-16 w-16 flex-shrink-0 border border-black/10"
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
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-medium text-black">
                              {displayColorName(sample.color_name)}
                            </h3>
                            <p className="mt-1 text-xs text-black/65">
                              {displayMaterialName(sample.material)}
                            </p>
                            <p className="mt-2 text-xs font-medium text-am-navy">
                              {toAmount(sample.unit_price) > 0 ? formatPrice(sample.unit_price) : 'Gratuit'}
                            </p>
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
                            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-black/65 opacity-0 transition-opacity hover:text-black group-hover:opacity-100"
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
                    <div className="flex items-center gap-3 border-b border-black/10 pb-4">
                      <Package className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Façades sur mesure
                      </h2>
                      <span className="ml-auto text-sm text-black/65">
                        {facadeCart.count} façade{facadeCart.count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {facadeCart.items.map((facade) => (
                        <div
                          key={facade.id}
                          className="group relative flex items-center gap-6 border border-black/10 bg-white p-5 transition-colors hover:border-am-navy/20"
                        >
                          {/* Clickable area for details */}
                          <button
                            type="button"
                            onClick={() => setSelectedFacade(facade)}
                            className="flex flex-1 items-center gap-6 text-left"
                          >
                            {/* 3D Preview */}
                            <div className="h-20 w-20 flex-shrink-0 border border-black/10 overflow-hidden">
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
                              <h3 className="font-medium text-black">
                                Façade {displayColorName(facade.config.material?.name) || 'Sur mesure'}
                              </h3>
                              <p className="mt-1 text-xs text-black/65">
                                {facade.config.width / 10} × {facade.config.height / 10} cm · {facade.config.depth} mm
                              </p>
                              {facade.config.hinges?.type !== 'no-hole-no-hinge' && (
                                <p className="mt-1 text-xs text-black/65">
                                  {facade.config.hinges?.count} charnières · Ouverture {facade.config.hinges?.direction === 'left' ? 'gauche' : 'droite'}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-am-navy underline">Voir les détails</p>
                            </div>

                            {/* Quantity & Price */}
                            <div className="text-right">
                              <p className="font-mono text-lg text-black">
                                {formatPrice(facade.unit_price * facade.quantity)}
                              </p>
                              <p className="mt-1 text-xs text-black/65">
                                {facade.quantity > 1 ? `${facade.quantity} × ${formatPrice(facade.unit_price)}` : `${formatPrice(facade.unit_price)} / unité`}
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
                            className="text-black/65 hover:text-black"
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
                    <div className="flex items-center gap-3 border-b border-black/10 pb-4">
                      <ShoppingBag className="h-5 w-5 text-am-navy" />
                      <h2 className="eyebrow-lg text-black">
                        Vos configurations
                      </h2>
                      <span className="ml-auto text-sm text-black/65">
                        {cart.item_count} article{cart.item_count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="divide-y divide-black/10">
                      {cart.items.map((item) => {
                        const isUpdating = updatingItems.has(item.configuration_id);

                        return (
                          <div key={item.id} className="py-6 first:pt-6">
                            {/* Mobile Layout */}
                            <div className="lg:hidden">
                              <div className="flex gap-4">
                                {/* Preview */}
                                <div className="h-24 w-24 flex-shrink-0 border border-black/10 bg-am-mist/15">
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
                                      <ShoppingBag className="h-8 w-8 text-black/30" />
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-black">
                                    {item.configuration.name}
                                  </h3>
                                  {item.configuration.config_data?.dimensions && (
                                    <p className="mt-1 text-xs text-black/65">
                                      {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                                    </p>
                                  )}
                                  <p className="mt-2 font-mono text-lg text-black">
                                    {formatPrice(item.configuration.price)}
                                  </p>
                                  {isTrueFlag(item.configuration.price_includes_delivery) && (
                                    <p className="mt-1 text-xs text-black/65">Livraison comprise</p>
                                  )}
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="mt-4 flex items-center justify-between">
                                {/* Quantity */}
                                <div className="flex items-center border border-black/10">
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity - 1)}
                                    disabled={isUpdating || item.quantity <= 1}
                                    className="flex h-10 w-10 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-12 text-center font-medium text-black">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity + 1)}
                                    disabled={isUpdating}
                                    className="flex h-10 w-10 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4">
                                  <Link
                                    href={`/configurator/${item.configuration.model_id || 1}?mode=edit&configId=${item.configuration_id}`}
                                    className="text-sm text-black/65 underline underline-offset-4 hover:text-black"
                                  >
                                    Modifier
                                  </Link>
                                  <button
                                    onClick={() => removeItem(item.configuration_id)}
                                    className="text-sm text-black/65 underline underline-offset-4 hover:text-red-600"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>

                              {/* Subtotal */}
                              <div className="mt-4 flex items-center justify-between border-t border-dashed border-black/10 pt-4">
                                <span className="text-sm text-black/65">Sous-total</span>
                                <span className="font-mono text-black">
                                  {formatPrice(item.configuration.price * item.quantity)}
                                </span>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
                              {/* Preview */}
                              <div className="col-span-2">
                                <div className="aspect-square border border-black/10 bg-am-mist/15">
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
                                      <ShoppingBag className="h-10 w-10 text-black/30" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Info */}
                              <div className="col-span-5">
                                <h3 className="font-medium text-black">
                                  {item.configuration.name}
                                </h3>
                                {item.configuration.config_data?.dimensions && (
                                  <p className="mt-2 text-sm text-black/65">
                                    Dimensions : {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                                  </p>
                                )}
                                <div className="mt-4 flex items-center gap-4">
                                  <Link
                                    href={`/configurator/${item.configuration.model_id || 1}?mode=edit&configId=${item.configuration_id}`}
                                    className="inline-flex items-center gap-2 text-sm text-black/65 transition-colors hover:text-black"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Modifier
                                  </Link>
                                  <button
                                    onClick={() => removeItem(item.configuration_id)}
                                    className="inline-flex items-center gap-2 text-sm text-black/65 transition-colors hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Retirer
                                  </button>
                                </div>
                              </div>

                              {/* Quantity */}
                              <div className="col-span-2">
                                <div className="inline-flex items-center border border-black/10">
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity - 1)}
                                    disabled={isUpdating || item.quantity <= 1}
                                    className="flex h-10 w-10 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-12 text-center font-medium text-black">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.configuration_id, item.quantity + 1)}
                                    disabled={isUpdating}
                                    className="flex h-10 w-10 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="col-span-3 text-right">
                                <p className="font-mono text-lg text-black">
                                  {formatPrice(item.configuration.price)}
                                </p>
                                {isTrueFlag(item.configuration.price_includes_delivery) && (
                                  <p className="mt-1 text-xs text-black/65">Livraison comprise</p>
                                )}
                                {item.quantity > 1 && (
                                  <p className="mt-1 text-sm text-black/65">
                                    Total : {formatPrice(item.configuration.price * item.quantity)}
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
                <div className="sticky top-6 border border-black/10 bg-white">
                  {/* Header */}
                  <div className="border-b border-black/10 p-6">
                    <h2 className="text-xl text-black">
                      Récapitulatif
                    </h2>
                  </div>

                  {/* Details */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {hasFurniture && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black/65">Meubles sur mesure</span>
                          <span className="font-mono text-black">{formatPrice(totals.furniture)}</span>
                        </div>
                      )}
                      {facadeCart && facadeCart.count > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black/65">Façades ({facadeCart.count})</span>
                          <span className="font-mono text-black">
                            {formatPrice(totals.facades)}
                          </span>
                        </div>
                      )}
                      {catalogueCart && catalogueCart.items.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black/65">Articles du catalogue</span>
                          <span className="font-mono text-black">{formatPrice(totals.catalogue)}</span>
                        </div>
                      )}
                      {samplesCart && samplesCart.count > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black/65">Échantillons</span>
                          <span className={`font-medium ${totals.samples > 0 ? 'font-mono text-black' : 'text-am-navy'}`}>
                            {totals.samples > 0 ? formatPrice(totals.samples) : 'Offerts'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-dashed border-black/10 pt-4 text-sm">
                        <span className="text-black/65">Sous-total articles</span>
                        <span className="font-mono text-black">{formatPrice(totals.items)}</span>
                      </div>
                      {lines.map((line) => (
                        <div key={line.key} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-black/65">{line.label}</span>
                            <span className={line.amount > 0 ? 'font-mono text-black' : 'font-medium text-am-navy'}>{line.value}</span>
                          </div>
                          {line.note && <p className="mt-0.5 text-right text-xs text-black/65">{line.note}</p>}
                        </div>
                      ))}
                      {!shipping && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black/65">Livraison</span>
                          <span className="text-black/65">{shippingError ? 'Calculée à la commande' : '…'}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 border-t border-black/10 pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-black">{shipping ? 'Total' : 'Total hors livraison'}</span>
                        <span className="font-mono text-2xl text-black">{formatPrice(totals.total)}</span>
                      </div>
                      <p className="mt-1 text-right text-xs text-black/65">
                        TVA incluse
                      </p>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => router.push('/checkout')}
                      className="mt-6 flex h-14 w-full items-center justify-center bg-am-navy text-sm font-medium tracking-wide text-white transition-colors hover:bg-am-navy/90"
                    >
                      Passer commande
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>

                    <Link
                      href="/models"
                      className="mt-4 block text-center text-sm text-black/65 underline underline-offset-4 transition-colors hover:text-black"
                    >
                      Continuer mes achats
                    </Link>
                  </div>

                  {/* Trust Indicators */}
                  <div className="border-t border-black/10 p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-am-navy" />
                        <div>
                          <p className="text-sm font-medium text-black">Livraison à domicile</p>
                          <p className="text-xs text-black/65">Partout en France métropolitaine, frais détaillés ci-dessus</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-am-navy" />
                        <div>
                          <p className="text-sm font-medium text-black">Fabrication sur mesure</p>
                          <p className="text-xs text-black/65">Dans notre atelier lillois</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-am-navy" />
                        <div>
                          <p className="text-sm font-medium text-black">Qualité artisanale</p>
                          <p className="text-xs text-black/65">Conçu pour durer</p>
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
            background: 'var(--am-navy)',
            color: '#fff',
            borderRadius: '0',
          },
        }}
      />

      {/* Modal détails façade */}
      {selectedFacade && <FacadeDetailsModal facade={selectedFacade} onClose={() => setSelectedFacade(null)} />}
    </>
  );
}

// Lu par _app.tsx : seule cette page affiche des <model-viewer>, le script du composant n'est chargé que pour elle
Cart.needsModelViewer = true;
