import { PRODUCTS } from "@/components/home/homeData";

export function ProductsMarquee() {
  return (
    <section aria-label="Produits" className="pt-[clamp(56px,7vw,96px)]">
      <div className="overflow-hidden border-y border-[#E5E2D9]">
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
      className="flex items-center gap-[clamp(28px,4vw,56px)] whitespace-nowrap py-[26px] pl-[clamp(28px,4vw,56px)] font-medium tracking-[-0.04em] text-[#161513]"
      style={{ fontSize: "clamp(22px,2.4vw,32px)" }}
    >
      <span>{product}</span>
      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[#161513] bg-[#D4FF3A]" />
    </span>
  );
}
