/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

export type ProductModel = {
  id: number;
  name: string;
  description: string;
  image_path: string | null;
  created_at: string;
};

type ProductCardProps = {
   model: ProductModel;
};
function formatCreatedAt(date: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(date));
  } catch (error) {
    return date;
  }
}

export function ProductCard({ model }: ProductCardProps) {
  const formattedDate = formatCreatedAt(model.created_at);

  return (
    <article className="flex h-full flex-col rounded-sm border border-border bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="aspect-square w-full overflow-hidden rounded-[28px] bg-[#ece3d8]">
        <img
          src={model.image_path || "/placeholder.jpg"}
          alt={model.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="font-serif text-xl text-ink">{model.name}</h3>
        <p className="mt-3 text-sm text-stone line-clamp-2">{model.description}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted">Créé le {formattedDate}</p>
        <Link href={`/configurator/${model.id}`} className="mt-6 w-full btn-primary text-center">
          Configurer ce meuble
        </Link>
      </div>
    </article>
  );
}
