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
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F4]">
        <Image
          src={model.image_path || "/placeholder.jpg"}
          alt={model.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      
      {/* Content */}
      <div className="mt-4">
        <h3 className="font-serif text-xl text-[#1A1917] group-hover:underline">
          {model.name}
        </h3>
        {model.description && (
          <p className="mt-1 text-sm text-[#706F6C] line-clamp-1">
            {model.description}
          </p>
        )}
        <p className="mt-2 font-mono text-sm text-[#1A1917]">
          A partir de {price} €
        </p>
      </div>
    </Link>
  );
}
