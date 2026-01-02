import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/dateUtils';
import {
  IconClock,
  IconCircleCheck,
  IconHammer,
  IconTruck,
  IconPackage,
  IconX,
  IconRuler,
  IconRefresh,
  IconEye,
  IconLink,
  IconTrendingUp,
} from '@tabler/icons-react';
import PaymentLinkModal from '@/components/admin/PaymentLinkModal';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OrderItem {
  configuration_id: number;
  quantity: number;
  price: number;
  prompt: string;
  name: string;
}

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  name: string;
}

interface Order {
  id: string;
  order_number: string;
  customer?: Customer;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status: string;
  total: number;
  amount?: number;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_CONFIG: {
  [key: string]: {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
} = {
  pending: { label: 'En attente', Icon: IconClock, variant: 'outline' },
  confirmed: { label: 'Confirmée', Icon: IconCircleCheck, variant: 'default' },
  in_production: { label: 'En production', Icon: IconHammer, variant: 'default' },
  shipped: { label: 'Expédiée', Icon: IconTruck, variant: 'secondary' },
  delivered: { label: 'Livrée', Icon: IconPackage, variant: 'secondary' },
  cancelled: { label: 'Annulée', Icon: IconX, variant: 'destructive' },
};

export function DashboardOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentLinkModalOpen, setPaymentLinkModalOpen] = useState(false);
  const [selectedOrderForPaymentLink, setSelectedOrderForPaymentLink] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      let url = '/api/admin/orders';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }

      const response = await fetch(url, { credentials: 'include' });

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

  const loadOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders?id=${orderId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }

      const data = await response.json();
      setSelectedOrder(data.order);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement des détails');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      toast.success('Statut mis à jour');
      await loadOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        await loadOrderDetails(orderId);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
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

  // Calculate important stats
  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    in_production: orders.filter(o => o.status === 'in_production').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Important Stats */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-3 lg:px-6">
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>En attente</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.pending}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconClock className="size-3" />
                À traiter
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Commandes en attente <IconClock className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Nécessitent validation
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>En production</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.in_production}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconHammer className="size-3" />
                Actif
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              En cours de fabrication <IconHammer className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Travail en cours
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Expédiées</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.shipped}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconTruck className="size-3" />
                En route
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              En livraison <IconTruck className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Chez le transporteur
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-6">
        <Card>
        <CardHeader>
          <CardTitle>Filtrer par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              {Object.entries(STATUS_CONFIG).map(([status, { label, Icon }]) => (
                <TabsTrigger key={status} value={status} className="flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-medium mb-1">Aucune commande</h3>
            <p className="text-sm text-muted-foreground">
              {filterStatus === 'all'
                ? 'Aucune commande pour le moment'
                : `Aucune commande avec le statut "${STATUS_CONFIG[filterStatus]?.label}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.Icon;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{getCustomerName(order)}</div>
                          <div className="text-muted-foreground">{getCustomerEmail(order)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{getOrderTotal(order)}€</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => loadOrderDetails(order.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <IconEye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                          {order.payment_status !== 'paid' && (
                            <Button
                              onClick={() => {
                                setSelectedOrderForPaymentLink(order);
                                setPaymentLinkModalOpen(true);
                              }}
                              size="sm"
                            >
                              <IconLink className="w-4 h-4 mr-1" />
                              Lien paiement
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Order Details Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Commande #{selectedOrder.order_number}</SheetTitle>
                <SheetDescription>Détails complets de la commande</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informations client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Nom:</span> {getCustomerName(selectedOrder)}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {getCustomerEmail(selectedOrder)}
                    </p>
                    <p>
                      <span className="font-medium">Téléphone:</span> {getCustomerPhone(selectedOrder)}
                    </p>
                  </CardContent>
                </Card>

                {/* Status Change */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Changer le statut</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(STATUS_CONFIG)
                        .slice(0, 5)
                        .map(([status, { label, Icon }]) => (
                          <Button
                            key={status}
                            onClick={() => updateOrderStatus(selectedOrder.id, status)}
                            disabled={selectedOrder.status === status}
                            variant={selectedOrder.status === status ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start gap-1"
                          >
                            <Icon className="w-3 h-3" />
                            {label}
                          </Button>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Articles à produire</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-sm">{item.name || 'Sans nom'}</h4>
                            <p className="text-xs text-muted-foreground">
                              Quantité: {item.quantity} × {item.price}€ ={' '}
                              <span className="font-semibold">{item.quantity * item.price}€</span>
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-xs font-semibold mb-1 uppercase text-muted-foreground">
                            Prompt de production:
                          </p>
                          <code className="text-xs font-mono block whitespace-pre-wrap break-all">
                            {item.prompt || 'N/A'}
                          </code>
                        </div>

                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a
                            href={`/backend/api/files/dxf.php?id=${item.configuration_id}`}
                            download={`configuration_${item.configuration_id}.dxf`}
                          >
                            <IconRuler className="w-4 h-4 mr-2" />
                            Télécharger DXF pour la menuiserie
                          </a>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Adresse de livraison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.shipping_address}</p>
                  </CardContent>
                </Card>

                {/* Total */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total à facturer</span>
                      <span>{getOrderTotal(selectedOrder)}€</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Link Modal */}
      {selectedOrderForPaymentLink && (
        <PaymentLinkModal
          isOpen={paymentLinkModalOpen}
          onClose={() => {
            setPaymentLinkModalOpen(false);
            setSelectedOrderForPaymentLink(null);
          }}
          orderId={parseInt(selectedOrderForPaymentLink.id)}
          orderNumber={selectedOrderForPaymentLink.order_number}
          totalAmount={getOrderTotal(selectedOrderForPaymentLink)}
        />
      )}
    </>
  );
}
