"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { ShoppingCart, Package, Home, User } from "lucide-react";
import { useCustomer } from "@/context/CustomerContext";
import { useEffect, useState } from "react";
import { AccountButton } from "@/components/AccountButton";

export function UserNavigation() {
  const router = useRouter();
  const { customer } = useCustomer();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Charger le nombre d'articles dans le panier
    const loadCartCount = async () => {
      if (!customer) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' + "/backend/api/cart/index.php", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCartCount(data.items?.length || 0);
        }
      } catch (err) {
        console.error("Erreur chargement panier:", err);
      }
    };
    loadCartCount();
  }, [customer]);

  const isActive = (path: string) => router.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        {/* Logo */}
        <Link
          href="/"
          className="heading-serif text-[28px] font-semibold tracking-tight text-ink"
          aria-label="ArchiMeuble"
        >
          ArchiMeuble
        </Link>

        {/* Navigation principale */}
        <nav className="hidden items-center gap-10 text-sm font-medium uppercase tracking-[0.2em] text-ink/70 md:flex">
          <Link
            href="/"
            className={`transition ${
              isActive("/") ? "text-ink" : "hover:text-ink"
            }`}
          >
            Accueil
          </Link>

          {customer && (
            <>
              <Link
                href="/cart"
                className={`transition ${
                  isActive("/cart") ? "text-ink" : "hover:text-ink"
                }`}
              >
                Panier
              </Link>

              <Link
                href="/my-orders"
                className={`transition ${
                  isActive("/my-orders") ? "text-ink" : "hover:text-ink"
                }`}
              >
                Mes commandes
              </Link>
            </>
          )}
        </nav>

        {/* Right section - Account button and cart */}
        <div className="flex items-center gap-3">
          <AccountButton />
          {customer && (
            <Link
              href="/cart"
              aria-label="Voir le panier"
              className="relative rounded-full border border-transparent p-2 text-ink/70 transition hover:bg-alabaster"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default UserNavigation;
