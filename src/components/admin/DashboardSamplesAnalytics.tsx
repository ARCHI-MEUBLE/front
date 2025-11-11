'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SampleAnalytics {
  total_ordered: number;
  orders_with_samples: number;
  samples_in_cart: number;
  top_samples: {
    sample_name: string;
    material: string;
    order_count: number;
  }[];
  material_distribution: {
    material: string;
    count: number;
  }[];
  recent_orders: {
    date: string;
    order_count: number;
  }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardSamplesAnalytics() {
  const [analytics, setAnalytics] = useState<SampleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/samples/analytics', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement des analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{error || 'Aucune donnée disponible'}</div>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const topSamplesData = analytics.top_samples.map(sample => ({
    name: `${sample.sample_name} (${sample.material})`,
    commandes: sample.order_count
  }));

  const materialData = analytics.material_distribution.map(mat => ({
    name: mat.material,
    value: mat.count
  }));

  const timelineData = analytics.recent_orders.map(order => ({
    date: new Date(order.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    commandes: order.order_count
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Commandés</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.total_ordered}</div>
          <div className="text-xs text-gray-500 mt-1">Échantillons livrés/en cours</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Commandes Actives</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.orders_with_samples}</div>
          <div className="text-xs text-gray-500 mt-1">Commandes incluant échantillons</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Dans les Paniers</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.samples_in_cart}</div>
          <div className="text-xs text-gray-500 mt-1">En attente de validation</div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 échantillons - Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top 5 des Échantillons</h2>
          {topSamplesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSamplesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip />
                <Bar dataKey="commandes" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Répartition par matériau - Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition par Matériau</h2>
          {materialData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={materialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {materialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Timeline des commandes - Line Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution des Commandes (30 derniers jours)</h2>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="commandes"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Commandes"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Aucune donnée disponible
          </div>
        )}
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Détails par Matériau</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matériau</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pourcentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.material_distribution.map((material, index) => {
                const percentage = (material.count / analytics.total_ordered) * 100;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{material.material}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{material.count}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
