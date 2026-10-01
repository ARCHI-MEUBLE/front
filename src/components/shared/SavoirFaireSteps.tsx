export const SAVOIR_FAIRE_STEPS: { title: string; text: string; bg: string; path: string }[] = [
  { title: "Conception", text: "Plans 3D sur mesure", bg: "#D4FF3A", path: "M3 21l3-1L19 7l-2-2L4 18zM14 6l4 4M15 21h6" },
  { title: "Fabrication", text: "Atelier français", bg: "#E8B9A2", path: "M4 20h16M6 20V10l6-6 6 6v10M10 20v-5h4v5" },
  { title: "Finitions", text: "Qualité artisanale", bg: "#EAF4C4", path: "M5 3h10v6H5zM15 6h3v5h-7v3M10 14h2v7h-2z" },
  { title: "Installation", text: "Pose soignée", bg: "#EDEBE4", path: "M3 11l9-7 9 7M5 10v10h14V10M9 20v-6h6v6" },
];

export function SavoirFaireStepsGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-12">
      {SAVOIR_FAIRE_STEPS.map((step) => (
        <div key={step.title} className="flex flex-col gap-[18px]">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-[10px]"
            style={{ background: step.bg }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d={step.path} />
            </svg>
          </span>
          <h3 className="m-0 font-[Geist] font-semibold leading-[1.05] tracking-[-0.045em] text-[#161513]" style={{ fontSize: "clamp(24px,2.2vw,30px)" }}>
            {step.title}
          </h3>
          <p className="m-0 text-[17px] text-[#3B3832]">{step.text}</p>
        </div>
      ))}
    </div>
  );
}
