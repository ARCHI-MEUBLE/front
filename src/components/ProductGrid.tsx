import { useCallback, useEffect, useState } from "react";
import { apiClient, FurnitureModel } from "@/lib/apiClient";
import { ProductCard, ProductModel } from "@/components/ProductCard";

export function ProductGrid() {
  const [models, setModels] = useState<ProductModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.models.getAll();
      // Adapter FurnitureModel vers ProductModel
      const productModels: ProductModel[] = data.map((model: FurnitureModel) => ({
        id: model.id,
        name: model.name,
        description: model.description || '',
        image_path: model.image_url || '',
        created_at: model.created_at
      }));
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse flex-col space-y-4 rounded-[32px] border border-[#e7ded3] bg-white/70 p-6"
            >
              <div className="aspect-square w-full rounded-[28px] bg-[#ede3d7]" />
              <div className="space-y-3">
                <div className="h-4 w-2/3 rounded-full bg-[#e7ded3]" />
                <div className="h-3 w-5/6 rounded-full bg-[#e7ded3]" />
                <div className="h-8 w-1/2 rounded-full bg-[#e7ded3]" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center space-y-4 py-16 text-center">
          <p className="text-base font-medium text-ink/70">{error}</p>
          <button
            type="button"
            onClick={loadModels}
            className="rounded-full border border-[#d7c9b9] px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-ink/70 transition hover:border-ink hover:text-ink"
          >
            Réessayer
          </button>
        </div>
      );
    }
    if (models.length === 0) {
      return (
        <p className="py-16 text-center text-base text-ink/50">
          Aucun modèle disponible pour le moment.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <ProductCard key={model.id} model={model} />
        ))}
      </div>
    );
  };

  return (
    <section id="templates" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="heading-serif text-3xl text-ink">Nos modèles les plus demandés</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Inspirez-vous des créations de nos artisans pour imaginer votre prochain meuble sur mesure.
          </p>
        </div>
        <span className="text-sm uppercase tracking-[0.3em] text-ink/40">
          {isLoading ? "Chargement…" : `${models.length} modèles`}
        </span>
      </div>
      {renderContent()}
    </section>
  );
}

