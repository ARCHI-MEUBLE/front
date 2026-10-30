import { memo, useEffect, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import type { ModelCardData } from "@/components/models/ModelCard";
import { Chevron } from "@/components/models/Chevron";
import { ModelCarouselCard, ModelPreviewTile } from "@/components/models/ModelCarouselCard";
import { carouselSlots, mod, useSmoothScroller, type CategoryGroup } from "@/components/models/modelsCarousel";

const EASE = [0.16, 1, 0.3, 1] as const;

// Changement de catégorie : le bloc glisse dans le sens de la navigation et ses rangées arrivent en cascade (fondu et
// léger zoom), en commençant par celle qui vient du côté de l'arrivée. Pas de flou : animer `filter: blur` sur des
// rangées d'images force le navigateur à les repeindre à chaque image et rendait la roulette des catégories saccadée.
const BLOCK_VARIANTS = {
  enter: (d: number) => ({ y: d * 90 }),
  center: (d: number) => ({
    y: 0,
    transition: { duration: 0.42, ease: EASE, staggerChildren: 0.05, staggerDirection: d > 0 ? -1 : 1 },
  }),
  exit: (d: number) => ({ y: d * -90, transition: { duration: 0.24, ease: EASE } }),
};
const ROW_VARIANTS = {
  enter: { opacity: 0, scale: 0.97 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.36, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.22, ease: EASE } },
};

// Aperçu d'une catégorie voisine (au-dessus : précédente, au-dessous : suivante), purement décoratif : trois photos,
// coupées pour n'en garder que les deux tiers côté rangée principale, et fondues vers l'extérieur — les catégories
// voisines semblent dépasser de part et d'autre de la sélection, comme sur une roulette.
const PREVIEW_COUNT = 3;
// Hauteur visible du cadre : 2/3 d'une vignette (format 6:5) quand trois vignettes occupent sa largeur, soit
// largeur × 5/27 ; l'écart entre vignettes, négligé ici, ne change la coupe que de quelques pixels
const PREVIEW_FRAME_ASPECT = "27 / 5";

