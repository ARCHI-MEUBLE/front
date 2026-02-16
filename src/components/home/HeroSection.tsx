"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll("[data-animate]");
    elements?.forEach((el, i) => {
      (el as HTMLElement).style.animationDelay = `${i * 80}ms`;
      el.classList.add("animate-in");
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 bg-[#FAFAF9]"
    >
      {/* Subtle grid pattern - Caché sur desktop pour ne pas cacher l'image */}
      <div
        className="absolute inset-0 opacity-[0.03] lg:hidden"
        style={{
          backgroundImage: `linear-gradient(#1A1917 1px, transparent 1px),
                           linear-gradient(90deg, #1A1917 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Mobile Layout */}
        <div className="flex flex-col py-12 lg:hidden">
          {/* Content */}
          <div>
            {/* Eyebrow */}
            <div data-animate className="flex items-center gap-3 opacity-0">
              <div className="h-px w-8 bg-[#8B7355]" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                Menuisier à Lille
              </span>
            </div>

            {/* Titre */}
            <h1
              data-animate
              className="mt-5 font-sans text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1A1917] opacity-0 sm:text-4xl"
            >
              Meubles{" "}
              {/* Style: Surlignage fluo jaune avec bords irréguliers */}
              <span className="relative inline-block whitespace-nowrap">
                <svg
                  className="absolute -inset-x-2 -inset-y-1 -z-10 h-[calc(100%+8px)] w-[calc(100%+16px)]"
                  viewBox="0 0 120 50"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M8,12 Q2,8 4,18 L2,25 Q0,32 6,38 L12,42 Q18,46 25,44 L95,46 Q105,48 110,42 L116,35 Q120,28 118,20 L115,12 Q112,4 105,6 L20,4 Q12,2 8,12 Z"
                    fill="#FDE047"
                    opacity="0.55"
                  />
                  <path
                    d="M12,14 Q6,12 8,20 L6,26 Q4,33 10,36 L16,40 Q22,43 30,41 L90,43 Q100,44 104,39 L110,32 Q114,26 112,19 L109,13 Q106,7 98,9 L25,7 Q16,6 12,14 Z"
                    fill="#FACC15"
                    opacity="0.35"
                  />
                </svg>
                <span className="relative">sur mesure</span>
              </span>
              ,
              <br />
              faits pour{" "}
              {/* Style: Pinceau orange */}
              <span className="relative inline-block">
                <svg
                  className="absolute -inset-x-1 inset-y-0 -z-10 h-full w-[calc(100%+8px)]"
                  viewBox="0 0 120 40"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M8,20 Q15,8 35,22 T65,18 T95,22 Q110,20 115,18"
                    stroke="#FF6B4A"
                    strokeWidth="20"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <path
                    d="M5,22 Q20,12 40,24 T70,19 T100,23 Q112,21 118,19"
                    stroke="#FF8566"
                    strokeWidth="14"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </svg>
                <span className="relative">durer</span>
              </span>
            </h1>

            {/* Paragraphe */}
            <p
              data-animate
              className="mt-4 text-base font-medium leading-relaxed text-[#706F6C] opacity-0"
            >
              Chaque pièce est dessinée pour votre espace,
              fabriquée dans notre atelier lillois.
            </p>

            {/* CTAs */}
            <div
              data-animate
              className="mt-6 flex flex-col gap-3 opacity-0 sm:flex-row"
            >
              <Link
                href="/realisations"
                className="inline-flex h-12 items-center justify-center bg-[#1A1917] px-6 text-sm font-medium text-white"
              >
                Voir les réalisations
              </Link>
              <Link
                href="tel:+33601062867"
                className="inline-flex h-12 items-center justify-center border border-[#1A1917] px-6 text-sm font-medium text-[#1A1917]"
              >
                Appeler l'atelier
              </Link>
            </div>
          </div>

          {/* Image - Mobile */}
          <div data-animate className="mt-8 opacity-0">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/accueil image/img.png"
                alt="Bibliothèque sur mesure ArchiMeuble"
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              {/* Overlay card */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-[#706F6C]">
                  Réalisation récente
                </p>
                <p className="mt-1 font-serif text-base text-[#1A1917]">
                  Bibliothèque sur mesure — Lille, 2024
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Desktop Layout */}
        <div className="hidden min-h-[100svh] items-center lg:grid lg:grid-cols-12 lg:gap-12">
          {/* LEFT - Content */}
          <div className="lg:col-span-6 lg:pr-8">
            {/* Eyebrow */}
            <div data-animate className="flex items-center gap-4 opacity-0">
              <div className="h-px w-12 bg-[#8B7355]" />
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#8B7355]">
                Menuisier à Lille
              </span>
            </div>

            {/* Titre */}
            <h1
              data-animate
              className="mt-8 font-sans text-6xl font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1917] opacity-0 xl:text-7xl"
            >
              Meubles{" "}
              {/* Style: Surlignage fluo jaune avec bords irréguliers */}
              <span className="relative inline-block whitespace-nowrap">
                <svg
                  className="absolute -inset-x-3 -inset-y-2 -z-10 h-[calc(100%+16px)] w-[calc(100%+24px)]"
                  viewBox="0 0 120 50"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M8,12 Q2,8 4,18 L2,25 Q0,32 6,38 L12,42 Q18,46 25,44 L95,46 Q105,48 110,42 L116,35 Q120,28 118,20 L115,12 Q112,4 105,6 L20,4 Q12,2 8,12 Z"
                    fill="#FDE047"
                    opacity="0.55"
                  />
                  <path
                    d="M12,14 Q6,12 8,20 L6,26 Q4,33 10,36 L16,40 Q22,43 30,41 L90,43 Q100,44 104,39 L110,32 Q114,26 112,19 L109,13 Q106,7 98,9 L25,7 Q16,6 12,14 Z"
                    fill="#FACC15"
                    opacity="0.35"
                  />
                </svg>
                <span className="relative">sur mesure</span>
              </span>
              ,
              <br />
              faits pour{" "}
              {/* Style: Pinceau orange */}
              <span className="relative inline-block">
                <svg
                  className="absolute -inset-x-2 inset-y-0 -z-10 h-full w-[calc(100%+16px)]"
                  viewBox="0 0 120 40"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M8,20 Q15,8 35,22 T65,18 T95,22 Q110,20 115,18"
                    stroke="#FF6B4A"
                    strokeWidth="20"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <path
                    d="M5,22 Q20,12 40,24 T70,19 T100,23 Q112,21 118,19"
                    stroke="#FF8566"
                    strokeWidth="14"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </svg>
                <span className="relative">durer</span>
              </span>
            </h1>

            {/* Paragraphe */}
            <p
              data-animate
              className="mt-8 max-w-md text-lg font-medium leading-relaxed text-[#706F6C] opacity-0"
            >
              Chaque pièce est dessinée pour votre espace,
              fabriquée dans notre atelier lillois, livrée chez vous.
            </p>

            {/* CTAs */}
            <div
              data-animate
              className="mt-12 flex flex-wrap items-center gap-4 opacity-0"
            >
              <Link
                href="/realisations"
                className="group relative inline-flex h-14 items-center justify-center overflow-hidden bg-[#1A1917] px-8 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#2D2B28]"
              >
                <span className="relative z-10">Voir les réalisations</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </Link>
              <Link
                href="tel:+33601062867"
                className="inline-flex h-14 items-center justify-center border border-[#1A1917] px-8 text-sm font-medium tracking-wide text-[#1A1917] transition-all duration-300 hover:bg-[#1A1917] hover:text-white"
              >
                Appeler l'atelier
              </Link>
            </div>

          </div>

          <div className="relative lg:col-span-6 lg:hidden">
            <div
              data-animate
              className="relative opacity-0"
            >
              <Image
                src="/images/accueil image/img.png"
                alt="Bibliothèque sur mesure ArchiMeuble"
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
              {/* Overlay card */}
              <div className="absolute bottom-6 left-6 border border-white/20 bg-white/95 p-6 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-[#706F6C]">
                  Réalisation récente
                </p>
                <p className="mt-1 font-serif text-lg text-[#1A1917]">
                  Bibliothèque sur mesure
                </p>
                <p className="mt-1 text-sm text-[#706F6C]">
                  Lille, 2024
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - desktop only */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block">
        <div className="flex flex-col items-center gap-2 text-[#706F6C]">
          <span className="text-xs uppercase tracking-[0.2em]">Défiler</span>
          <div className="h-12 w-px bg-gradient-to-b from-[#706F6C] to-transparent" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </section>
  );
}
