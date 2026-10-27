import { describe, expect, it } from "vitest";
import { carouselSlots, groupModelsByCategory, mod } from "./modelsCarousel";
import type { ModelCardData } from "./ModelCard";
import type { Category } from "@/lib/apiClient";

const model = (id: number, categorySlug: string): ModelCardData => ({
  id,
  name: `Modèle ${id}`,
  description: "",
  imagePath: null,
  categorySlug,
  categoryLabel: categorySlug,
});

const category = (slug: string, display_order: number): Category => ({
  id: display_order,
  name: slug.toUpperCase(),
  slug,
  description: null,
  image_url: null,
  display_order,
  is_active: 1,
  created_at: "",
  updated_at: "",
});

describe("mod", () => {
  it("reste positif pour les index négatifs", () => {
    expect(mod(-1, 4)).toBe(3);
    expect(mod(-5, 4)).toBe(3);
    expect(mod(9, 4)).toBe(1);
  });
});

describe("groupModelsByCategory", () => {
  it("suit l'ordre d'affichage et garde les catégories vides", () => {
    const groups = groupModelsByCategory(
      [model(1, "tv"), model(2, "biblio"), model(3, "tv")],
      [category("tv", 2), category("dressing", 3), category("biblio", 1)],
    );
    expect(groups.map((g) => g.slug)).toEqual(["biblio", "tv", "dressing"]);
    expect(groups[1].models.map((m) => m.id)).toEqual([1, 3]);
    expect(groups[2].models).toEqual([]);
  });

  it("regroupe les modèles sans catégorie connue au lieu de les perdre", () => {
    const groups = groupModelsByCategory([model(1, "all"), model(2, "tv")], [category("tv", 1)]);
    expect(groups.map((g) => [g.slug, g.label, g.models.length])).toEqual([
      ["tv", "TV", 1],
      ["autres", "Autres", 1],
    ]);
  });
});

describe("carouselSlots", () => {
  it("monte une carte hors champ de chaque côté quand le défilement est possible", () => {
    expect(carouselSlots(0, 3, 5)).toEqual([
      { key: -1, slot: -1, index: 4 },
      { key: 0, slot: 0, index: 0 },
      { key: 1, slot: 1, index: 1 },
      { key: 2, slot: 2, index: 2 },
      { key: 3, slot: 3, index: 3 },
    ]);
  });

  it("boucle après le dernier modèle", () => {
    expect(carouselSlots(4, 3, 5).filter((s) => s.slot >= 0 && s.slot < 3).map((s) => s.index)).toEqual([4, 0, 1]);
  });

  it("n'affiche que les modèles disponibles, sans doublon, quand il y en a peu", () => {
    expect(carouselSlots(0, 3, 2).map((s) => s.index)).toEqual([0, 1]);
    expect(carouselSlots(0, 3, 0)).toEqual([]);
  });
});
