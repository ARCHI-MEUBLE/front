"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HOME_MONO, HOME_PILL_DARK, HOME_PILL_OUTLINE, HOME_SECTION } from "@/components/home/homeLayout";
import { SWATCHES, swatchImage } from "@/components/home/homeData";

export function ColorsAndFinishesSection() {
  const [selected, setSelected] = useState(0);
  const active = SWATCHES[selected];

  return (
    <section aria-labelledby="teintes-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[#E5E2D9] bg-[#ECE9E1]">
          <Image
            src={swatchImage(active.file)}
            alt={`Armoire ArchiMeuble teinte ${active.name}`}
            fill
            className="object-cover"
          />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#161513] bg-[#F7F6F2] px-3.5 py-1.5 text-[14px] text-[#161513]">
            <span className={`text-[11px] ${HOME_MONO}`}>Teinte</span>
            {active.name}
          </div>
        </div>

        <div>
          <h2
            id="teintes-title"
            className="m-0 mb-5 max-w-[12ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            Toutes les teintes sont possibles.
          </h2>
          <p className="m-0 mb-7 max-w-[46ch] text-[18px] text-[#3B3832]">
            Bois naturels, nuances contemporaines, finitions mates ou satinées : votre meuble sera exactement comme
            vous l&apos;imaginez.
          </p>
          <div role="radiogroup" aria-label="Choisir une teinte" className="mb-8 flex flex-wrap gap-1.5">
            {SWATCHES.map((swatch, index) => {
              const isActive = index === selected;
              return (
                <button
                  key={swatch.name}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={() => setSelected(index)}
                  className="h-11 w-11 rounded-full transition-transform duration-200 hover:scale-110"
                  style={{
                    background: swatch.hex,
                    border: isActive ? "2px solid #161513" : "1px solid rgba(22,21,19,0.18)",
                    boxShadow: isActive ? "0 0 0 3px #F7F6F2, 0 0 0 4px #161513" : "none",
                  }}
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
