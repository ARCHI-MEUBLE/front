import { useEffect, useRef, useState } from "react";
import type { ModelCardData } from "@/components/models/ModelCard";
import type { Category } from "@/lib/apiClient";

export type CategoryGroup = { slug: string; label: string; models: ModelCardData[] };

// Modulo toujours positif : les carrousels sont cycliques et leurs index « virtuels » peuvent devenir négatifs
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

// Positions rendues autour de la fenêtre visible. Les positions hors champ (-1 et `visible`) sont montées à l'avance
// pour que la carte entrante glisse depuis le bord au lieu d'apparaître d'un coup.
export function carouselSlots(offset: number, visible: number, count: number) {
  if (count === 0) return [];
  const shown = Math.min(visible, count);
  const canScroll = count > shown;
  const first = canScroll ? -1 : 0;
  const last = canScroll ? shown : shown - 1;
  const slots: { key: number; slot: number; index: number }[] = [];
  for (let slot = first; slot <= last; slot++) {
    slots.push({ key: offset + slot, slot, index: mod(offset + slot, count) });
  }
  return slots;
}

// Nombre de cartes de la rangée principale selon la largeur (1 / 2 / 3), aligné sur les breakpoints sm et lg
export function useVisibleCount(): number {
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const sm = window.matchMedia("(min-width: 640px)");
    const update = () => setVisible(lg.matches ? 3 : sm.matches ? 2 : 1);
    update();
    lg.addEventListener("change", update);
    sm.addEventListener("change", update);
    return () => {
      lg.removeEventListener("change", update);
      sm.removeEventListener("change", update);
    };
  }, []);

  return visible;
}

// Distance de défilement (px) qui fait avancer d'un cran : un cran de molette (~100 px) = un pas,
// un pavé tactile ou un doigt font défiler en continu, un pas tous les WHEEL_STEP / TOUCH_STEP px parcourus
const WHEEL_STEP = 100;
const TOUCH_STEP = 140;
// Intervalle minimal entre deux pas (≈ durée du glissement, ~0,3 s) : chaque pas se termine avant le suivant, et un
// geste plus rapide est plafonné au lieu d'être mis en file d'attente
const MIN_STEP_INTERVAL = 350;

// Navigation sans les flèches : molette / pavé tactile et glissé au doigt sur un axe, en continu dans les deux sens.
// Seul l'axe du carrousel est intercepté ; un mouvement sur l'autre axe laisse la page défiler normalement.
// Le sens suit le contenu : défiler vers le bas ou glisser vers le haut / la gauche avance (+1).
export function useGestureStep<T extends HTMLElement>(axis: "x" | "y", onStep: (delta: number) => void, enabled = true) {
  const ref = useRef<T>(null);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let lastStep = 0;
    // Renvoie true si le pas a été fait ; sinon le mouvement est ignoré (pas de rattrapage différé, donc rien ne « traîne »)
    const step = (delta: number) => {
      const now = performance.now();
      if (now - lastStep < MIN_STEP_INTERVAL) return false;
      lastStep = now;
      onStepRef.current(delta);
      return true;
    };

    let accumulated = 0;
    let lastWheel = 0;
    const onWheel = (event: WheelEvent) => {
      // Firefox peut compter en lignes : on ramène en pixels
      const unit = event.deltaMode === 1 ? 16 : 1;
      const primary = (axis === "y" ? event.deltaY : event.deltaX) * unit;
      const other = (axis === "y" ? event.deltaX : event.deltaY) * unit;
      if (Math.abs(primary) <= Math.abs(other)) return;
      event.preventDefault();

      const now = performance.now();
      // Changement de sens ou reprise après une pause : on repart de zéro pour réagir tout de suite
      if (Math.sign(primary) !== Math.sign(accumulated) || now - lastWheel > 200) accumulated = 0;
      lastWheel = now;
      accumulated += primary;
      if (Math.abs(accumulated) >= WHEEL_STEP && step(Math.sign(accumulated))) accumulated = 0;
      // Plafond : un geste plus rapide que le carrousel ne s'accumule pas en pas différés
      accumulated = Math.max(-WHEEL_STEP, Math.min(WHEEL_STEP, accumulated));
    };

    let anchor: { x: number; y: number } | null = null;
    let axisLocked: boolean | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      anchor = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
      axisLocked = null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!anchor) return;
      const touch = event.touches[0];
      const dx = touch.clientX - anchor.x;
      const dy = touch.clientY - anchor.y;
      const primary = axis === "y" ? dy : dx;
      const other = axis === "y" ? dx : dy;
      // Le geste est attribué à un axe dès les premiers pixels : un glissé sur l'autre axe n'agit jamais sur le carrousel
      if (axisLocked === null && Math.hypot(dx, dy) > 10) axisLocked = Math.abs(primary) > Math.abs(other);
      if (!axisLocked) return;
      if (Math.abs(primary) >= TOUCH_STEP && step(primary < 0 ? 1 : -1)) {
        anchor = { x: touch.clientX, y: touch.clientY };
      }
    };
    const onTouchEnd = () => {
      anchor = null;
    };

    // passive: false, sinon preventDefault n'empêche pas la page de défiler pendant le geste
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [axis, enabled]);

  return ref;
}
