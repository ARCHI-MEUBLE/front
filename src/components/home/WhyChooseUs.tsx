import { HOME_SECTION, HOME_HEADING, HOME_MONO } from "@/components/home/homeLayout";

const reasons = [
  {
    n: "01",
    title: "Au millimètre",
    text: "Chaque meuble épouse parfaitement votre espace. Pas de compromis sur les dimensions."
  },
  {
    n: "02",
    title: "Votre style",
    text: "Essences, teintes, poignées : vous composez un meuble unique qui vous ressemble."
  },
  {
    n: "03",
    title: "Fait à Lille",
    text: "Notre atelier lillois allie savoir-faire traditionnel et précision moderne."
  }
];

export function WhyChooseUs() {
  return (
    <section aria-labelledby="why-title" className={HOME_SECTION}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2 id="why-title" className={`${HOME_HEADING} m-0 mb-5 max-w-[10ch] text-[36px] sm:text-[52px] lg:text-[72px]`}>
            La précision du sur-mesure.
          </h2>
          <p className="m-0 max-w-[40ch] text-[18px] text-[#3B3832]">
            Du premier croquis à l&apos;installation, chaque détail est pensé pour créer un meuble qui traverse les
            années.
          </p>
        </div>
        <div className="border-t border-[#161513]">
          {reasons.map((reason) => (
            <div key={reason.n} className="grid grid-cols-[48px_1fr] gap-4 border-b border-[#E5E2D9] py-7">
              <span className={`pt-1.5 text-[13px] text-[#5F5B53] ${HOME_MONO}`}>{reason.n}</span>
              <div>
                <h3 className="m-0 mb-2 text-[24px] font-medium tracking-[-0.035em] text-[#161513] sm:text-[32px]">
                  {reason.title}
                </h3>
                <p className="m-0 max-w-[52ch] text-[#5F5B53]">{reason.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
