import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from "@/components/Footer";
import { CheckCircle, Package, MapPin, CreditCard, ArrowRight } from 'lucide-react';

interface OrderItem {
  configuration_id: number;
  name: string;
  quantity: number;
  price: number;
}

interface OrderSample {
  id: number;
  sample_name: string;
  material: string;
  hex: string | null;
  image_url: string | null;
}

interface OrderCatalogueItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
  samples: OrderSample[];
  catalogue_items: OrderCatalogueItem[];
}

export default function OrderConfirmation() {
  const router = useRouter();
  const { order_id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order_id) return;

    const loadOrder = async () => {
      try {
        const response = await fetch(`/backend/api/orders/list.php?id=${order_id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Commande non trouvée');
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [order_id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
          <p className="mt-4 text-sm text-[#6B6560]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-5">
          <div className="text-center">
            <h1 className="font-serif text-2xl text-[#1A1917]">Erreur</h1>
            <p className="mt-3 text-[#6B6560]">{error || 'Commande non trouvée'}</p>
            <Link
              href="/Archimeuble/front/public"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#8B7355] hover:underline"
            >
              Retour à l'accueil
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isSamplesOnly = order.total === 0 && order.samples && order.samples.length > 0;
  const hasConfigurations = order.items && order.items.length > 0;
  const hasCatalogueItems = order.catalogue_items && order.catalogue_items.length > 0;
  const hasSamples = order.samples && order.samples.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Commande confirmée - ArchiMeuble</title>
      </Head>
      <Header />

      <main className="flex-1 px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Success Header */}
          <div className="mb-12 text-center sm:mb-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-[#059669]/10 sm:h-20 sm:w-20">
              <CheckCircle className="h-8 w-8 text-[#059669] sm:h-10 sm:w-10" />
            </div>
            <h1 className="font-serif text-2xl text-[#1A1917] sm:text-3xl lg:text-4xl">
              {isSamplesOnly ? 'Échantillons commandés !' : 'Commande confirmée !'}
            </h1>
            <p className="mt-3 text-[#6B6560]">
              Commande <span className="font-medium text-[#1A1917]">#{order.order_number}</span>
            </p>
            <p className="mt-2 text-sm text-[#6B6560]">
              {isSamplesOnly
                ? 'Vos échantillons gratuits vont être préparés et expédiés.'
                : hasConfigurations
                ? 'Merci pour votre commande. Nous avons bien reçu votre demande et nous allons commencer la production de vos meubles sur mesure.'
                : 'Merci pour votre commande ! Nous préparons vos articles pour l\'expédition.'}
            </p>
          </div>

          {/* Info Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {/* Shipping Address */}
            <div className="bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[#F5F3F0]">
                  <MapPin className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                </div>
                <h2 className="font-medium text-[#1A1917]">Livraison</h2>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#6B6560]">
                {order.shipping_address}
              </p>
            </div>

            {/* Payment Info */}
            <div className="bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[#F5F3F0]">
                  <CreditCard className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                </div>
                <h2 className="font-medium text-[#1A1917]">Paiement</h2>
              </div>
              <div className="space-y-2 text-sm text-[#6B6560]">
                <p>
                  Méthode:{' '}
                  <span className="font-medium text-[#1A1917]">
                    {order.payment_method === 'free_samples' ? 'Gratuit' : 'Carte bancaire'}
                  </span>
                </p>
                <p>
                  Statut:{' '}
                  <span className={`font-medium ${order.payment_status === 'paid' ? 'text-[#059669]' : 'text-[#8B7355]'}`}>
                    {order.payment_status === 'paid' ? 'Payé' : 'En attente'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          {(hasConfigurations || hasCatalogueItems) && (
            <div className="mb-8 bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[#F5F3F0]">
                  <Package className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                </div>
                <h2 className="font-medium text-[#1A1917]">Articles</h2>
              </div>
              <div className="divide-y divide-[#E8E4DE]">
                {/* Configurations */}
                {order.items && order.items.length > 0 ? order.items.map((item, index) => (
                  <div key={`config-${index}`} className="flex items-start justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <h3 className="font-medium text-[#1A1917]">{item.name || 'Configuration'}</h3>
                      <p className="mt-1 text-sm text-[#6B6560]">Meuble sur mesure • Qté: {item.quantity || 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#1A1917]">{((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')}€</p>
                      <p className="text-sm text-[#6B6560]">{(item.price || 0).toLocaleString('fr-FR')}€ × {item.quantity || 1}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-sm text-[#6B6560]">Aucun article dans cette commande</div>
                )}

                {/* Catalogue Items */}
                {order.catalogue_items && order.catalogue_items.length > 0 && order.catalogue_items.map((item, index) => (
                  <div key={`catalogue-${index}`} className="flex items-start justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <h3 className="font-medium text-[#1A1917]">{item.name || 'Article catalogue'}</h3>
                      <p className="mt-1 text-sm text-[#6B6560]">Article catalogue • Qté: {item.quantity || 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#1A1917]">{((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')}€</p>
                      <p className="text-sm text-[#6B6560]">{(item.price || 0).toLocaleString('fr-FR')}€ × {item.quantity || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Samples */}
          {order.samples && order.samples.length > 0 && (
            <div className="mb-8 border-2 border-[#059669]/20 bg-[#059669]/5 p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-xl">🎨</span>
                <h2 className="font-medium text-[#1A1917]">Échantillons gratuits</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {order.samples.map((sample) => (
                  <div key={sample.id} className="flex items-center gap-3 bg-white p-3">
                    <div
                      className="h-10 w-10 flex-shrink-0 border border-[#059669]/30"
                      style={{ backgroundColor: sample.hex || '#EEE' }}
                    >
                      {sample.image_url && (
                        <img
                          src={sample.image_url}
                          alt={sample.sample_name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1A1917]">{sample.sample_name}</p>
                      <p className="text-xs text-[#6B6560]">{sample.material}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="mb-8 border-t-2 border-[#1A1917] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-[#1A1917]">Total</span>
              <span className="font-serif text-2xl text-[#1A1917]">
                {isSamplesOnly ? 'Gratuit' : `${order.total}€`}
              </span>
            </div>
            {isSamplesOnly && (
              <p className="mt-2 text-right text-sm text-[#059669]">
                Échantillons offerts - Livraison gratuite
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/my-orders"
              className="flex items-center justify-center gap-2 bg-[#1A1917] px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
            >
              Voir mes commandes
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/Archimeuble/front/public"
              className="flex items-center justify-center gap-2 border border-[#E8E4DE] bg-white px-6 py-4 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F3F0]"
            >
              Retour à l'accueil
            </Link>
          </div>

          {/* Next Steps */}
          <div className="mt-12 bg-white p-5 sm:p-6">
            <h3 className="mb-4 font-medium text-[#1A1917]">Prochaines étapes</h3>
            <ul className="space-y-3 text-sm text-[#6B6560]">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#059669]">✓</span>
                <span>Email de confirmation envoyé à votre adresse</span>
              </li>
                  {isSamplesOnly ? (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Préparation sous 24-48h</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Livraison gratuite sous 3-5 jours ouvrés</span>
                      </li>
                    </>
                  ) : hasConfigurations ? (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Mise en production de votre commande</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Notifications à chaque étape de fabrication</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Préparation de vos articles pour l'expédition</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 text-[#059669]">✓</span>
                        <span>Notification lors de l'envoi de votre colis</span>
                      </li>
                    </>
                  )}
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#059669]">✓</span>
                <span>Suivi disponible dans "Mes commandes"</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
