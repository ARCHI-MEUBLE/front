import Image from "next/image";
import Link from "next/link";
import {
  HOME_SECTION_NO_TOP,
  HOME_MONO,
  HOME_HEADING,
  HOME_PILL_DARK,
  HOME_PILL_OUTLINE
} from "@/components/home/homeLayout";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className={`${HOME_SECTION_NO_TOP} pt-12 sm:pt-16 lg:pt-24`}>
      <div className={`flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#5F5B53] ${HOME_MONO} mb-8`}>
        <span>Menuisier à Lille</span>
        <span>Atelier, 30 rue Henri Regnault</span>
      </div>

      <h1
        id="hero-title"
        className={`${HOME_HEADING} m-0 max-w-[12ch] text-[46px] sm:text-[64px] lg:text-[96px] xl:text-[132px]`}
      >
        <span className="block">Meubles sur mesure,</span>
        <span className="block">
          faits pour <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">durer.</span>
        </span>
      </h1>

      <div className="mt-11 grid grid-cols-1 items-end gap-8 sm:grid-cols-2">
        <p className="m-0 max-w-[40ch] text-[17px] leading-[1.45] text-[#3B3832] sm:text-[21px]">
          Chaque pièce est dessinée pour votre espace, fabriquée dans notre atelier lillois, livrée chez vous.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/realisations" className={HOME_PILL_DARK}>
            Voir les réalisations →
          </Link>
          <a href="tel:+33601062867" className={HOME_PILL_OUTLINE}>
            Appeler l&apos;atelier
          </a>
        </div>
      </div>

      <figure className="relative mt-11 aspect-video overflow-hidden rounded-2xl border border-[#E5E2D9] bg-[#ECE9E1] sm:mt-16 lg:mt-[72px]">
        <Image
          src="/images/home/hero-bibliotheque.png"
          alt="Bibliothèque sur mesure ArchiMeuble"
          fill
          priority
          sizes="(min-width: 1360px) 1360px, 100vw"
          className="object-cover"
        />
        <figcaption className="absolute bottom-4 left-4 flex flex-col gap-0.5 rounded-[10px] border border-[#161513] bg-[#F7F6F2] px-3.5 py-2.5">
          <span className={`text-[11px] text-[#5F5B53] ${HOME_MONO}`}>Réalisation récente</span>
          <span className="text-[15px] font-medium text-[#161513]">Bibliothèque sur mesure, Lille, 2024</span>
        </figcaption>
      </figure>
    </section>
  );
}
