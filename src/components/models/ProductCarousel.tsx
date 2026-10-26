import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ModelCardData } from "@/components/models/ModelCard";
import { ModelCarouselCard } from "@/components/models/ModelCarouselCard";
import { carouselSlots, mod, useGestureStep, type CategoryGroup } from "@/components/models/modelsCarousel";

const EASE = [0.16, 1, 0.3, 1] as const;
// Sert uniquement à réserver la hauteur d'une carte d'aperçu absente (rendue invisible)
const PLACEHOLDER_MODEL: ModelCardData = {
  id: 0,
  name: " ",
  description: "",
  imagePath: null,
  categorySlug: "",
  categoryLabel: "",
};

// Même chevron en trait fin que la navigation des catégories, tourné à l'horizontale
function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 13 24" aria-hidden="true" className="h-8 w-[17px]">
      <polyline
        points={direction === "left" ? "11.5,2 2,12 11.5,22" : "1.5,2 11,12 1.5,22"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Changement de catégorie : le bloc glisse dans le sens de la navigation et ses rangées arrivent en cascade, avec un
// léger flou, en commençant par celle qui vient du côté de l'arrivée
const BLOCK_VARIANTS = {
  enter: (d: number) => ({ y: d * 90 }),
  center: (d: number) => ({
    y: 0,
    transition: { duration: 0.42, ease: EASE, staggerChildren: 0.05, staggerDirection: d > 0 ? -1 : 1 },
  }),
  exit: (d: number) => ({ y: d * -90, transition: { duration: 0.24, ease: EASE } }),
};
const ROW_VARIANTS = {
  enter: { opacity: 0, scale: 0.97, filter: "blur(6px)" },
  center: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.36, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, filter: "blur(6px)", transition: { duration: 0.22, ease: EASE } },
};

// Aperçu atténué d'une catégorie voisine (au-dessus : précédente, au-dessous : suivante), purement décoratif.
// Les emplacements vides gardent leur place pour que la hauteur ne change pas d'une catégorie à l'autre.
function PreviewRow({ group, visible }: { group: CategoryGroup; visible: number }) {
  const models = group.models.slice(0, visible);
  return (
    <div aria-hidden="true" className="pointer-events-none mx-auto grid w-[78%] gap-2 opacity-35" style={{ gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))` }}>
      {Array.from({ length: visible }).map((_, i) =>
        models[i] ? (
          <ModelCarouselCard key={models[i].id} model={models[i]} preview />
        ) : (
          <div key={`empty-${i}`} className="invisible">
            <ModelCarouselCard model={PLACEHOLDER_MODEL} preview />
          </div>
        ),
      )}
    </div>
  );
}

// Rangée principale : fenêtre glissante sur les modèles de la catégorie, cyclique.
// Chaque carte est clée par sa position virtuelle et translatée de sa largeur, ce qui donne un défilement continu.
function MainRow({ group, offset, visible }: { group: CategoryGroup; offset: number; visible: number }) {
  const count = group.models.length;

  if (count === 0) {
    return (
      <div className="flex aspect-[3/1] min-h-[220px] items-center justify-center rounded-md border border-dashed border-black/15 bg-[#efefef]/60 px-6 text-center text-black/70">
        Aucun modèle dans cette catégorie pour le moment.
      </div>
    );
  }

  const shown = Math.min(visible, count);
  const slots = carouselSlots(offset, visible, count);

  return (
    // Moins de modèles que d'emplacements : la rangée se resserre au centre, les cartes gardent leur taille
    <div className="mx-auto overflow-hidden" style={{ width: `${(shown / visible) * 100}%` }}>
      <div className="grid grid-cols-[minmax(0,1fr)]">
        {slots.map(({ key, slot, index }) => {
          const inView = slot >= 0 && slot < shown;
          return (
            <motion.div
              key={key}
              style={{ gridArea: "1 / 1", width: `${100 / shown}%` }}
              className="px-1 sm:px-1.5"
              initial={false}
              animate={{ x: `${slot * 100}%` }}
              transition={{ duration: 0.36, ease: EASE }}
              aria-hidden={inView ? undefined : true}
            >
              <ModelCarouselCard model={group.models[index]} focusable={inView} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Carrousel horizontal des modèles de la catégorie active, encadré par les aperçus des catégories voisines.
// Le défilement horizontal a son propre état et ne touche jamais à la catégorie ; il repart du début à chaque changement de catégorie.
export function ProductCarousel({
  groups,
  virtualIndex,
  direction,
  visible,
}: {
  groups: CategoryGroup[];
  virtualIndex: number;
  direction: number;
  visible: number;
}) {
  const count = groups.length;
  const current = groups[mod(virtualIndex, count)];
  const prev = count > 1 ? groups[mod(virtualIndex - 1, count)] : null;
  const next = count > 1 ? groups[mod(virtualIndex + 1, count)] : null;

  // Le décalage est mémorisé avec la catégorie à laquelle il s'applique : changer de catégorie le remet à zéro sans effet de bord
  const [scroll, setScroll] = useState({ slug: current.slug, offset: 0 });
  const offset = scroll.slug === current.slug ? scroll.offset : 0;

  const modelCount = current.models.length;
  const shown = Math.min(visible, modelCount);
  const canScroll = modelCount > shown;
  const scrollBy = (delta: number) => setScroll({ slug: current.slug, offset: offset + delta });
  const gestureRef = useGestureStep<HTMLElement>("x", scrollBy, canScroll);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canScroll) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollBy(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const firstShown = mod(offset, Math.max(modelCount, 1)) + 1;
  const arrowClass =
    "flex h-16 w-9 flex-none items-center justify-center self-center rounded text-am-navy transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-navy disabled:opacity-25 sm:w-12";

  return (
    // touch-pan-y : la page défile toujours au doigt à la verticale, le glissé horizontal fait défiler les modèles
    <section
      ref={gestureRef}
      aria-roledescription="carrousel"
      aria-label={`Modèles : ${current.label}`}
      onKeyDown={handleKeyDown}
      className="grid min-w-0 touch-pan-y grid-cols-[auto_minmax(0,1fr)_auto] gap-x-1 sm:gap-x-4"
    >
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canScroll}
        aria-label="Modèles précédents"
        className={`${arrowClass} hover:-translate-x-0.5 disabled:hover:translate-x-0`}
      >
        <Arrow direction="left" />
      </button>

      <div className="relative min-w-0">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={virtualIndex}
            custom={direction}
            variants={BLOCK_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex w-full flex-col gap-4 sm:gap-6"
          >
            {prev && (
              <motion.div variants={ROW_VARIANTS}>
                <PreviewRow group={prev} visible={visible} />
              </motion.div>
            )}
            <motion.div variants={ROW_VARIANTS}>
              <MainRow group={current} offset={offset} visible={visible} />
            </motion.div>
            {next && (
              <motion.div variants={ROW_VARIANTS}>
                <PreviewRow group={next} visible={visible} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canScroll}
        aria-label="Modèles suivants"
        className={`${arrowClass} hover:translate-x-0.5 disabled:hover:translate-x-0`}
      >
        <Arrow direction="right" />
      </button>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {modelCount === 0
          ? `${current.label} : aucun modèle`
          : canScroll && shown === 1
            ? `${current.label} : modèle ${firstShown} sur ${modelCount}`
            : canScroll
            ? `${current.label} : modèles ${firstShown} à ${mod(offset + shown - 1, modelCount) + 1} sur ${modelCount}`
            : `${current.label} : ${modelCount} modèle${modelCount > 1 ? "s" : ""}`}
      </p>
    </section>
  );
}
