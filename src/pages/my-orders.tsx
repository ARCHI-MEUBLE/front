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
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: '✅' },
  in_production: { label: 'En production', color: 'bg-purple-100 text-purple-800', icon: '🔨' },
  shipped: { label: 'Expédiée', color: 'bg-indigo-100 text-indigo-800', icon: '🚚' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: '📦' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: '❌' }
};

const PAYMENT_STATUS_LABELS: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'En attente', color: 'text-yellow-600' },
  paid: { label: 'Payé', color: 'text-green-600' },
  failed: { label: 'Échec', color: 'text-red-600' }
};

export default function MyOrders() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      const response = await fetch('http://localhost:8000/backend/api/orders/list.php', {
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
      const response = await fetch(`http://localhost:8000/backend/api/orders/list.php?id=${orderId}`, {
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

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mes Commandes - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
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

      <div className="min-h-screen bg-gray-50">
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Mes Commandes' }
            ]}
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📦 Mes Commandes
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {orders.length} commande{orders.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune commande
            </h3>
            <p className="text-gray-600 mb-6">
              Passez votre première commande pour la retrouver ici
            </p>
            <Link 
              href="/my-configurations"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Voir mes configurations
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              const paymentInfo = PAYMENT_STATUS_LABELS[order.payment_status] || PAYMENT_STATUS_LABELS.pending;
              
              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          Commande #{order.order_number}
                        </h3>
                        <p className="text-sm text-gray-500">
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
                        <span className="text-gray-600">💰</span>
                        <div>
                          <p className="text-sm text-gray-500">Montant total</p>
                          <p className="font-semibold text-gray-900">{order.total}€</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">💳</span>
                        <div>
                          <p className="text-sm text-gray-500">Paiement</p>
                          <p className={`font-semibold ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">📍</span>
                        <div>
                          <p className="text-sm text-gray-500">Livraison</p>
                          <p className="font-semibold text-gray-900 text-sm">
                            {order.shipping_address.split(',')[0]}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadOrderDetails(order.id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        👁️ Voir les détails
                      </button>
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
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Commande #{selectedOrder.order_number}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Statut de la commande
                </h3>
                <div className="flex items-center gap-2">
                  {Object.keys(STATUS_LABELS).slice(0, 5).map((status, index) => {
                    const statusInfo = STATUS_LABELS[status];
                    const isActive = Object.keys(STATUS_LABELS).indexOf(selectedOrder.status) >= index;
                    
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isActive ? statusInfo.color : 'bg-gray-200 text-gray-400'}`}>
                          {statusInfo.icon}
                        </div>
                        {index < 4 && (
                          <div className={`h-1 w-8 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Articles */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Articles commandés
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-grow">
                        <h4 className="font-semibold text-gray-900">
                          {item.name || item.configuration.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Quantité: {item.quantity} × {item.price || item.configuration.price}€
                        </p>
                        {item.configuration.config_data && item.configuration.config_data.dimensions && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.configuration.config_data.dimensions.width} × {item.configuration.config_data.dimensions.depth} × {item.configuration.config_data.dimensions.height} mm
                          </p>
                        )}
                        {item.production_status && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Statut production:</span> {item.production_status}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{(item.price || item.configuration.price) * item.quantity}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adresse de livraison */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Adresse de livraison
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{selectedOrder.shipping_address}</p>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
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
