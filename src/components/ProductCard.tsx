import Link from "next/link";
import Image from "next/image";

export type ProductModel = {
  id: number;
  name: string;
  description: string;
  image_path: string | null;
  created_at: string;
  base_price?: number;
  category?: string;
};

type ProductCardProps = {
  model: ProductModel;
};

export function ProductCard({ model }: ProductCardProps) {
  const price = model.base_price || 890;

  return (
    <Link href={"/configurator/" + model.id} className="group block">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
        <Image
          src={model.image_path || "/placeholder.jpg"}
          alt={model.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content - minimal */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[15px] text-[#1A1917]">
            {model.name}
          </h3>
          <span className="text-[13px] text-[#999]">
            {price} €
          </span>
        </div>
      </div>
    </Link>
  );
}
