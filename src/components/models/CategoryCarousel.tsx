import type { KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { mod, type CategoryGroup } from "@/components/models/modelsCarousel";

// Écart vertical entre deux catégories, en px ; les filets séparateurs sont placés à mi-chemin
const PITCH = 84;
// Taille des catégories voisines par rapport à l'active (qui reprend la taille du titre de section)
const NEIGHBOUR_SCALE = 0.66;
const EASE = [0.16, 1, 0.3, 1] as const;

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 13" aria-hidden="true" className="h-[17px] w-8">
      <polyline
        points={direction === "up" ? "2,11.5 12,2 22,11.5" : "2,1.5 12,11 22,1.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
    <nav aria-label="Catégories de meubles" onKeyDown={handleKeyDown} className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={!canStep}
        aria-label={`Catégorie précédente : ${prev.label}`}
        className="relative z-10 flex h-12 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:opacity-30 disabled:hover:translate-y-0"
      >
        <Chevron direction="up" />
      </button>

      <ul className="relative m-0 grid h-[252px] w-[230px] list-none place-items-center p-0 lg:w-[260px]">
        {/* Repères fixes : filets autour de la catégorie active et barre bordeaux à gauche ; seuls les libellés glissent */}
        {canStep && (
          <>
            <span aria-hidden="true" className="absolute inset-x-0 h-px bg-black/10" style={{ top: `calc(50% - ${PITCH / 2}px)` }} />
            <span aria-hidden="true" className="absolute inset-x-0 h-px bg-black/10" style={{ top: `calc(50% + ${PITCH / 2}px)` }} />
          </>
        )}
        <span aria-hidden="true" className="absolute top-1/2 -left-7 h-12 w-1 -translate-y-1/2 rounded-full bg-am-wine" />
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
                className={`h-14 w-full origin-left ${isHidden ? "pointer-events-none" : ""}`}
                initial={{ y: slot * PITCH, opacity: 0, scale: NEIGHBOUR_SCALE }}
                animate={{ y: slot * PITCH, opacity: isHidden ? 0 : 1, scale: isActive ? 1 : NEIGHBOUR_SCALE }}
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
                  // Typographie du titre de section (text-subheading) ; la taille réduite des voisines vient de l'échelle
                  // animée du <li> (origine à gauche), ce qui garde l'alignement et évite un saut de police
                  className={`flex h-full w-full items-center rounded px-2 text-left text-subheading whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine ${
                    isActive ? "cursor-default text-am-wine" : "cursor-pointer text-am-wine/45 hover:text-am-wine/70"
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
        className="relative z-10 flex h-12 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:opacity-30 disabled:hover:translate-y-0"
      >
        <Chevron direction="down" />
      </button>
    </nav>
  );
}
