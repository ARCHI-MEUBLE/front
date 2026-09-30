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
    <div className="sticky top-16 z-10 mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E2D9] bg-[#F7F6F2]/95 py-4 backdrop-blur-md">
      <div role="tablist" aria-label="Catégories" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === ""}
          onClick={() => onCategoryChange("")}
          className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] ${
            selectedCategory === ""
              ? "border-[#161513] bg-[#161513] text-[#F7F6F2]"
              : "border-[#E5E2D9] bg-white text-[#161513]"
          }`}
        >
          <span>Tout</span>
          <span className="font-[Geist_Mono] text-[11px] opacity-70">{totalCount}</span>
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
                isActive ? "border-[#161513] bg-[#161513] text-[#F7F6F2]" : "border-[#E5E2D9] bg-white text-[#161513]"
              }`}
            >
              <span>{category}</span>
              <span className="font-[Geist_Mono] text-[11px] opacity-70">{categoryCounts[category] ?? 0}</span>
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
          className="h-10 min-w-0 flex-1 rounded-full border border-[#CFCBC0] bg-white px-4 text-[14px] text-[#161513] outline-none placeholder:text-[#5F5B53]"
        />
        <label className={`flex items-center gap-2 text-[12px] ${HOME_MONO}`}>
          Trier
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="min-h-10 cursor-pointer rounded-full border border-[#CFCBC0] bg-white px-3.5 py-2 font-[Geist] text-[14px] normal-case tracking-normal text-[#161513]"
          >
            <option value="newest">Nouveautés</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </label>
        <Link
          href="/cart"
          className="flex min-h-10 items-center gap-2 rounded-full bg-[#161513] px-4 py-2 text-[14px] text-[#F7F6F2]"
        >
          Panier
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#D4FF3A] px-1.5 font-[Geist_Mono] text-[12px] text-[#161513]">
            {cartCount}
          </span>
        </Link>
      </div>
    </div>
  );
}
