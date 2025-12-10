"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, FurnitureModel } from "@/lib/apiClient";
import { ProductCard, ProductModel } from "@/components/ProductCard";

const categories = [
  { id: "all", label: "Tout" },
  { id: "dressing", label: "Dressing" },
  { id: "bibliotheque", label: "Bibliothèque" },
  { id: "buffet", label: "Buffet" },
  { id: "bureau", label: "Bureau" },
  { id: "meuble-tv", label: "Meuble TV" },
  { id: "sous-escalier", label: "Sous-escalier" },
  { id: "tete-de-lit", label: "Tête de lit" },
];

export function ProductGrid() {
  const [models, setModels] = useState<ProductModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.models.getAll();
      const productModels: ProductModel[] = data.map((model: FurnitureModel) => ({
        id: model.id,
        name: model.name,
        description: model.description || "",
        image_path: model.image_url || "",
        created_at: model.created_at,
        base_price: 890,
        category: model.name.toLowerCase().includes("dressing") ? "dressing"
          : model.name.toLowerCase().includes("biblio") ? "bibliotheque"
          : model.name.toLowerCase().includes("buffet") ? "buffet"
          : model.name.toLowerCase().includes("bureau") ? "bureau"
          : model.name.toLowerCase().includes("tv") ? "meuble-tv"
          : model.name.toLowerCase().includes("escalier") ? "sous-escalier"
          : model.name.toLowerCase().includes("lit") ? "tete-de-lit"
          : "all"
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

  const filteredModels = activeCategory === "all"
    ? models
    : models.filter(m => m.category === activeCategory);

  return (
    <>
      {/* Filter tabs */}
      <div className="border-y border-[#E5E5E5]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="-mb-px flex gap-8 overflow-x-auto py-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative whitespace-nowrap text-sm transition-colors ${
                  activeCategory === cat.id
                    ? "text-[#1A1917]"
                    : "text-[#999] hover:text-[#1A1917]"
                }`}
              >
                {cat.label}
                {activeCategory === cat.id && (
                  <span className="absolute -bottom-4 left-0 right-0 h-px bg-[#1A1917]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {isLoading ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[4/3] animate-pulse bg-[#F5F5F5]" />
                <div className="mt-6 h-4 w-24 animate-pulse bg-[#F5F5F5]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-[#999]">{error}</p>
            <button
              onClick={loadModels}
              className="mt-6 text-sm text-[#1A1917] underline underline-offset-4"
            >
              Réessayer
            </button>
          </div>
        ) : filteredModels.length === 0 ? (
          <p className="py-20 text-center text-[#999]">
            Aucun modèle dans cette catégorie.
          </p>
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => (
              <ProductCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
