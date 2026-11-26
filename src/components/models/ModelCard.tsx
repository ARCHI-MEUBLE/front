import Image from "next/image";
import Link from "next/link";

// Pas de prix sur la carte : celui de la base ne correspond pas au prix calculé par le configurateur
export type ModelCardData = {
  id: number;
  name: string;
  description: string;
  imagePath: string | null;
  // Image au survol (champ du formulaire admin), affichée à la place de la photo quand on survole la carte
  hoverImagePath?: string | null;
  categorySlug: string;
  categoryLabel: string;
};

export function ModelCard({ model, index }: { model: ModelCardData; index: number }) {
  return (
    <Link
      href={`/configurator/${model.id}`}
      aria-label={`Configurer : ${model.name}`}
      className="group flex flex-col gap-4"
    >
      <div className="relative overflow-hidden rounded bg-am-mist/25" style={{ aspectRatio: "4/5" }}>
        {model.imagePath && (
          <Image
            src={model.imagePath}
            alt={model.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="grid items-start gap-x-3 gap-y-1" style={{ gridTemplateColumns: "32px minmax(0,1fr) auto" }}>
        <span className="pt-[5px] font-mono text-[12px] text-black/70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-card-title text-black">{model.name}</h3>
            <span className="whitespace-nowrap eyebrow text-black/70">
              {model.categoryLabel}
            </span>
          </div>
          <p className="m-0 text-[15px] text-black/70">{model.description}</p>
          <p className="m-0 mt-1 text-[15px]">
            <span className="text-black underline decoration-black/30 underline-offset-4 transition-colors group-hover:decoration-black">
              Configurer ce modèle
            </span>
          </p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-black bg-am-mist text-[18px] transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </Link>
  );
}
