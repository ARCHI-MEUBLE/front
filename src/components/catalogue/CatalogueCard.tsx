import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export type CatalogueItemData = {
  id: number;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  unit: string;
  image_url: string;
  variations?: { id?: number; color_name: string; image_url: string; is_default: number }[];
};

export function CatalogueCard({
  item,
  selectedVariationIndex,
  onSelectVariation,
  onAddToCart,
}: {
  item: CatalogueItemData;
  selectedVariationIndex: number;
  onSelectVariation: (index: number) => void;
  onAddToCart: () => void;
}) {
  const variations = item.variations || [];
  const defaultIndex = variations.findIndex((v) => v.is_default === 1);
  const activeIndex = selectedVariationIndex >= 0 ? selectedVariationIndex : defaultIndex;
  const image = activeIndex >= 0 ? variations[activeIndex]?.image_url : item.image_url;

  return (
    <article className="flex flex-col gap-3.5">
      <Link
        href={`/catalogue/${item.id}`}
        className="relative block overflow-hidden rounded bg-am-mist/25"
        style={{ aspectRatio: "1/1" }}
      >
        {image && (
          <Image
            src={image}
            alt={item.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.05]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}
      </Link>
      <div className="grid items-start gap-x-3 gap-y-1" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow text-black/70">
            {item.category}
          </span>
          <h3 className="m-0 text-card-title text-black">
            <Link href={`/catalogue/${item.id}`} className="underline decoration-transparent underline-offset-4 hover:decoration-current">
              {item.name}
            </Link>
          </h3>
          <p className="m-0 text-[14px] text-black/70">{item.description}</p>
          <span className="mt-1.5 text-[17px] font-medium text-black">
            {formatPrice(item.unit_price)}
          </span>
          {variations.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {variations.map((variation, index) => (
                <button
                  key={variation.id ?? index}
                  type="button"
                  title={variation.color_name}
                  onClick={() => onSelectVariation(index)}
                  className={`h-6 w-6 rounded-full border-2 bg-cover bg-center ${
                    index === activeIndex ? "border-black" : "border-transparent"
                  }`}
                  style={{ backgroundImage: variation.image_url ? `url(${variation.image_url})` : undefined, backgroundColor: "color-mix(in srgb, var(--am-mist) 30%, transparent)" }}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label={`Ajouter au panier : ${item.name}`}
          onClick={onAddToCart}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-black bg-am-mist text-[20px] leading-none text-black transition-transform duration-200 hover:-translate-y-0.5"
        >
          +
        </button>
      </div>
    </article>
  );
}
