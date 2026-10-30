import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { ModelCardData } from "@/components/models/ModelCard";
import { CategoryCarousel } from "@/components/models/CategoryCarousel";
import { MobileCategoryBar, MobileProductList } from "@/components/models/MobileCollection";
import { ProductCarousel } from "@/components/models/ProductCarousel";
import { groupModelsByCategory, mod, useVisibleCount } from "@/components/models/modelsCarousel";
import { Category } from "@/lib/apiClient";

// Pause (ms) qui marque la fin d'un défilement continu des catégories (au-delà de l'intervalle entre deux catégories
// à vitesse maximale, ≈ 330 ms, pour qu'un défilement continu ne mette à jour le panneau qu'au début et à l'arrêt)
const PANEL_QUIET = 450;

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
  // Téléphone (sous 640 px, là où une seule carte tient en largeur) : version dédiée, catégorie horizontale et liste
  // verticale des modèles. Au-delà, roulette des catégories et carrousel des modèles.
  const isPhone = visible === 1;

  // Index virtuel de la catégorie affichée (non borné : la roulette boucle) + sens du dernier déplacement, partagés par
  // les deux carrousels pour animer dans le même sens
  const [nav, setNav] = useState({ index: 0, direction: 1 });
  const currentIndex = groups.length ? mod(nav.index, groups.length) : 0;
  const activeIndex = groups.findIndex((group) => group.slug === activeCategory);

  // Panneau des modèles et page (URL) : un changement isolé (flèche, cran de molette) est appliqué tout de suite ; pendant
  // un défilement continu, les catégories traversées sont ignorées et seule celle où l'on s'arrête est appliquée, une
  // fois le geste posé (PANEL_QUIET ms sans changement). Seule la roulette travaille pendant le geste : ni transition du
  // panneau, ni rendu de toute la page à chaque catégorie traversée.
  const [panelNav, setPanelNav] = useState(nav);
  const lastActivity = useRef(-Infinity);
  // Dernière valeur de `activeCategory` déjà prise en compte (venue de l'URL ou remontée par la roulette). Seul un
  // changement de cette valeur recale la roulette : la page garde l'ancienne catégorie pendant un défilement continu, ce
  // qui ne doit pas ramener la roulette en arrière.
  const [appliedCategory, setAppliedCategory] = useState<string | null>(null);
  const latest = useRef({ groups, onCategoryChange });
  useEffect(() => {
    latest.current = { groups, onCategoryChange };
  });

  // Catégorie imposée de l'extérieur (URL au chargement, lien) : recalage pendant le rendu (et non dans un effet) pour
  // ne jamais afficher d'abord la première catégorie ; on reste sur le même « tour » de roulette pour éviter un saut
  // (Seulement une fois la catégorie trouvée parmi les données chargées, sinon celle de l'URL serait perdue.)
  if (activeIndex >= 0 && activeCategory !== appliedCategory) {
    setAppliedCategory(activeCategory);
    if (activeIndex !== currentIndex) {
      const synced = { index: nav.index + activeIndex - currentIndex, direction: activeIndex > currentIndex ? 1 : -1 };
      setNav(synced);
      // Saut imposé de l'extérieur : le panneau s'aligne directement, sans transition depuis la mauvaise catégorie
      setPanelNav(synced);
    }
  }

  useEffect(() => {
    if (nav.index === panelNav.index) return;
    const now = performance.now();
    const wait = now - lastActivity.current > PANEL_QUIET ? 0 : PANEL_QUIET;
    lastActivity.current = now;
    const timer = setTimeout(() => {
      lastActivity.current = performance.now();
      setPanelNav((shown) => ({ index: nav.index, direction: Math.sign(nav.index - shown.index) || 1 }));
      const { groups: list, onCategoryChange: report } = latest.current;
      const slug = list[mod(nav.index, list.length)].slug;
      setAppliedCategory(slug);
      report(slug);
    }, wait);
    return () => clearTimeout(timer);
  }, [nav.index, panelNav.index]);

  // Appelé par la roulette des catégories dès qu'une nouvelle catégorie passe au centre
  const handleIndexChange = (index: number) => {
    if (groups.length < 2) return;
    setNav((prev) => (prev.index === index ? prev : { index, direction: Math.sign(index - prev.index) }));
  };

  return (
    <section
      aria-labelledby="collection-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(32px,4vw,56px)" }}
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
        <div className="grid items-center gap-10 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-4">
          <div className="mx-auto flex w-[250px] flex-col gap-[56px] lg:w-[290px]">
            <div className="h-5 w-32 animate-pulse rounded bg-am-wine/15" />
            <div className="h-7 w-48 animate-pulse rounded bg-am-wine/30" />
            <div className="h-5 w-28 animate-pulse rounded bg-am-wine/15" />
          </div>
          <div className="grid grid-cols-1 gap-3 px-10 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-[6/5] animate-pulse rounded-[18px] bg-[#efefef] ${i > 0 ? "hidden sm:block" : ""} ${i > 1 ? "sm:hidden" : ""}`}
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
          {isPhone ? (
            <div className="flex flex-col gap-6 pb-4">
              <MobileCategoryBar groups={groups} index={nav.index} onIndexChange={handleIndexChange} />
              <MobileProductList groups={groups} index={panelNav.index} direction={panelNav.direction} />
            </div>
          ) : (
            // À partir de xl, roulette et carrousel côte à côte, et la zone sort du gabarit de la page (1360 px) pour
            // occuper la largeur de l'écran (moins 24 px de chaque côté, au plus 1760 px) : trois grandes cartes.
            // Centrée sur la section (donc sur la page) ; 100vw inclut la barre de défilement, compensée par la marge.
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-4 xl:relative xl:left-1/2 xl:w-[min(100vw-48px,1760px)] xl:-translate-x-1/2 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-4">
              {/* Roulette calée à droite de sa colonne : ses bulles, à sa gauche, restent dans l'écran */}
              <div className="xl:justify-self-end">
                <CategoryCarousel groups={groups} index={nav.index} onIndexChange={handleIndexChange} />
              </div>
              <ProductCarousel
                groups={groups}
                index={panelNav.index}
                direction={panelNav.direction}
                visible={visible}
              />
            </div>
          )}
        </MotionConfig>
      )}
    </section>
  );
}
