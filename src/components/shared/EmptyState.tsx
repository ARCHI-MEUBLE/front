import Link from "next/link";
import { HOME_PILL_DARK, HOME_PILL_OUTLINE } from "@/components/home/homeLayout";

type EmptyStateAction = { label: string; href?: string; onClick?: () => void };

function ActionButton({ action, className }: { action: EmptyStateAction; className: string }) {
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

// Page ou liste sans contenu : dit pourquoi, et propose quoi faire ensuite
export function EmptyState({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: EmptyStateAction;
  secondary?: EmptyStateAction;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-black/30 bg-am-mist/15 px-6 py-[clamp(48px,8vw,96px)] text-center">
      <h3 className="m-0 text-subheading text-black">
        {title}
      </h3>
      <p className="m-0 max-w-[46ch] text-[17px] text-black/80">{text}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <ActionButton action={primary} className={HOME_PILL_DARK} />
        {secondary && <ActionButton action={secondary} className={HOME_PILL_OUTLINE} />}
      </div>
    </div>
  );
}
