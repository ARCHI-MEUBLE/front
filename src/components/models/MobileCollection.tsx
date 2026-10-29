import { memo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { Chevron } from "@/components/models/Chevron";
import { MOBILE_ROW_HEIGHT, ModelRowCard } from "@/components/models/ModelCarouselCard";
import { ProgressDots } from "@/components/models/ProgressDots";
import type { ModelCardData } from "@/components/models/ModelCard";
import {
  carouselSlots,
  mod,
  useCenteredIndex,
  useSmoothScroller,
  type CategoryGroup,
} from "@/components/models/modelsCarousel";

// Version téléphone de la collection (sous 640 px) : une seule catégorie visible, qu'on change horizontalement, et
// la liste de ses modèles, trois par trois, qu'on fait défiler verticalement avec une barre de progression à droite.

const EASE = [0.16, 1, 0.3, 1] as const;
const ROWS_SHOWN = 3;
const ROW_GAP = 12;
const ROW_PITCH = MOBILE_ROW_HEIGHT + ROW_GAP;

const arrowClass =
  "flex h-11 w-11 flex-none items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 disabled:invisible";

// Libellé d'une catégorie : décalé horizontalement de (sa position − position du carrousel) largeurs, en continu,
// ce qui le fait suivre le doigt ; ses voisines restent hors du cadre
function CategoryLabel({ itemKey, position, label, isActive }: { itemKey: number; position: MotionValue<number>; label: string; isActive: boolean }) {
  const x = useTransform(position, (p) => `${(itemKey - p) * 100}%`);
  const opacity = useTransform(position, (p) => 1 - Math.min(Math.abs(itemKey - p), 1));
  return (
    <motion.p
      style={{ gridArea: "1 / 1", x, opacity }}
      aria-current={isActive ? "true" : undefined}
      aria-hidden={isActive ? undefined : true}
      className="m-0 truncate px-2 text-center text-subheading text-am-wine"
    >
      {label}
    </motion.p>
  );
}

// Catégories sur téléphone : une seule visible, les bulles de progression au-dessus, flèches et glissé horizontal
// pour changer. Boucle à l'infini comme la roulette de l'ordinateur (index virtuel remonté au parent).
export function MobileCategoryBar({
  groups,
  index,
  onIndexChange,
}: {
  groups: CategoryGroup[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const count = groups.length;
  const canStep = count > 1;
  const viewportRef = useRef<HTMLDivElement>(null);
  // Au doigt, une catégorie par largeur de cadre : le libellé suit exactement le doigt
  const scroller = useSmoothScroller<HTMLElement>("x", {
    initial: index,
    enabled: canStep,
    touchPx: () => viewportRef.current?.clientWidth ?? 240,
  });
  const { ref, position, stepBy } = scroller;
  const center = useCenteredIndex(scroller, index, onIndexChange);
  const activeIndex = mod(center, count);
  const prev = groups[mod(center - 1, count)];
  const next = groups[mod(center + 1, count)];

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canStep || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    stepBy(event.key === "ArrowLeft" ? -1 : 1);
  };

  return (
    <nav ref={ref} aria-label="Catégories de meubles" onKeyDown={handleKeyDown} className="flex flex-col items-center gap-3">
      {canStep && <ProgressDots groups={groups} activeIndex={activeIndex} orientation="horizontal" />}
      <div className="flex w-full items-center gap-1">
        <button
          type="button"
          onClick={() => stepBy(-1)}
          disabled={!canStep}
          aria-label={`Catégorie précédente : ${prev.label}`}
          className={`${arrowClass} text-am-wine focus-visible:outline-am-wine`}
        >
          <Chevron direction="left" />
        </button>
        {/* touch-pan-y : la page défile toujours au doigt à la verticale, le glissé horizontal change de catégorie */}
        <div ref={viewportRef} className="grid h-14 min-w-0 flex-1 touch-pan-y items-center overflow-hidden">
          {(canStep ? [-1, 0, 1] : [0]).map((slot) => {
            const key = center + slot;
            return (
              <CategoryLabel key={key} itemKey={key} position={position} label={groups[mod(key, count)].label} isActive={slot === 0} />
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => stepBy(1)}
          disabled={!canStep}
          aria-label={`Catégorie suivante : ${next.label}`}
          className={`${arrowClass} text-am-wine focus-visible:outline-am-wine`}
        >
          <Chevron direction="right" />
        </button>
      </div>
    </nav>
  );
}

// Une vignette de la liste : décalée de (sa position − position de la liste) hauteurs de vignette, en continu
function RowSlot({ itemKey, position, model, focusable }: { itemKey: number; position: MotionValue<number>; model: ModelCardData; focusable: boolean }) {
  const y = useTransform(position, (p) => (itemKey - p) * ROW_PITCH);
  return (
    <motion.div style={{ y }} className="absolute inset-x-0 top-0" aria-hidden={focusable ? undefined : true}>
      <ModelRowCard model={model} focusable={focusable} />
    </motion.div>
  );
}

// Barre de défilement de la liste : flèche en haut et en bas (masquées aux extrémités), et un curseur dont la taille
// et la position montrent la part de la liste affichée — la liste est finie
function ListScrollbar({
  position,
  count,
  offset,
  lastOffset,
  onStep,
}: {
  position: MotionValue<number>;
  count: number;
  offset: number;
  lastOffset: number;
  onStep: (delta: number) => void;
}) {
  const thumbPct = (ROWS_SHOWN / count) * 100;
  const top = useTransform(position, (p) => `${Math.max(0, Math.min(1, p / lastOffset)) * (100 - thumbPct)}%`);
  return (
    <div className="flex w-9 flex-none flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={offset <= 0}
        aria-label="Modèles précédents"
        className={`${arrowClass} h-9 w-9 text-am-navy focus-visible:outline-am-navy`}
      >
        <Chevron direction="up" className="h-[10px] w-5" />
      </button>
      <div aria-hidden="true" className="relative w-1 flex-1 rounded-full bg-am-navy/15">
        <motion.div className="absolute inset-x-0 rounded-full bg-am-navy" style={{ height: `${thumbPct}%`, top }} />
      </div>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={offset >= lastOffset}
        aria-label="Modèles suivants"
        className={`${arrowClass} h-9 w-9 text-am-navy focus-visible:outline-am-navy`}
      >
        <Chevron direction="down" className="h-[10px] w-5" />
      </button>
    </div>
  );
}

// Modèles d'une catégorie, trois par trois, en défilement vertical fini (du premier au dernier modèle). Chaque
// catégorie a sa propre liste : elle repart du premier modèle, et l'ancienne garde sa position pendant qu'elle s'efface.
function CategoryModels({ group }: { group: CategoryGroup }) {
  const count = group.models.length;
  const shown = Math.min(ROWS_SHOWN, count);
  const lastOffset = Math.max(0, count - shown);
  const canScroll = count > shown;
  const scroller = useSmoothScroller<HTMLElement>("y", {
    enabled: canScroll,
    min: 0,
    max: lastOffset,
    touchPx: () => ROW_PITCH,
  });
  const { ref, position, stepBy } = scroller;

  // Rendu React seulement quand la partie entière (vignettes à monter) ou l'arrondi (focus, annonce) change
  const [view, setView] = useState({ base: 0, center: 0 });
  useMotionValueEvent(position, "change", (value) => {
    const base = Math.floor(value);
    const center = Math.round(value);
    setView((v) => (v.base === base && v.center === center ? v : { base, center }));
  });
  const offset = Math.max(0, Math.min(lastOffset, view.center));

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canScroll || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    stepBy(event.key === "ArrowUp" ? -1 : 1);
  };

  if (count === 0) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-black/15 bg-[#efefef]/60 px-6 text-center text-black/70">
        Aucun modèle dans cette catégorie pour le moment.
      </div>
    );
  }

  return (
    <section
      ref={ref}
      aria-roledescription="carrousel"
      aria-label={`Modèles : ${group.label}`}
      onKeyDown={handleKeyDown}
      className="flex gap-2"
    >
      {/* touch-none seulement s'il y a de quoi défiler : un glissé vertical sur la liste fait défiler les modèles */}
      <div
        className={`relative min-w-0 flex-1 overflow-hidden ${canScroll ? "touch-none" : ""}`}
        style={{ height: shown * MOBILE_ROW_HEIGHT + (shown - 1) * ROW_GAP }}
      >
        {carouselSlots(view.base, shown, count).map(({ key }) => (
          <RowSlot
            key={key}
            itemKey={key}
            position={position}
            model={group.models[key]}
            focusable={key - view.center >= 0 && key - view.center < shown}
          />
        ))}
      </div>
      {canScroll && <ListScrollbar position={position} count={count} offset={offset} lastOffset={lastOffset} onStep={stepBy} />}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {canScroll
          ? `${group.label} : modèles ${offset + 1} à ${offset + shown} sur ${count}`
          : `${group.label} : ${count} modèle${count > 1 ? "s" : ""}`}
      </p>
    </section>
  );
}

// Liste des modèles de la catégorie affichée. Au changement de catégorie, la nouvelle liste glisse depuis le côté
// d'où vient la catégorie. Mémorisée : elle ne se redessine que quand la catégorie affichée change.
export const MobileProductList = memo(function MobileProductList({
  groups,
  index,
  direction,
}: {
  groups: CategoryGroup[];
  index: number;
  direction: number;
}) {
  const group = groups[mod(index, groups.length)];
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d * 48, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d * -48, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: EASE }}
        >
          <CategoryModels group={group} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
