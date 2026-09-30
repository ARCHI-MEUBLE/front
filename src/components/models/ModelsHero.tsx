import Image from "next/image";
import Link from "next/link";
import { HOME_MONO, HOME_PILL_LIME, HOME_PILL_OUTLINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function ModelsHero() {
  return (
    <section
      aria-labelledby="modeles-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(48px,8vw,104px)" }}
    >
      <div className="grid grid-cols-1 items-center gap-[clamp(40px,6vw,96px)] lg:grid-cols-2">
        <div className="flex flex-col items-start gap-7">
          <span className={`text-xs ${HOME_MONO}`}>Nos modèles sur mesure</span>
          <h1
            id="modeles-title"
            className="m-0 font-[Geist] font-medium leading-[0.96] tracking-[-0.055em] text-[#161513]"
            style={{ fontSize: "clamp(44px,6.2vw,96px)" }}
          >
            Fabriqués à la main,{" "}
            <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">avec cœur.</span>
          </h1>
          <p className="m-0 max-w-[44ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.5vw,21px)" }}>
            Derrière chaque meuble, il y a un menuisier de notre atelier lillois qui découpe, assemble et
            ponce chaque pièce. Chaque modèle est entièrement personnalisable : dimensions, matériaux,
            finitions.
          </p>
          <div className="flex items-center gap-2.5 text-[15px] text-[#161513]">
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#161513] text-[12px] text-[#D4FF3A]"
            >
              ✓
            </span>
            <span>
              <strong className="font-semibold">Devis gratuit.</strong> Maquette 3D offerte.
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/demande-devis" className={HOME_PILL_LIME}>
              Demander un devis gratuit
            </Link>
            <a href="#collection-title" className={HOME_PILL_OUTLINE}>
              Voir les modèles
            </a>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[28px] bg-[#ECE9E1]" style={{ aspectRatio: "1/1" }}>
          <Image
            src="https://images.unsplash.com/photo-1561297331-a9c00b9c2c44?auto=format&fit=crop&w=1200&q=75"
            alt="Menuisier qui ponce un panneau de bois clair à l'atelier"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
