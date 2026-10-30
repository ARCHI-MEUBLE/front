import type { CategoryGroup } from "@/components/models/modelsCarousel";

// Indicateur de progression des catégories : une bulle par catégorie, pleine (bordeaux) pour celle affichée.
// Vertical à gauche de la roulette sur ordinateur, horizontal au-dessus de la catégorie sur téléphone.
export function ProgressDots({
  groups,
  activeIndex,
  orientation,
  className = "",
}: {
  groups: CategoryGroup[];
  activeIndex: number;
  orientation: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <ol
      aria-label={`Catégorie ${activeIndex + 1} sur ${groups.length}`}
      className={`m-0 flex list-none items-center gap-2.5 p-0 ${orientation === "vertical" ? "flex-col" : ""} ${className}`}
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
  );
}
