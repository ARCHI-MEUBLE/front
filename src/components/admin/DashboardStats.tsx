import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StatsData {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  cancellation_rate: number;
  phone_count: number;
  visio_count: number;
  this_month_count: number;
  last_month_count: number;
  monthly_trend: number;
}

interface ChartData {
  weekly: Array<{ week: string; count: number; year: string; week_num: string }>;
  monthly: Array<{ month: string; count: number; year: string; month_num: string }>;
  status_distribution: Array<{ status: string; count: number; label: string }>;
  type_distribution: Array<{ type: string; count: number; label: string }>;
}

interface StatsResponse {
  success: boolean;
  stats: StatsData;
  charts: ChartData;
}

const COLORS = {
  scheduled: '#2196f3',
  completed: '#4caf50',
  cancelled: '#9e9e9e',
  phone: '#4caf50',
  visio: '#2196f3',
};

const PIE_COLORS = ['#2196f3', '#4caf50', '#9e9e9e'];

export function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/appointments-stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Vous devez être connecté en tant qu'administrateur");
        }
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data: StatsResponse = await response.json();
      setStats(data.stats);
      setCharts(data.charts);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
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

  if (error) {
    return (
      <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!stats || !charts) {
    return null;
  }

  // Formater les données mensuelles pour l'affichage
  const monthlyData = charts.monthly.map((item) => ({
    name: new Date(`${item.year}-${item.month_num}-01`).toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric',
    }),
    count: item.count,
  }));

  // Formater les données hebdomadaires
  const weeklyData = charts.weekly && charts.weekly.length > 0
    ? charts.weekly.map((item) => ({
        name: `S${item.week_num}`,
        count: item.count,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Statistiques des Rendez-vous</h2>
        <p className="text-sm text-gray-600 mt-1">
          Vue d&apos;ensemble et tendances des rendez-vous Calendly
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase mb-1">Total RDV</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="border border-gray-200 p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase mb-1">Ce Mois</p>
          <p className="text-2xl font-bold text-gray-900">{stats.this_month_count}</p>
          {stats.monthly_trend !== 0 && (
            <p className={`text-xs mt-1 ${stats.monthly_trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthly_trend > 0 ? '↑' : '↓'} {Math.abs(stats.monthly_trend)}% vs mois dernier
            </p>
          )}
        </div>

        <div className="border border-gray-200 p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase mb-1">Terminés</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% du total
          </p>
        </div>

        <div className="border border-gray-200 p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase mb-1">Taux d&apos;annulation</p>
          <p className="text-2xl font-bold text-gray-900">{stats.cancellation_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">{stats.cancelled} annulés</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Évolution mensuelle */}
        <div className="border border-gray-200 p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Évolution des RDV (6 derniers mois)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2196f3"
                strokeWidth={2}
                dot={{ fill: '#2196f3', r: 4 }}
                activeDot={{ r: 6 }}
                name="Rendez-vous"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Téléphone vs Visio */}
        <div className="border border-gray-200 p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Type de Rendez-vous</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.type_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Rendez-vous">
                {charts.type_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === 'phone' ? COLORS.phone : COLORS.visio} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Répartition par statut */}
        <div className="border border-gray-200 p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Répartition par Statut</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={charts.status_distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {charts.status_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - 4 dernières semaines */}
        <div className="border border-gray-200 p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">RDV par Semaine (4 dernières)</h3>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2f2a26" name="Rendez-vous" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
              Aucun rendez-vous dans les 4 dernières semaines
            </div>
          )}
        </div>
      </div>

      {/* Statistiques détaillées */}
      <div className="border border-gray-200 p-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistiques Détaillées</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-gray-500">Total Rendez-vous</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div>
            <p className="text-gray-500">📅 Prévus</p>
            <p className="text-lg font-semibold text-blue-600 mt-1">{stats.scheduled}</p>
          </div>
          <div>
            <p className="text-gray-500">✅ Terminés</p>
            <p className="text-lg font-semibold text-green-600 mt-1">{stats.completed}</p>
          </div>
          <div>
            <p className="text-gray-500">❌ Annulés</p>
            <p className="text-lg font-semibold text-gray-600 mt-1">{stats.cancelled}</p>
          </div>
          <div>
            <p className="text-gray-500">📞 Téléphone</p>
            <p className="text-lg font-semibold text-green-600 mt-1">{stats.phone_count}</p>
          </div>
          <div>
            <p className="text-gray-500">🎥 Visio</p>
            <p className="text-lg font-semibold text-blue-600 mt-1">{stats.visio_count}</p>
          </div>
          <div>
            <p className="text-gray-500">Type le plus demandé</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {stats.phone_count > stats.visio_count ? '📞 Téléphone' : '🎥 Visio'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Taux d&apos;annulation</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.cancellation_rate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
