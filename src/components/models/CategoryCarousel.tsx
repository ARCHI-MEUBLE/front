import type { KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { mod, type CategoryGroup } from "@/components/models/modelsCarousel";

// Écart vertical entre deux catégories, en % de la hauteur d'un bouton
const PITCH = 130;
const EASE = [0.16, 1, 0.3, 1] as const;

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 56 28" aria-hidden="true" className="h-6 w-12 sm:h-7 sm:w-14">
      <path
        d={direction === "up" ? "M0 28 L28 0 L56 28 L44 28 L28 12 L12 28 Z" : "M0 0 L28 28 L56 0 L44 0 L28 16 L12 0 Z"}
        fill="currentColor"
      />
    </svg>
  );
}

// Navigation verticale entre catégories : la catégorie active reste au centre, ses voisines au-dessus et au-dessous.
// `virtualIndex` n'est pas borné, ce qui permet de faire glisser la liste dans le bon sens en passant de la dernière à la première.
export function CategoryCarousel({
  groups,
  virtualIndex,
  onStep,
}: {
  groups: CategoryGroup[];
  virtualIndex: number;
  onStep: (delta: number) => void;
}) {
  const count = groups.length;
  const prev = groups[mod(virtualIndex - 1, count)];
  const next = groups[mod(virtualIndex + 1, count)];
  const canStep = count > 1;
  // Les positions ±2 sont montées invisibles pour que la catégorie entrante arrive en glissant
  const slots = count >= 3 ? [-2, -1, 0, 1, 2] : count === 2 ? [0, 1] : [0];

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canStep) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onStep(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <nav aria-label="Catégories de meubles" onKeyDown={handleKeyDown} className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={!canStep}
        aria-label={`Catégorie précédente : ${prev.label}`}
        className="relative z-10 flex h-11 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:opacity-30 disabled:hover:translate-y-0"
      >
        <Chevron direction="up" />
      </button>

      <ul className="m-0 grid h-[173px] w-[200px] list-none place-items-center p-0 sm:h-[202px] lg:h-[231px] lg:w-[230px]">
        <AnimatePresence initial={false}>
          {slots.map((slot) => {
            const key = virtualIndex + slot;
            const group = groups[mod(key, count)];
            const isActive = slot === 0;
            const isHidden = Math.abs(slot) > 1;
            return (
              <motion.li
                key={key}
                style={{ gridArea: "1 / 1" }}
                // Les positions ±2, invisibles, débordent sur les flèches : sans pointer-events-none elles captent leurs clics
                className={`h-12 w-full sm:h-14 lg:h-16 ${isHidden ? "pointer-events-none" : ""}`}
                initial={{ y: `${slot * PITCH}%`, opacity: 0, scale: 0.8 }}
                animate={{ y: `${slot * PITCH}%`, opacity: isHidden ? 0 : 1, scale: isActive ? 1 : 0.78 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                aria-hidden={isHidden || undefined}
              >
                <button
                  type="button"
                  onClick={isActive || isHidden ? undefined : () => onStep(slot)}
                  tabIndex={isActive || isHidden ? -1 : 0}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={isActive ? `${group.label}, catégorie affichée` : `Afficher : ${group.label}`}
                  // Même taille de texte partout : l'écart de hiérarchie vient de l'échelle animée, sans saut de police
                  className={`flex h-full w-full items-center justify-center rounded-lg px-4 text-center text-[20px] font-semibold tracking-[0.02em] text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine sm:text-[22px] lg:text-[24px] ${
                    isActive
                      ? "cursor-default bg-am-wine shadow-[0_6px_18px_rgba(106,32,37,0.25)]"
                      : "cursor-pointer bg-am-wine/50 hover:bg-am-wine/65"
                  }`}
                >
                  <span className="truncate">{group.label}</span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={!canStep}
        aria-label={`Catégorie suivante : ${next.label}`}
        className="relative z-10 flex h-11 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:opacity-30 disabled:hover:translate-y-0"
      >
        <Chevron direction="down" />
      </button>
    </nav>
  );
}
