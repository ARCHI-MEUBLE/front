import { RealisationCarousel } from "@/components/facades/RealisationCarousel";

export type RealisationImage = { id: number; image_url: string; legende?: string; ordre: number };

export type RealisationData = {
  id: number;
  titre: string;
  images?: RealisationImage[];
  date_projet: string;
  lieu: string;
  categorie: string;
  featured?: boolean;
};

function projectYear(dateProjet: string): string {
  const parsed = new Date(dateProjet);
  return isNaN(parsed.getTime()) ? dateProjet : String(parsed.getFullYear());
}

export function RealisationCard({
  realisation,
  onGalleryOpen,
}: {
  realisation: RealisationData;
  onGalleryOpen: (images: RealisationImage[], startIndex: number) => void;
}) {
  return (
    <figure className="m-0 flex flex-col gap-3.5">
      <div className="relative overflow-hidden rounded bg-am-mist/25" style={{ aspectRatio: "4/5" }}>
        <RealisationCarousel images={realisation.images || []} onGalleryOpen={onGalleryOpen} className="!aspect-auto h-full" />
        {realisation.featured && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-am-navy px-3 py-1 text-xs font-medium text-am-mist">
            Coup de cœur
          </div>
        )}
      </div>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[20px] font-medium tracking-[-0.035em] text-black">{realisation.titre}</span>
        <span className="whitespace-nowrap font-[Geist_Mono] text-[11px] uppercase tracking-[0.04em] text-black/70">
          {realisation.lieu} · {projectYear(realisation.date_projet)}
        </span>
      </figcaption>
    </figure>
  );
}
