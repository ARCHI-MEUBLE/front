import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function CatalogueHero() {
  return (
    <section
      aria-labelledby="boutique-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(48px,8vw,104px)" }}
    >
      <div className={`mb-6 text-xs ${HOME_MONO}`}>Notre boutique</div>
      <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
        <h1
          id="boutique-title"
          className="m-0 font-[Geist] font-medium leading-[0.96] tracking-[-0.055em] text-[#161513]"
          style={{ fontSize: "clamp(44px,6.2vw,96px)" }}
        >
          Les finitions <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">qui changent tout.</span>
        </h1>
        <p className="m-0 max-w-[44ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.5vw,21px)" }}>
          Découvrez notre sélection de produits et accessoires haut de gamme pour vos projets d&apos;aménagement.
        </p>
      </div>
    </section>
  );
}
