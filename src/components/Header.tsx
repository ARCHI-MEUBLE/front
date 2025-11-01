"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ShoppingCart } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { useCustomer } from "@/context/CustomerContext";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/models", label: "Nos modèles" },
  { href: "/samples", label: "Échantillons" },
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
  const notificationRef = useRef<HTMLDivElement | null>(null);

  // Charger le nombre d'articles dans le panier de meubles
  useEffect(() => {
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

  // Charger les notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!customer) return;
      try {
        const res = await fetch("http://localhost:8000/backend/api/notifications/index.php?limit=10", {
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
      await fetch(`http://localhost:8000/backend/api/notifications/index.php/${notificationId}/read`, {
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
      await fetch("http://localhost:8000/backend/api/notifications/index.php/read-all", {
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
    <header className="sticky top-0 z-50 border-b border-[#f0e2d0] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-16">
          <Link
            href="/"
            className="heading-serif text-[28px] font-semibold tracking-tight text-ink"
            aria-label="ArchiMeuble"
          >
            ArchiMeuble
          </Link>
          <nav className="hidden items-center gap-10 text-sm font-medium uppercase tracking-[0.2em] text-ink/70 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                onClick={(event) => handleNavClick(event, link.href)}
                className="transition hover:text-ink"
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
                className="relative rounded-full border border-transparent p-2 text-ink/70 transition hover:bg-[#e9dfd4]"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-xs font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-[#dfd3c5] bg-white shadow-xl">
                  <div className="sticky top-0 bg-white p-4 border-b border-[#dfd3c5] flex items-center justify-between">
                    <p className="heading-serif text-lg text-ink">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-ink/70 hover:text-ink underline"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="p-2">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-ink/70 text-center">
                        Aucune nouvelle notification.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 mb-2 rounded-lg cursor-pointer transition ${
                            notif.is_read
                              ? "bg-white hover:bg-[#f9f7f5]"
                              : "bg-[#f0e2d0] hover:bg-[#e9dfd4]"
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
                          <p className="text-xs text-ink/70 mt-1">{notif.message}</p>
                          <p className="text-xs text-ink/50 mt-2">
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
            className="relative rounded-full border border-transparent p-2 text-ink/70 transition hover:bg-[#e9dfd4]"
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
            className={["hidden", "button-elevated", "sm:inline-flex"].join(" ")}
          >
            Configurer un meuble
          </Link>
        </div>
      </div>
    </header>
  );
}
