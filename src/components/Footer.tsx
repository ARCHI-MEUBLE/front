import Link from "next/link";

const footerLinks = {
  produits: [
    { label: "Dressings", href: "/models" },
    { label: "Bibliothèques", href: "/models" },
    { label: "Buffets", href: "/models" },
    { label: "Bureaux", href: "/models" },
  ],
  services: [
    { label: "Échantillons", href: "/samples" },
    { label: "Réalisations", href: "/realisations" },
    { label: "Avis clients", href: "/avis" },
    { label: "Contact", href: "/contact-request" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#1A1917]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Brand */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <img
                src="/images/logo site .png"
                alt="ArchiMeuble"
                className="h-8 w-auto mx-auto brightness-0 invert"
              />
            </Link>
            <p className="mx-auto mt-3 max-w-xs text-sm font-medium leading-relaxed text-gray-400">
              Menuisiers à Lille, nous fabriquons des meubles sur mesure durables.
            </p>
          </div>

          {/* Links - 2 columns */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-center">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Produits
              </h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.produits.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/80">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Services
              </h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.services.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/80">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 text-center">
            <Link
              href="tel:+33601062867"
              className="inline-flex h-12 items-center justify-center border border-white/20 px-6 text-sm font-medium text-white"
            >
              06 01 06 28 67
            </Link>
          </div>

          {/* Social */}
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="https://www.instagram.com/archimeuble"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center border border-white/20 text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </Link>
            <Link
              href="https://www.facebook.com/people/Menuisier-%C3%80-Lille-Archimeuble/61567832751482/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center border border-white/20 text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </Link>
          </div>

          {/* Bottom */}
          <div className="mt-8 border-t border-white/10 pt-6 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} ArchiMeuble
            </p>
            <div className="mt-3 flex justify-center gap-4 text-xs text-gray-400">
              <Link href="/mentions-legales" className="hover:text-white">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="hover:text-white">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Brand */}
            <div className="lg:col-span-5">
              <Link href="/" className="inline-block">
                <img
                  src="/images/logo site .png"
                  alt="ArchiMeuble"
                  className="h-10 w-auto brightness-0 invert"
                />
              </Link>
              <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-gray-400">
                Menuisiers à Lille, nous concevons et fabriquons des meubles sur mesure
                durables pour votre intérieur.
              </p>

              {/* Social */}
              <div className="mt-8 flex gap-3">
                <Link
                  href="https://www.instagram.com/archimeuble"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </Link>
                <Link
                  href="https://www.facebook.com/people/Menuisier-%C3%80-Lille-Archimeuble/61567832751482/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-8 lg:col-span-4">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
                  Produits
                </h3>
                <ul className="mt-6 space-y-3">
                  {footerLinks.produits.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/80 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
                  Services
                </h3>
                <ul className="mt-6 space-y-3">
                  {footerLinks.services.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/80 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Address */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
                Atelier
              </h3>
              <address className="mt-6 text-sm not-italic leading-relaxed text-white/80">
                30 Rue Henri Regnault
                <br />
                59000 Lille, France
                <br />
                <br />
                <Link href="tel:+33601062867" className="text-white hover:text-[#8B7355]">
                  06 01 06 28 67
                </Link>
                <br />
                <Link href="mailto:pro.archimeuble@gmail.com" className="text-white/80 hover:text-[#8B7355]">
                  pro.archimeuble@gmail.com
                </Link>
              </address>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-8">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} ArchiMeuble. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-xs text-gray-400">
              <Link href="/mentions-legales" className="hover:text-white">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="hover:text-white">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
