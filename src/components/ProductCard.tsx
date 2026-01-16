import Link from "next/link";
import Image from "next/image";

export type ProductModel = {
  id: number;
  name: string;
  description: string;
  image_path: string | null;
  hover_image_path?: string | null;
  created_at: string;
  base_price?: number;
  category?: string;
};

type ProductCardProps = {
  model: ProductModel;
};

export function ProductCard({ model }: ProductCardProps) {
  const price = model.base_price || 890;
  const hasHoverImage = model.hover_image_path && model.hover_image_path !== model.image_path;

  return (
    <Link href={"/configurator/" + model.id} className="group block">
      {/* Image container with hover effect */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
        {/* Main image */}
        <Image
          src={model.image_path || "/placeholder.jpg"}
          alt={model.name}
          fill
          className={`object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            hasHoverImage
              ? "scale-100 group-hover:scale-[1.02] group-hover:opacity-0"
              : "group-hover:scale-[1.03]"
          }`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Hover image - elegant crossfade with subtle zoom */}
        {hasHoverImage && (
          <Image
            src={model.hover_image_path!}
            alt={`${model.name} - vue alternative`}
            fill
            className="object-cover scale-[1.02] opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-100 group-hover:opacity-100"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>

      {/* Content - minimal */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[15px] text-[#1A1917] transition-colors duration-300 group-hover:text-[#8B7355]">
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
