import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { Seo } from "@/components/Seo";
import { PUBLIC_PAGE_CACHE, fetchBackend } from "@/lib/backendServer";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageGalleryLightbox } from "@/components/facades/RealisationCarousel";
import { RealisationsHero } from "@/components/realisations/RealisationsHero";
import { RealisationsSavoirFaire } from "@/components/realisations/RealisationsSavoirFaire";
import {
  RealisationsCollectionSection,
  RealisationCategory,
} from "@/components/realisations/RealisationsCollectionSection";
import { RealisationData, RealisationImage } from "@/components/realisations/RealisationCard";
import { ContactUniqueSection } from "@/components/shared/ContactUniqueSection";
import { RealisationsDelaiCta } from "@/components/realisations/RealisationsDelaiCta";

const ALL_CATEGORY: RealisationCategory = { slug: "all", name: "Toutes" };

interface RealisationsPageProps {
  // Lus par le serveur : les projets (titres, lieux, photos) arrivent dans la page, lisibles par Google.
  // null si le backend n'a pas répondu à temps : chargement dans le navigateur, comme avant.
  initialRealisations: RealisationData[] | null;
  initialCategories: RealisationCategory[] | null;
}

export const getServerSideProps: GetServerSideProps<RealisationsPageProps> = async ({ res }) => {
  const [realisationsResult, categoriesResult] = await Promise.all([
    fetchBackend("/backend/api/realisations.php"),
    fetchBackend("/backend/api/categories.php?active=true"),
  ]);
  const realisations = realisationsResult.status === "ok" ? (realisationsResult.data as { realisations?: unknown }).realisations : null;
  const categories = categoriesResult.status === "ok" ? (categoriesResult.data as { categories?: unknown }).categories : null;
  const initialRealisations = Array.isArray(realisations) ? (realisations as RealisationData[]) : null;
  if (initialRealisations) res.setHeader("Cache-Control", PUBLIC_PAGE_CACHE);
  return {
    props: {
      initialRealisations,
      initialCategories: Array.isArray(categories) ? (categories as RealisationCategory[]) : null,
    },
  };
};

export default function RealisationsPage({ initialRealisations, initialCategories }: RealisationsPageProps) {
  const [realisations, setRealisations] = useState<RealisationData[]>(initialRealisations ?? []);
  const [categories, setCategories] = useState<RealisationCategory[]>([ALL_CATEGORY, ...(initialCategories ?? [])]);
  const [isLoading, setIsLoading] = useState(!initialRealisations);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [galleryData, setGalleryData] = useState<{ images: RealisationImage[]; startIndex: number } | null>(null);

  useEffect(() => {
    if (initialCategories) return;
    const fetchCategories = async () => {
      try {
        const response = await fetch("/backend/api/categories.php?active=true");
        if (response.ok) {
          const data = await response.json();
          if (data.categories) setCategories([ALL_CATEGORY, ...data.categories]);
        }
      } catch (error) {
        console.error("Erreur chargement catégories:", error);
      }
    };

    fetchCategories();
  }, [initialCategories]);

  useEffect(() => {
    // Déjà fournies par le serveur ; « Réessayer » (reloadKey) recharge depuis le navigateur
    if (initialRealisations && reloadKey === 0) return;
    const fetchRealisations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/backend/api/realisations.php");
        if (response.ok) {
          const data = await response.json();
          setRealisations(data.realisations || []);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      } catch (error) {
        console.error("Erreur chargement réalisations:", error);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealisations();
  }, [initialRealisations, reloadKey]);

  const filteredRealisations =
    selectedCategory === "all" ? realisations : realisations.filter((r) => r.categorie === selectedCategory);

  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Seo title="Nos réalisations de meubles sur mesure à Lille — ArchiMeuble" description="Dressings, bibliothèques, meubles TV : découvrez les meubles sur mesure fabriqués dans notre atelier lillois et posés chez nos clients de la métropole." />
      <Header />
      <main className="flex-1">
        <RealisationsHero />
        <RealisationsSavoirFaire />
        <RealisationsCollectionSection
          realisations={filteredRealisations}
          categories={categories}
          isLoading={isLoading}
          loadFailed={loadFailed}
          onRetry={() => setReloadKey((key) => key + 1)}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onGalleryOpen={(images, startIndex) => setGalleryData({ images, startIndex })}
        />
        <ContactUniqueSection />
        <RealisationsDelaiCta />
      </main>
      <Footer />

      <AnimatePresence>
        {galleryData && (
          <ImageGalleryLightbox
            images={galleryData.images}
            startIndex={galleryData.startIndex}
            onClose={() => setGalleryData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
