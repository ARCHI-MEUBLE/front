const FURNITURE_TYPES = ["Dressing", "Bibliothèque", "Buffet", "Bureau", "Meuble TV", "Autre"];

export function DevisFurnitureTypePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend
        className="mb-4 font-[Geist] font-semibold leading-[1.05] tracking-[-0.04em] text-black"
        style={{ fontSize: "clamp(26px,2.6vw,38px)" }}
      >
        Type de meuble
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {FURNITURE_TYPES.map((type) => {
          const isActive = type === value;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(type)}
              className={`min-h-[52px] rounded-full border-[1.5px] border-black px-6 py-3 text-[16px] ${
                isActive ? "bg-am-navy font-semibold text-white" : "bg-transparent font-normal text-black"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
