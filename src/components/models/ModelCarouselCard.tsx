import Image from "next/image";
import Link from "next/link";
import { Pencil, SlidersHorizontal } from "lucide-react";
import type { ModelCardData } from "@/components/models/ModelCard";

// Carte des carrousels de la page modèles : fond gris clair, image contenue, nom en pied.
// En aperçu (rangées du dessus et du dessous) elle n'est ni cliquable ni focusable : seule la rangée centrale se navigue.
export function ModelCarouselCard({
  model,
  preview = false,
  focusable = true,
}: {
  model: ModelCardData;
  preview?: boolean;
  focusable?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between text-black/70">
        <span className={`flex items-center gap-1.5 ${preview ? "text-[9px]" : "text-[11px]"}`}>
          <Pencil aria-hidden="true" className={preview ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={1.75} />
          Sur-mesure
        </span>
        <span
          aria-hidden="true"
          className={`flex items-center justify-center rounded-full border border-black/40 ${preview ? "h-4 w-4" : "h-6 w-6"}`}
        >
          <SlidersHorizontal className={preview ? "h-2 w-2" : "h-3 w-3"} strokeWidth={1.75} />
        </span>
      </div>
      <div className="relative aspect-[4/3] w-full">
        {model.imagePath ? (
          <Image
            src={model.imagePath}
            alt={preview ? "" : model.name}
            fill
            unoptimized
            className="object-contain transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-sm border border-dashed border-black/10">
            <span className="eyebrow text-black/40">Visuel à venir</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
        <h3 className={`m-0 w-full truncate text-black ${preview ? "text-[11px]" : "text-[15px] font-medium"}`}>
          {model.name}
        </h3>
        {!preview && (
          <span className="text-[12px] text-black/60 underline decoration-black/20 underline-offset-4 transition-colors group-hover:decoration-black">
            Configurer ce modèle
          </span>
        )}
      </div>
    </>
  );

  const cardClass = `group flex flex-col rounded-md bg-[#efefef] ${preview ? "gap-2 p-2" : "gap-4 p-3 sm:p-4"}`;

  if (preview) return <div className={cardClass}>{content}</div>;

  return (
    <Link
      href={`/configurator/${model.id}`}
      aria-label={`Configurer : ${model.name}`}
      tabIndex={focusable ? undefined : -1}
      className={`${cardClass} transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-am-navy`}
    >
      {content}
    </Link>
  );
}
