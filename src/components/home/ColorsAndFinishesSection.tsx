"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type ColorOption = {
  slug: string;
  image: string;
  fancyName: string;
  swatch: string;
};

interface Props {
  colors: ColorOption[];
}

export function ColorsAndFinishesSection({ colors }: Props) {
  const [selected, setSelected] = useState(colors[0]?.slug ?? "");
  const activeColor = colors.find((c) => c.slug === selected) ?? colors[0];

  if (!activeColor) return null;

  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Left - Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-square overflow-hidden bg-[#F5F5F4] sm:aspect-[4/5]">
              {colors.map((color) => (
                <Image
                  key={color.slug}
                  src={color.image}
                  alt={color.fancyName}
                  fill
                  className={`object-cover transition-opacity duration-500 ${
                    color.slug === selected ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>

            {/* Selected color label */}
            <div className="absolute bottom-4 left-4 right-4 border border-white/20 bg-white/90 p-4 backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-auto sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#706F6C]">Teinte sélectionnée</p>
              <p className="mt-1 font-sans text-lg font-bold text-[#1A1917] sm:text-xl">{activeColor.fancyName}</p>
            </div>
          </div>

          {/* Right - Content */}
          <div className="order-1 flex flex-col justify-center lg:order-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
              Matériaux
            </span>
            <h2 className="mt-4 font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Toutes les teintes
              <br />
              sont possibles
            </h2>
            <p className="mt-5 text-base font-medium leading-relaxed text-[#706F6C] sm:mt-6">
              Bois naturels, nuances contemporaines, finitions mates ou satinées —
              votre meuble sera exactement comme vous l'imaginez.
            </p>

            {/* Color swatches */}
            <div className="mt-8 flex flex-wrap gap-2 sm:mt-10 sm:gap-3">
              {colors.map((color) => (
                <button
                  key={color.slug}
                  onClick={() => setSelected(color.slug)}
                  className={`h-10 w-10 rounded-full transition-all duration-200 sm:h-12 sm:w-12 ${
                    color.slug === selected
                      ? "ring-2 ring-[#1A1917] ring-offset-2"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color.swatch }}
                  title={color.fancyName}
                />
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/samples"
                className="inline-flex h-12 items-center justify-center bg-[#1A1917] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2D2D2A] sm:px-8"
              >
                Commander un échantillon
              </Link>
              <Link
                href="/showrooms"
                className="inline-flex h-12 items-center justify-center border border-[#1A1917] px-6 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#1A1917] hover:text-white sm:px-8"
              >
                Voir les modèles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
