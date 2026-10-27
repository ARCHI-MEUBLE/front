"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useId, useState } from "react";
import { Menu, X, ShoppingBag, ChevronRight, ChevronDown, Layers, Package, DoorClosed, Palette } from "lucide-react";
import { useCustomer } from "@/context/CustomerContext";
import { NavDropdown, isPathActive, type NavDropdownItem } from "@/components/NavDropdown";

interface NavGroup {
  label: string;
  items: NavDropdownItem[];
}

type NavItem = NavDropdownItem | NavGroup;

const isGroup = (item: NavItem): item is NavGroup => "items" in item;

// Boutique est un menu déroulant : le catalogue, les façades et les échantillons y sont regroupés
const navItems: NavItem[] = [
  { href: "/models", label: "Nos modèles" },
  {
    label: "Boutique",
    // Les lignes descriptives reprennent le ton des pages : « produits et accessoires » (boutique), « Configurateur de façades »,
    // « Touchez la qualité avant de commander » (échantillons)
    items: [
      { href: "/catalogue", label: "Tous les produits", description: "Produits et accessoires", icon: Package },
      { href: "/facades", label: "Façades", description: "Configurez vos façades", icon: DoorClosed },
      { href: "/samples", label: "Échantillons", description: "Touchez avant de commander", icon: Palette },
    ],
  },
  { href: "/realisations", label: "Réalisations" },
  { href: "/contact-request", label: "Contact" },
];

// Plus de place dans le tiroir mobile que dans la barre du haut : les avis s'y ajoutent, avant Contact
const drawerItems: NavItem[] = [...navItems.slice(0, -1), { href: "/avis", label: "Avis clients" }, navItems[navItems.length - 1]];

// Groupe du tiroir mobile : se déplie au toucher, ouvert d'emblée quand la page courante en fait partie
function DrawerGroup({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate: () => void }) {
  const hasActive = group.items.some((item) => isPathActive(pathname, item.href));
  const [open, setOpen] = useState(hasActive);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={
          "flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-black " +
          (hasActive && !open ? "bg-am-mist/30" : "hover:bg-am-mist/30")
        }
      >
        {group.label}
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-black/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="mb-1 ml-4 mt-1 space-y-1 border-l border-black/15 pl-2">
          {group.items.map((item) => {
            const isActive = isPathActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={
                  "flex items-center rounded-lg px-4 py-2.5 text-[15px] font-medium text-black " +
                  (isActive ? "bg-am-mist/30" : "hover:bg-am-mist/30")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      <header className="sticky top-0 z-50 border-b border-black/15 bg-am-paper/[0.88] backdrop-blur-md">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-3 px-[clamp(20px,4vw,48px)] sm:gap-6"
        >
          <Link href="/" className="flex items-center gap-2.5 py-2" aria-label="ArchiMeuble, accueil">
            <Image src="/images/logo site .png" alt="ArchiMeuble" width={320} height={113} className="h-8 w-auto" priority />
            <span className="font-mono text-[11px] text-black/70 max-[359px]:hidden">Lille</span>
          </Link>

          <div className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => {
              if (isGroup(item)) {
                return <NavDropdown key={item.label} label={item.label} items={item.items} pathname={router.pathname} />;
              }
              const isActive = isPathActive(router.pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-4 py-2.5 text-[14px] font-medium text-black transition-colors hover:bg-am-mist/30 ${
                    isActive ? "bg-am-mist/30" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              aria-label={`Panier, ${cartCount} article${cartCount > 1 ? "s" : ""}`}
              className="relative hidden h-11 w-11 flex-none items-center justify-center rounded-full border border-black/30 bg-white text-black sm:flex"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-am-wine font-mono text-[11px] text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-black/30 bg-white text-black xl:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>
      </header>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm xl:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className={
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-am-paper shadow-xl transition-transform duration-300 ease-in-out xl:hidden " +
          (isMenuOpen ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-4">
            <span className="flex items-center gap-2.5">
              <Image src="/images/logo site .png" alt="ArchiMeuble" width={320} height={113} className="h-7 w-auto" />
              <span className="font-mono text-[11px] text-black/70">Lille</span>
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-am-mist/30"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1">
              {drawerItems.map((item) =>
                isGroup(item) ? (
                  <DrawerGroup key={item.label} group={item} pathname={router.pathname} onNavigate={() => setIsMenuOpen(false)} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={
                      "flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-black " +
                      (router.pathname === item.href ? "bg-am-mist/30" : "hover:bg-am-mist/30")
                    }
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-black/40" />
                  </Link>
                )
              )}
            </div>

            <div className="my-6 border-t border-black/15" />

            <div className="space-y-1">
              <Link
                href="/cart"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-black hover:bg-am-mist/30"
              >
                <ShoppingBag className="h-5 w-5" />
                Panier
                {cartCount > 0 && (
                  <span className="ml-auto rounded-full bg-am-wine px-2 py-0.5 font-mono text-xs text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>

          <div className="border-t border-black/15 p-4">
            <Link
              href="/models"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-full border border-black bg-am-wine px-6 py-3 text-base font-medium text-white"
            >
              Configurer mon meuble
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
