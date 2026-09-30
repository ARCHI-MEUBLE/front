"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HOME_SECTION, HOME_HEADING, HOME_MONO, HOME_PILL_DARK, HOME_PILL_OUTLINE } from "@/components/home/homeLayout";

export type ColorOption = {
  slug: string;
  image: string;
  fancyName: string;
  swatch: string;
};

type Props = {
  colors: ColorOption[];
};

export function ColorsAndFinishesSection({ colors }: Props) {
  const [selected, setSelected] = useState(colors[0]?.slug ?? "");
  const activeColor = colors.find((color) => color.slug === selected) ?? colors[0];

  if (!activeColor) {
    return null;
  }

  return (
    <section aria-labelledby="teintes-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[#E5E2D9] bg-[#ECE9E1]">
          <Image
            src={activeColor.image}
            alt={`Armoire ArchiMeuble, teinte ${activeColor.fancyName}`}
            fill
            className="object-cover"
          />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#161513] bg-[#F7F6F2] px-3.5 py-1.5 text-[14px]">
            <span className={`text-[11px] text-[#5F5B53] ${HOME_MONO}`}>Teinte</span>
            {activeColor.fancyName}
          </div>
        </div>

        <div>
          <h2 id="teintes-title" className={`${HOME_HEADING} m-0 mb-5 max-w-[12ch] text-[36px] sm:text-[52px] lg:text-[72px]`}>
            Toutes les teintes sont possibles.
          </h2>
          <p className="m-0 mb-7 max-w-[46ch] text-[18px] text-[#3B3832]">
            Bois naturels, nuances contemporaines, finitions mates ou satinées : votre meuble sera exactement comme
            vous l&apos;imaginez.
          </p>
          <div role="radiogroup" aria-label="Choisir une teinte" className="mb-8 flex flex-wrap gap-1.5">
            {colors.map((color) => {
              const isActive = color.slug === selected;
              return (
                <button
                  key={color.slug}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={color.fancyName}
                  title={color.fancyName}
                  onClick={() => setSelected(color.slug)}
                  className={`h-11 w-11 rounded-full transition-transform duration-200 hover:scale-110 ${
                    isActive ? "ring-2 ring-[#161513] ring-offset-2 ring-offset-[#F7F6F2]" : ""
                  }`}
                  style={{ background: color.swatch }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/samples" className={HOME_PILL_DARK}>
              Commander un échantillon
            </Link>
            <Link href="/models" className={HOME_PILL_OUTLINE}>
              Voir les modèles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
