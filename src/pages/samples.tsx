"use client";

import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiClient, type SampleType } from "@/lib/apiClient";
import { SampleCard } from "@/components/samples/SampleCard";
import { useRouter } from "next/router";
import { useCustomer } from "@/context/CustomerContext";
import { IconPackage, IconTruck, IconCircleCheck, IconChevronRight } from "@tabler/icons-react";
import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  { ssr: false }
);

// Composant pour l'effet peinture
function PaintHighlight({ children, color = "#FDE047" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <svg
        className="absolute -inset-x-2 -inset-y-1 -z-10 h-[calc(100%+8px)] w-[calc(100%+16px)]"
        viewBox="0 0 120 50"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M8,12 Q2,8 4,18 L2,25 Q0,32 6,38 L12,42 Q18,46 25,44 L95,46 Q105,48 110,42 L116,35 Q120,28 118,20 L115,12 Q112,4 105,6 L20,4 Q12,2 8,12 Z"
          fill={color}
          opacity="0.55"
        />
        <path
          d="M12,14 Q6,12 8,20 L6,26 Q4,33 10,36 L16,40 Q22,43 30,41 L90,43 Q100,44 104,39 L110,32 Q114,26 112,19 L109,13 Q106,7 98,9 L25,7 Q16,6 12,14 Z"
          fill={color}
          opacity="0.35"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

type MaterialsMap = Record<string, SampleType[]>;

const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  "Aggloméré": "Économique et polyvalent, idéal pour les intérieurs de meubles",
  "MDF + revêtement (mélaminé)": "Surface lisse et résistante, large choix de finitions",
  "Plaqué bois": "Authenticité du bois naturel avec une stabilité optimale",
};

export default function SamplesPage() {
  const router = useRouter();
  const { isAuthenticated } = useCustomer();
  const sectionRef = useRef<HTMLElement>(null);
  const [materials, setMaterials] = useState<MaterialsMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [samplesInCart, setSamplesInCart] = useState(0);
  const [samplesInCartIds, setSamplesInCartIds] = useState<Set<number>>(new Set());
  const [freeSamplesInCart, setFreeSamplesInCart] = useState(0);

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll("[data-animate]");
    elements?.forEach((el, i) => {
      (el as HTMLElement).style.animationDelay = `${i * 80}ms`;
      el.classList.add("animate-in");
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    apiClient.samples
      .listPublic()
      .then((data) => {
        if (!mounted) return;
        setMaterials(data);
        const first = Object.keys(data).find((m) => data[m]?.length) || null;
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
        const items = data.items || [];
        const ids = new Set(items.map((item: any) => item.sample_color_id));
        setSamplesInCartIds(ids);

        const freeCount = items.filter((item: any) => (item.unit_price ?? 0) <= 0).length;
        setFreeSamplesInCart(freeCount);
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
    const list = typesForSelected.flatMap((t) =>
      (t.colors || []).map(c => ({
        ...c,
        price_per_m2: c.price_per_m2 ?? 0,
        unit_price: c.unit_price ?? 0
      }))
    );
    const map = new Map<string, typeof list[number]>();
    for (const c of list) {
      const key = `${c.id}`;
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

      await loadSamplesCart();
    } catch (error) {
      console.error('Erreur ajout panier:', error);
      throw error;
    }
  };

  const materialList = Object.keys(materials)
    .filter(m => materials[m]?.length)
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const features = [
    { icon: IconPackage, title: "Échantillons", desc: "Découvrez nos finitions" },
    { icon: IconTruck, title: "Livraison", desc: "Livraison en France" },
    { icon: IconCircleCheck, title: "Qualité garantie", desc: "Matériaux de nos ateliers" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Échantillons — ArchiMeuble</title>
        <meta name="description" content="Commandez nos échantillons de matériaux et découvrez les textures et finitions de nos meubles sur mesure." />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section
          ref={sectionRef}
          className="relative bg-[#1A1917] py-16 sm:py-20 lg:py-28 overflow-hidden"
        >
          {/* Background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#8B7355]/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] bg-[#5B4D3A]/15 blur-[100px] rounded-full" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Eyebrow */}
              <div
                data-animate
                className="flex items-center gap-3 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                <div className="h-px w-8 bg-[#8B7355]" />
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                  Nos matériaux
                </span>
              </div>

              {/* Title */}
              <h1
                data-animate
                className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-[-0.02em] text-white opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                Touchez la{" "}
                <PaintHighlight color="#FF6B4A">qualité</PaintHighlight>
                <br />
                avant de commander
              </h1>

              {/* Description */}
              <p
                data-animate
                className="mt-6 text-base sm:text-lg font-medium leading-relaxed text-[#A8A7A3] max-w-xl opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                Commandez nos échantillons de matériaux. Découvrez les textures, les couleurs
                et la qualité de nos finitions avant de finaliser votre projet.
              </p>

              {/* Stats */}

              {/* Cart indicator */}
              {isAuthenticated && samplesInCart > 0 && (
                <div
                  data-animate
                  className="mt-8 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
                >
                  <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                    <span className="text-sm text-white/80">
                      {samplesInCart} échantillon{samplesInCart > 1 ? 's' : ''} dans votre sélection
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-[#E8E6E3] bg-white py-10 lg:py-12">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-3">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#F5F5F4]">
                    <feature.icon className="h-5 w-5 text-[#1A1917]" stroke={1.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1917]">{feature.title}</h3>
                    <p className="text-sm text-[#706F6C]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Material Selection */}
        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                Étape 1
              </span>
              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A1917]">
                Choisissez votre matériau
              </h2>
              <p className="mt-3 text-[#706F6C]">
                Sélectionnez le type de finition qui correspond à votre projet
              </p>
            </div>

            {/* Material Cards */}
            <div className="mt-10 lg:mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materialList.map((m, i) => {
                const colorCount = (materials[m]?.flatMap(t => t.colors) || []).length;
                const isSelected = selectedMaterial === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMaterial(m)}
                    className={`group relative overflow-hidden border-2 p-6 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-[#1A1917] bg-[#1A1917]'
                        : 'border-[#E8E6E3] bg-white hover:border-[#1A1917]'
                    }`}
                  >
                    {/* Corner accent */}
                    <div className={`absolute right-0 top-0 h-10 w-10 origin-top-right transition-transform duration-200 ${
                      isSelected ? 'scale-100 bg-[#8B7355]' : 'scale-0 bg-[#1A1917] group-hover:scale-100'
                    }`} />

                    <div className="relative z-10">
                      <div className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                        isSelected ? 'text-[#8B7355]' : 'text-[#8B7355]'
                      }`}>
                        {colorCount} coloris
                      </div>

                      <h3 className={`mt-2 text-lg font-bold ${
                        isSelected ? 'text-white' : 'text-[#1A1917]'
                      }`}>
                        {m}
                      </h3>

                      <p className={`mt-2 text-sm leading-relaxed ${
                        isSelected ? 'text-white/70' : 'text-[#706F6C]'
                      }`}>
                        {MATERIAL_DESCRIPTIONS[m] || "Découvrez nos finitions disponibles"}
                      </p>

                      <div className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${
                        isSelected ? 'text-[#8B7355]' : 'text-[#1A1917]'
                      }`}>
                        Voir les coloris
                        <IconChevronRight size={16} className={`transition-transform ${isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Colors Grid */}
        <section className="bg-white py-12 lg:py-20 border-t border-[#E8E6E3]">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
              </div>
            ) : colorsForMaterial.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <div className="w-16 h-16 mb-4 bg-[#F5F5F4] rounded-full flex items-center justify-center">
                  <IconPackage size={28} className="text-[#D4D4D4]" />
                </div>
                <p className="text-lg font-bold text-[#1A1917]">Aucun coloris disponible</p>
                <p className="mt-1 text-[#706F6C]">Ce matériau n'a pas encore de coloris.</p>
              </div>
            ) : (
              <div>
                {/* Section header */}
                <div className="mb-8 lg:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                      Étape 2
                    </span>
                    <h3 className="mt-2 text-xl lg:text-2xl font-bold text-[#1A1917]">
                      Sélectionnez vos échantillons
                    </h3>
                    <p className="mt-1 text-sm text-[#706F6C]">
                      {colorsForMaterial.length} coloris disponibles pour {selectedMaterial}
                    </p>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid gap-4 lg:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {colorsForMaterial.map((c, i) => (
                    <SampleCard
                      key={c.id}
                      color={c}
                      material={selectedMaterial || ''}
                      pricePerM2={c.price_per_m2}
                      unitPrice={c.unit_price}
                      onAddToCart={handleAddToCart}
                      isInCart={samplesInCartIds.has(c.id)}
                      isLimitReached={false}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}
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
            borderRadius: '0',
          },
        }}
      />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
