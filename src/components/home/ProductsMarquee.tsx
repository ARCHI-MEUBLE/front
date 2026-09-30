const products = [
  "Dressings",
  "Bibliothèques",
  "Buffets",
  "Bureaux",
  "Meubles TV",
  "Sous-escalier"
];

export function ProductsMarquee() {
  const loop = [...products, ...products];

  return (
    <section aria-label="Produits" className="pt-14 sm:pt-16 lg:pt-24">
      <div className="overflow-hidden border-y border-[#E5E2D9]">
        <div className="flex w-max animate-home-marquee">
          {loop.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex items-center gap-7 whitespace-nowrap py-6 pl-7 text-[22px] font-medium tracking-[-0.04em] text-[#161513] sm:text-[28px] lg:gap-14 lg:pl-14 lg:text-[32px]"
            >
              {item}
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[#161513] bg-[#D4FF3A]" />
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes home-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-home-marquee {
          animation: home-marquee 26s linear infinite;
        }
      `}</style>
    </section>
  );
}
