import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { ModelCardData } from "@/components/models/ModelCard";
import { CategoryCarousel } from "@/components/models/CategoryCarousel";
import { ProductCarousel } from "@/components/models/ProductCarousel";
import { groupModelsByCategory, mod, useVisibleCount } from "@/components/models/modelsCarousel";
import { Category } from "@/lib/apiClient";

const PANEL_THROTTLE = 200;

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
  // Panneau des modèles : suit la catégorie au plus toutes les PANEL_THROTTLE ms (le premier pas tout de suite, puis la
  // dernière catégorie atteinte). La liste reste instantanée, mais une molette rapide n'empile pas les transitions.
  const [panelNav, setPanelNav] = useState(nav);
  const lastPanelUpdate = useRef(0);

  if (activeIndex >= 0 && activeIndex !== currentIndex) {
    const synced = {
      virtualIndex: nav.virtualIndex + activeIndex - currentIndex,
      direction: activeIndex > currentIndex ? 1 : -1,
    };
    setNav(synced);
    // Saut imposé par l'URL : le panneau s'aligne directement, sans transition depuis la mauvaise catégorie
    setPanelNav(synced);
  }

  useEffect(() => {
    if (nav.virtualIndex === panelNav.virtualIndex) return;
    const wait = Math.max(0, PANEL_THROTTLE - (performance.now() - lastPanelUpdate.current));
    const timer = setTimeout(() => {
      lastPanelUpdate.current = performance.now();
      setPanelNav((shown) => ({
        virtualIndex: nav.virtualIndex,
        direction: Math.sign(nav.virtualIndex - shown.virtualIndex) || 1,
      }));
    }, wait);
    return () => clearTimeout(timer);
  }, [nav.virtualIndex, panelNav.virtualIndex]);

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
        <div className="grid items-center gap-10 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-12">
          <div className="mx-auto flex w-[250px] flex-col gap-[56px] lg:w-[290px]">
            <div className="h-5 w-32 animate-pulse rounded bg-am-wine/15" />
            <div className="h-7 w-48 animate-pulse rounded bg-am-wine/30" />
            <div className="h-5 w-28 animate-pulse rounded bg-am-wine/15" />
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
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-4 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-12">
            <CategoryCarousel groups={groups} virtualIndex={nav.virtualIndex} onStep={stepCategory} />
            <ProductCarousel
              groups={groups}
              virtualIndex={panelNav.virtualIndex}
              direction={panelNav.direction}
              visible={visible}
            />
          </div>
        </MotionConfig>
      )}
    </section>
  );
}
