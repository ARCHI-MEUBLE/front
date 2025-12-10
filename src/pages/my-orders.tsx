import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Eye, Trash2, CreditCard, Download, Package, MapPin, X, ChevronRight, Clock, CheckCircle, Truck, ShoppingBag } from 'lucide-react';

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
  price?: number;
  name?: string;
  production_status?: string;
}

interface OrderSampleItem {
  id: number;
  sample_color_id: number;
  sample_name: string;
  sample_type_name: string;
  material: string;
  image_url: string | null;
  hex: string | null;
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
  items?: OrderItem[];
  samples?: OrderSampleItem[];
  samples_count?: number;
}

const STATUS_CONFIG: { [key: string]: { label: string; icon: React.ReactNode; step: number } } = {
  pending: { label: 'En attente', icon: <Clock className="h-4 w-4" />, step: 0 },
  confirmed: { label: 'Confirmée', icon: <CheckCircle className="h-4 w-4" />, step: 1 },
  in_production: { label: 'En production', icon: <Package className="h-4 w-4" />, step: 2 },
  shipped: { label: 'Expédiée', icon: <Truck className="h-4 w-4" />, step: 3 },
  delivered: { label: 'Livrée', icon: <CheckCircle className="h-4 w-4" />, step: 4 },
  cancelled: { label: 'Annulée', icon: <X className="h-4 w-4" />, step: -1 }
};

