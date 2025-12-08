import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CheckCircle, Package, MapPin, CreditCard } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-text-secondary mb-8">{error || 'Commande non trouvée'}</p>
          <Link href="/" className="text-primary hover:underline">
            Retour à l'accueil
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isSamplesOnly = order.total === 0 && order.samples && order.samples.length > 0;

  return (
    <div className="min-h-screen bg-surface">
      <Head>
        <title>Commande confirmée - ArchiMeuble</title>
      </Head>
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="font-serif text-4xl text-ink mb-4">
            {isSamplesOnly ? 'Échantillons commandés !' : 'Commande confirmée !'}
          </h1>
          <p className="text-lg text-text-secondary mb-2">
            Commande <span className="font-semibold text-ink">#{order.order_number}</span>
          </p>
          {isSamplesOnly ? (
            <p className="text-text-secondary">
              Vos échantillons gratuits vont être préparés et expédiés dans les plus brefs délais.
            </p>
          ) : (
            <p className="text-text-secondary">
              Merci pour votre commande ! Vous allez recevoir un email de confirmation.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Informations de livraison */}
          <div className="bg-white p-6 rounded-lg border border-border-light">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-ink">Adresse de livraison</h2>
            </div>
            <p className="text-text-secondary whitespace-pre-line">
              {order.shipping_address}
            </p>
          </div>

          {/* Informations de paiement */}
          <div className="bg-white p-6 rounded-lg border border-border-light">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-ink">Paiement</h2>
            </div>
            <div className="space-y-2 text-text-secondary">
              <p>
                Méthode: <span className="font-medium text-ink">
                  {order.payment_method === 'free_samples' ? 'Gratuit (échantillons)' : 'Carte bancaire'}
                </span>
              </p>
              <p>
                Statut: <span className={`font-medium ${
                  order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {order.payment_status === 'paid' ? 'Payé' : 'En attente'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Articles commandés */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-border-light mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-ink">Articles commandés</h2>
            </div>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start pb-4 border-b border-border-light last:border-0">
                  <div className="flex-1">
                    <h3 className="font-medium text-ink">{item.name}</h3>
                    <p className="text-sm text-text-secondary">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{item.price * item.quantity}€</p>
                    <p className="text-sm text-text-secondary">{item.price}€ × {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Échantillons commandés */}
        {order.samples && order.samples.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🎨</span>
              <h2 className="text-lg font-semibold text-ink">Échantillons gratuits</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {order.samples.map((sample) => (
                <div key={sample.id} className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-green-300 flex-shrink-0"
                      style={{ backgroundColor: sample.hex || '#EEE' }}
                    >
                      {sample.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sample.image_url}
                          alt={sample.sample_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-ink text-sm truncate">{sample.sample_name}</h4>
                      <p className="text-xs text-text-secondary">{sample.material}</p>
                      <p className="text-xs text-green-700 font-semibold">Gratuit</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-white p-6 rounded-lg border border-border-light mb-8">
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-ink">Total</span>
            <span className="text-ink">
              {isSamplesOnly ? 'Gratuit' : `${order.total}€`}
            </span>
          </div>
          {isSamplesOnly && (
            <p className="text-sm text-green-600 mt-2 text-right">
              Échantillons offerts - Aucun frais de port
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/my-orders"
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            Voir mes commandes
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-ink border border-border-light rounded-lg font-semibold hover:bg-bg-light transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-ink mb-3">Prochaines étapes</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Vous recevrez un email de confirmation à l'adresse enregistrée</span>
            </li>
            {isSamplesOnly ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Vos échantillons seront préparés sous 24-48h</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Livraison gratuite à l'adresse indiquée sous 3-5 jours ouvrés</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Votre commande sera préparée et mise en production</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Vous serez notifié à chaque étape (production, expédition, livraison)</span>
                </li>
              </>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Suivez votre commande dans votre espace "Mes commandes"</span>
            </li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
