import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, type MotionValue } from "framer-motion";
import type { ModelCardData } from "@/components/models/ModelCard";
import type { Category } from "@/lib/apiClient";

export type CategoryGroup = { slug: string; label: string; models: ModelCardData[] };

// Modulo toujours positif : la roulette des catégories boucle et son index « virtuel » peut devenir négatif
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// Libellés des slugs devinés par la page modèles (inferCategorySlug) quand la catégorie n'existe pas en base
const FALLBACK_LABELS: Record<string, string> = {
  autres: "Autres",
  dressing: "Dressings",
  bibliotheque: "Bibliothèques",
  buffet: "Buffets",
  bureau: "Bureaux",
  "meuble-tv": "Meubles TV",
  "sous-escalier": "Sous-escalier",
  "tete-de-lit": "Têtes de lit",
};

// Une entrée par catégorie (ordre d'affichage de l'admin), même vide, pour que le carrousel des catégories reste stable.
// Les modèles dont la catégorie n'existe pas en base sont regroupés à la fin pour ne pas disparaître de la page.
export function groupModelsByCategory(models: ModelCardData[], categories: Category[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [...categories]
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => ({
      slug: category.slug,
      label: category.name,
      models: models.filter((model) => model.categorySlug === category.slug),
    }));

  for (const model of models) {
    // « all » est le slug de repli de la page (catégorie non devinée) et aussi la valeur « aucun filtre » de l'URL
    const slug = model.categorySlug === "all" ? "autres" : model.categorySlug;
    let group = groups.find((g) => g.slug === slug);
    if (!group) {
      group = { slug, label: FALLBACK_LABELS[slug] ?? model.categoryLabel, models: [] };
      groups.push(group);
    }
    if (!group.models.includes(model)) group.models.push(model);
  }

  return groups;
}

// Positions rendues autour de la fenêtre visible (carrousel fini, sans boucle). Les positions hors champ (-1 et
// `visible`) sont montées à l'avance pour que la carte entrante glisse depuis le bord au lieu d'apparaître d'un coup ;
// avant le premier modèle et après le dernier, il n'y a rien.
export function carouselSlots(offset: number, visible: number, count: number) {
  const shown = Math.min(visible, count);
  const slots: { key: number; slot: number; index: number }[] = [];
  for (let key = offset - 1; key <= offset + shown; key++) {
    if (key >= 0 && key < count) slots.push({ key, slot: key - offset, index: key });
  }
  return slots;
}

// Nombre de cartes de la rangée principale : 1 sur téléphone (sous le breakpoint sm, version dédiée), 2 sur tablette,
// 3 à partir de lg — la mise en page laisse alors assez de largeur pour trois grandes cartes.
const SM_QUERY = "(min-width: 640px)";
const LG_QUERY = "(min-width: 1024px)";
const countFor = (sm: boolean, lg: boolean) => (lg ? 3 : sm ? 2 : 1);

export function useVisibleCount(): number {
  // Lu dès le premier rendu côté navigateur : évite de rendre 3 cartes puis 1 sur téléphone. Sans risque d'écart
  // d'hydratation, le carrousel n'étant affiché qu'après le chargement des données (côté client)
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return 3;
    return countFor(window.matchMedia(SM_QUERY).matches, window.matchMedia(LG_QUERY).matches);
  });

  useEffect(() => {
    const sm = window.matchMedia(SM_QUERY);
    const lg = window.matchMedia(LG_QUERY);
    const update = () => setVisible(countFor(sm.matches, lg.matches));
    update();
    sm.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, []);

  return visible;
}
// Défilement continu des carrousels. `target` est la position voulue (en éléments, éventuellement bornée, fractionnaire pendant un
// Défilement continu des carrousels. `target` est la position voulue (en éléments, non bornée, fractionnaire pendant un
// geste) ; `position` la suit avec un ressort amorti et pilote l'affichage. Au repos, `target` est toujours un entier.
// Ressort proche de l'amortissement critique : glisse vite, sans rebond (un rebond repasserait la mi-distance et ferait
// clignoter l'élément actif).
const SPRING = { stiffness: 220, damping: 32, mass: 1 };
// Pavé tactile : px de défilement pour un élément. Un cran de molette (≥ 50 px d'un coup) avance toujours d'un élément.
const WHEEL_PX = 220;
const WHEEL_NOTCH = 50;
// Avance maximale de la cible sur l'affichage : plafonne la vitesse (≈ 3 éléments/s avec ce ressort), un geste très
// rapide ne fait donc pas tourner le carrousel en roue libre
const MAX_LEAD = 0.5;
const MAX_LEAD_STEPS = 3;
// Pause après laquelle un geste au pavé tactile est considéré fini et se cale sur l'élément le plus proche
const SETTLE_DELAY = 140;

export type SmoothScroller<T extends HTMLElement> = {
  ref: React.RefObject<T | null>;
  position: MotionValue<number>;
  // Avance d'un nombre entier d'éléments depuis la cible courante (flèches, clavier, clic sur un voisin)
  stepBy: (delta: number) => void;
  // Place le carrousel sur un élément sans animation (synchronisation externe : URL, changement de catégorie)
  jumpTo: (index: number) => void;
};

