import { useState, useEffect } from 'react';
import { Eye, User, Calendar, Euro, RefreshCw, MoreVertical, Ruler } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface AdminConfiguration {
  id: number;
  customer_email: string | null;
  model_name: string | null;
  model_id?: number | null;
  price: number;
  created_at: string;
  prompt?: string | null;
  glb_url?: string | null;
  dxf_url?: string | null;
  thumbnail_url?: string | null;
  config_data?: string | null; // JSON string
}

export function DashboardConfigs() {
  const [configs, setConfigs] = useState<AdminConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AdminConfiguration | null>(null);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/configurations', {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Vous devez être connecté en tant qu'administrateur (ouvrez /admin/login). ");
        throw new Error('Impossible de charger les configurations');
      }
      const data = await res.json();
      setConfigs(data.configurations || []);
      setTotal(data.total || (data.configurations?.length ?? 0));
    } catch (err: any) {
      console.error('Erreur lors du chargement des configurations:', err);
      setError(err.message || 'Impossible de charger les configurations');
    } finally {
      setLoading(false);
    }
  };

  const parseConfigString = (configString: string | null | undefined) => {
    if (!configString) return null;
    try {
      return JSON.parse(configString);
    } catch {
      return null;
    }
  };

  const viewDetails = (config: AdminConfiguration) => {
    setSelectedConfig(config);
  };

  const closeDetails = () => {
    setSelectedConfig(null);
  };

  if (loading) {
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
      <div className="space-y-4">
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
        <button
          onClick={loadConfigurations}
          className="px-4 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configurations clients</h2>
            <p className="mt-1 text-sm text-gray-500">
              {total} configuration{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Table */}
        {configs.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune configuration</h3>
            <p className="text-sm text-gray-600">
              Aucune configuration enregistrée pour le moment
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {configs.map((config) => {
                  return (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">#{config.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-900">{config.customer_email || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {config.model_name ? config.model_name : (config.model_id ? `M${config.model_id}` : '—')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">
                          {Math.round(config.price)}€
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(config.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => viewDetails(config)}
                          className="text-xs font-medium text-gray-900 hover:underline"
                        >
                          Détails →
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

      {/* Modal de détails */}
      {selectedConfig && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeDetails}
        >
          <div
            className="bg-white border border-gray-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Configuration #{selectedConfig.id}
                </h2>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Informations client */}
                <div className="border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Informations Client
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Email:</span> {selectedConfig.customer_email || 'N/A'}</p>
                  </div>
                </div>

                {/* Informations générales */}
                <div className="border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Détails de la Configuration
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Modèle:</span> {selectedConfig.model_name ? selectedConfig.model_name : (selectedConfig.model_id ? `M${selectedConfig.model_id}` : '—')}</p>
                    <p><span className="font-medium">Prix:</span> {Math.round(selectedConfig.price)}€</p>
                    <p><span className="font-medium">Date:</span> {formatDate(selectedConfig.created_at)}</p>
                  </div>
                </div>

              {/* Prompt de production */}
              {selectedConfig.prompt && (
                <div className="bg-gray-50 border border-gray-300 p-2">
                  <p className="text-xs font-semibold text-gray-900 mb-1">PROMPT DE PRODUCTION:</p>
                  <code className="text-xs font-mono text-gray-900 break-all">
                    {selectedConfig.prompt}
                  </code>
                </div>
              )}

              {/* Fichiers téléchargeables */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Fichiers pour la Menuiserie
                </h3>
                <div className="space-y-2">
                  {selectedConfig.glb_url && (
                    <a
                      href={selectedConfig.glb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      Télécharger GLB (3D)
                    </a>
                  )}
                  {selectedConfig.dxf_url ? (
                    <a
                      href={selectedConfig.dxf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium ml-2 hover:bg-blue-700 transition"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      Télécharger DXF pour la menuiserie
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium ml-2 cursor-not-allowed">
                      DXF non disponible
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardConfigs;