import Link from "next/link";
import { useRouter } from "next/router";
import { Bell, ShoppingCart } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";

const navLinks = [
  { href: "#acheter", label: "Acheter" },
  { href: "#configurer", label: "Configurer" },
  { href: "#avis", label: "Avis" },
  { href: "#showrooms", label: "Showrooms" },
  { href: "/admin", label: "Admin" }
];

export function Header() {
  const router = useRouter();

  const handleCartClick = () => {
    console.log("🛒 Cart button clicked");
    router.push("/cart");
  };

  const handleNotificationClick = () => {
    console.log("🔔 Notification button clicked");
    // TODO: Implémenter la page de notifications
    alert("Fonctionnalité notifications à venir !");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-10">
          <Link href="https://archimeuble.com/" className="text-xl font-semibold tracking-tight text-accent">
            ArchiMeuble
          </Link>
          <nav className="hidden items-center space-x-8 text-sm font-medium text-gray-700 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-accent">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-3">
          <AccountButton />
          <button
            type="button"
            aria-label="Voir les notifications"
            onClick={handleNotificationClick}
            className="rounded-full border border-transparent p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Voir le panier"
            onClick={handleCartClick}
            className="rounded-full border border-transparent p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <Link
            href="#configurer"
            className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:inline-flex"
          >
            Configurer un meuble
          </Link>
        </div>
      </div>
    </header>
  );
}