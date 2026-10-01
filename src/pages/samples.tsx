"use client";

import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, type SampleColor, type SampleType } from "@/lib/apiClient";
import { useRouter } from "next/router";
import { useCustomer } from "@/context/CustomerContext";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { SamplesHero } from "@/components/samples/SamplesHero";
import { SamplesMaterialList } from "@/components/samples/SamplesMaterialList";
import { SampleSwatch } from "@/components/samples/SampleSwatch";
import { SamplesKitSidebar } from "@/components/samples/SamplesKitSidebar";

const Toaster = dynamic(() => import("react-hot-toast").then((mod) => mod.Toaster), { ssr: false });

type MaterialsMap = Record<string, SampleType[]>;

const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  Aggloméré: "Économique et polyvalent, idéal pour les intérieurs de meubles",
  "MDF + revêtement (mélaminé)": "Résistant aux rayures, facile à entretenir.",
  "Plaqué bois": "Placage chêne véritable, veinage naturel.",
};

const KIT_SIZE = 5;

export default function SamplesPage() {
  const router = useRouter();
  const { isAuthenticated } = useCustomer();
  const [materials, setMaterials] = useState<MaterialsMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [samplesInCartIds, setSamplesInCartIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  const loadSamplesCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart/samples", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        setSamplesInCartIds(new Set(items.map((item: { sample_color_id: number }) => item.sample_color_id)));
      }
    } catch (error) {
      console.error("Erreur chargement panier échantillons:", error);
    }
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
      .catch((err) => console.error("Erreur chargement échantillons:", err))
      .finally(() => mounted && setLoading(false));

    if (isAuthenticated) void loadSamplesCart();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loadSamplesCart]);

  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    if (!selectedMaterial) return [];
    const list = (materials[selectedMaterial] || []).flatMap((t) => t.colors || []);
    const map = new Map<number, SampleColor>();
    for (const c of list) if (!map.has(c.id)) map.set(c.id, c);
    return Array.from(map.values());
  }, [materials, selectedMaterial]);

  const kitItems = useMemo(
    () => colorsForMaterial.filter((c) => samplesInCartIds.has(c.id)),
    [colorsForMaterial, samplesInCartIds]
  );

  const handleToggle = async (colorId: number) => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/samples");
      return;
    }
    setAddingId(colorId);
    try {
      const response = await fetch("/api/cart/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sample_color_id: colorId, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'ajout au panier");
      await loadSamplesCart();
      const color = colorsForMaterial.find((c) => c.id === colorId);
      toast.success(`${color?.name || "Échantillon"} ajouté à votre kit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout");
    } finally {
      setAddingId(null);
    }
  };

  const materialList = Object.keys(materials)
    .filter((m) => materials[m]?.length)
    .sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>Échantillons — ArchiMeuble</title>
        <meta
          name="description"
          content="Commandez nos échantillons de matériaux et découvrez les textures et finitions de nos meubles sur mesure."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <SamplesHero />

        <section
          aria-labelledby="ech-step1-title"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(72px,9vw,128px)", scrollMarginTop: 80 }}
        >
          <div className="grid grid-cols-1 items-start gap-[clamp(32px,4vw,56px)] lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-[clamp(56px,7vw,88px)]">
              <SamplesMaterialList
                materials={materialList}
                descriptions={MATERIAL_DESCRIPTIONS}
                selected={selectedMaterial}
                onSelect={setSelectedMaterial}
              />

              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-4">
                    <span className="font-[Geist_Mono] text-xs uppercase tracking-[0.05em] text-[#5F5B53]">02</span>
                    <h2 className="m-0 font-[Geist] font-medium tracking-[-0.045em] text-[#161513]" style={{ fontSize: "clamp(28px,3vw,44px)" }}>
                      Choisissez vos teintes
                    </h2>
                  </div>
                  <span className="text-[15px] text-[#5F5B53]">Jusqu&apos;à {KIT_SIZE} échantillons par envoi</span>
                </div>

                {loading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#161513] border-t-transparent" />
                  </div>
                ) : colorsForMaterial.length === 0 ? (
                  <p className="m-0 text-[#5F5B53]">Ce matériau n&apos;a pas encore de coloris.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {colorsForMaterial.map((color) => (
                      <SampleSwatch
                        key={color.id}
                        color={color}
                        isInCart={samplesInCartIds.has(color.id)}
                        isLimitReached={kitItems.length >= KIT_SIZE}
                        isAdding={addingId === color.id}
                        onToggle={() => handleToggle(color.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <SamplesKitSidebar selectedMaterial={selectedMaterial} kitItems={kitItems} />
          </div>
        </section>
      </main>
      <Footer />

      <Toaster position="bottom-center" toastOptions={{ style: { background: "#161513", color: "#F7F6F2", borderRadius: "999px" } }} />
    </div>
  );
}
