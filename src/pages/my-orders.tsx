import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';

interface OrderItem {
  id: number;
  configuration_id: number;
  quantity: number;
  added_at: string;
  configuration: {
    id: number;
    name: string;
    prompt: string;
    price: number;
    glb_url: string;
    thumbnail_url?: string;
    config_data?: any;
    created_at: string;
  };
  // Champs ajoutés par formatForFrontend du backend
  price?: number;
  name?: string;
  production_status?: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number; // Le backend renvoie 'total', pas 'total_amount'
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_LABELS: { [key: string]: { label: string; color: string; icon: string } } = {
  pending: { label: 'En attente', color: 'bg-warning-light text-warning', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'bg-info-light text-info', icon: '✅' },
  in_production: { label: 'En production', color: 'bg-warning-light text-warning', icon: '🔨' },
  shipped: { label: 'Expédiée', color: 'bg-info-light text-info', icon: '🚚' },
  delivered: { label: 'Livrée', color: 'bg-success-light text-success', icon: '📦' },
  cancelled: { label: 'Annulée', color: 'bg-error-light text-error', icon: '❌' }
};

const PAYMENT_STATUS_LABELS: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'En attente', color: 'text-warning' },
  paid: { label: 'Payé', color: 'text-success' },
  failed: { label: 'Échec', color: 'text-error' }
};

export default function MyOrders() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/my-orders');
      return;
    }

    loadOrders();
  }, [isAuthenticated, authLoading, router]);

  const loadOrders = async () => {
    try {
      const response = await fetch('/backend/api/orders/list.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    try {
      const response = await fetch(`/backend/api/orders/list.php?id=${orderId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }

      const data = await response.json();
      setSelectedOrder(data.order);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Séparer les commandes en cours et terminées
  // Terminées = payées (paid) OU livrées (delivered)
  const completedOrders = orders.filter(order =>
    order.payment_status === 'paid' || order.status === 'delivered'
  );

  // En cours = toutes les autres (pending, confirmed, etc.) qui ne sont ni payées ni livrées
  const ongoingOrders = orders.filter(order =>
    order.payment_status !== 'paid' && order.status !== 'delivered'
  );

  const displayedOrders = activeTab === 'ongoing' ? ongoingOrders : completedOrders;

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mes Commandes - ArchiMeuble</title>
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

  return (
    <>
      <Head>
        <title>Mes Commandes - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-bg-light">
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Mes Commandes' }
            ]}
          />

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              📦 Mes achats
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border-light">
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  activeTab === 'ongoing'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Mes achats en cours
                {ongoingOrders.length > 0 && (
                  <span className="ml-2 text-xs bg-primary text-white rounded-full px-2 py-0.5">
                    {ongoingOrders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  activeTab === 'completed'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Mes achats terminés
                {completedOrders.length > 0 && (
                  <span className="ml-2 text-xs bg-primary text-white rounded-full px-2 py-0.5">
                    {completedOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        {displayedOrders.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              {activeTab === 'ongoing' ? 'Aucun achat en cours' : 'Vous n\'avez pas d\'achats terminés.'}
            </h3>
            <p className="text-text-secondary mb-6">
              {activeTab === 'ongoing'
                ? 'Passez votre première commande pour la retrouver ici'
                : 'Vos commandes payées et livrées apparaîtront ici'}
            </p>
            {activeTab === 'ongoing' && (
              <Link
                href="/"
                className="btn-primary"
              >
                Créer un meuble
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              const paymentInfo = PAYMENT_STATUS_LABELS[order.payment_status] || PAYMENT_STATUS_LABELS.pending;
              
              return (
                <div
                  key={order.id}
                  className="card overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-text-primary mb-1">
                          Commande #{order.order_number}
                        </h3>
                        <p className="text-sm text-text-tertiary">
                          Passée le {formatDate(order.created_at)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                          <span>{statusInfo.icon}</span>
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Infos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">💰</span>
                        <div>
                          <p className="text-sm text-text-tertiary">Montant total</p>
                          <p className="font-semibold text-text-primary">{order.total}€</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">💳</span>
                        <div>
                          <p className="text-sm text-text-tertiary">Paiement</p>
                          <p className={`font-semibold ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">📍</span>
                        <div>
                          <p className="text-sm text-text-tertiary">Livraison</p>
                          <p className="font-semibold text-text-primary text-sm">
                            {order.shipping_address.split(',')[0]}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadOrderDetails(order.id)}
                        className="btn-primary"
                      >
                        👁️ Voir les détails
                      </button>

                      {order.payment_status === 'paid' && (
                        <button
                          onClick={() => window.open(`/backend/api/orders/invoice.php?id=${order.id}&download=true`, '_blank')}
                          className="btn-secondary flex items-center gap-2"
                        >
                          📄 Télécharger facture
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal détails de commande */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border-light sticky top-0 bg-bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">
                  Commande #{selectedOrder.order_number}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-text-tertiary hover:text-text-secondary text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Statut de la commande
                </h3>
                <div className="flex items-center gap-2">
                  {Object.keys(STATUS_LABELS).slice(0, 5).map((status, index) => {
                    const statusInfo = STATUS_LABELS[status];
                    const isActive = Object.keys(STATUS_LABELS).indexOf(selectedOrder.status) >= index;

                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isActive ? statusInfo.color : 'bg-border-light text-text-tertiary'}`}>
                          {statusInfo.icon}
                        </div>
                        {index < 4 && (
                          <div className={`h-1 w-8 ${isActive ? 'bg-primary' : 'bg-border-light'}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Articles */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Articles commandés
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 bg-bg-light rounded-lg"
                    >
                      <div className="flex-grow">
                        <h4 className="font-semibold text-text-primary">
                          {item.name || item.configuration.name}
                        </h4>
                        <p className="text-sm text-text-secondary mt-1">
                          Quantité: {item.quantity} × {item.price || item.configuration.price}€
                        </p>
                        {item.configuration.config_data && item.configuration.config_data.dimensions && (
                          <p className="text-xs text-text-tertiary mt-1">
                            {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                          </p>
                        )}
                        {item.production_status && (
                          <p className="text-sm text-text-secondary mt-2">
                            <span className="font-medium">Statut production:</span> {item.production_status}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-primary">{(item.price || item.configuration.price) * item.quantity}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adresse de livraison */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Adresse de livraison
                </h3>
                <div className="p-4 bg-bg-light rounded-lg">
                  <p className="text-text-primary">{selectedOrder.shipping_address}</p>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-border-light pt-4">
                <div className="flex justify-between items-center text-xl font-bold text-text-primary">
                  <span>Total</span>
                  <span>{selectedOrder.total}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
