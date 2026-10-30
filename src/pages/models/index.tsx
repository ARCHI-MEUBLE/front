import { Seo } from "@/components/Seo";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Catégorie lue dans l'URL au chargement, puis seulement lors d'une vraie navigation (lien vers /models?category=…).
  // Les router.replace de la page sont « shallow » et ignorés : leur retour via router.query arrive après coup, parfois
  // quand on a déjà changé de catégorie, et ramenait le carrousel en arrière.
  const { isReady, events } = router;
  const initialCategory = router.query.category;
  useEffect(() => {
    if (!isReady) return;
    if (typeof initialCategory === "string") setActiveCategory(initialCategory);
    const onRouteChange = (url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return;
      const category = new URL(url, window.location.origin).searchParams.get("category");
      if (category) setActiveCategory(category);
    };
    events.on("routeChangeComplete", onRouteChange);
    return () => events.off("routeChangeComplete", onRouteChange);
    // initialCategory volontairement exclu : seule la valeur au chargement compte, la suite passe par routeChangeComplete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, events]);

  useEffect(() => () => {
    if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
  }, []);

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Catégories chargées avec les modèles : le carrousel n'apparaît qu'une fois l'ordre des catégories connu,
      // sinon il s'afficherait d'abord sur une autre catégorie puis glisserait vers celle de l'URL
      const [data] = await Promise.all([
        apiClient.models.getAll(),
        apiClient.categories
          .getAll(true)
          .then(setCategories)
          .catch((err) => console.error("Erreur lors du chargement des catégories:", err)),
      ]);
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
  }, [loadModels]);

  // Mémorisé : recréé à chaque rendu (donc à chaque pas du carrousel), ce tableau faisait recalculer tous les groupes
  // de catégories et redessiner toutes les cartes
  const labelledModels: ModelCardData[] = useMemo(
    () =>
      models.map((model) => {
        const category = categories.find((c) => c.slug === model.categorySlug);
        return { ...model, categoryLabel: category ? category.name : model.categorySlug };
      }),
    [models, categories],
  );

  // L'état change tout de suite ; l'URL n'est réécrite qu'une fois la navigation posée (molette ou glissé enchaînent
  // plusieurs catégories par seconde, et un router.replace à chaque pas saccade le carrousel)
  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
    urlTimerRef.current = setTimeout(() => {
      router.replace(slug === "all" ? "/models" : `/models?category=${slug}`, undefined, { shallow: true });
    }, 250);
  };

  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Seo title="Nos modèles de meubles sur mesure — ArchiMeuble Lille" description="Dressings, bibliothèques, buffets, bureaux, meubles TV : choisissez un modèle et configurez-le en 3D à vos dimensions. Fabriqué dans notre atelier à Lille." />
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
