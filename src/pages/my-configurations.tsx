import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import Image from 'next/image';

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
      const response = await fetch('http://localhost:8000/backend/api/configurations/list.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      setConfigurations(data.configurations || []);
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
      const response = await fetch(`http://localhost:8000/backend/api/configurations/list.php?id=${id}`, {
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
      const response = await fetch('http://localhost:8000/backend/api/cart/index.php', {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
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
              href="/configurator/select"
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
            <Link href="/configurator/select" className="btn-primary inline-flex items-center gap-2">
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
                {/* Preview 3D */}
                <div className="aspect-video bg-gradient-to-br from-bg-light to-bg-default flex items-center justify-center">
                  {config.glb_url ? (
                    <div className="w-full h-full relative">
                      {/* Utiliser model-viewer pour afficher le GLB */}
                      <model-viewer
                        src={config.glb_url}
                        alt={config.name}
                        auto-rotate
                        camera-controls
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  ) : (
                    <div className="text-6xl">🪑</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-base font-medium text-text-primary mb-2">
                    {config.name}
                  </h3>
                  
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
                    <button
                      onClick={() => handleAddToCart(config.id)}
                      className="btn-primary"
                    >
                      🛒 Ajouter
                    </button>
                    <button
                      onClick={() => {
                        // Cas idéal: on a un prompt sauvegardé -> on ouvre le configurateur avec la clé template et le prompt
                        if (config.prompt) {
                          const match = config.prompt.match(/^([A-Za-z0-9]+)\(/);
                          const templateKey = match ? match[1] : (config.template_id ? String(config.template_id) : 'M1');
                          router.push(`/configurator/${templateKey}?prompt=${encodeURIComponent(config.prompt)}`);
                          return;
                        }

                        // Sinon, si on a un template_id numérique, on ouvre sur ce modèle (sans prompt)
                        if (config.template_id && Number(config.template_id) > 0) {
                          router.push(`/configurator/${config.template_id}`);
                          return;
                        }

                        // Fallback: renvoyer vers la sélection
                        router.push('/configurator/select');
                      }}
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
