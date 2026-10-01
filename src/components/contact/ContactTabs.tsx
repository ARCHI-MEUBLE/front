export function ContactTabs({
  active,
  onChange,
}: {
  active: "contact" | "appointment";
  onChange: (tab: "contact" | "appointment") => void;
}) {
  return (
    <div role="tablist" aria-label="Mode de contact" className="flex gap-2">
      {([
        { id: "contact", label: "Nous écrire" },
        { id: "appointment", label: "Prendre RDV" },
      ] as const).map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`min-h-11 rounded-full border-[1.5px] border-[#161513] px-6 py-2.5 text-[15px] ${
              isActive ? "bg-[#161513] font-semibold text-[#F7F6F2]" : "bg-transparent text-[#161513]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
