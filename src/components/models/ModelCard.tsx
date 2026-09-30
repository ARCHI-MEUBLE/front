import Image from "next/image";
import Link from "next/link";

export type ModelCardData = {
  id: number;
  name: string;
  description: string;
  imagePath: string | null;
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
      <div className="relative overflow-hidden rounded bg-[#ECE9E1]" style={{ aspectRatio: "4/5" }}>
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
        <span className="pt-[5px] font-[Geist_Mono] text-[12px] text-[#5F5B53]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 font-[Geist] text-[22px] font-medium tracking-[-0.035em] text-[#161513]">{model.name}</h3>
            <span className="whitespace-nowrap font-[Geist_Mono] text-[11px] uppercase tracking-[0.04em] text-[#5F5B53]">
              {model.categoryLabel}
            </span>
          </div>
          <p className="m-0 text-[15px] text-[#5F5B53]">{model.description}</p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[#161513] bg-[#D4FF3A] text-[18px] transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </Link>
  );
}
