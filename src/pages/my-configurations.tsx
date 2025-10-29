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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
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

      <div className="min-h-screen bg-gray-50">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          } shadow-lg`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{toast.type === 'success' ? '✅' : '❌'}</span>
              <div>
                <p className="font-medium text-sm">{toast.message}</p>
                {toast.type === 'success' && (
                  <Link href="/panier" className="text-xs underline mt-1 block">
                    Voir le panier →
                  </Link>
                )}
              </div>
              <button onClick={() => setToast(null)} className="ml-4 text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Mes Configurations' }
            ]}
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mes Configurations
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Bienvenue {customer?.first_name} {customer?.last_name}
              </p>
            </div>

            <Link
              href="/configurator/select"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
            >
              ➕ Nouvelle configuration
            </Link>
          </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {configurations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune configuration sauvegardée
            </h3>
            <p className="text-gray-600 mb-6">
              Créez votre première configuration pour la retrouver ici
            </p>
            <Link 
              href="/configurator/select"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Commencer une configuration
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configurations.map((config) => (
              <div 
                key={config.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                {/* Preview 3D */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {config.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      <span className="font-semibold text-gray-900">{config.price}€</span>
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
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                    >
                      🛒 Ajouter
                    </button>
                    <button
                      onClick={() => router.push(`/configurator/${config.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                      👁️ Voir
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(config.id)}
                    className="w-full mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
