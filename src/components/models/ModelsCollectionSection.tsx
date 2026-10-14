import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { ModelCard, ModelCardData } from "@/components/models/ModelCard";
import { Category } from "@/lib/apiClient";

type CategoryTab = { slug: string; label: string; count: number };

export function ModelsCollectionSection({
  models,
  categories,
  isLoading,
  error,
  onRetry,
  activeCategory,
  onCategoryChange,
}: {
  models: ModelCardData[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}) {
  const tabs: CategoryTab[] = [
    { slug: "all", label: "Tous", count: models.length },
    ...categories.map((category) => ({
      slug: category.slug,
      label: category.name,
      count: models.filter((model) => model.categorySlug === category.slug).length,
    })),
  ];

  const filteredModels =
    activeCategory === "all" ? models : models.filter((model) => model.categorySlug === activeCategory);

  return (
    <section
      aria-labelledby="collection-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(64px,8vw,112px)" }}
    >
      <div className="sticky top-[68px] z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-black/15 bg-am-paper/95 py-4 backdrop-blur-md">
        <h2
          id="collection-title"
          className="m-0 font-[Geist] font-medium tracking-[-0.04em] text-black"
          style={{ fontSize: "clamp(24px,2.4vw,32px)" }}
        >
          Explorez notre collection
        </h2>
        <div role="tablist" aria-label="Catégories" className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.slug === activeCategory;
            return (
              <button
                key={tab.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onCategoryChange(tab.slug)}
                className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] ${
                  isActive
                    ? "border-black bg-am-navy text-white"
                    : "border-black/15 bg-white text-black"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-[Geist_Mono] text-[11px] opacity-70">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="animate-pulse rounded bg-am-mist/25" style={{ aspectRatio: "4/5" }} />
              <div className="h-5 w-2/3 animate-pulse rounded bg-am-mist/25" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-am-mist/25" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-black/70">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-black bg-am-navy px-6 py-3 text-[15px] font-medium text-white"
          >
            Réessayer
          </button>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="py-20 text-center text-black/70">Aucun modèle dans cette catégorie.</div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model, index) => (
            <ModelCard key={model.id} model={model} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
