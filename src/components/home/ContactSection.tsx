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
    <section id="contact" className="scroll-mt-32 bg-ink py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div
            className={`rounded-[32px] border border-white/10 bg-white/5 p-10 shadow-xl backdrop-blur transition-transform duration-500 ${
              isHighlighted ? "scale-[1.02]" : "scale-100"
            }`}
          >
            <span className="text-xs font-medium uppercase tracking-[0.4em] text-white/60">Une question ?</span>
            <h2 className="heading-serif mt-5 text-4xl leading-tight text-white md:text-[44px]">
              Votre menuisier sur mesure à Lille
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">
              Si vous avez une demande particulière, appelez-nous directement au <strong>06 01 06 28 67</strong> : nous prenons
              le temps de répondre à chaque projet avec attention.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
              Quelle que soit votre question, vous serez accompagnés par un expert de la métropole lilloise pour imaginer un
              meuble parfaitement adapté à votre intérieur.
            </p>
            <div
              className={`mt-10 flex flex-col gap-4 text-sm font-medium text-white transition-all duration-500 ${
                isHighlighted
                  ? "translate-y-0 opacity-100 animate-[contactDetailsReveal_800ms_ease-out]"
                  : "translate-y-1 opacity-90"
              }`}
            >
              <Link href="tel:+33601062867" className="inline-flex items-center gap-3 transition hover:text-[#f1e8de]">
                <Phone className="h-5 w-5" /> 06 01 06 28 67
              </Link>
              <Link href="tel:+33602425663" className="inline-flex items-center gap-3 transition hover:text-[#f1e8de]">
                <Phone className="h-5 w-5" /> Service clients : 06 02 42 56 63
              </Link>
              <Link href="mailto:pro.archimeuble@gmail.com" className="inline-flex items-center gap-3 transition hover:text-[#f1e8de]">
                <Mail className="h-5 w-5" /> pro.archimeuble@gmail.com
              </Link>
            </div>
            <div className="mt-12 flex gap-4">
              <Link
                href="https://www.facebook.com/people/Menuisier-%C3%80-Lille-Archimeuble/61567832751482/"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:bg-white/10"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.instagram.com/archimeuble"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:bg-white/10"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div
            className={`rounded-[32px] border border-white/10 bg-white/5 p-10 shadow-lg backdrop-blur transition-transform duration-500 ${
              isHighlighted ? "scale-[1.04]" : "scale-100"
            }`}
          >
            <h3 className="heading-serif text-2xl text-white">ArchiMeuble</h3>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              ArchiMeuble est une entreprise spécialisée dans la fabrication de meubles sur mesure à Lille. Nos menuisiers
              conçoivent, fabriquent et posent un ameublement unique pensé pour durer.
            </p>
            <div className="mt-6 grid gap-4 text-sm text-white/70">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Adresse</p>
                <p className="mt-1 text-white">1 rue de la madeleine, Lille 5900 — France</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Horaires</p>
                <p className="mt-1 text-white">Du lundi au dimanche · 09:00 – 17:00</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">E-mail</p>
                <Link href="mailto:pro.archimeuble@gmail.com" className="mt-1 inline-flex items-center gap-2 text-white transition hover:text-[#f1e8de]">
                  <Mail className="h-4 w-4" /> pro.archimeuble@gmail.com
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Raison sociale</p>
                <p className="mt-1 text-white">VRAI BOIS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
