import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Trash2, Edit } from 'lucide-react';

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
      alert(`❌ ${err.message}`);
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
      alert('✅ Article retiré du panier');
    } catch (err: any) {
      alert(`❌ ${err.message}`);
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
      alert('✅ Panier vidé');
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mon Panier - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-text-secondary">Chargement du panier...</p>
          </div>
        </div>
      </>
    );
  }

  const isEmpty = (!cart || cart.items.length === 0) && (!samplesCart || samplesCart.items.length === 0);
  const totalItems = (cart?.item_count || 0) + (samplesCart?.count || 0);

  return (
    <>
      <Head>
        <title>Mon Panier - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-bg-light">
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Panier' }
            ]}
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Mon Panier
              </h1>
              {!isEmpty && (
                <p className="mt-1 text-sm text-text-secondary">
                  {totalItems} article{totalItems > 1 ? 's' : ''} dans votre panier
                  {samplesCart && samplesCart.count > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      ({samplesCart.count} échantillon{samplesCart.count > 1 ? 's' : ''} gratuit{samplesCart.count > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        {isEmpty ? (
          <div className="text-center py-12 card">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Votre panier est vide
            </h3>
            <p className="text-text-secondary mb-6">
              Créez votre première configuration de meuble
            </p>
            <Link
              href="/models"
              className="btn-primary inline-flex"
            >
              Créer une configuration
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Liste des articles */}
            <div className="lg:col-span-2 space-y-6">
              {/* Échantillons */}
              {samplesCart && samplesCart.items.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <span>🎨</span>
                    <span>Échantillons gratuits ({samplesCart.count})</span>
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {samplesCart.items.map((sample) => (
                      <div key={sample.id} className="card p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-20 w-20 rounded-xl border border-border-light flex-shrink-0"
                            style={{ backgroundColor: sample.image_url ? undefined : (sample.hex || '#EEE') }}
                          >
                            {sample.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sample.image_url}
                                alt={sample.color_name}
                                className="h-full w-full object-cover rounded-xl"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-text-primary truncate">
                              {sample.color_name}
                            </h3>
                            <p className="text-xs text-text-secondary mt-1">
                              {sample.material}
                            </p>
                            <p className="text-xs font-medium text-green-600 mt-2">
                              Gratuit
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
                                  alert('Erreur lors de la suppression');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-700 p-2"
                            title="Retirer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configurations */}
              {cart && cart.items.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-text-primary">
                    Meubles configurés ({cart.item_count})
                  </h2>
                  {cart.items.map((item) => {
                const isUpdating = updatingItems.has(item.configuration_id);

                return (
                  <div
                    key={item.id}
                    className="card p-6"
                  >
                    <div className="flex gap-6">
                      {/* Preview 3D */}
                      <div className="flex-shrink-0 w-32 h-32 bg-gradient-to-br from-bg-light to-border-light rounded-lg flex items-center justify-center">
                        {item.configuration.glb_url ? (
                          <model-viewer
                            src={item.configuration.glb_url}
                            alt={item.configuration.name}
                            auto-rotate
                            camera-controls
                            style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
                          />
                        ) : (
                          <div className="text-4xl">🪑</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-text-primary">
                              {item.configuration.name}
                            </h3>
                            {item.configuration.config_data && item.configuration.config_data.dimensions && (
                              <p className="text-sm text-text-secondary mt-1">
                                {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                              </p>
                            )}
                          </div>
                          <p className="text-xl font-bold text-text-primary">
                            {item.configuration.price}€
                          </p>
                        </div>

                        {/* Contrôles quantité */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.configuration_id, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                              className="w-8 h-8 rounded-lg bg-bg-light hover:bg-border-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-text-primary"
                            >
                              −
                            </button>
                            <span className="w-12 text-center font-semibold text-text-primary">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.configuration_id, item.quantity + 1)}
                              disabled={isUpdating}
                              className="w-8 h-8 rounded-lg bg-bg-light hover:bg-border-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-text-primary"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex-grow"></div>

                          <div className="flex items-center gap-3">
                            <Link
                              href={`/configurator/${item.configuration.model_id || 1}?mode=edit&configId=${item.configuration_id}`}
                              className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Modifier
                            </Link>

                            <button
                              onClick={() => removeItem(item.configuration_id)}
                              className="text-error hover:text-error text-sm font-medium flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Retirer
                            </button>
                          </div>
                        </div>

                        {/* Sous-total */}
                        <div className="mt-3 pt-3 border-t border-border-light">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-text-secondary">Sous-total:</span>
                            <span className="text-lg font-semibold text-text-primary">
                              {item.configuration.price * item.quantity}€
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bouton vider le panier */}
              <button
                onClick={clearCart}
                className="w-full py-3 text-error hover:text-error text-sm font-medium"
              >
                Vider le panier
              </button>
                </div>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-4">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Récapitulatif
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-text-secondary">
                    <span>Sous-total</span>
                    <span className="font-semibold">{cart.total}€</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Livraison</span>
                    <span className="font-semibold text-success">Gratuite</span>
                  </div>
                  <div className="border-t border-border-light pt-3">
                    <div className="flex justify-between text-lg font-bold text-text-primary">
                      <span>Total</span>
                      <span>{cart.total}€</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  className="btn-primary w-full"
                >
                  Commander ({cart.total}€)
                </button>

                <div className="mt-4 text-center">
                  <Link
                    href="/models"
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    ← Créer une autre configuration
                  </Link>
                </div>

                {/* Infos supplémentaires */}
                <div className="mt-6 pt-6 border-t border-border-light space-y-2 text-sm text-text-secondary">
                  <div className="flex items-start gap-2">
                    <span>✅</span>
                    <span>Livraison gratuite en France</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>✅</span>
                    <span>Fabrication sur mesure</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>✅</span>
                    <span>Garantie 2 ans</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
  );
}
