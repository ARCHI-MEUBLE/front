import Link from "next/link";
import { HOME_SECTION } from "@/components/home/homeLayout";

export function ContactUniqueSection() {
  return (
    <section aria-labelledby="contact-unique-title" className={HOME_SECTION}>
      <div
        className="flex flex-col items-start gap-8 rounded-[20px] bg-am-mist/25 lg:flex-row lg:items-end lg:justify-between"
        style={{ padding: "clamp(28px,5vw,64px)" }}
      >
        <div className="flex flex-col gap-6">
          <h2 id="contact-unique-title" className="m-0 text-heading text-black">
            Un seul interlocuteur, basé à Lille
          </h2>
          <p className="m-0 max-w-[42ch] text-lead text-black/85">
            Gauthier suit votre projet de la maquette 3D jusqu&apos;à la pose. Vous gardez le même contact du premier
            appel à la livraison.
          </p>
        </div>
        <Link
          href="/demande-devis"
          className="inline-flex min-h-[56px] shrink-0 items-center justify-center rounded-full bg-am-navy px-8 py-[18px] text-[16px] font-medium text-white"
        >
          Demander un devis
        </Link>
      </div>
    </section>
  );
}
