"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";

export type CategoryContent = {
  title: string;
  descriptions: string[];
  image: string;
  imageAlt: string;
};

export type ActivationSource = "pointer" | "keyboard";

type DeactivateOptions = {
  immediate?: boolean;
};

type CategoryCardProps = {
  category: CategoryContent;
  isTouchDevice: boolean;
  onActivate: (source: ActivationSource) => void;
  onDeactivate: (options?: DeactivateOptions) => void;
  onToggle: () => void;
};

export function CategoryCard({ category, isTouchDevice, onActivate, onDeactivate, onToggle }: CategoryCardProps) {
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      onActivate("pointer");
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      onDeactivate();
    }
  };

  const handleClick = () => {
    if (isTouchDevice) {
      onToggle();
    }
  };

  const handleFocus = () => {
    if (!isTouchDevice) {
      onActivate("keyboard");
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    onDeactivate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isTouchDevice) {
        onToggle();
      } else {
        onActivate("keyboard");
      }
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      onDeactivate({ immediate: true });
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="col-span-1 flex min-h-[220px] w-full flex-col justify-between rounded-sm bg-white/95 px-8 py-10 text-left shadow-sm transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
      aria-label={`Voir la catégorie ${category.title}`}
    >
      <p className="font-serif text-2xl leading-tight text-ink">{category.title}</p>
      <span className="mt-8 inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        Découvrir
      </span>
    </div>
  );
}

type FloatingCategoryPanelProps = {
  category: CategoryContent;
  ctaHref: string;
  isVisible: boolean;
  activationSource: ActivationSource;
  isPointerPassthrough: boolean;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

export function FloatingCategoryPanel({
  category,
  ctaHref,
  isVisible,
  activationSource,
  isPointerPassthrough,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: FloatingCategoryPanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    if (!isVisible || activationSource !== "keyboard") {
      return;
    }

    const button = closeButtonRef.current;

    if (button) {
      button.focus({ preventScroll: true });
    }
  }, [activationSource, isVisible]);

  const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("contact:reveal"));
    }
  };

  if (!isMounted) {
    return null;
  }

  const panel = (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:px-6">
      <div
        onMouseEnter={onPointerEnter}
        onMouseLeave={onPointerLeave}
        onFocusCapture={onPointerEnter}
        onBlurCapture={(event) => {
          if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }

          onPointerLeave();
        }}
        className={`${
          isPointerPassthrough ? "pointer-events-none" : "pointer-events-auto"
        } relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[48px] bg-white shadow-2xl transition-[opacity,transform] duration-[400ms] ease-out lg:flex-row ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
        style={{ minHeight: "460px" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Informations sur ${category.title}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          aria-label="Fermer le panneau catégorie"
        >
          <span className="text-lg">×</span>
        </button>
        <div className="relative h-64 w-full overflow-hidden bg-surface lg:h-[520px] lg:w-1/2">
          <Image
            src={category.image}
            alt={category.imageAlt}
            fill
            priority={false}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-10 p-10 lg:p-14">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">{category.title}</p>
            <h3 className="font-serif text-4xl leading-tight text-ink">{category.title}</h3>
            <div className="space-y-4 text-lg leading-relaxed text-stone">
              {category.descriptions.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          <Link href={ctaHref} className="inline-flex w-fit items-center justify-center btn-primary" onClick={handleCtaClick}>
            Démarrer mon projet
          </Link>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return panel;
  }

  return createPortal(panel, document.body);
}