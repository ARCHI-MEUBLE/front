import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { apiClient, type SampleType } from "@/lib/apiClient";
import { SampleCard } from "@/components/samples/SampleCard";
import { useRouter } from "next/router";
import { useCustomer } from "@/context/CustomerContext";
import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  { ssr: false }
);

type MaterialsMap = Record<string, SampleType[]>;

const MATERIAL_ORDER = [
  "Aggloméré",
  "MDF + revêtement (mélaminé)",
  "Plaqué bois",
];

export default function SamplesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCustomer();
  const [materials, setMaterials] = useState<MaterialsMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [samplesInCart, setSamplesInCart] = useState(0);
  const [samplesInCartIds, setSamplesInCartIds] = useState<Set<number>>(new Set());
  // On simplifie la vue publique: pas de sous-catégorie "type" visible.
  // On affiche toutes les couleurs d'un matériau, tous types confondus.

  useEffect(() => {
    let mounted = true;
    apiClient.samples
      .listPublic()
      .then((data) => {
        if (!mounted) return;
        console.log('📦 Données échantillons reçues:', data);
        console.log('📋 Matériaux disponibles:', Object.keys(data));
        setMaterials(data);
        // Choisir un matériau par défaut (ordre défini ou premier dispo)
        const first = MATERIAL_ORDER.find((m) => data[m]?.length)
          || Object.keys(data)[0]
          || null;
        console.log('🎯 Matériau sélectionné:', first);
        setSelectedMaterial(first);
        // Plus de sélection de type: on combine toutes les couleurs du matériau
      })
      .catch((err) => {
        console.error('❌ Erreur chargement échantillons:', err);
      })
      .finally(() => mounted && setLoading(false));

    // Charger le panier d'échantillons si connecté
    if (isAuthenticated) {
      loadSamplesCart();
    }

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const loadSamplesCart = async () => {
    try {
      const response = await fetch('/api/cart/samples', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSamplesInCart(data.count || 0);
        const ids = new Set(data.items?.map((item: any) => item.sample_color_id) || []);
        setSamplesInCartIds(ids);
      }
    } catch (error) {
      console.error('Erreur chargement panier échantillons:', error);
    }
  };

  const typesForSelected = useMemo<SampleType[]>(() => {
    if (!selectedMaterial) return [];
    const types = materials[selectedMaterial] || [];
    console.log(`🔍 Types pour "${selectedMaterial}":`, types);
    if (types.length > 0) {
      console.log('🔍 Premier type:', types[0]);
      console.log('🔍 Couleurs du premier type:', types[0].colors);
    }
    return types;
  }, [materials, selectedMaterial]);

  const colorsForMaterial = useMemo(() => {
    console.log('🔍 Types sélectionnés:', typesForSelected);
    const list = typesForSelected.flatMap((t) => t.colors || []);
    console.log('🎨 Liste couleurs avant déduplication:', list.length);
    // Optionnel: dédoublonner par nom si la même couleur existe dans plusieurs types
    const map = new Map<string, typeof list[number]>();
    for (const c of list) {
      const key = `${(c.name || '').toLowerCase()}|${c.image_url || c.hex || ''}`;
      if (!map.has(key)) map.set(key, c);
    }
    const colors = Array.from(map.values());
    console.log('🎨 Couleurs finales:', colors.length, colors);
    return colors;
  }, [typesForSelected]);

  const handleAddToCart = async (colorId: number) => {
    // Vérifier si l'utilisateur est connecté
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/samples');
      return;
    }

    try {
      const response = await fetch('/api/cart/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sample_color_id: colorId, quantity: 1 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout au panier');
      }

      // Succès - mettre à jour le compteur
      setSamplesInCart(data.samples_count || samplesInCart + 1);
      setSamplesInCartIds(prev => new Set(prev).add(colorId));

      // Succès - l'animation "Ajouté" est gérée par le SampleCard
    } catch (error) {
      console.error('Erreur ajout panier:', error);
      throw error;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-alabaster text-ink">
      <Head>
        <title>Échantillons — ArchiMeuble</title>
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="w-full bg-gradient-to-b from-white/80 to-alabaster py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h1 className="heading-serif text-5xl text-ink">Échantillons de façades</h1>
            <p className="mt-3 text-sm uppercase tracking-[0.18em] text-ink/60">
              3 échantillons offerts
              {isAuthenticated && samplesInCart > 0 && (
                <span className="ml-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                  {samplesInCart}/3 dans votre panier
                </span>
              )}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-10">
          {/* Onglets Matériaux */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {MATERIAL_ORDER.concat(
              Object.keys(materials).filter((m) => !MATERIAL_ORDER.includes(m))
            ).map((m) => (
              <button
                key={m}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedMaterial === m
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink/80 border-border-light hover:bg-bg-light'
                }`}
                onClick={() => {
                  setSelectedMaterial(m);
                  // plus de sélection par type
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Plus de filtres par type: une couleur = un échantillon, sous le matériau */}

          {/* Grille des couleurs (tous types confondus pour le matériau) */}
          <div className="mt-10">
            {loading ? (
              <div className="text-center text-text-secondary">Chargement…</div>
            ) : colorsForMaterial.length === 0 ? (
              <div className="card text-center">Aucune couleur disponible pour ce matériau.</div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {colorsForMaterial.map((c) => (
                  <SampleCard
                    key={c.id}
                    color={c}
                    material={selectedMaterial || ''}
                    onAddToCart={handleAddToCart}
                    isInCart={samplesInCartIds.has(c.id)}
                    isLimitReached={samplesInCart >= 3 && !samplesInCartIds.has(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
