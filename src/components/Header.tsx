"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ShoppingCart, Menu, X } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { useCustomer } from "@/context/CustomerContext";

const navLinks = [
  
  { href: "/models", label: "Modeles" },
  { href: "/samples", label: "Echantillons" },
  { href: "/avis", label: "Avis" },
  { href: "/showrooms", label: "Showrooms" },
  { href: "/contact-request", label: "Contact" }
];

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
  related_type?: string;
}

export function Header() {
  const router = useRouter();
  const { customer } = useCustomer();
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [router.pathname]);

  // Charger le nombre d'articles dans le panier de meubles
  useEffect(() => {
    const loadCartCount = async () => {
      if (!customer) return;
      try {
        const res = await fetch("/backend/api/cart/index.php", {
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

  // Charger les notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!customer) return;
      try {
        const res = await fetch("/backend/api/notifications/index.php?limit=10", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error("Erreur chargement notifications:", err);
      }
    };
    loadNotifications();

    // Recharger toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [customer]);

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/backend/api/notifications/index.php/${notificationId}/read`, {
        method: "PUT",
        credentials: "include",
      });
      // Recharger les notifications
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erreur marquage notification:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/backend/api/notifications/index.php/read-all", {
        method: "PUT",
        credentials: "include",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Erreur marquage toutes notifications:", err);
    }
  };

  const handleNavClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
      setMobileMenuOpen(false);
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

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        event.target instanceof Node &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationsOpen]);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${isScrolled ? "bg-white border-b border-border" : "bg-transparent border-b border-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16 md:h-20">
        <div>
          <Link
            href="/"
            className="font-serif text-xl md:text-2xl font-medium tracking-tight text-ink"
            aria-label="ArchiMeuble"
          >
            ArchiMeuble
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                onClick={(event) => handleNavClick(event, link.href)}
                className={`text-[13px] font-medium uppercase tracking-[0.15em] transition-colors ${router.pathname === link.href ? "text-ink" : "text-stone hover:text-ink"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <AccountButton />
          {customer && (
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                aria-label="Voir les notifications"
                aria-haspopup="dialog"
                aria-expanded={isNotificationsOpen}
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative p-2 text-stone transition-colors hover:text-ink"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-xs font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-sm border border-border bg-white shadow-xl">
                  <div className="sticky top-0 bg-white p-4 border-b border-border flex items-center justify-between">
                    <p className="font-serif text-lg text-ink">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-stone hover:text-ink underline"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="p-2">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-stone text-center">
                        Aucune nouvelle notification.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 mb-2 rounded-lg cursor-pointer transition ${
                            notif.is_read
                              ? "bg-white hover:bg-[#f9f7f5]"
                              : "bg-surface hover:bg-cream"
                          }`}
                          onClick={() => {
                            if (!notif.is_read) markAsRead(notif.id);
                            if (notif.related_type === "order" && notif.related_id) {
                              router.push("/my-orders");
                              setNotificationsOpen(false);
                            }
                          }}
                        >
                          <p className="text-sm font-semibold text-ink">{notif.title}</p>
                          <p className="text-xs text-stone mt-1">{notif.message}</p>
                          <p className="text-xs text-muted mt-2">
                            {new Date(notif.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <Link
            href="/cart"
            aria-label="Voir le panier"
            className="relative p-2 text-stone transition-colors hover:text-ink"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/configurator"
            className="hidden md:inline-flex text-[13px] font-medium text-ink underline underline-offset-4 decoration-stone/50 hover:decoration-ink transition-colors ml-2"
          >
            Configurer un meuble
          </Link>
        </div>
      </div>
    </header>
  );
}
