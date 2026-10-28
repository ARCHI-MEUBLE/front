import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { mod, useSmoothScroller, type CategoryGroup } from "@/components/models/modelsCarousel";

// Écart vertical entre deux catégories, en px ; les filets séparateurs sont placés à mi-chemin
const PITCH = 84;
// Taille des catégories voisines par rapport à l'active (qui reprend la taille du titre de section)
const NEIGHBOUR_SCALE = 0.66;
// Effet « roulette » : la catégorie active ressort vers la droite, les autres s'inclinent comme sur un tambour
const ACTIVE_SHIFT = 32;
const TILT = 20;
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

// Un libellé de la roulette. Tout son placement découle en continu de sa distance à la position courante : il suit le
// geste au pixel près, et grossit / ressort vers la droite en approchant du centre.
function CategoryItem({
  itemKey,
  position,
  label,
  slot,
  onSelect,
}: {
  itemKey: number;
  position: MotionValue<number>;
  label: string;
  slot: number;
  onSelect: (delta: number) => void;
}) {
  const distance = useTransform(position, (p) => itemKey - p);
  const nearness = useTransform(distance, (d) => 1 - Math.min(Math.abs(d), 1));
  const y = useTransform(distance, (d) => d * PITCH);
  const x = useTransform(nearness, (n) => n * ACTIVE_SHIFT);
  const scale = useTransform(nearness, (n) => NEIGHBOUR_SCALE + n * (1 - NEIGHBOUR_SCALE));
  const rotateX = useTransform(distance, (d) => -d * TILT);
  // Visible jusqu'à une position du centre, puis s'efface : les éléments qui entrent ou sortent ne « popent » pas
  const opacity = useTransform(distance, (d) => Math.max(0, Math.min(1, 2 - Math.abs(d))));

  const isActive = slot === 0;
  const isHidden = Math.abs(slot) > 1;
  return (
    <motion.li
      style={{ gridArea: "1 / 1", y, x, scale, rotateX, opacity }}
      // Les positions ±2, invisibles, débordent sur les flèches : sans pointer-events-none elles captent leurs clics
      className={`h-14 w-full origin-left ${isHidden ? "pointer-events-none" : ""}`}
      aria-hidden={isHidden || undefined}
    >
      <button
        type="button"
        onClick={isActive || isHidden ? undefined : () => onSelect(slot)}
        tabIndex={isActive || isHidden ? -1 : 0}
        aria-current={isActive ? "true" : undefined}
        aria-label={isActive ? `${label}, catégorie affichée` : `Afficher : ${label}`}
        // Typographie du titre de section (text-subheading) ; la taille réduite des voisines vient de l'échelle
        // du <li> (origine à gauche), ce qui garde l'alignement et évite un saut de police
        className={`flex h-full w-full items-center rounded px-2 text-left text-subheading whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine ${
          isActive ? "cursor-default text-am-wine" : "cursor-pointer text-am-wine/45 hover:text-am-wine/70"
        }`}
      >
        <span className="truncate">{label}</span>
      </button>
    </motion.li>
  );
}

