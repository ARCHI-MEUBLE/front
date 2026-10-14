import Image from "next/image";
import Link from "next/link";
import { HOME_MONO, HOME_PILL_DARK, HOME_PILL_OUTLINE, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className={`${HOME_SECTION_NO_TOP} pt-[clamp(32px,5vw,72px)]`}>
      <div className={`mb-8 flex flex-wrap gap-x-6 gap-y-2 text-xs ${HOME_MONO}`}>
        <span>Menuisier à Lille</span>
        <span>Atelier, 30 rue Henri Regnault</span>
      </div>
      <h1
        id="hero-title"
        className="m-0 max-w-[12ch] font-[Geist] font-medium leading-[0.96] tracking-[-0.055em] text-black"
        style={{ fontSize: "clamp(46px,8.6vw,132px)" }}
      >
        <span className="block">Meubles sur mesure,</span>
        <span className="block">
          faits pour <span className="am-highlight">durer.</span>
        </span>
      </h1>
      <div className="mt-11 grid grid-cols-1 items-end gap-8 md:grid-cols-2">
        <p className="m-0 max-w-[40ch] text-black/85" style={{ fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.45 }}>
          Chaque pièce est dessinée pour votre espace, fabriquée dans notre atelier lillois, livrée chez vous.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/realisations" className={HOME_PILL_DARK}>Voir les réalisations →</Link>
          <a href="tel:+33601062867" className={HOME_PILL_OUTLINE}>Appeler l&apos;atelier</a>
        </div>
      </div>
      <figure className="relative mt-11 overflow-hidden rounded-2xl border border-black/15 bg-am-mist/25" style={{ aspectRatio: "16/9" }}>
        <Image
          src="/images/accueil image/img.png"
          alt="Bibliothèque sur mesure ArchiMeuble"
          fill
          sizes="(min-width: 1360px) 1264px, 100vw"
          className="object-cover"
          priority
        />
        <figcaption className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-0.5 rounded-[10px] border border-black bg-am-paper px-3.5 py-2.5">
          <span className={`text-[11px] ${HOME_MONO}`}>Réalisation récente</span>
          <span className="text-[15px] font-medium leading-tight text-black">Bibliothèque sur mesure, Lille, 2024</span>
        </figcaption>
      </figure>
    </section>
  );
}
