import { HOME_MONO } from "@/components/home/homeLayout";

export function SamplesMaterialList({
  materials,
  descriptions,
  selected,
  onSelect,
}: {
  materials: string[];
  descriptions: Record<string, string>;
  selected: string | null;
  onSelect: (material: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-4">
        <span className={`text-xs ${HOME_MONO}`}>01</span>
        <h2
          id="ech-step1"
          className="m-0 font-[Geist] font-medium tracking-[-0.045em] text-black"
          style={{ fontSize: "clamp(28px,3vw,44px)" }}
        >
          Choisissez votre matériau
        </h2>
      </div>
      <div role="radiogroup" aria-label="Matériau" className="flex flex-col border-t border-black/15">
        {materials.map((material) => {
          const isActive = material === selected;
          return (
            <button
              key={material}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(material)}
              className="grid items-center gap-4 border-b border-black/15 py-[22px] px-1 text-left text-black"
              style={{ gridTemplateColumns: "28px minmax(0,1fr)" }}
            >
              <span
                aria-hidden="true"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-black"
              >
                <span className="h-3 w-3 rounded-full bg-am-navy" style={{ opacity: isActive ? 1 : 0 }} />
              </span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
                <span className="font-medium tracking-[-0.035em]" style={{ fontSize: "clamp(20px,1.8vw,24px)" }}>
                  {material}
                </span>
                <span className="text-[15px] text-black/70">
                  {descriptions[material] || "Découvrez nos finitions disponibles"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
