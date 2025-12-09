"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, FurnitureModel } from "@/lib/apiClient";
import { ProductCard, ProductModel } from "@/components/ProductCard";

const categories = [
  { id: "all", label: "Tous" },
  { id: "dressing", label: "Dressing" },
  { id: "bibliotheque", label: "Bibliotheque" },
  { id: "buffet", label: "Buffet" },
  { id: "bureau", label: "Bureau" },
  { id: "meuble-tv", label: "Meuble TV" },
  { id: "sous-escalier", label: "Sous-escalier" },
  { id: "tete-de-lit", label: "Tete de lit" },
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
      {/* Filters - Sticky */}
      <div className="sticky top-[73px] z-40 border-b border-[#E8E6E3] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={
                  "whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all " +
                  (activeCategory === cat.id
                    ? "bg-[#1A1917] text-white"
                    : "border border-[#E8E6E3] text-[#1A1917] hover:border-[#1A1917]")
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-[#F5F5F4]" />
                <div className="mt-4 space-y-2">
                  <div className="h-5 w-1/2 bg-[#F5F5F4]" />
                  <div className="h-4 w-3/4 bg-[#F5F5F4]" />
                  <div className="h-4 w-1/4 bg-[#F5F5F4]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-[#706F6C]">{error}</p>
            <button
              onClick={loadModels}
              className="mt-4 rounded-full border border-[#1A1917] px-6 py-2 text-sm font-medium text-[#1A1917] hover:bg-[#1A1917] hover:text-white"
            >
              Reessayer
            </button>
          </div>
        ) : filteredModels.length === 0 ? (
          <p className="py-16 text-center text-[#706F6C]">
            Aucun modele dans cette categorie.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => (
              <ProductCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
