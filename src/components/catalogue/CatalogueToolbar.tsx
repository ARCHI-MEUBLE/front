import Link from "next/link";
import { HOME_MONO } from "@/components/home/homeLayout";

export function CatalogueToolbar({
  categories,
  categoryCounts,
  totalCount,
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  cartCount,
}: {
  categories: string[];
  categoryCounts: Record<string, number>;
  totalCount: number;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  cartCount: number;
}) {
  return (
    <div className="sticky top-[68px] z-10 mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/15 bg-am-paper/95 py-4 backdrop-blur-md">
      <div role="tablist" aria-label="Catégories" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === ""}
          onClick={() => onCategoryChange("")}
          className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] ${
            selectedCategory === ""
              ? "border-black bg-am-navy text-white"
              : "border-black/15 bg-white text-black"
          }`}
        >
          <span>Tout</span>
          <span className="font-mono text-[11px] opacity-70">{totalCount}</span>
        </button>
        {categories.map((category) => {
          const isActive = category === selectedCategory;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onCategoryChange(category)}
              className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] ${
                isActive ? "border-black bg-am-navy text-white" : "border-black/15 bg-white text-black"
              }`}
            >
              <span>{category}</span>
              <span className="font-mono text-[11px] opacity-70">{categoryCounts[category] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher..."
          className="h-10 min-w-0 flex-1 rounded-full border border-black/30 bg-white px-4 text-[14px] text-black outline-none placeholder:text-black/70"
        />
        <label className={`flex items-center gap-2 ${HOME_MONO}`}>
          Trier
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="min-h-10 cursor-pointer rounded-full border border-black/30 bg-white px-3.5 py-2 font-sans text-[14px] normal-case tracking-normal text-black"
          >
            <option value="newest">Nouveautés</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </label>
        <Link
          href="/cart"
          className="flex min-h-10 items-center gap-2 rounded-full bg-am-navy px-4 py-2 text-[14px] text-white"
        >
          Panier
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-am-mist px-1.5 font-mono text-[12px] text-black">
            {cartCount}
          </span>
        </Link>
      </div>
    </div>
  );
}
