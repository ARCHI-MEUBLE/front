import { HOME_SECTION } from "@/components/home/homeLayout";
import { SavoirFaireStepsList } from "@/components/shared/SavoirFaireSteps";

export function WhyChooseUs() {
  return (
    <section aria-labelledby="why-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2
            id="why-title"
            className="m-0 mb-5 max-w-[12ch] font-sans font-medium leading-[0.98] tracking-[-0.05em] text-black"
            style={{ fontSize: "clamp(36px,5vw,72px)" }}
          >
            La précision du <span className="whitespace-nowrap">sur-mesure.</span>
          </h2>
          <p className="m-0 max-w-[40ch] text-[18px] text-black/85">
            Du premier croquis à l&apos;installation, chaque détail est pensé pour créer un meuble qui traverse les
            années.
          </p>
        </div>
        <SavoirFaireStepsList />
      </div>
    </section>
  );
}