function PreviewRow({ group, side }: { group: CategoryGroup; side: "above" | "below" }) {
  const models = group.models.slice(0, PREVIEW_COUNT);
  // Transparent sur le bord extérieur, opaque côté rangée principale
  const fade = `linear-gradient(to ${side === "above" ? "bottom" : "top"}, transparent 0%, rgba(0, 0, 0, 0.45) 40%, #000 90%)`;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto w-[66%] max-w-[760px] overflow-hidden opacity-80"
      style={{ aspectRatio: PREVIEW_FRAME_ASPECT, maskImage: fade, WebkitMaskImage: fade }}
    >
      {/* Vignettes collées au bord intérieur du cadre : la coupe enlève le tiers extérieur */}
      <div
        className={`absolute inset-x-0 grid gap-2.5 ${side === "above" ? "bottom-0" : "top-0"}`}
        style={{ gridTemplateColumns: `repeat(${PREVIEW_COUNT}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: PREVIEW_COUNT }).map((_, i) =>
          models[i] ? (
            <ModelPreviewTile key={models[i].id} model={models[i]} />
          ) : (
            // Emplacement vide : garde sa place pour que les vignettes restent alignées
            <div key={`empty-${i}`} className="invisible">
              <ModelPreviewTile model={null} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// Une carte de la rangée principale : décalée de (sa position virtuelle − position du carrousel) largeurs de carte,
// calculé en continu, ce qui la fait suivre le geste au pixel près
function CardSlot({
  itemKey,
  position,
  width,
  model,
  focusable,
}: {
  itemKey: number;
  position: MotionValue<number>;
  width: string;
  model: ModelCardData;
  focusable: boolean;
}) {
  const x = useTransform(position, (p) => `${(itemKey - p) * 100}%`);
  return (
    <motion.div
      style={{ gridArea: "1 / 1", width, x }}
      className="px-1 sm:px-1.5"
      aria-hidden={focusable ? undefined : true}
    >
      <ModelCarouselCard model={model} focusable={focusable} />
    </motion.div>
  );
}

// Rangée principale : fenêtre glissante sur les modèles de la catégorie, du premier au dernier. Seules les cartes de la fenêtre
// (plus une de chaque côté, prêtes à entrer) sont montées ; `base` = partie entière de la position, `center` = arrondi.
// `origin` : position du carrousel à l'arrivée de la catégorie, où se trouve son premier modèle.
function MainRow({
  group,
  position,
  base,
  center,
  origin,
  visible,
}: {
  group: CategoryGroup;
  position: MotionValue<number>;
  base: number;
  center: number;
  origin: number;
  visible: number;
}) {
  const count = group.models.length;

  if (count === 0) {
    return (
      <div className="flex aspect-[3/1] min-h-[220px] items-center justify-center rounded-md border border-dashed border-black/15 bg-[#efefef]/60 px-6 text-center text-black/70">
        Aucun modèle dans cette catégorie pour le moment.
      </div>
    );
  }

  const shown = Math.min(visible, count);
  const slots = carouselSlots(base - origin, visible, count);

  return (
    // Moins de modèles que d'emplacements : la rangée se resserre au centre, les cartes gardent leur taille
    <div data-carousel-track className="mx-auto overflow-hidden" style={{ width: `${(shown / visible) * 100}%` }}>
      {/* Marge basse : laisse voir l'ombre des vignettes, sinon coupée par le cadre masqué */}
      <div className="grid grid-cols-[minmax(0,1fr)] pb-6">
        {slots.map(({ key, index }) => (
          <CardSlot
            key={key}
            itemKey={key + origin}
            position={position}
            width={`${100 / shown}%`}
            model={group.models[index]}
            focusable={key + origin - center >= 0 && key + origin - center < shown}
          />
        ))}
      </div>
    </div>
  );
}

// Carrousel horizontal des modèles de la catégorie active, encadré par les aperçus des catégories voisines.
// Le défilement horizontal a son propre état et ne touche jamais à la catégorie ; il repart du début à chaque changement de catégorie.
// Fini : il s'arrête au premier et au dernier modèle, où la flèche correspondante disparaît.
// Mémorisé : la liste des catégories change à chaque pas, ce panneau seulement quand la catégorie affichée change
export const ProductCarousel = memo(function ProductCarousel({
  groups,
  index,
  direction,
  visible,
}: {
  groups: CategoryGroup[];
  index: number;
  direction: number;
  visible: number;
}) {
  // `index` est l'index virtuel de la roulette des catégories (qui boucle) : les aperçus montrent donc toujours une
  // catégorie précédente et suivante, comme la roulette (sous la dernière catégorie revient la première)
  const count = groups.length;
  const current = groups[mod(index, count)];
  const prev = count > 1 ? groups[mod(index - 1, count)] : null;
  const next = count > 1 ? groups[mod(index + 1, count)] : null;

  const modelCount = current.models.length;
  const shown = Math.min(visible, modelCount);
  const canScroll = modelCount > shown;

  // Rendu React seulement quand la partie entière (cartes à monter) ou l'arrondi (cartes focusables, annonce) change
  const [view, setView] = useState({ base: 0, center: 0 });
  const { base, center } = view;

  // Nouvelle catégorie : elle démarre sur son premier modèle à la position courante, au lieu de remettre la position à
  // zéro (ce qui faisait sauter les cartes de l'ancienne catégorie pendant qu'elle s'efface)
  const [origin, setOrigin] = useState({ slug: current.slug, value: 0 });
  if (origin.slug !== current.slug) setOrigin({ slug: current.slug, value: center });
  const originValue = origin.slug === current.slug ? origin.value : center;
  // Dernière position possible : le dernier modèle en bout de rangée
  const lastOffset = Math.max(0, modelCount - shown);

  // Au doigt, une carte par largeur de carte : le contenu suit exactement le doigt
  const { ref, position, stepBy } = useSmoothScroller<HTMLElement>("x", {
    enabled: canScroll,
    min: originValue,
    max: originValue + lastOffset,
    touchPx: (): number => (ref.current?.querySelector("[data-carousel-track]")?.clientWidth ?? 300) / Math.max(shown, 1),
  });
  useMotionValueEvent(position, "change", (value) => {
    const nextBase = Math.floor(value);
    const nextCenter = Math.round(value);
    setView((v) => (v.base === nextBase && v.center === nextCenter ? v : { base: nextBase, center: nextCenter }));
  });
  // Un geste en cours sur l'ancienne catégorie se cale sur une carte entière
  useEffect(() => {
    stepBy(0);
  }, [current.slug, stepBy]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canScroll) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepBy(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const offset = Math.max(0, Math.min(lastOffset, center - originValue));
  const firstShown = offset + 1;
  // Au bout du carrousel (ou s'il n'y a pas de quoi défiler), la flèche disparaît mais garde sa place
  const arrowClass =
    "flex h-16 w-9 flex-none items-center justify-center self-center rounded text-am-navy transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-navy disabled:invisible sm:w-10 xl:w-8";

  return (
    // touch-pan-y : la page défile toujours au doigt à la verticale, le glissé horizontal fait défiler les modèles
    <section
      ref={ref}
      aria-roledescription="carrousel"
      aria-label={`Modèles : ${current.label}`}
      onKeyDown={handleKeyDown}
      className="grid min-w-0 touch-pan-y grid-cols-[auto_minmax(0,1fr)_auto] gap-x-1 sm:gap-x-3 xl:gap-x-2"
    >
      <button
        type="button"
        onClick={() => stepBy(-1)}
        disabled={offset <= 0}
        aria-label="Modèles précédents"
        className={`${arrowClass} hover:-translate-x-0.5`}
      >
        <Chevron direction="left" />
      </button>

      <div className="relative min-w-0">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={BLOCK_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex w-full flex-col gap-3 sm:gap-4"
          >
            {prev && (
              <motion.div variants={ROW_VARIANTS}>
                <PreviewRow group={prev} side="above" />
              </motion.div>
            )}
            <motion.div variants={ROW_VARIANTS}>
              <MainRow group={current} position={position} base={base} center={center} origin={originValue} visible={visible} />
            </motion.div>
            {next && (
              <motion.div variants={ROW_VARIANTS}>
                <PreviewRow group={next} side="below" />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => stepBy(1)}
        disabled={offset >= lastOffset}
        aria-label="Modèles suivants"
        className={`${arrowClass} hover:translate-x-0.5`}
      >
        <Chevron direction="right" />
      </button>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {modelCount === 0
          ? `${current.label} : aucun modèle`
          : canScroll && shown === 1
            ? `${current.label} : modèle ${firstShown} sur ${modelCount}`
            : canScroll
            ? `${current.label} : modèles ${firstShown} à ${offset + shown} sur ${modelCount}`
            : `${current.label} : ${modelCount} modèle${modelCount > 1 ? "s" : ""}`}
      </p>
    </section>
  );
});
