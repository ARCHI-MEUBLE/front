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
              className="mt-5 font-sans text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1917] opacity-0 sm:text-4xl"
            >
              Meubles sur mesure,
              <br />
              <span className="text-[#8B7355]">faits pour durer</span>
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
                href="/showrooms"
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

          {/* Trust indicators - Mobile */}
          <div
            data-animate
            className="mt-8 flex justify-between border-t border-[#E8E6E3] pt-6 opacity-0"
          >
            <div className="text-center">
              <span className="block font-sans font-bold text-lg text-[#1A1917]">30j</span>
              <span className="text-xs text-[#706F6C] font-medium uppercase tracking-wider">fabrication</span>
            </div>
            <div className="text-center">
              <span className="block font-sans font-bold text-lg text-[#1A1917]">100%</span>
              <span className="text-xs text-[#706F6C] font-medium uppercase tracking-wider">français</span>
            </div>
            <div className="text-center">
              <span className="block font-sans font-bold text-lg text-[#1A1917]">Atelier</span>
              <span className="text-xs text-[#706F6C] font-medium uppercase tracking-wider">Lillois</span>
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
              className="mt-8 font-sans text-6xl font-bold leading-[0.95] tracking-[-0.02em] text-[#1A1917] opacity-0 xl:text-7xl"
            >
              Meubles sur mesure,
              <br />
              <span className="text-[#8B7355]">faits pour durer</span>
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
                href="/showrooms"
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

            {/* Trust indicators */}
            <div
              data-animate
              className="mt-16 flex items-center gap-8 text-sm text-[#706F6C] opacity-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base text-[#8B7355]">30j</span>
                <span className="font-medium uppercase tracking-wider text-[10px]">fabrication</span>
              </div>
              <div className="h-4 w-px bg-[#E8E6E3]" />
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base text-[#8B7355]">100%</span>
                <span className="font-medium uppercase tracking-wider text-[10px]">Made in France</span>
              </div>
              <div className="h-4 w-px bg-[#E8E6E3]" />
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base text-[#8B7355]">Atelier</span>
                <span className="font-medium uppercase tracking-wider text-[10px]">Lillois</span>
              </div>
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
