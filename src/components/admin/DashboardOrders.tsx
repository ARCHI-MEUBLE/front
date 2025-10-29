import { useEffect, useState } from 'react';

interface OrderItem {
  configuration_id: number;
  quantity: number;
  price: number;          // Nouveau champ aplati depuis backend
  prompt: string;         // Nouveau champ aplati depuis backend
  name: string;           // Nouveau champ aplati depuis backend
}

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  name: string;          // Nom complet combiné
}

interface Order {
  id: string;
  order_number: string;
  customer?: Customer;
  customer_name?: string;  // Champ aplati au niveau racine
  customer_email?: string;
  customer_phone?: string;
  status: string;
  total: number;           // Champ principal
  amount?: number;         // Alias
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

const STATUS_LABELS: { [key: string]: { label: string; icon: string } } = {
  pending: { label: 'En attente', icon: '⏳' },
  confirmed: { label: 'Confirmée', icon: '✅' },
  in_production: { label: 'En production', icon: '🔨' },
  shipped: { label: 'Expédiée', icon: '🚚' },
  delivered: { label: 'Livrée', icon: '📦' },
  cancelled: { label: 'Annulée', icon: '❌' }
};

export function DashboardOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

  const loadOrderDetails = async (orderId: string) => {
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
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
      await loadOrders();

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

  const getCustomerName = (order: Order): string => {
    return order.customer?.name || order.customer_name || 'N/A';
  };

  const getCustomerEmail = (order: Order): string => {
    return order.customer?.email || order.customer_email || 'N/A';
  };

  const getCustomerPhone = (order: Order): string => {
    return order.customer?.phone || order.customer_phone || 'N/A';
  };

  const getOrderTotal = (order: Order): number => {
    return order.total || order.amount || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats - Design sobre */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">En attente</p>
            <p className="text-xl font-semibold text-gray-900">{stats.pending}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Confirmées</p>
            <p className="text-xl font-semibold text-gray-900">{stats.confirmed}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">En production</p>
            <p className="text-xl font-semibold text-gray-900">{stats.in_production}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Expédiées</p>
            <p className="text-xl font-semibold text-gray-900">{stats.shipped}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Livrées</p>
            <p className="text-xl font-semibold text-gray-900">{stats.delivered}</p>
          </div>
        </div>
      )}

      {/* Filters - Design sobre */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
          }`}
        >
          Toutes
        </button>
        {Object.entries(STATUS_LABELS).map(([status, info]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap ${
              filterStatus === status
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
            }`}
          >
            {info.icon} {info.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table - Design sobre sans shadow */}
      {orders.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 bg-white">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune commande</h3>
          <p className="text-sm text-gray-600">
            {filterStatus === 'all'
              ? 'Aucune commande pour le moment'
              : `Aucune commande avec le statut "${STATUS_LABELS[filterStatus]?.label}"`
            }
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">
                        #{order.order_number}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-gray-900">{getCustomerName(order)}</div>
                        <div className="text-gray-500">{getCustomerEmail(order)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">
                        {getOrderTotal(order)}€
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-900 text-xs font-medium">
                        <span>{statusInfo.icon}</span>
                        <span>{statusInfo.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadOrderDetails(order.id)}
                        className="text-xs font-medium text-gray-900 hover:underline"
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

      {/* Modal détails - Design sobre */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white border border-gray-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Commande #{selectedOrder.order_number}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Client */}
              <div className="border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Informations Client
                </h3>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">Nom:</span> {getCustomerName(selectedOrder)}</p>
                  <p><span className="font-medium">Email:</span> {getCustomerEmail(selectedOrder)}</p>
                  <p><span className="font-medium">Téléphone:</span> {getCustomerPhone(selectedOrder)}</p>
                </div>
              </div>

              {/* Changer le statut */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Changer le statut
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(STATUS_LABELS).slice(0, 5).map(([status, info]) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      disabled={selectedOrder.status === status}
                      className={`p-2 border text-xs font-medium ${
                        selectedOrder.status === status
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'border-gray-300 hover:border-gray-900 text-gray-700'
                      }`}
                    >
                      {info.icon} {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Articles à produire
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">
                            {item.name || 'Sans nom'}
                          </h4>
                          <p className="text-xs text-gray-600">
                            Quantité: {item.quantity} × {item.price}€ = <span className="font-semibold">{item.quantity * item.price}€</span>
                          </p>
                        </div>
                      </div>

                      {/* PROMPT */}
                      <div className="bg-gray-50 border border-gray-300 p-2 mb-2">
                        <p className="text-xs font-semibold text-gray-900 mb-1">PROMPT DE PRODUCTION:</p>
                        <code className="text-xs font-mono text-gray-900 break-all">
                          {item.prompt || 'N/A'}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Livraison */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Adresse de livraison
                </h3>
                <div className="p-3 border border-gray-200">
                  <p className="text-xs text-gray-700">{selectedOrder.shipping_address}</p>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between items-center text-base font-semibold">
                  <span>Total à facturer</span>
                  <span>{getOrderTotal(selectedOrder)}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
