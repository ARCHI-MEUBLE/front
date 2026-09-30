import Head from "next/head";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCallback, useEffect, useState } from "react";
import { apiClient, FurnitureModel, Category } from "@/lib/apiClient";
import { ModelsHero } from "@/components/models/ModelsHero";
import { ModelsCollectionSection } from "@/components/models/ModelsCollectionSection";
import { ModelsCta } from "@/components/models/ModelsCta";
import { ModelCardData } from "@/components/models/ModelCard";

function inferCategorySlug(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("dressing")) return "dressing";
  if (lower.includes("biblio")) return "bibliotheque";
  if (lower.includes("buffet")) return "buffet";
  if (lower.includes("bureau")) return "bureau";
  if (lower.includes("tv")) return "meuble-tv";
  if (lower.includes("escalier")) return "sous-escalier";
  if (lower.includes("lit")) return "tete-de-lit";
  return "all";
}

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    if (router.isReady && router.query.category) {
      setActiveCategory(router.query.category as string);
    }
  }, [router.isReady, router.query.category]);

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.models.getAll();
      const productModels: ModelCardData[] = data.map((model: FurnitureModel) => {
        const categorySlug = model.category || inferCategorySlug(model.name);
        return {
          id: model.id,
          name: model.name,
          description: model.description || "",
          imagePath: model.image_url || null,
          categorySlug,
          categoryLabel: categorySlug,
        };
      });
      setModels(productModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();

    const loadCategories = async () => {
      try {
        const data = await apiClient.categories.getAll(true);
        setCategories(data);
      } catch (err) {
        console.error("Erreur lors du chargement des catégories:", err);
      }
    };
    void loadCategories();
  }, [loadModels]);

  const labelledModels: ModelCardData[] = models.map((model) => {
    const category = categories.find((c) => c.slug === model.categorySlug);
    return { ...model, categoryLabel: category ? category.name : model.categorySlug };
  });

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    router.replace(slug === "all" ? "/models" : `/models?category=${slug}`, undefined, { shallow: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>Nos Modèles — ArchiMeuble</title>
        <meta
          name="description"
          content="Découvrez nos modèles de meubles sur mesure fabriqués à Lille. Dressings, bibliothèques, buffets, bureaux, meubles TV et plus."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <ModelsHero />
        <ModelsCollectionSection
          models={labelledModels}
          categories={categories}
          isLoading={isLoading}
          error={error}
          onRetry={loadModels}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
        <ModelsCta />
      </main>
      <Footer />
    </div>
  );
}
