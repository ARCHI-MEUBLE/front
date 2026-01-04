"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const categories = [
  {
    title: "Dressing",
    image: "/images/accueil image/dressing.jpg",
    description: "Optimisez chaque centimètre"
  },
  {
    title: "Bibliothèque",
    image: "/images/accueil image/biblio.jpg",
    description: "Du sol au plafond"
  },
  {
    title: "Buffet",
    image: "/images/accueil image/buffet.jpg",
    description: "Élégance fonctionnelle"
  },
  {
    title: "Bureau",
    image: "/images/accueil image/bureau.jpg",
    description: "Votre espace de travail"
  },
  {
    title: "Meuble TV",
    image: "/images/accueil image/meubletv.jpg",
    description: "Lignes épurées"
  },
  {
    title: "Sous-escalier",
    image: "/images/accueil image/meublesousescalier.jpg",
    description: "Chaque recoin optimisé"
  },
];

export function CategoriesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#FAFAF9] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
              Nos créations
            </span>
            <h2 className="mt-4 font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Chaque pièce,
              <br />
              sur mesure
            </h2>
          </div>
          <Link
            href="/showrooms"
            className="hidden text-sm font-bold uppercase tracking-wider text-[#1A1917] underline underline-offset-4 hover:no-underline sm:block"
          >
            Tout voir
          </Link>
        </div>

        {/* Grid */}
        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:mt-16 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Link
              key={category.title}
              href={`/showrooms?category=${category.title.toLowerCase()}`}
              className="group relative aspect-[4/3] overflow-hidden bg-[#E8E6E3]"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Image */}
              <Image
                src={category.image}
                alt={category.title}
                fill
                className={`object-cover transition-transform duration-700 ${
                  hoveredIndex === index ? "scale-105" : "scale-100"
                }`}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1917]/80 via-transparent to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                  {category.description}
                </p>
                <h3 className="mt-1.5 font-sans text-xl font-bold text-white sm:mt-2 sm:text-2xl">
                  {category.title}
                </h3>
              </div>

              {/* Arrow */}
              <div className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center bg-white transition-all duration-300 sm:right-6 sm:top-6 sm:h-10 sm:w-10 ${
                hoveredIndex === index ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
              }`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="sm:h-4 sm:w-4">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#1A1917" strokeWidth="1.5"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/showrooms"
            className="inline-flex h-12 items-center justify-center border border-[#1A1917] px-8 text-sm font-medium text-[#1A1917]"
          >
            Voir toutes les créations
          </Link>
        </div>
      </div>
    </section>
  );
}
