import { memo, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ModelCardData } from "@/components/models/ModelCard";

// Images du site (public/images) : redimensionnées et converties par l'optimiseur de Next, au lieu de télécharger des
// originaux de plusieurs Mo pour une carte de ~250 px. Les autres (uploads servis par le backend) restent telles quelles.
const isOptimizable = (src: string) => src.startsWith("/images/");

// Format commun de toutes les vignettes : les photos sont recadrées (object-cover, centrées) dans ce cadre, pour que
// la grille reste régulière quelles que soient les images d'origine. À aligner sur le format des futures photos.
export const MODEL_TILE_ASPECT = "6 / 5";
export const MODEL_TILE_RATIO = 6 / 5;

// Bandeau des cartes (≈ 190 à 450 px de large selon l'écran) : il suit la largeur de la carte elle-même (container
// queries, la carte porte `@container`), pour que le nom tienne à toutes les tailles
const BAR = {
  radius: "rounded-[20px]",
  bar: "h-[48px] pl-3.5 pr-1.5 @min-[300px]:h-[52px] @min-[300px]:pl-4 @min-[400px]:h-[56px] @min-[400px]:pl-5",
  title: "text-[13px] @min-[300px]:text-[15px] @min-[400px]:text-[16px]",
  button: "px-3 py-1.5 text-[12px] @min-[300px]:px-3.5 @min-[300px]:py-2 @min-[300px]:text-[13px] @min-[400px]:px-4",
};

// Photo d'une vignette, recadrée dans le format commun (mêmes réglages pour les cartes et les aperçus)
function TileImage({ model, sizes }: { model: ModelCardData; sizes: string }) {
  return model.imagePath ? (
    <Image
      src={model.imagePath}
      alt=""
      fill
      unoptimized={!isOptimizable(model.imagePath)}
      className="object-cover object-center transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
      sizes={sizes}
    />
  ) : (
    <div className="absolute inset-0 flex items-start justify-center pt-[18%]">
      <span className="eyebrow text-black/40">Visuel à venir</span>
    </div>
  );
}

// Vignette d'un modèle : photo plein cadre, et en bas un bandeau bleu nuit arrondi avec le nom et le bouton
// « Configurer ». Rien d'autre, pour que la photo du meuble porte la vignette.
function ModelTile({ model, children }: { model: ModelCardData; children: (content: ReactNode, className: string) => ReactNode }) {
  const s = BAR;
  const content = (
    <>
      <TileImage model={model} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" />
      <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-am-navy ${s.radius} ${s.bar}`}>
        {/* Nom trop long pour la carte : coupé par des points de suspension, complet au survol */}
        <h3 title={model.name} className={`m-0 min-w-0 truncate font-medium tracking-[-0.02em] text-white ${s.title}`}>
          {model.name}
        </h3>
        <span
          aria-hidden="true"
          className={`flex-none whitespace-nowrap rounded-full bg-am-mist text-am-navy transition-colors duration-200 group-hover:bg-white ${s.button}`}
        >
          Configurer →
        </span>
      </div>
    </>
  );
  return children(
    content,
    `@container group relative block overflow-hidden bg-[#e9e7e2] shadow-[0_10px_24px_-8px_rgba(31,34,56,0.35)] ${s.radius}`,
  );
}

// Carte des carrousels de la page modèles (ordinateur et tablette), au format commun MODEL_TILE_ASPECT.
// Mémorisée : un pas du carrousel ne redessine que les cartes dont les props changent.
export const ModelCarouselCard = memo(function ModelCarouselCard({
  model,
  focusable = true,
}: {
  model: ModelCardData;
  focusable?: boolean;
}) {
  return (
    <ModelTile model={model}>
      {(content, className) => (
        <Link
          href={`/configurator/${model.id}`}
          aria-label={`Configurer : ${model.name}`}
          tabIndex={focusable ? undefined : -1}
          style={{ aspectRatio: MODEL_TILE_ASPECT }}
          className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-navy`}
        >
          {content}
        </Link>
      )}
    </ModelTile>
  );
});

// Vignette des aperçus (catégories précédente et suivante) : la photo seule, au format commun, ni cliquable ni
// focusable — seule la rangée centrale se navigue. La rangée d'aperçu la coupe et la fond (ProductCarousel).
export const ModelPreviewTile = memo(function ModelPreviewTile({ model }: { model: ModelCardData | null }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-[#e9e7e2]" style={{ aspectRatio: MODEL_TILE_ASPECT }}>
      {model && <TileImage model={model} sizes="(max-width: 1024px) 22vw, 15vw" />}
    </div>
  );
});

// Vignette de la liste des modèles sur téléphone : même vignette et même format (MODEL_TILE_ASPECT) que sur
// ordinateur, donc photo cadrée à l'identique ; sa hauteur est calculée par la liste pour que trois tiennent à l'écran.
export const ModelRowCard = memo(function ModelRowCard({
  model,
  height,
  focusable = true,
}: {
  model: ModelCardData;
  height: number;
  focusable?: boolean;
}) {
  return (
    <ModelTile model={model}>
      {(content, className) => (
        <Link
          href={`/configurator/${model.id}`}
          aria-label={`Configurer : ${model.name}`}
          tabIndex={focusable ? undefined : -1}
          style={{ height, width: Math.round(height * MODEL_TILE_RATIO) }}
          className={`${className} mx-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-navy`}
        >
          {content}
        </Link>
      )}
    </ModelTile>
  );
});
