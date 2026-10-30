import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

const CONTACTS: { label: string; value: string; href?: string; Icon: LucideIcon }[] = [
  { label: "Atelier", value: "30 Rue Henri Regnault, 59000 Lille", Icon: MapPin },
  { label: "Téléphone", value: "06 01 06 28 67", href: "tel:+33601062867", Icon: Phone },
  { label: "Email", value: "pro.archimeuble@gmail.com", href: "mailto:pro.archimeuble@gmail.com", Icon: Mail },
];

export function DevisChecklist() {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {CONTACTS.map(({ label, value, href, Icon }) => (
        <li key={label} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-px flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-black"
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
          </span>
          <span className="text-[16px] leading-[1.4] text-black">
            <strong className="font-semibold">{label}</strong> ·{" "}
            {href ? (
              <a href={href} className="underline decoration-black/30 underline-offset-4 hover:decoration-black">
                {value}
              </a>
            ) : (
              value
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
