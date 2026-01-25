import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import FacadeControls from '@/components/facades/FacadeControls';
import { FacadeConfig, FacadeDrilling, FacadeMaterial } from '@/types/facade';
import type { FacadeViewerHandle } from '@/components/facades/FacadeViewer';

// Import dynamique pour éviter les erreurs SSR avec Three.js
const FacadeViewer = dynamic(() => import('@/components/facades/FacadeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#FAFAF9]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
        <p className="text-sm font-medium text-[#706F6C]">Chargement du visualiseur 3D...</p>
      </div>
    </div>
  ),
});

export default function FacadesPage() {
  const viewerRef = useRef<FacadeViewerHandle>(null);
  const [materials, setMaterials] = useState<FacadeMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration par défaut
  const [config, setConfig] = useState<FacadeConfig>({
    width: 600,
    height: 800,
    depth: 19,
    material: {
      id: 1,
      name: 'Chêne Naturel',
      color_hex: '#D8C7A1',
      texture_url: '',
      price_modifier: 0,
      price_per_m2: 150,
      is_active: true,
    },
    hinges: {
      type: 'no-hole-no-hinge',
      count: 3,
      direction: 'right',
      price: 0,
    },
    drillings: [],
  });

  // Charger les matériaux depuis l'API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/backend/api/facade-materials.php?active=1`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setMaterials(data.data);
          // Mettre à jour avec le premier matériau disponible
          setConfig((prev) => ({
            ...prev,
            material: data.data[0],
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des matériaux:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const handleUpdateConfig = (updates: Partial<FacadeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleAddDrilling = (drilling: FacadeDrilling) => {
    setConfig((prev) => ({
      ...prev,
      drillings: [...prev.drillings, drilling],
    }));
  };

  const handleRemoveDrilling = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      drillings: prev.drillings.filter((d) => d.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Configurateur de Façades | ArchiMeuble</title>
        <meta
          name="description"
          content="Configurez vos façades sur mesure avec notre visualiseur 3D interactif"
        />
      </Head>

      <div className="flex min-h-screen flex-col">
        <Header />

        {/* Header Section */}
        <div className="border-b border-[#E8E6E3] bg-white mt-6">
          <div className="container mx-auto px-4 py-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1917]">
                Configurateur de Façades
              </h1>
              <p className="mt-2 text-[#706F6C]">
                Créez vos façades sur mesure avec dimensions, couleurs et perçages personnalisés
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Viewer Section - Left */}
          <div className="flex-1 bg-[#FAFAF9]">
            <div className="h-full p-6">
              <div className="h-full rounded-lg border border-[#E8E6E3] bg-white shadow-sm overflow-hidden">
                <FacadeViewer ref={viewerRef} config={config} showGrid={false} />
              </div>
            </div>
          </div>

          {/* Controls Section - Right */}
          <div className="w-[400px] flex-shrink-0">
            <FacadeControls
              config={config}
              materials={materials}
              onUpdateConfig={handleUpdateConfig}
              onAddDrilling={handleAddDrilling}
              onRemoveDrilling={handleRemoveDrilling}
            />
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