// Seul l'axe du carrousel est intercepté ; un mouvement sur l'autre axe laisse la page défiler normalement.
// Le sens suit le contenu : défiler vers le bas / la droite ou glisser vers le haut / la gauche avance.
// `touchPx` : distance de doigt pour un élément (la taille d'un élément, pour que le contenu suive le doigt).
// `min` / `max` : bornes de la position pour un carrousel fini (arrivé au bout, le geste n'a plus d'effet) ;
// sans bornes, le carrousel boucle à l'infini.
export function useSmoothScroller<T extends HTMLElement>(
  axis: "x" | "y",
  {
    initial = 0,
    enabled = true,
    min = -Infinity,
    max = Infinity,
    touchPx,
  }: { initial?: number; enabled?: boolean; min?: number; max?: number; touchPx: () => number },
): SmoothScroller<T> {
  const ref = useRef<T>(null);
  const target = useMotionValue(initial);
  const position = useSpring(target, SPRING);
  const reduceMotion = useReducedMotion();
  const touchPxRef = useRef(touchPx);
  const boundsRef = useRef({ min, max });
  useEffect(() => {
    touchPxRef.current = touchPx;
    boundsRef.current = { min, max };
  });

  // Toute cible est ramenée dans les bornes. Préférence système « moins d'animations » : la position la rejoint aussitôt.
  const setTarget = useCallback(
    (value: number) => {
      const { min: low, max: high } = boundsRef.current;
      const clamped = Math.max(low, Math.min(high, value));
      target.set(clamped);
      if (reduceMotion) position.jump(clamped);
    },
    [target, position, reduceMotion],
  );

  // Bornes réduites (fenêtre élargie, moins de modèles) : la position revient dans les limites
  useEffect(() => {
    const current = target.get();
    if (current < min || current > max) setTarget(current);
  }, [min, max, target, setTarget]);

  const stepBy = useCallback(
    (delta: number) => {
      const shown = position.get();
      const next = Math.round(target.get()) + delta;
      setTarget(Math.max(Math.round(shown) - MAX_LEAD_STEPS, Math.min(Math.round(shown) + MAX_LEAD_STEPS, next)));
    },
    [position, target, setTarget],
  );

  const jumpTo = useCallback(
    (index: number) => {
      target.jump(index);
      position.jump(index);
    },
    [target, position],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => setTarget(Math.round(target.get()));

    const onWheel = (event: WheelEvent) => {
      // Firefox peut compter en lignes : on ramène en pixels
      const unit = event.deltaMode === 1 ? 16 : 1;
      const primary = (axis === "y" ? event.deltaY : event.deltaX) * unit;
      const other = (axis === "y" ? event.deltaX : event.deltaY) * unit;
      if (Math.abs(primary) <= Math.abs(other)) return;
      event.preventDefault();

      if (settleTimer) clearTimeout(settleTimer);
      if (Math.abs(primary) >= WHEEL_NOTCH) {
        // Cran de molette : un élément, en glissant
        stepBy(Math.sign(primary));
        return;
      }
      // Pavé tactile : la cible suit le geste en continu, puis se cale à la fin
      const shown = position.get();
      const next = target.get() + primary / WHEEL_PX;
      setTarget(Math.max(shown - MAX_LEAD, Math.min(shown + MAX_LEAD, next)));
      settleTimer = setTimeout(settle, SETTLE_DELAY);
    };

    let start: { x: number; y: number; target: number } | null = null;
    let axisLocked: boolean | null = null;
    let velocity = 0;
    let lastMove = { value: 0, time: 0 };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      if (settleTimer) clearTimeout(settleTimer);
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, target: target.get() };
      axisLocked = null;
      velocity = 0;
      lastMove = { value: start.target, time: performance.now() };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const primary = axis === "y" ? dy : dx;
      const other = axis === "y" ? dx : dy;
      // Le geste est attribué à un axe dès les premiers pixels : un glissé sur l'autre axe n'agit jamais sur le carrousel
      if (axisLocked === null && Math.hypot(dx, dy) > 8) axisLocked = Math.abs(primary) > Math.abs(other);
      if (!axisLocked) return;
      const value = start.target - primary / touchPxRef.current();
      const now = performance.now();
      if (now > lastMove.time) velocity = (value - lastMove.value) / ((now - lastMove.time) / 1000);
      lastMove = { value, time: now };
      setTarget(value);
    };
    const onTouchEnd = () => {
      if (!start) return;
      const moved = axisLocked;
      start = null;
      if (!moved) return;
      // Lancer : la vitesse du doigt prolonge un peu le mouvement (au plus un élément de plus), puis calage
      const current = target.get();
      const projected = current + Math.max(-1, Math.min(1, velocity * 0.12));
      setTarget(Math.round(projected));
    };

    // passive: false, sinon preventDefault n'empêche pas la page de défiler pendant le geste
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [axis, enabled, target, position, setTarget, stepBy]);

  return { ref, position, stepBy, jumpTo };
}

// Élément au centre d'un carrousel (arrondi de la position) : seul son changement provoque un rendu React, et il est
// remonté via `onIndexChange` dès que le carrousel passe à mi-chemin. Un `index` imposé de l'extérieur (URL au
// chargement, lien) replace le carrousel directement, sans animation.
export function useCenteredIndex(
  { position, jumpTo }: Pick<SmoothScroller<HTMLElement>, "position" | "jumpTo">,
  index: number,
  onIndexChange: (index: number) => void,
): number {
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
  useEffect(() => {
    if (index === centerRef.current) return;
    centerRef.current = index;
    jumpTo(index);
    setCenter(index);
  }, [index, jumpTo]);
  return center;
}
