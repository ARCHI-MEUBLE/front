import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { RealisationCard, RealisationData, RealisationImage } from "@/components/realisations/RealisationCard";
import { EmptyState } from "@/components/shared/EmptyState";

export type RealisationCategory = { slug: string; name: string };

export function RealisationsCollectionSection({
  realisations,
  categories,
  isLoading,
  loadFailed,
  onRetry,
  selectedCategory,
  onCategoryChange,
  onGalleryOpen,
}: {
  realisations: RealisationData[];
  categories: RealisationCategory[];
  isLoading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  selectedCategory: string;
  onCategoryChange: (slug: string) => void;
  onGalleryOpen: (images: RealisationImage[], startIndex: number) => void;
}) {
  return (
    <section
      aria-labelledby="real-projets"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(80px,10vw,144px)" }}
    >
      <div className="sticky top-[68px] z-10 mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/15 bg-am-paper/95 py-4 backdrop-blur-md">
        <h2 id="real-projets" className="m-0 text-subheading text-black">
          Explorez nos projets
        </h2>
        {categories.length > 1 && (
          <div role="tablist" aria-label="Filtrez par type de réalisation" className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = category.slug === selectedCategory;
              return (
                <button
                  key={category.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onCategoryChange(category.slug)}
                  className={`min-h-10 rounded-full border px-3.5 py-2 text-[14px] ${
                    isActive ? "border-black bg-am-navy text-white" : "border-black/15 bg-white text-black"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <div className="animate-pulse rounded bg-am-mist/25" style={{ aspectRatio: "4/5" }} />
              <div className="h-5 w-2/3 animate-pulse rounded bg-am-mist/25" />
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <EmptyState
          title="La galerie est momentanément indisponible"
          text="Les réalisations n'ont pas pu être chargées. Réessayez dans un instant. Si le problème continue, l'atelier reste joignable par téléphone ou via le formulaire de contact."
          primary={{ label: "Réessayer", onClick: onRetry }}
          secondary={{ label: "Nous contacter", href: "/contact-request" }}
        />
      ) : realisations.length === 0 ? (
        selectedCategory === "all" ? (
          <EmptyState
            title="Nos réalisations arrivent bientôt"
            text="Nous préparons la galerie de nos derniers projets. En attendant, découvrez nos modèles ou parlez-nous du vôtre."
            primary={{ label: "Voir les modèles", href: "/models" }}
            secondary={{ label: "Demander un devis", href: "/demande-devis" }}
          />
        ) : (
          <EmptyState
            title="Aucune réalisation dans cette catégorie"
            text="Essayez une autre catégorie pour découvrir nos projets."
            primary={{ label: "Voir toutes les réalisations", onClick: () => onCategoryChange("all") }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {realisations.map((realisation) => (
            <RealisationCard key={realisation.id} realisation={realisation} onGalleryOpen={onGalleryOpen} />
          ))}
        </div>
      )}
    </section>
  );
}
