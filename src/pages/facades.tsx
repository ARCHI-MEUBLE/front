import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HOME_SECTION_NO_TOP } from '@/components/home/homeLayout';
import FacadeControls from '@/components/facades/FacadeControls';
import { FacadeConfig, FacadeDrilling, FacadeMaterial } from '@/types/facade';
import type { FacadeViewerHandle } from '@/components/facades/FacadeViewer';

// Import dynamique pour éviter les erreurs SSR avec Three.js
const FacadeViewer = dynamic(() => import('@/components/facades/FacadeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-am-mist/25">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="text-sm font-medium text-black/70">Chargement du visualiseur 3D...</p>
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
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

      <div className="flex min-h-screen flex-col bg-am-paper">
        <Header />

        {/* Sur grand écran, l'outil occupe exactement la hauteur sous l'en-tête : le prix et les boutons restent visibles, seul le panneau de réglages défile */}
        <div className="flex flex-col lg:h-[calc(100dvh-68px)]">
          <section aria-labelledby="facades-title" className={`${HOME_SECTION_NO_TOP} flex-none py-5 sm:py-6`}>
            <h1
              id="facades-title"
              className="m-0 font-medium leading-tight tracking-[-0.03em] text-black"
              style={{ fontSize: "clamp(28px,3vw,40px)" }}
            >
              Configurateur de façades
            </h1>
            <p className="m-0 mt-1 text-[15px] text-black/70">
              Créez vos façades sur mesure avec dimensions, couleurs et perçages personnalisés
            </p>
          </section>

          <div className="flex min-h-0 flex-1 flex-col border-t border-black/15 lg:flex-row">
            {/* Viewer */}
            <div className="h-[55vh] min-h-[320px] bg-am-mist/25 p-3 sm:p-6 lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="h-full overflow-hidden rounded-lg border border-black/15 bg-white shadow-sm">
                <FacadeViewer ref={viewerRef} config={config} showGrid={false} />
              </div>
            </div>

            {/* Réglages */}
            <div className="w-full flex-shrink-0 lg:h-full lg:w-[400px]">
              <FacadeControls
                config={config}
                materials={materials}
                onUpdateConfig={handleUpdateConfig}
                onAddDrilling={handleAddDrilling}
                onRemoveDrilling={handleRemoveDrilling}
              />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
