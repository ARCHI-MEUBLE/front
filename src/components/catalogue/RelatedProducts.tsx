import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export type RelatedProduct = {
  id: number;
  name: string;
  category: string;
  unit_price: number;
  image_url: string;
};

export function RelatedProducts({ items }: { items: RelatedProduct[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.id} href={`/catalogue/${item.id}`} className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded bg-am-mist/25" style={{ aspectRatio: "1/1" }}>
            {item.image_url && (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                unoptimized
                className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.05]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
          </div>
          <span className="eyebrow text-black/70">
            {item.category}
          </span>
          <span className="flex items-baseline justify-between gap-3 text-[17px] font-medium tracking-[-0.02em] text-black">
            <span>{item.name}</span>
            <span>{formatPrice(item.unit_price)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
