"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag, User, ChevronRight, Layers } from "lucide-react";
import { useCustomer } from "@/context/CustomerContext";

const navLinks = [
  { href: "/models", label: "Nos modèles" },
  { href: "/facades", label: "Façades" },
  { href: "/catalogue", label: "Boutique" },
  { href: "/samples", label: "Échantillons" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/avis", label: "Avis clients" },
  { href: "/contact-request", label: "Contact" },
];

export function Header() {
  const router = useRouter();
  const { customer } = useCustomer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const loadCart = async () => {
      if (!customer) return;
      try {
        const res = await fetch("/backend/api/cart/index.php", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCartCount(data.items?.length || 0);
        }
      } catch (err) {
        console.error("Erreur panier:", err);
      }
    };
    loadCart();
  }, [customer]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/images/logo site .png"
              alt="ArchiMeuble"
              className="h-8 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={"text-sm font-medium transition-colors hover:text-gray-900 " + (router.pathname === link.href ? "text-gray-900" : "text-gray-500")}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/models"
              className="mr-2 hidden rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:inline-flex"
            >
              Configurer
            </Link>

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href={customer ? "/account" : "/auth/login?redirect=/account"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <User className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className={"fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden " + (isMenuOpen ? "translate-x-0" : "translate-x-full")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <img
              src="/images/logo site .png"
              alt="ArchiMeuble"
              className="h-7 w-auto"
            />
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={"flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors " + (router.pathname === link.href ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>

            <div className="my-6 border-t border-gray-100" />

            <div className="space-y-1">
              <Link
                href={customer ? "/account" : "/auth/login?redirect=/account"}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <User className="h-5 w-5" />
                {customer ? "Mon compte" : "Se connecter"}
              </Link>
              {customer && (
                <Link
                  href="/account?section=configurations"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <Layers className="h-5 w-5" />
                  Mes configurations
                </Link>
              )}
              <Link
                href="/cart"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <ShoppingBag className="h-5 w-5" />
                Panier
                {cartCount > 0 && (
                  <span className="ml-auto rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <Link
              href="/models"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-gray-800"
            >
              Configurer mon meuble
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
