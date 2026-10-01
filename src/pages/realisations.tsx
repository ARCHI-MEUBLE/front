"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
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

export default function RealisationsPage() {
  const [realisations, setRealisations] = useState<RealisationData[]>([]);
  const [categories, setCategories] = useState<RealisationCategory[]>([ALL_CATEGORY]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [galleryData, setGalleryData] = useState<{ images: RealisationImage[]; startIndex: number } | null>(null);

  useEffect(() => {
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

    const fetchRealisations = async () => {
      try {
        const response = await fetch("/backend/api/realisations.php");
        if (response.ok) {
          const data = await response.json();
          setRealisations(data.realisations || []);
        }
      } catch (error) {
        console.error("Erreur chargement réalisations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
    fetchRealisations();
  }, []);

  const filteredRealisations =
    selectedCategory === "all" ? realisations : realisations.filter((r) => r.categorie === selectedCategory);

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>Nos Réalisations — ArchiMeuble</title>
        <meta
          name="description"
          content="Découvrez nos réalisations de meubles sur mesure : dressings, bibliothèques, meubles TV. Fabrication artisanale Made in France dans la métropole lilloise."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <RealisationsHero />
        <RealisationsSavoirFaire />
        <RealisationsCollectionSection
          realisations={filteredRealisations}
          categories={categories}
          isLoading={isLoading}
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
