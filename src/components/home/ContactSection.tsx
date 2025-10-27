"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mail, Phone, Facebook, Instagram } from "lucide-react";

export function ContactSection() {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const triggerHighlight = () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      setIsHighlighted(true);
      resetTimeoutRef.current = setTimeout(() => setIsHighlighted(false), 1600);
    };

    if (window.location.hash === "#contact") {
      setTimeout(triggerHighlight, 120);
    }

    window.addEventListener("contact:reveal", triggerHighlight);

    return () => {
      window.removeEventListener("contact:reveal", triggerHighlight);

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section id="contact" className="scroll-mt-32 bg-[#0C2D57] py-20 text-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div
            className={`rounded-3xl border border-white/5 bg-white/5 p-8 shadow-xl backdrop-blur transition-transform duration-500 lg:p-10 ${
              isHighlighted ? "scale-[1.02]" : "scale-100"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent/80">Une question ?</span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-4xl">
              Votre menuisier sur mesure à Lille
            </h2>
            <p className="mt-4 max-w-2xl text-base text-white/80">
              Si vous avez une demande particulière, appelez-nous directement au <strong>06 01 06 28 67</strong> : nous prenons le
              temps de répondre à chaque projet avec attention.
            </p>
            <p className="mt-3 max-w-2xl text-base text-white/80">
              Quelle que soit votre question, vous aurez toujours un expert de la métropole lilloise pour vous accompagner
              dans les moindres détails de votre meuble sur mesure.
            </p>
            <div
              className={`mt-8 flex flex-col gap-4 text-sm font-medium text-white/90 transition-all duration-500 ${
                isHighlighted
                  ? "translate-y-0 opacity-100 animate-[contactDetailsReveal_800ms_ease-out]"
                  : "translate-y-1 opacity-90"
              }`}
            >
              <Link href="tel:+33601062867" className="inline-flex items-center gap-3 transition hover:text-accent">
                <Phone className="h-5 w-5" /> 06 01 06 28 67
              </Link>
              <Link href="tel:+33602425663" className="inline-flex items-center gap-3 transition hover:text-accent">
                <Phone className="h-5 w-5" /> Service clients : 06 02 42 56 63
              </Link>
              <Link href="mailto:pro.archimeuble@gmail.com" className="inline-flex items-center gap-3 transition hover:text-accent">
                <Mail className="h-5 w-5" /> pro.archimeuble@gmail.com
              </Link>
            </div>
            <div className="mt-10 flex gap-4">
              <Link
                href="https://www.facebook.com/people/Menuisier-%C3%80-Lille-Archimeuble/61567832751482/"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/10"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.instagram.com/archimeuble"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-accent hover:bg-accent/10"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div
            className={`rounded-3xl bg-white/10 p-8 shadow-lg backdrop-blur transition-transform duration-500 lg:p-10 ${
              isHighlighted ? "scale-[1.04]" : "scale-100"
            }`}
          >
            <h3 className="text-lg font-semibold">Archimeuble</h3>
            <p className="mt-4 text-sm text-white/80">
              Archimeuble est une entreprise spécialisée dans la fabrication de meubles sur mesure à Lille. Nos menuisiers
              lillois conçoivent, fabriquent et posent un ameublement unique pensé pour durer.
            </p>
            <div className="mt-6 grid gap-4 text-sm text-white/80">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Adresse</p>
                <p className="mt-1 text-white">1 rue de la madeleine, Lille 5900 — France</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Horaires</p>
                <p className="mt-1 text-white">Du lundi au dimanche · 09:00 – 17:00</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">E-mail</p>
                <Link href="mailto:pro.archimeuble@gmail.com" className="mt-1 inline-flex items-center gap-2 text-white transition hover:text-accent">
                  <Mail className="h-4 w-4" /> pro.archimeuble@gmail.com
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Raison sociale</p>
                <p className="mt-1 text-white">VRAI BOIS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
