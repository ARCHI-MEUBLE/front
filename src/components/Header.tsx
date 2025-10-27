"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import { Bell, ShoppingCart } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/models", label: "Nos modèles" },
  { href: "/#avis", label: "Avis" },
  { href: "/#contact", label: "Contact" }
];

export function Header() {
  const router = useRouter();

  const handleNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.includes("#")) {
        return;
      }

      const [rawPath, hash] = href.split("#");
      const targetPath = rawPath || "/";

      if (!hash) {
        return;
      }

      const isOnTargetPage = router.pathname === targetPath;

      if (isOnTargetPage) {
        event.preventDefault();
        const element = document.getElementById(hash);

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });

          if (hash === "contact") {
            window.dispatchEvent(new CustomEvent("contact:reveal"));
          }
        }

        return;
      }

      event.preventDefault();
      void router.push(href);
    },
    [router]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-7 sm:px-6">
        <div className="flex items-center space-x-14">
          <Link href="/" className="text-[26px] font-semibold tracking-tight text-accent">
            ArchiMeuble
          </Link>
          <nav className="hidden items-center space-x-9 text-base font-semibold text-gray-700 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                onClick={(event) => handleNavClick(event, link.href)}
                className="transition hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-start space-x-3">
          <AccountButton />
          <button
            type="button"
            aria-label="Voir les notifications"
            className="rounded-full border border-transparent p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Voir le panier"
            className="rounded-full border border-transparent p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <Link
            href="/configurator"
            className={[
              "hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90",
              "sm:inline-flex"
            ].join(" ")}
          >
            Configurer un meuble
          </Link>
        </div>
      </div>
    </header>
  );
}
