'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  IconDownload,
  IconRefresh,
  IconTrendingUp,
  IconCurrencyEuro,
  IconShoppingCart,
  IconChartBar,
  IconCreditCard,
} from '@tabler/icons-react';
import type { PaymentAnalytics, PaymentTransaction, PaymentFilters } from '@/types/PaymentAnalytics';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPayments() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filters, setFilters] = useState<PaymentFilters>({ period: '30d' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchTransactions();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/payment-analytics?period=${filters.period}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/admin/recent-transactions?period=${filters.period}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/backend/api/admin/export-payments.php?period=${filters.period}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paiements_${filters.period}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export CSV téléchargé');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'paid':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      case 'refunded':
        return 'Remboursé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune donnée disponible</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successRate = analytics.total_orders > 0
    ? ((analytics.successful_payments / analytics.total_orders) * 100).toFixed(1)
    : '0.0';

  return (
    <>
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Revenu Total</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCurrency(analytics.total_revenue)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconCurrencyEuro className="size-3" />
                Revenu
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Paiements réussis <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              {analytics.successful_payments} paiements
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Commandes</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {analytics.total_orders}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconShoppingCart className="size-3" />
                Total
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Toutes les commandes <IconShoppingCart className="size-4" />
            </div>
            <div className="text-muted-foreground">
              {analytics.pending_payments} en attente
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Panier Moyen</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCurrency(analytics.average_order_value)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconChartBar className="size-3" />
                Moyenne
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Valeur moyenne <IconChartBar className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Par commande
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Taux de Succès</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {successRate}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconTrendingUp className="size-3" />
                Succès
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Paiements réussis <IconCreditCard className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Taux de conversion
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Filters & Content */}
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analytics Paiements</CardTitle>
                <CardDescription>Statistiques et transactions</CardDescription>
              </div>
              <Button onClick={handleExportCSV} variant="outline">
                <IconDownload className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filters.period} onValueChange={(value) => setFilters({ period: value as any })}>
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="7d">7 jours</TabsTrigger>
                <TabsTrigger value="30d">30 jours</TabsTrigger>
                <TabsTrigger value="90d">90 jours</TabsTrigger>
                <TabsTrigger value="1y">1 an</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        {analytics.revenue_by_month && analytics.revenue_by_month.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Évolution du revenu</CardTitle>
              <CardDescription>Revenus par période</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.revenue_by_month}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                    />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Revenu"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        {analytics.payment_methods_distribution && analytics.payment_methods_distribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Méthodes de paiement</CardTitle>
              <CardDescription>Répartition des paiements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.payment_methods_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }) => `${method} ${percentage.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="method"
                    >
                      {analytics.payment_methods_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions récentes</CardTitle>
            <CardDescription>Derniers paiements enregistrés</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Aucune transaction</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Montant</TableHead>
                    <TableHead className="hidden sm:table-cell">Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 10).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">#{transaction.id}</TableCell>
                      <TableCell className="font-medium">{transaction.customer_email || 'Client'}</TableCell>
                      <TableCell className="hidden md:table-cell font-semibold tabular-nums">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={getStatusVariant(transaction.payment_status)}>
                          {getStatusLabel(transaction.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
