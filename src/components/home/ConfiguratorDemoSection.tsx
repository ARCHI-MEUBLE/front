import Image from "next/image";
import Link from "next/link";
import { HOME_PILL_DARK, HOME_SECTION } from "@/components/home/homeLayout";

const STATS = [
  { value: "3D", label: "Temps réel", bg: "#D4FF3A" },
  { value: "Personnalisez", label: "Couleurs, portes, tiroirs...", bg: "#FFFFFF" },
  { value: "Commandez", label: "Devis instantané, commande en un clic", bg: "#FFFFFF" },
];

export function ConfiguratorDemoSection() {
  return (
    <section id="configurateur" aria-labelledby="config-title" className={`${HOME_SECTION} scroll-mt-[68px]`}>
      <div className="mb-12 grid grid-cols-1 items-end gap-10 lg:grid-cols-2">
        <h2
          id="config-title"
          className="m-0 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
          style={{ fontSize: "clamp(36px,5.4vw,80px)" }}
        >
          Votre meuble. Votre vision.
        </h2>
        <div className="flex flex-col gap-5">
          <p className="m-0 max-w-[40ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.4vw,20px)" }}>
            Configurez en 3D, visualisez en temps réel, commandez en un clic.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/models" className={HOME_PILL_DARK}>Lancer le configurateur →</Link>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative min-w-0 overflow-hidden lg:col-span-2">
          <Image
            src="/images/configurator-mockup.png"
            alt="Configurateur 3D ArchiMeuble"
            width={1920}
            height={1080}
            className="block h-auto w-full"
          />
        </div>
        <div className="grid min-w-0 gap-4" style={{ gridTemplateRows: "repeat(3,minmax(0,1fr))" }}>
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-start justify-between gap-4 rounded-[14px] border border-[#E5E2D9] p-5"
              style={{ background: stat.bg }}
            >
              <span
                className="min-w-0 font-medium leading-[0.9] tracking-[-0.05em] text-[#161513]"
                style={{ fontSize: stat.value.length > 3 ? "clamp(26px,2.6vw,38px)" : "clamp(44px,5vw,72px)" }}
              >
                {stat.value}
              </span>
              <span className="font-[Geist_Mono] text-xs uppercase tracking-[0.04em] text-[#3B3832]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
