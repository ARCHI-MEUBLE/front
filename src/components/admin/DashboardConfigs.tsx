import { useState, useEffect } from 'react';
import { Eye, User, Calendar, Euro } from 'lucide-react';

interface AdminConfiguration {
  id: number;
  customer_email: string | null;
  model_name: string | null;
  model_id?: number | null;
  price: number;
  created_at: string;
  prompt?: string | null;
  glb_url?: string | null;
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
      const res = await fetch('http://localhost:8000/backend/api/admin/configurations.php', {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewDetails = (config: AdminConfiguration) => {
    setSelectedConfig(config);
  };

  const closeDetails = () => {
    setSelectedConfig(null);
  };

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Configurations clients</h2>
        <div className="mt-6 flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Configurations clients</h2>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
        <button
          onClick={loadConfigurations}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
        >
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configurations clients</h2>
            <p className="mt-2 text-sm text-gray-500">
              {total} configuration{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={loadConfigurations}
            className="px-4 py-2 text-sm text-amber-600 hover:text-amber-700 transition"
          >
            🔄 Actualiser
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Aucune configuration enregistrée pour le moment
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => {
                  const parsedConfig = parseConfigString(config.config_data);
                  return (
                    <tr key={config.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">#{config.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700 truncate max-w-[220px]">{config.customer_email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {config.model_name ? config.model_name : (config.model_id ? `M${config.model_id}` : '—')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                          <Euro className="h-4 w-4 text-amber-600" />
                          {Math.round(config.price)}€
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(config.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => viewDetails(config)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                        >
                          <Eye className="h-3 w-3" />
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de détails */}
      {selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDetails}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Configuration #{selectedConfig.id}
              </h3>
              <button
                onClick={closeDetails}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Informations client */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">👤 Client</h4>
                <p className="text-sm text-gray-600">{selectedConfig.customer_email || '—'}</p>
              </div>

              {/* Informations générales */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Informations</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Modèle:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedConfig.model_name ? selectedConfig.model_name : (selectedConfig.model_id ? `M${selectedConfig.model_id}` : '—')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Prix:</span>
                    <span className="ml-2 font-semibold text-amber-600">{Math.round(selectedConfig.price)}€</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Date de création:</span>
                    <span className="ml-2 text-gray-700">{formatDate(selectedConfig.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Configuration détaillée */}
              {(() => {
                const parsedConfig = parseConfigString(selectedConfig.config_data);
                if (!parsedConfig) {
                  return (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Configuration non disponible</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">🎨 Détails de configuration</h4>
                    
                    <div className="space-y-2 text-sm">
                      {parsedConfig.modules && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Modules:</span>
                          <span className="text-gray-900 font-medium">{parsedConfig.modules}</span>
                        </div>
                      )}
                      {parsedConfig.height && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Hauteur:</span>
                          <span className="text-gray-900">{parsedConfig.height} cm</span>
                        </div>
                      )}
                      {parsedConfig.depth && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Profondeur:</span>
                          <span className="text-gray-900">{parsedConfig.depth} cm</span>
                        </div>
                      )}
                      {parsedConfig.color && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Couleur:</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: parsedConfig.color }}
                            />
                            <span className="text-gray-900">{parsedConfig.color}</span>
                          </div>
                        </div>
                      )}
                      {parsedConfig.finish && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Finition:</span>
                          <span className="text-gray-900 capitalize">{parsedConfig.finish}</span>
                        </div>
                      )}
                      {parsedConfig.socle !== undefined && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Socle:</span>
                          <span className="text-gray-900">{parsedConfig.socle ? 'Oui' : 'Non'}</span>
                        </div>
                      )}
                      {parsedConfig.doors !== undefined && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Portes:</span>
                          <span className="text-gray-900">{parsedConfig.doors}</span>
                        </div>
                      )}
                      {parsedConfig.drawers !== undefined && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Tiroirs:</span>
                          <span className="text-gray-900">{parsedConfig.drawers}</span>
                        </div>
                      )}
                      {parsedConfig.shelves !== undefined && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 min-w-[100px]">Étagères:</span>
                          <span className="text-gray-900">{parsedConfig.shelves}</span>
                        </div>
                      )}
                    </div>

                    {/* Prompt IA si disponible */}
                    {parsedConfig.prompt && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-xs font-semibold text-gray-600 mb-2">💬 Prompt de génération</h5>
                        <p className="text-xs text-gray-600 bg-white rounded p-3 border border-gray-200">
                          {parsedConfig.prompt}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Aperçu 3D */}
              {selectedConfig.glb_url && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 Modèle 3D</h4>
                  <a
                    href={selectedConfig.glb_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:text-amber-700 underline"
                  >
                    Télécharger le fichier GLB
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardConfigs;