import Image from "next/image";
import Link from "next/link";
import { HOME_SECTION, HOME_HEADING, HOME_PILL_DARK } from "@/components/home/homeLayout";

const configStats = [
  { value: "3D", label: "Temps réel", bg: "#D4FF3A" },
  { value: "24/7", label: "Disponible", bg: "#FFFFFF" },
  { value: "∞", label: "Options", bg: "#ECE9E1" }
];

export function ConfiguratorDemoSection() {
  return (
    <section id="configurateur" aria-labelledby="config-title" className={`${HOME_SECTION} scroll-mt-[68px]`}>
      <div className="mb-12 grid grid-cols-1 items-end gap-10 lg:grid-cols-2">
        <h2 id="config-title" className={`${HOME_HEADING} m-0 text-[36px] sm:text-[56px] lg:text-[80px]`}>
          Votre meuble. Votre vision.
        </h2>
        <div className="flex flex-col gap-5">
          <p className="m-0 max-w-[40ch] text-[17px] text-[#3B3832] sm:text-[20px]">
            Configurez en 3D, visualisez en temps réel, commandez en un clic.
          </p>
          <div>
            <Link href="/models" className={HOME_PILL_DARK}>
              Lancer le configurateur →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[#E5E2D9] bg-[#ECE9E1] sm:col-span-2">
          <Image
            src="/images/home/configurator-mockup.png"
            alt="Configurateur 3D ArchiMeuble"
            width={1920}
            height={1080}
            className="block h-auto w-full"
          />
        </div>
        <div className="grid min-w-0 grid-rows-3 gap-4">
          {configStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-start justify-between gap-4 rounded-[14px] border border-[#E5E2D9] p-5"
              style={{ background: stat.bg }}
            >
              <span className="min-w-0 text-[40px] font-medium leading-[0.9] tracking-[-0.05em] text-[#161513]">
                {stat.value}
              </span>
              <span className="font-[Geist_Mono] text-[12px] uppercase tracking-[0.04em] text-[#3B3832]">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
