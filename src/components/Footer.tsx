import Link from "next/link";
import { HOME_MONO, HOME_SECTION } from "@/components/home/homeLayout";

const PRODUITS = [
  { label: "Dressings", href: "/models" },
  { label: "Bibliothèques", href: "/models" },
  { label: "Buffets", href: "/models" },
  { label: "Bureaux", href: "/models" },
];

const SERVICES = [
  { label: "Échantillons", href: "/samples" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Avis clients", href: "/avis" },
  { label: "Contact", href: "/contact-request" },
];

export function Footer() {
  return (
    <footer className={`${HOME_SECTION} pb-8`}>
      <div
        className="grid gap-8 border-b border-[#E5E2D9] pb-12"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))" }}
      >
        <p className="m-0 max-w-[30ch] text-[17px] text-[#3B3832]">
          Menuisiers à Lille, nous concevons et fabriquons des meubles sur mesure durables pour votre intérieur.
        </p>
        <div className="flex flex-col gap-1">
          <span className={`mb-2 text-xs ${HOME_MONO}`}>Produits</span>
          {PRODUITS.map((link) => (
            <Link key={link.label} href={link.href} className="py-1 text-[#161513]">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className={`mb-2 text-xs ${HOME_MONO}`}>Services</span>
          {SERVICES.map((link) => (
            <Link key={link.label} href={link.href} className="py-1 text-[#161513]">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className={`mb-2 text-xs ${HOME_MONO}`}>Atelier</span>
          <span className="py-1 text-[#161513]">
            30 Rue Henri Regnault
            <br />
            59000 Lille, France
          </span>
          <a href="tel:+33601062867" className="py-1 text-[#161513]">06 01 06 28 67</a>
          <a href="mailto:pro.archimeuble@gmail.com" className="py-1 text-[#161513]">pro.archimeuble@gmail.com</a>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="my-6 whitespace-nowrap font-semibold leading-[0.85] tracking-[-0.05em] text-[#161513]"
        style={{ fontSize: "clamp(44px,12.5vw,200px)" }}
      >
        ArchiMeuble
        <span className="text-[#D4FF3A]" style={{ WebkitTextStroke: "2px #161513" }}>.</span>
      </div>

      <div className={`flex flex-wrap justify-between gap-3 text-xs ${HOME_MONO}`}>
        <span>© 2026 ArchiMeuble. Tous droits réservés.</span>
        <span className="flex gap-4">
          <a href="https://www.instagram.com/archimeuble" className="text-[#5F5B53]">Instagram</a>
          <Link href="/mentions-legales" className="text-[#5F5B53]">Mentions légales</Link>
          <Link href="/confidentialite" className="text-[#5F5B53]">Confidentialité</Link>
        </span>
      </div>
    </footer>
  );
}
