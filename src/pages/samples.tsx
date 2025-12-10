import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { apiClient, type SampleType } from "@/lib/apiClient";
import { SampleCard } from "@/components/samples/SampleCard";
import { useRouter } from "next/router";
import { useCustomer } from "@/context/CustomerContext";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Truck, CheckCircle } from "lucide-react";
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

const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  "Aggloméré": "Économique et polyvalent, idéal pour les intérieurs de meubles",
  "MDF + revêtement (mélaminé)": "Surface lisse et résistante, large choix de finitions",
  "Plaqué bois": "Authenticité du bois naturel avec une stabilité optimale",
};

export default function SamplesPage() {
  const router = useRouter();
  const { isAuthenticated } = useCustomer();
  const [materials, setMaterials] = useState<MaterialsMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [samplesInCart, setSamplesInCart] = useState(0);
  const [samplesInCartIds, setSamplesInCartIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    apiClient.samples
      .listPublic()
      .then((data) => {
        if (!mounted) return;
        setMaterials(data);
        const first = MATERIAL_ORDER.find((m) => data[m]?.length)
          || Object.keys(data)[0]
          || null;
        setSelectedMaterial(first);
      })
      .catch((err) => {
        console.error('Erreur chargement échantillons:', err);
      })
      .finally(() => mounted && setLoading(false));

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
    return materials[selectedMaterial] || [];
  }, [materials, selectedMaterial]);

  const colorsForMaterial = useMemo(() => {
    const list = typesForSelected.flatMap((t) => t.colors || []);
    const map = new Map<string, typeof list[number]>();
    for (const c of list) {
      const key = `${(c.name || '').toLowerCase()}|${c.image_url || c.hex || ''}`;
      if (!map.has(key)) map.set(key, c);
    }
    return Array.from(map.values());
  }, [typesForSelected]);

  const handleAddToCart = async (colorId: number) => {
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

      setSamplesInCart(data.samples_count || samplesInCart + 1);
      setSamplesInCartIds(prev => new Set(prev).add(colorId));
    } catch (error) {
      console.error('Erreur ajout panier:', error);
      throw error;
    }
  };

  const materialList = MATERIAL_ORDER.concat(
    Object.keys(materials).filter((m) => !MATERIAL_ORDER.includes(m))
  ).filter(m => materials[m]?.length);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Échantillons — ArchiMeuble</title>
        <meta name="description" content="Commandez gratuitement jusqu'à 3 échantillons de nos matériaux pour découvrir nos finitions." />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-24 lg:py-32">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
              >
                Échantillons gratuits
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Touchez la qualité
                <br />
                <span className="text-[#8B7355]">avant de commander</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-white/70"
              >
                Recevez gratuitement jusqu'à 3 échantillons de nos matériaux.
                Découvrez les textures, les couleurs et la qualité de nos finitions.
              </motion.p>

              {/* Progress indicator */}
              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-10"
                >
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`h-2 w-8 rounded-full transition-colors ${
                            i < samplesInCart ? 'bg-[#8B7355]' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-white/80">
                      {samplesInCart}/3 sélectionnés
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-[#E8E4DE] bg-white py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { icon: Package, title: "3 échantillons", desc: "Offerts pour votre projet" },
                { icon: Truck, title: "Livraison gratuite", desc: "Sous 3-5 jours ouvrés" },
                { icon: CheckCircle, title: "Qualité garantie", desc: "Matériaux de nos ateliers" },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F3F0]">
                    <feature.icon className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1A1917]">{feature.title}</h3>
                    <p className="text-sm text-[#6B6560]">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Material Selection */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h2 className="font-serif text-3xl text-[#1A1917]">Choisissez votre matériau</h2>
              <p className="mt-3 text-[#6B6560]">Sélectionnez le type de finition qui correspond à votre projet</p>
            </div>

            {/* Material Cards */}
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {materialList.map((m, i) => (
                <motion.button
                  key={m}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => setSelectedMaterial(m)}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-300 ${
                    selectedMaterial === m
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E4DE] bg-white hover:border-[#1A1917]/20 hover:shadow-lg'
                  }`}
                >
                  <div className="relative z-10">
                    <h3 className={`text-lg font-semibold ${
                      selectedMaterial === m ? 'text-white' : 'text-[#1A1917]'
                    }`}>
                      {m}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed ${
                      selectedMaterial === m ? 'text-white/70' : 'text-[#6B6560]'
                    }`}>
                      {MATERIAL_DESCRIPTIONS[m] || "Découvrez nos finitions disponibles"}
                    </p>
                    <div className={`mt-4 text-xs font-medium uppercase tracking-wider ${
                      selectedMaterial === m ? 'text-[#8B7355]' : 'text-[#8B7355]'
                    }`}>
                      {(materials[m]?.flatMap(t => t.colors) || []).length} coloris
                    </div>
                  </div>

                  {/* Decorative element */}
                  <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full transition-transform duration-500 ${
                    selectedMaterial === m
                      ? 'bg-[#8B7355]/20 scale-150'
                      : 'bg-[#F5F3F0] scale-100 group-hover:scale-125'
                  }`} />
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Colors Grid */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-64 items-center justify-center"
                >
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
                </motion.div>
              ) : colorsForMaterial.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-64 flex-col items-center justify-center text-center"
                >
                  <p className="text-lg text-[#6B6560]">Aucun coloris disponible pour ce matériau.</p>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedMaterial}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 flex items-center justify-between">
                    <h3 className="text-xl font-medium text-[#1A1917]">
                      {colorsForMaterial.length} coloris disponibles
                    </h3>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {colorsForMaterial.map((c, i) => (
                      <SampleCard
                        key={c.id}
                        color={c}
                        material={selectedMaterial || ''}
                        onAddToCart={handleAddToCart}
                        isInCart={samplesInCartIds.has(c.id)}
                        isLimitReached={samplesInCart >= 3 && !samplesInCartIds.has(c.id)}
                        index={i}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1A1917',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
}
