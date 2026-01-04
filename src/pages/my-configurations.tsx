import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import Image from 'next/image';
import type { Zone } from '@/components/configurator/ZoneEditor';

// Import dynamique pour éviter les erreurs SSR avec Three.js
const ThreeViewer = dynamic(() => import('@/components/configurator/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-light to-bg-default">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-text-secondary">Chargement 3D...</p>
      </div>
    </div>
  ),
});

interface SavedConfiguration {
  id: number;
  template_id: number | null;
  name: string;
  prompt: string;
  config_data: any;
  glb_url: string | null;
  thumbnail_url: string | null;
  price: number;
  created_at: string;
  status: string;
  order_id?: number | null;
}

export default function MyConfigurations() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();
  
  const [configurations, setConfigurations] = useState<SavedConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/my-configurations');
      return;
    }

    loadConfigurations();
  }, [isAuthenticated, authLoading, router]);

  const loadConfigurations = async () => {
    try {
      const response = await fetch('/backend/api/configurations/list.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      const items = (data.configurations || []).map((raw: any) => {
        let parsed: any = raw;
        // Normaliser: decoder config_string -> config_data et exposer name/thumbnails
        try {
          // Si config_string existe mais pas config_data, parser config_string
          if (raw.config_string && !raw.config_data) {
            const cfg = JSON.parse(raw.config_string);
            parsed.config_data = cfg;
            if (!raw.name && cfg.name) parsed.name = cfg.name;
            if (!raw.thumbnail_url && cfg.thumbnail_url) parsed.thumbnail_url = cfg.thumbnail_url;
          }
          // Si config_data est une chaîne, la parser
          if (typeof parsed.config_data === 'string') {
            parsed.config_data = JSON.parse(parsed.config_data);
          }
        } catch (parseError) {
          console.warn('Erreur de parsing config_data:', parseError);
        }
        // Valeur par défaut pour le nom
        if (!parsed.name) parsed.name = `Configuration #${raw.id}`;
        return parsed as SavedConfiguration;
      });
      console.log('📥 Configurations chargées:', items);
      setConfigurations(items);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }

    try {
      const response = await fetch(`/backend/api/configurations/list.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Retirer de la liste
      setConfigurations(configurations.filter(c => c.id !== id));
      alert('✅ Configuration supprimée');
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleAddToCart = async (configId: number) => {
    try {
      const response = await fetch('/backend/api/cart/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          configuration_id: configId,
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout au panier');
      }

      // Afficher un toast au lieu de rediriger
      setToast({ message: 'Configuration ajoutée au panier !', type: 'success' });

      // Masquer le toast après 4 secondes
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleViewConfiguration = (config: SavedConfiguration) => {
    console.log('📤 handleViewConfiguration - config complète:', config);
    console.log('📤 handleViewConfiguration - config.config_data:', config.config_data);
    console.log('📤 handleViewConfiguration - advancedZones:', config.config_data?.advancedZones);

    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(config);
        console.log('📤 Stockage dans localStorage:', `archimeuble:configuration:${config.id}`);
        window.localStorage.setItem(`archimeuble:configuration:${config.id}`, serialized);
        window.localStorage.setItem('archimeuble:configuration:last', serialized);
      } catch (storageError) {
        console.warn('Impossible de sauvegarder la configuration dans localStorage:', storageError);
      }
    }

    let templateKey: string | null = null;
    if (config.prompt) {
      const match = config.prompt.match(/^([A-Za-z0-9]+)\(/);
      templateKey = match ? match[1] : null;
    }

    if (!templateKey && config.template_id) {
      templateKey = String(config.template_id);
    }

    if (!templateKey) {
      router.push('/models');
      return;
    }

    const query = new URLSearchParams();
    query.set('mode', 'edit');
    query.set('configId', String(config.id));
    if (config.prompt) {
      query.set('prompt', config.prompt);
    }

    const url = `/configurator/${templateKey}?${query.toString()}`;
    console.log('📤 Redirection vers:', url);
    router.push(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'en_attente_validation':
        return { label: 'En attente de validation', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
      case 'validee':
        return { label: 'Validée - Prêt pour commande', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'payee':
        return { label: 'Payée', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'en_production':
        return { label: 'En production', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'livree':
        return { label: 'Livrée', color: 'bg-gray-50 text-gray-700 border-gray-200' };
      case 'annulee':
        return { label: 'Annulée', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'en_commande':
        return { label: 'En commande', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Mes Configurations - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-text-secondary">Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Mes Configurations - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-bg-light">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 w-[320px]">
            <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}> 
              <div className="flex items-start gap-3 w-full">
                <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="text-sm">{toast.message}</p>
                  {toast.type === 'success' && (
                    <Link href="/cart" className="text-xs underline mt-1 inline-block">
                      Voir le panier →
                    </Link>
                  )}
                </div>
                <button onClick={() => setToast(null)} className="text-text-secondary hover:text-text-primary">✕</button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Mon compte', href: '/account' },
              { label: 'Mes configurations' }
            ]}
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">
                Mes configurations
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Bienvenue {customer?.first_name} {customer?.last_name}
              </p>
            </div>

            <Link
              href="/models"
              className="btn-primary"
            >
              ➕ Nouvelle configuration
            </Link>
          </div>
        {error && (
          <div className="alert alert-error mb-6">{error}</div>
        )}

        {configurations.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-6xl mb-3">📦</div>
            <h3 className="text-lg font-medium text-text-primary mb-1">Aucune configuration sauvegardée</h3>
            <p className="text-text-secondary mb-5">Créez votre première configuration pour la retrouver ici</p>
            <Link href="/models" className="btn-primary inline-flex items-center gap-2">
              ➕ Commencer une configuration
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configurations.map((config) => (
              <div 
                key={config.id}
                className="card overflow-hidden hover:shadow-lg transition"
              >
                {/* Preview 3D - Configuration réelle */}
                <div className="h-64 bg-gradient-to-br from-bg-light to-bg-default overflow-hidden relative">
                  {config.config_data ? (
                    <ThreeViewer
                        width={config.config_data.dimensions?.width || 1500}
                        height={config.config_data.dimensions?.height || 730}
                        depth={config.config_data.dimensions?.depth || 500}
                        color={config.config_data.styling?.color || '#D8C7A1'}
                        hasSocle={config.config_data.styling?.socle !== 'none'}
                        rootZone={config.config_data.advancedZones || { id: 'root', type: 'leaf', content: 'empty' } as Zone}
                        selectedZoneId={null}
                        onSelectZone={() => {}}
                        isBuffet={false}
                        doorsOpen={config.config_data.features?.doorsOpen ?? false}
                        showDecorations={false}
                        componentColors={config.config_data.componentColors}
                        useMultiColor={config.config_data.useMultiColor || false}
                        doorType={config.config_data.features?.doorType || 'none'}
                        doorSide={config.config_data.features?.doorSide || 'left'}
                        onToggleDoors={() => {}}
                      />
                  ) : (
                    <div className="flex items-center justify-center h-full text-6xl">🪑</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-medium text-text-primary">
                      {config.name}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusInfo(config.status).color}`}>
                      {getStatusInfo(config.status).label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-text-secondary mb-4">
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      <span className="font-semibold text-text-primary">{config.price}€</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(config.created_at)}</span>
                    </div>
                    {config.config_data && config.config_data.dimensions && (
                      <div className="flex items-center gap-2">
                        <span>📏</span>
                        <span>
                          {config.config_data.dimensions.width} × {config.config_data.dimensions.depth} × {config.config_data.dimensions.height} mm
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {config.status === 'validee' ? (
                      <button
                        onClick={() => handleAddToCart(config.id)}
                        className="btn-primary"
                      >
                        🛒 Commander
                      </button>
                    ) : config.status === 'en_commande' && config.order_id ? (
                      <button
                        onClick={() => router.push(`/checkout?order_id=${config.order_id}`)}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-none flex items-center justify-center gap-1 shadow-md"
                      >
                        💳 <span className="text-[10px] uppercase font-bold tracking-wider">Payer</span>
                      </button>
                    ) : ['payee', 'en_production', 'livree', 'en_commande'].includes(config.status) ? (
                      <button
                        disabled
                        className="btn-primary opacity-70 cursor-not-allowed text-[10px] bg-green-600 border-none"
                      >
                        ✅ Commandé
                      </button>
                    ) : config.status === 'annulee' ? (
                      <button
                        disabled
                        className="btn-primary opacity-50 cursor-not-allowed text-[10px] bg-red-600 border-none"
                      >
                        ❌ Annulée
                      </button>
                    ) : (
                      <button
                        disabled
                        title="En attente de validation par un menuisier"
                        className="btn-primary opacity-50 cursor-not-allowed text-[10px]"
                      >
                        ⌛ En attente
                      </button>
                    )}
                    <button
                      onClick={() => handleViewConfiguration(config)}
                      className="btn-secondary"
                    >
                      👁️ Voir
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(config.id)}
                    className="w-full mt-2 btn-secondary text-error hover:bg-error-light"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
