const CHECKLIST = [
  { label: "Atelier", value: "30 Rue Henri Regnault, 59000 Lille" },
  { label: "Téléphone", value: "06 01 06 28 67" },
  { label: "Email", value: "pro.archimeuble@gmail.com" },
];

export function DevisChecklist() {
  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {CHECKLIST.map((entry) => (
        <li key={entry.label} className="grid grid-cols-[24px,minmax(0,1fr)] items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-px flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-[#161513] text-[11px]"
          >
            ✓
          </span>
          <span className="text-[17px] leading-[1.4] text-[#161513]">
            <strong className="font-semibold">{entry.label}</strong> · {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