// Navigation verticale entre catégories, en roulette continue : molette, pavé tactile et doigt la font tourner au pixel
// près, puis elle se cale sur la catégorie la plus proche ; flèches et clavier la font glisser d'une catégorie.
// La roulette boucle à l'infini (après la dernière catégorie revient la première) ; les bulles sous la liste indiquent
// le nombre de catégories et celle affichée. L'index, virtuel (non borné pour boucler dans le bon sens), est remonté au
// parent dès que la roulette passe à mi-chemin d'une catégorie.
export function CategoryCarousel({
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
  const { ref, position, stepBy, jumpTo } = useSmoothScroller<HTMLElement>("y", {
    initial: index,
    enabled: canStep,
    touchPx: () => PITCH,
  });

  // Catégorie au centre de la roulette (arrondi de la position) : seul ce changement provoque un rendu React
  const [center, setCenter] = useState(index);
  const centerRef = useRef(index);
  const onIndexChangeRef = useRef(onIndexChange);
  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  });
  useMotionValueEvent(position, "change", (value) => {
    const rounded = Math.round(value);
    if (rounded === centerRef.current) return;
    centerRef.current = rounded;
    setCenter(rounded);
    onIndexChangeRef.current(rounded);
  });

  // Catégorie imposée de l'extérieur (URL au chargement, lien) : la roulette s'y place directement
  useEffect(() => {
    if (index === centerRef.current) return;
    centerRef.current = index;
    jumpTo(index);
    setCenter(index);
  }, [index, jumpTo]);

  const activeIndex = mod(center, count);
  const prev = groups[mod(center - 1, count)];
  const next = groups[mod(center + 1, count)];
  // Deux positions de plus de chaque côté du centre : les catégories entrantes sont déjà là, transparentes
  const slots = canStep ? [-2, -1, 0, 1, 2] : [0];

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canStep) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <nav ref={ref} aria-label="Catégories de meubles" onKeyDown={handleKeyDown} className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => stepBy(-1)}
        disabled={!canStep}
        aria-label={`Catégorie précédente : ${prev.label}`}
        className="relative z-10 flex h-12 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:invisible"
      >
        <Chevron direction="up" />
      </button>

      <div className="relative">
        {/* Indicateur de progression, en colonne à gauche de la barre bordeaux : une bulle par catégorie, pleine pour
            celle affichée. En position absolue, il ne change ni la largeur de la colonne ni celle des cartes. */}
        {canStep && (
          <ol
            aria-label={`Catégorie ${activeIndex + 1} sur ${count}`}
            className="absolute top-1/2 -left-14 m-0 flex -translate-y-1/2 list-none flex-col items-center gap-2.5 p-0"
          >
            {groups.map((group, i) => (
              <li
                key={group.slug}
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full border-[1.5px] border-am-wine transition-[background-color,transform] duration-300 ${
                  i === activeIndex ? "scale-110 bg-am-wine" : "bg-transparent"
                }`}
              />
            ))}
          </ol>
        )}
        {/* touch-none : un glissé vertical sur la liste fait tourner la roulette au lieu de faire défiler la page */}
        <ul
          className="relative m-0 grid h-[252px] w-[250px] touch-none list-none place-items-center p-0 lg:w-[290px]"
          // Point de fuite au niveau des libellés (alignés à gauche) : sans ça l'inclinaison les cisaille en faux italique
          style={{ perspective: 600, perspectiveOrigin: "22% 50%" }}
        >
          {/* Repères fixes : filets autour de la catégorie active et barre bordeaux à gauche ; seuls les libellés glissent */}
          {canStep && (
            <>
              <span aria-hidden="true" className="absolute inset-x-0 h-px bg-black/10" style={{ top: `calc(50% - ${PITCH / 2}px)` }} />
              <span aria-hidden="true" className="absolute inset-x-0 h-px bg-black/10" style={{ top: `calc(50% + ${PITCH / 2}px)` }} />
            </>
          )}
          {/* Clée sur la catégorie centrale : la barre se redessine à chaque changement pour marquer l'arrivée */}
          <span aria-hidden="true" className="absolute top-1/2 -left-7 flex h-12 w-1 -translate-y-1/2 items-center">
            <motion.span
              key={center}
              className="h-full w-full rounded-full bg-am-wine"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
            />
          </span>
          {slots.map((slot) => {
            const key = center + slot;
            return (
              <CategoryItem
                key={key}
                itemKey={key}
                position={position}
                label={groups[mod(key, count)].label}
                slot={slot}
                onSelect={stepBy}
              />
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => stepBy(1)}
        disabled={!canStep}
        aria-label={`Catégorie suivante : ${next.label}`}
        className="relative z-10 flex h-12 w-16 items-center justify-center rounded text-am-wine transition-transform duration-200 hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-wine disabled:invisible"
      >
        <Chevron direction="down" />
      </button>
    </nav>
  );
}
