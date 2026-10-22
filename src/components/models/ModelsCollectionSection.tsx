import { useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { ModelCardData } from "@/components/models/ModelCard";
import { CategoryCarousel } from "@/components/models/CategoryCarousel";
import { ProductCarousel } from "@/components/models/ProductCarousel";
import { groupModelsByCategory, mod, useVisibleCount } from "@/components/models/modelsCarousel";
import { Category } from "@/lib/apiClient";

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
  const groups = useMemo(() => groupModelsByCategory(models, categories), [models, categories]);
  const visible = useVisibleCount();

  // Index non borné (cyclique) + sens du dernier déplacement, partagés par les deux carrousels pour animer dans le même sens
  const [nav, setNav] = useState({ virtualIndex: 0, direction: 1 });
  const currentIndex = groups.length ? mod(nav.virtualIndex, groups.length) : 0;
  const activeIndex = groups.findIndex((group) => group.slug === activeCategory);

  // Catégorie imposée par l'URL (?category=…) : recalage pendant le rendu (et non dans un effet) pour ne jamais
  // afficher d'abord la première catégorie ; on reste sur le même « tour » pour éviter un saut d'animation
  if (activeIndex >= 0 && activeIndex !== currentIndex) {
    setNav({
      virtualIndex: nav.virtualIndex + activeIndex - currentIndex,
      direction: activeIndex > currentIndex ? 1 : -1,
    });
  }

  const stepCategory = (delta: number) => {
    if (groups.length < 2) return;
    const virtualIndex = nav.virtualIndex + delta;
    setNav({ virtualIndex, direction: Math.sign(delta) });
    onCategoryChange(groups[mod(virtualIndex, groups.length)].slug);
  };

  return (
    <section
      aria-labelledby="collection-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(64px,8vw,112px)" }}
    >
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-black/15 py-4 lg:mb-14">
        <h2 id="collection-title" className="m-0 text-subheading text-black">
          Explorez notre collection
        </h2>
        {!isLoading && !error && (
          <span className="eyebrow text-black/70">
            {models.length} modèle{models.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid items-center gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-40 animate-pulse rounded-lg bg-am-wine/15" />
            <div className="h-16 w-[230px] animate-pulse rounded-lg bg-am-wine/25" />
            <div className="h-12 w-40 animate-pulse rounded-lg bg-am-wine/15" />
          </div>
          <div className="grid grid-cols-1 gap-3 px-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-[4/3.6] animate-pulse rounded-md bg-[#efefef] ${i > 0 ? "hidden sm:block" : ""} ${i > 1 ? "sm:hidden lg:block" : ""}`}
              />
            ))}
          </div>
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
      ) : groups.length === 0 ? (
        <div className="py-20 text-center text-black/70">Aucun modèle disponible pour le moment.</div>
      ) : (
        // reducedMotion="user" : les déplacements deviennent instantanés si le système demande moins d'animations
        <MotionConfig reducedMotion="user">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
            <CategoryCarousel groups={groups} virtualIndex={nav.virtualIndex} onStep={stepCategory} />
            <ProductCarousel
              groups={groups}
              virtualIndex={nav.virtualIndex}
              direction={nav.direction}
              visible={visible}
            />
          </div>
        </MotionConfig>
      )}
    </section>
  );
}
