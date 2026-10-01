import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { SavoirFaireStepsGrid } from "@/components/shared/SavoirFaireSteps";

export function RealisationsSavoirFaire() {
  return (
    <section
      aria-labelledby="real-savoir"
      className={HOME_SECTION_NO_TOP}
      style={{ paddingTop: "clamp(64px,8vw,112px)" }}
    >
      <div className="grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <span className={`text-xs ${HOME_MONO}`}>Notre savoir-faire</span>
          <h2
            id="real-savoir"
            className="m-0 font-[Geist] font-medium leading-none tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(32px,4vw,56px)" }}
          >
            L&apos;artisanat français au service de vos projets
          </h2>
          <p className="m-0 max-w-[48ch] text-[17px] leading-[1.55] text-[#3B3832]">
            Basés dans la métropole lilloise, nous concevons et fabriquons chaque meuble dans notre atelier. Du
            premier croquis à la pose finale, nous maîtrisons chaque étape pour vous garantir un résultat parfait.
          </p>
        </div>
        <SavoirFaireStepsGrid />
      </div>
    </section>
  );
}
