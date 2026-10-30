import { PRODUCTS } from "@/components/home/homeData";

export function ProductsMarquee() {
  return (
    <section aria-label="Produits" className="pt-[clamp(56px,7vw,96px)]">
      <div className="overflow-hidden border-y border-black/15">
        <div className="home-marquee-products flex w-max">
          {PRODUCTS.map((product) => (
            <ProductItem key={product} product={product} />
          ))}
          {PRODUCTS.map((product) => (
            <ProductItem key={product} product={product} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductItem({ product, hidden }: { product: string; hidden?: boolean }) {
  return (
    <span
      aria-hidden={hidden}
      className="flex items-center gap-[clamp(28px,4vw,56px)] whitespace-nowrap py-[26px] pl-[clamp(28px,4vw,56px)] text-subheading text-black"
    >
      <span>{product}</span>
      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-black bg-am-mist" />
    </span>
  );
}
