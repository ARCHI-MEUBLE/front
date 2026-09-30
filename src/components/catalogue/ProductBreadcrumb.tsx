import Link from "next/link";
import { HOME_MONO } from "@/components/home/homeLayout";

export function ProductBreadcrumb({ category, name }: { category: string; name: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className={`mb-8 flex flex-wrap items-center gap-2 text-xs ${HOME_MONO}`}>
      <Link href="/catalogue" className="py-2">
        ← Boutique
      </Link>
      <span aria-hidden="true">/</span>
      <span>{category}</span>
      <span aria-hidden="true">/</span>
      <span className="text-[#161513]">{name}</span>
    </nav>
  );
}