const PAYMENT_CONFIG: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'En attente', color: 'text-[#8B7355]' },
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
      alert(`Erreur: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const completedOrders = orders.filter(order =>
    order.payment_status === 'paid' || order.status === 'delivered'
  );

  const ongoingOrders = orders.filter(order =>
    order.payment_status !== 'paid' && order.status !== 'delivered'
  );

  const displayedOrders = activeTab === 'ongoing' ? ongoingOrders : completedOrders;

  // Loading state
  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mes Commandes - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-[#FAFAF9]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin border-2 border-[#E8E6E3] border-t-[#1A1917]" />
              <p className="mt-6 text-sm text-[#706F6C]">Chargement...</p>
            </div>
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

      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <div className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Mes commandes
            </h1>
            <p className="mt-3 text-[#706F6C]">
              Suivez vos commandes et téléchargez vos factures
            </p>

            {/* Tabs */}
            <div className="mt-8 flex gap-8 border-b border-[#E8E6E3]">
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`relative pb-4 text-sm font-medium transition-colors ${
                  activeTab === 'ongoing'
                    ? 'text-[#1A1917]'
                    : 'text-[#706F6C] hover:text-[#1A1917]'
                }`}
              >
                En cours
                {ongoingOrders.length > 0 && (
                  <span className="ml-2 bg-[#1A1917] px-2 py-0.5 text-xs text-white">
                    {ongoingOrders.length}
                  </span>
                )}
                {activeTab === 'ongoing' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1917]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`relative pb-4 text-sm font-medium transition-colors ${
                  activeTab === 'completed'
                    ? 'text-[#1A1917]'
                    : 'text-[#706F6C] hover:text-[#1A1917]'
                }`}
              >
                Terminées
                {completedOrders.length > 0 && (
                  <span className="ml-2 bg-[#E8E6E3] px-2 py-0.5 text-xs text-[#1A1917]">
                    {completedOrders.length}
                  </span>
                )}
                {activeTab === 'completed' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1917]" />
                )}
              </button>
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
          {displayedOrders.length === 0 ? (
            /* Empty State */
            <div className="mx-auto max-w-md py-12 text-center sm:py-16 lg:py-24">
              <div className="mx-auto flex h-20 w-20 items-center justify-center border border-[#E8E6E3] bg-white">
                <Package className="h-8 w-8 text-[#706F6C]" />
              </div>
              <h2 className="mt-8 font-serif text-2xl text-[#1A1917]">
                {activeTab === 'ongoing' ? 'Aucune commande en cours' : 'Aucune commande terminée'}
              </h2>
              <p className="mt-3 text-[#706F6C]">
                {activeTab === 'ongoing'
                  ? 'Créez votre premier meuble sur mesure'
                  : 'Vos commandes payées et livrées apparaîtront ici'}
              </p>
              {activeTab === 'ongoing' && (
                <Link
                  href="/models"
                  className="mt-8 inline-flex h-12 items-center justify-center bg-[#1A1917] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                >
                  Découvrir nos modèles
                </Link>
              )}
            </div>
          ) : (
            /* Orders List */
            <div className="space-y-4">
              {displayedOrders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const paymentInfo = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.pending;

                return (
                  <div key={order.id} className="border border-[#E8E6E3] bg-white">
                    {/* Order Header */}
                    <div className="flex flex-col gap-4 border-b border-[#E8E6E3] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <span className="font-mono text-sm text-[#1A1917]">
                          #{order.order_number}
                        </span>
                        <span className="h-4 w-px bg-[#E8E6E3]" />
                        <span className="text-sm text-[#706F6C]">
                          {formatDate(order.created_at)}
                        </span>
                        <span className="h-4 w-px bg-[#E8E6E3]" />
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${
                          order.status === 'cancelled' ? 'text-red-600' : 'text-[#1A1917]'
                        }`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono text-lg text-[#1A1917]">
                            {order.total.toLocaleString('fr-FR')} €
                          </p>
                          <p className={`text-xs font-medium ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </p>
                        </div>
                        {order.payment_status !== 'paid' && (
                          <button
                            onClick={() => router.push(`/checkout?order_id=${order.id}`)}
                            className="flex h-10 items-center justify-center bg-[#1A1917] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Payer
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-[#706F6C]">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">{order.shipping_address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Actions */}
                    <div className="flex flex-wrap items-center gap-4 border-t border-[#E8E6E3] px-5 py-4 sm:px-6">
                      <button
                        onClick={() => loadOrderDetails(order.id)}
                        className="inline-flex items-center gap-2 text-sm text-[#706F6C] transition-colors hover:text-[#1A1917]"
                      >
                        <Eye className="h-4 w-4" />
                        Voir les détails
                      </button>

                      {order.payment_status !== 'paid' && (
                        <button
                          onClick={async () => {
                            if (!confirm('Voulez-vous vraiment supprimer cette commande ?')) return;
                            try {
                              const response = await fetch(`/backend/api/orders/delete.php`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ order_id: order.id })
                              });
                              if (!response.ok) throw new Error('Erreur de suppression');
                              loadOrders();
                            } catch (error) {
                              alert('Erreur lors de la suppression');
                            }
                          }}
                          className="inline-flex items-center gap-2 text-sm text-[#706F6C] transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      )}

                      {order.payment_status === 'paid' && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/backend/api/orders/invoice.php?id=${order.id}&download=true`, {
                                credentials: 'include'
                              });
                              if (!response.ok) throw new Error('Erreur de téléchargement');
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `facture-${order.order_number}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (error) {
                              alert('Erreur lors du téléchargement de la facture');
                            }
                          }}
                          className="inline-flex items-center gap-2 text-sm text-[#8B7355] transition-colors hover:text-[#1A1917]"
                        >
                          <Download className="h-4 w-4" />
                          Télécharger la facture
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#E8E6E3] bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-[#E8E6E3] bg-white p-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#1A1917]">
                    Commande #{selectedOrder.order_number}
                  </h2>
                  <p className="mt-1 text-sm text-[#706F6C]">
                    {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:text-[#1A1917]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Status Progress */}
                <div className="mb-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                    Statut de la commande
                  </h3>
                  <div className="flex items-center justify-between">
                    {['pending', 'confirmed', 'in_production', 'shipped', 'delivered'].map((status, index) => {
                      const config = STATUS_CONFIG[status];
                      const currentStep = STATUS_CONFIG[selectedOrder.status]?.step || 0;
                      const isActive = currentStep >= index;
                      const isCurrent = selectedOrder.status === status;

                      return (
                        <div key={status} className="flex flex-1 items-center">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 transition-colors ${
                            isActive
                              ? 'border-[#1A1917] bg-[#1A1917] text-white'
                              : 'border-[#E8E6E3] text-[#706F6C]'
                          } ${isCurrent ? 'ring-2 ring-[#1A1917] ring-offset-2' : ''}`}>
                            {config.icon}
                          </div>
                          {index < 4 && (
                            <div className={`h-0.5 flex-1 ${isActive ? 'bg-[#1A1917]' : 'bg-[#E8E6E3]'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[#706F6C]">
                    <span>En attente</span>
                    <span>Confirmée</span>
                    <span>Production</span>
                    <span>Expédiée</span>
                    <span>Livrée</span>
                  </div>
                </div>

                {/* Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                      Meubles sur mesure
                    </h3>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item) => {
                        const itemName = item.name || item.prompt || item.configuration?.name || 'Configuration';
                        const itemPrice = item.price || item.configuration?.price || 0;
                        const rawConfigData = item.config_data || item.configuration?.config_data;
                        const configData = typeof rawConfigData === 'string' ? JSON.parse(rawConfigData) : rawConfigData;

                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-4 border border-[#E8E6E3] p-4"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-[#E8E6E3] bg-[#F5F5F4]">
                                <ShoppingBag className="h-6 w-6 text-[#C4C2BF]" />
                              </div>
                              <div>
                                <h4 className="font-medium text-[#1A1917]">{itemName}</h4>
                                {configData?.dimensions && (
                                  <p className="mt-1 text-xs text-[#706F6C]">
                                    {configData.dimensions.width} × {configData.dimensions.depth} × {configData.dimensions.height} mm
                                  </p>
                                )}
                                <p className="mt-1 text-sm text-[#706F6C]">
                                  Quantité : {item.quantity}
                                </p>
                              </div>
                            </div>
                            <p className="font-mono text-[#1A1917]">
                              {(itemPrice * item.quantity).toLocaleString('fr-FR')} €
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Samples */}
                {selectedOrder.samples && selectedOrder.samples.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                      Échantillons ({selectedOrder.samples.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedOrder.samples.map((sample) => (
                        <div
                          key={sample.id}
                          className="flex items-center gap-3 border border-[#E8E6E3] p-3"
                        >
                          <div
                            className="h-10 w-10 flex-shrink-0 border border-[#E8E6E3]"
                            style={{ backgroundColor: sample.image_url ? undefined : (sample.hex || '#EEE') }}
                          >
                            {sample.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sample.image_url}
                                alt={sample.sample_name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#1A1917]">
                              {sample.sample_name}
                            </p>
                            <p className="text-xs text-[#706F6C]">{sample.material}</p>
                          </div>
                          <span className="text-xs font-medium text-[#8B7355]">Offert</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                <div className="mb-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.1em] text-[#706F6C]">
                    Adresse de livraison
                  </h3>
                  <div className="flex items-start gap-3 border border-[#E8E6E3] p-4">
                    <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8B7355]" />
                    <p className="text-[#1A1917]">{selectedOrder.shipping_address}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-[#E8E6E3] pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[#1A1917]">Total</span>
                    <span className="font-mono text-2xl text-[#1A1917]">
                      {selectedOrder.total.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[#E8E6E3] p-6">
                <div className="flex flex-wrap gap-4">
                  {selectedOrder.payment_status !== 'paid' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        router.push(`/checkout?order_id=${selectedOrder.id}`);
                      }}
                      className="flex h-12 items-center justify-center bg-[#1A1917] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payer maintenant
                    </button>
                  )}
                  {selectedOrder.payment_status === 'paid' && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/backend/api/orders/invoice.php?id=${selectedOrder.id}&download=true`, {
                            credentials: 'include'
                          });
                          if (!response.ok) throw new Error('Erreur');
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `facture-${selectedOrder.order_number}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          alert('Erreur lors du téléchargement');
                        }
                      }}
                      className="flex h-12 items-center justify-center border border-[#1A1917] px-6 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#1A1917] hover:text-white"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger la facture
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex h-12 items-center justify-center px-6 text-sm text-[#706F6C] transition-colors hover:text-[#1A1917]"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
