"use client";

import Image from "next/image";
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
      <header className="sticky top-0 z-50 border-b border-[#E5E2D9] bg-[#F7F6F2]/[0.88] backdrop-blur-md">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-6 px-[clamp(20px,4vw,48px)]"
        >
          <Link href="/" className="flex items-center gap-2.5 py-2" aria-label="ArchiMeuble, accueil">
            <Image src="/images/logo site .png" alt="ArchiMeuble" width={320} height={113} className="h-8 w-auto" priority />
            <span className="font-[Geist_Mono] text-[11px] text-[#5F5B53]">Lille</span>
          </Link>

          <div className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2.5 text-[14px] ${
                  router.pathname === link.href ? "text-[#161513]" : "text-[#5F5B53]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={customer ? "/account" : "/auth/login?redirect=/account"}
              aria-label="Mon compte"
              className="hidden h-11 w-11 flex-none items-center justify-center rounded-full border border-[#E5E2D9] bg-white text-[#161513] sm:flex"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <Link
              href="/cart"
              aria-label={`Panier, ${cartCount} article${cartCount > 1 ? "s" : ""}`}
              className="relative hidden h-11 w-11 flex-none items-center justify-center rounded-full border border-[#E5E2D9] bg-white text-[#161513] sm:flex"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#161513] font-[Geist_Mono] text-[11px] text-[#D4FF3A]">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/models"
              className="hidden min-h-11 items-center justify-center rounded-full border border-[#161513] bg-[#D4FF3A] px-[18px] py-2.5 text-[14px] font-medium text-[#161513] sm:inline-flex"
            >
              Configurer mon meuble
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[#E5E2D9] bg-white text-[#161513] lg:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>
      </header>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161513]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className={
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-[#F7F6F2] shadow-xl transition-transform duration-300 ease-in-out lg:hidden " +
          (isMenuOpen ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#E5E2D9] px-4 py-4">
            <span className="flex items-center gap-2.5">
              <Image src="/images/logo site .png" alt="ArchiMeuble" width={320} height={113} className="h-7 w-auto" />
              <span className="font-[Geist_Mono] text-[11px] text-[#5F5B53]">Lille</span>
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#161513] hover:bg-[#EDEBE4]"
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
                  className={
                    "flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium " +
                    (router.pathname === link.href ? "bg-[#EDEBE4] text-[#161513]" : "text-[#5F5B53] hover:bg-[#EDEBE4]/60 hover:text-[#161513]")
                  }
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4 text-[#CFCBC0]" />
                </Link>
              ))}
            </div>

            <div className="my-6 border-t border-[#E5E2D9]" />

            <div className="space-y-1">
              <Link
                href={customer ? "/account" : "/auth/login?redirect=/account"}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[#5F5B53] hover:bg-[#EDEBE4]/60 hover:text-[#161513]"
              >
                <User className="h-5 w-5" />
                {customer ? "Mon compte" : "Se connecter"}
              </Link>
              {customer && (
                <Link
                  href="/account?section=configurations"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[#5F5B53] hover:bg-[#EDEBE4]/60 hover:text-[#161513]"
                >
                  <Layers className="h-5 w-5" />
                  Mes configurations
                </Link>
              )}
              <Link
                href="/cart"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[#5F5B53] hover:bg-[#EDEBE4]/60 hover:text-[#161513]"
              >
                <ShoppingBag className="h-5 w-5" />
                Panier
                {cartCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#161513] px-2 py-0.5 font-[Geist_Mono] text-xs text-[#D4FF3A]">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>

          <div className="border-t border-[#E5E2D9] p-4">
            <Link
              href="/models"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-full border border-[#161513] bg-[#D4FF3A] px-6 py-3 text-base font-medium text-[#161513]"
            >
              Configurer mon meuble
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
