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
    <article className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={model.image_path || "/placeholder.jpg"}
          alt={model.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
       <div className="mt-4 flex flex-1 flex-col">
        <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{model.description}</p>
        <p className="mt-3 text-xs text-gray-500">Créé le {formattedDate}</p>
        <Link
          href={`/configurator/${model.id}`}
          className="mt-3 w-full rounded-full bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-amber-700"
        >
          Configurer ce meuble
        </Link>
      </div>
    </article>
  );
  }