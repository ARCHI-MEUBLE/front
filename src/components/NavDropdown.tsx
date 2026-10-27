"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export interface NavDropdownItem {
  href: string;
  label: string;
  // Facultatifs : une tuile d'icône et une courte ligne sous le libellé. Sans eux, l'entrée reste une simple ligne.
  icon?: LucideIcon;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  // Page courante : marque l'entrée active, et le bouton quand l'une des entrées l'est
  pathname: string;
}

export const isPathActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

// Menu déroulant de la barre du haut. Au survol à la souris il s'ouvre tout seul ; au doigt et au clavier le
// bouton l'ouvre et le ferme. Échap, un clic ailleurs ou la sortie du focus le referment.
// Ce n'est pas un role="menu" : ce sont de vrais liens de navigation, qu'on parcourt avec Tab (motif « disclosure »).
export function NavDropdown({ label, items, pathname }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  // Type du dernier pointeur posé sur le bouton : un clic à la souris ne doit pas refermer ce que le survol vient d'ouvrir
  const lastPointer = useRef("mouse");
  const panelId = useId();
  const hasActive = items.some((item) => isPathActive(pathname, item.href));

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handlePointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    setOpen(true);
  };

  // Court délai : le pointeur peut passer du bouton au panneau sans que le menu clignote
  const handlePointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    cancelClose();
    // detail vaut 0 pour un clic déclenché au clavier (Entrée, Espace)
    const fromMouse = event.detail > 0 && lastPointer.current === "mouse";
    setOpen((current) => (fromMouse ? true : !current));
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType;
        }}
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-medium text-black transition-colors hover:bg-am-mist/30 ${
          open || hasActive ? "bg-am-mist/30" : ""
        }`}
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={2}
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Le haut du panneau (pt-5) est transparent mais fait partie de la zone survolée : on traverse l'écart sans le refermer.
          invisible retire les liens de l'ordre de tabulation tant que le menu est fermé. */}
      <div
        id={panelId}
        className={`absolute left-0 top-full z-10 pt-5 transition-[opacity,transform,visibility] duration-150 motion-reduce:transition-none ${
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"
        }`}
      >
        {/* Panneau blanc comme les cartes du site. Marge de 8 px et coins de 8 px dans un panneau de 16 px : les courbes restent
            concentriques. Une seule couleur de survol (le fond du site) : la page courante n'a pas de fond, elle porte le point
            de la marquee, sinon deux lignes surlignées côte à côte formaient une tache. */}
        <ul className="m-0 flex w-[300px] list-none flex-col gap-0.5 rounded-2xl border border-black/15 bg-white p-2 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.2)]">
          {items.map((item) => {
            const isActive = isPathActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-black transition-colors hover:bg-am-paper focus-visible:bg-am-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-am-navy"
                >
                  {Icon && (
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-am-mist transition-colors group-hover:bg-am-navy group-hover:text-white group-focus-visible:bg-am-navy group-focus-visible:text-white"
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium leading-tight">{item.label}</span>
                    {item.description && <span className="text-[13px] leading-snug text-black/65">{item.description}</span>}
                  </span>
                  {isActive && <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full border-[1.5px] border-black bg-am-mist" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
