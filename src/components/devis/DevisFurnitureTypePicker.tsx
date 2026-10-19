import { HOME_MONO } from "@/components/home/homeLayout";

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
      <legend className={`mb-1.5 p-0 ${HOME_MONO}`}>Type de meuble</legend>
      <div className="flex flex-wrap gap-2">
        {FURNITURE_TYPES.map((type) => {
          const isActive = type === value;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(type)}
              className={`min-h-10 rounded-full border-[1.5px] border-black px-3.5 py-1.5 text-[14px] ${
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
