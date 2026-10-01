import Image from "next/image";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";

const FANNED_CARDS = [
  { label: "Chêne blanchi", image: "https://images.unsplash.com/photo-1611072337226-1140ab367200?auto=format&fit=crop&w=500&q=70", left: "4%", top: "14%", rotate: -12, z: 1 },
  { label: "Chêne naturel", image: "https://images.unsplash.com/photo-1737094662085-7e0db16198e3?auto=format&fit=crop&w=500&q=70", left: "24%", top: "6%", rotate: -3, z: 2 },
  { label: "Chêne vieilli", image: "https://images.unsplash.com/photo-1644931551533-02906718127f?auto=format&fit=crop&w=500&q=70", left: "44%", top: "10%", rotate: 6, z: 3 },
  { label: "Noisette caramélisée", image: "https://images.unsplash.com/photo-1564512533667-015a90133f04?auto=format&fit=crop&w=500&q=70", left: "62%", top: "20%", rotate: 14, z: 4 },
];

export function SamplesHero() {
  return (
    <section
      aria-labelledby="ech-title"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(40px,7vw,96px)" }}
    >
      <div className="grid grid-cols-1 items-center gap-[clamp(48px,6vw,96px)] lg:grid-cols-2">
        <div className="flex flex-col items-start gap-7">
          <h1
            id="ech-title"
            className="m-0 font-[Geist] font-medium leading-[0.96] tracking-[-0.055em] text-[#161513]"
            style={{ fontSize: "clamp(44px,6.2vw,96px)" }}
          >
            Touchez la qualité <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">avant de commander</span>
          </h1>
          <p className="m-0 max-w-[44ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.5vw,21px)" }}>
            Commandez nos échantillons de matériaux. Découvrez les textures, les couleurs et la qualité de nos
            finitions avant de finaliser votre projet.
          </p>
          <a
            href="#ech-step1"
            className="inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-[#161513] px-6 py-3.5 text-[15px] font-medium text-[#F7F6F2]"
          >
            Composer mon kit ↓
          </a>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-[560px]"
          style={{ aspectRatio: "1/0.9", containerType: "inline-size" }}
        >
          {FANNED_CARDS.map((card) => (
            <div
              key={card.label}
              className="absolute flex flex-col gap-[2cqi] rounded bg-white pb-0 pl-[2.2cqi] pr-[2.2cqi] pt-[2.2cqi] shadow-[0_0_0_1px_rgba(22,21,19,0.06),0_16px_40px_-12px_rgba(22,21,19,0.22)]"
              style={{ left: card.left, top: card.top, width: "34%", aspectRatio: "3/4.4", transform: `rotate(${card.rotate}deg)`, zIndex: card.z }}
            >
              <span className="relative block flex-1 overflow-hidden rounded-sm bg-[#ECE9E1]">
                <Image src={card.image} alt="" fill unoptimized className="object-cover" />
              </span>
              <span className="flex flex-col gap-[0.4cqi] pb-[2.6cqi]">
                <span className="whitespace-nowrap font-semibold tracking-[-0.02em]" style={{ fontSize: "clamp(11px,2.6cqi,15px)" }}>
                  {card.label}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
