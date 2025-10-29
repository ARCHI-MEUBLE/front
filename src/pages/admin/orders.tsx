import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface OrderItem {
  id: number;
  configuration_name: string;
  prompt: string;
  config_data: any;
  quantity: number;
  unit_price: number;
  total_price: number;
  production_status: string;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: OrderItem[];
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  in_production: number;
  shipped: number;
  delivered: number;
}

const STATUS_LABELS: { [key: string]: { label: string; color: string; icon: string } } = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: '✅' },
  in_production: { label: 'En production', color: 'bg-purple-100 text-purple-800', icon: '🔨' },
  shipped: { label: 'Expédiée', color: 'bg-indigo-100 text-indigo-800', icon: '🚚' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: '📦' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: '❌' }
};

export default function AdminOrders() {
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // TODO: Vérifier que l'utilisateur est admin
    // Pour l'instant, on charge directement
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      let url = 'http://localhost:8000/backend/api/admin/orders.php';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/backend/api/admin/orders.php?id=${orderId}`, {
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

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch('http://localhost:8000/backend/api/admin/orders.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      alert('✅ Statut mis à jour');
      
      // Recharger les commandes
      await loadOrders();
      
      // Si c'était la commande sélectionnée, recharger ses détails
      if (selectedOrder && selectedOrder.id === orderId) {
        await loadOrderDetails(orderId);
      }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const filteredOrders = orders;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👨‍💼 Gestion des Commandes
              </h1>
              <p className="mt-1 text-gray-600">
                {orders.length} commande{orders.length > 1 ? 's' : ''}
              </p>
            </div>
            
            <Link 
              href="/admin/notifications"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              🔔 Notifications
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700">En attente</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">Confirmées</p>
                <p className="text-2xl font-bold text-blue-900">{stats.confirmed}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700">En production</p>
                <p className="text-2xl font-bold text-purple-900">{stats.in_production}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-700">Expédiées</p>
                <p className="text-2xl font-bold text-indigo-900">{stats.shipped}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700">Livrées</p>
                <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            {Object.entries(STATUS_LABELS).map(([status, info]) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {info.icon} {info.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune commande
            </h3>
            <p className="text-gray-600">
              {filterStatus === 'all' 
                ? 'Aucune commande pour le moment' 
                : `Aucune commande avec le statut "${STATUS_LABELS[filterStatus]?.label}"`
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          #{order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-gray-500">{order.customer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {order.total_amount}€
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          <span>{statusInfo.icon}</span>
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => loadOrderDetails(order.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Voir détails →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal détails commande */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10">
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
              {/* Client */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  👤 Informations Client
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Nom:</span> {selectedOrder.customer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.customer_email}</p>
                  <p><span className="font-medium">Téléphone:</span> À récupérer du profil client</p>
                </div>
              </div>

              {/* Changer le statut */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  🔄 Changer le statut
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(STATUS_LABELS).slice(0, 5).map(([status, info]) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      disabled={selectedOrder.status === status}
                      className={`p-3 rounded-lg border-2 font-medium text-sm transition ${
                        selectedOrder.status === status
                          ? `${info.color} border-current cursor-default`
                          : 'border-gray-200 hover:border-blue-500 text-gray-700'
                      }`}
                    >
                      {info.icon} {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles avec PROMPT */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  📋 Articles à produire
                </h3>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item) => (
                    <div 
                      key={item.id}
                      className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">
                            {item.configuration_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quantité: {item.quantity} × {item.unit_price}€ = <span className="font-bold">{item.total_price}€</span>
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                          {item.production_status}
                        </span>
                      </div>

                      {/* PROMPT - Info cruciale pour la production */}
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-yellow-900 mb-1">🔧 PROMPT DE PRODUCTION:</p>
                        <code className="text-sm font-mono text-yellow-900 break-all">
                          {item.prompt}
                        </code>
                      </div>

                      {/* Config Data */}
                      {item.config_data && (
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">📐 Configuration détaillée:</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(item.config_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Livraison */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  📍 Adresse de livraison
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{selectedOrder.shipping_address}</p>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 pt-4">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>Total à facturer</span>
                  <span className="text-green-600">{selectedOrder.total_amount}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
