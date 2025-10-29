"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { ShoppingCart, Package, Home, User } from "lucide-react";
import { useCustomer } from "@/context/CustomerContext";
import { useEffect, useState } from "react";

export function UserNavigation() {
  const router = useRouter();
  const { customer, logout } = useCustomer();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Charger le nombre d'articles dans le panier
    const loadCartCount = async () => {
      if (!customer) return;
      try {
        const res = await fetch("http://localhost:8000/backend/api/cart/index.php", {
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

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ArchiMeuble
            </Link>
          </div>

          {/* Navigation principale */}
          <div className="flex items-center space-x-1">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/")
                  ? "text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>

            {customer && (
              <>
                <Link
                  href="/cart"
                  className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/cart")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Panier</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/my-orders"
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/my-orders")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Mes commandes</span>
                </Link>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center">
            {customer ? (
              <Link
                href="/account"
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/account")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">Mon compte</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
              >
                <User className="h-4 w-4" />
                <span>Connexion</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default UserNavigation;
