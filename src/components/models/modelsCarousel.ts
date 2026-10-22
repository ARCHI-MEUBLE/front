import { useEffect, useState } from "react";
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
