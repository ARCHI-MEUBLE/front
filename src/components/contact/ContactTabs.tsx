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
            className={`min-h-11 rounded-full border-[1.5px] border-black px-6 py-2.5 text-[15px] ${
              isActive ? "bg-am-navy font-semibold text-white" : "bg-transparent text-black"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
