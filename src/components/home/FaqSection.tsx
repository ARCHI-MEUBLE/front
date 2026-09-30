"use client";

import Link from "next/link";
import { useState } from "react";
import { HOME_SECTION, HOME_HEADING } from "@/components/home/homeLayout";

const faqItems = [
  {
    q: "Comment se passe une demande de devis ?",
    a: "À réception de votre demande, un chargé de projet vous est attribué. Il vous transmet une maquette 3D et un devis détaillé, qui servent de base pour affiner le projet ensemble."
  },
  {
    q: "Quels types de meubles fabriquez-vous ?",
    a: "Dressings, bibliothèques, buffets, bureaux, meubles TV ou meubles sous-escalier : tous nos meubles sont conçus sur mesure pour votre intérieur."
  },
  {
    q: "Quel est le délai de fabrication ?",
    a: "Comptez environ 30 jours entre la validation du devis et la fin de la production en atelier, avant la pose chez vous."
  },
  {
    q: "Proposez-vous une visite à domicile ?",
    a: "Oui, une prise de mesures précises est réalisée sur place après validation du devis, pour garantir un ajustement parfait."
  },
  {
    q: "Quelles teintes et finitions sont disponibles ?",
    a: "Bois naturels, nuances contemporaines, finitions mates ou satinées : toutes les teintes du configurateur sont disponibles sur chaque modèle."
  },
  {
    q: "Livrez-vous en dehors de Lille ?",
    a: "Nous intervenons dans toute la métropole lilloise, et pouvons nous déplacer au-delà selon les projets."
  },
  {
    q: "Comment se déroule la pose ?",
    a: "La pose et les finitions sont réalisées sur place par notre équipe, pour une intégration parfaite dans votre intérieur."
  }
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section aria-labelledby="faq-title" className={HOME_SECTION}>
      <div className="mb-10 flex flex-col items-center gap-4 text-center sm:mb-16">
        <h2 id="faq-title" className={`${HOME_HEADING} m-0 text-[40px] sm:text-[64px] lg:text-[88px]`}>
          On vous répond.
        </h2>
        <p className="m-0 max-w-[44ch] text-balance text-[17px] text-[#5F5B53] sm:text-[20px]">
          Tout ce qu&apos;il faut savoir sur le devis, la fabrication, la pose et les teintes.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-[#E5E2D9] bg-white p-6">
          <h3 className="m-0 text-[20px] font-medium leading-[1.15] tracking-[-0.03em] sm:text-[24px]">
            Une question qui n&apos;est pas là ?
          </h3>
          <p className="m-0 text-[15px] text-[#5F5B53]">Alexis, notre métreur commercial, vous répond directement.</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Link
              href="/contact-request"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#161513] bg-[#D4FF3A] px-[18px] py-[11px] text-[14px] font-medium text-[#161513] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Nous contacter →
            </Link>
            <a
              href="https://wa.me/33601062867"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-[#161513] bg-[#25D366] px-[18px] py-[11px] text-[14px] font-medium text-[#161513] transition-transform duration-200 hover:-translate-y-0.5"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {faqItems.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <div key={item.q} className={`rounded-[14px] border bg-white transition-colors ${isOpen ? "border-[#161513]" : "border-[#E5E2D9]"}`}>
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="flex min-h-11 w-full items-center justify-between gap-5 px-[22px] py-5 text-left text-[17px] font-medium tracking-[-0.02em] text-[#161513] sm:text-[19px]"
                  >
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border ${isOpen ? "border-[#161513] bg-[#D4FF3A]" : "border-[#E5E2D9] bg-[#F7F6F2]"}`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M3 5.5 7 9.5 11 5.5" fill="none" stroke="#161513" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </h3>
                {isOpen && <p className="m-0 px-[22px] pb-[22px] text-[16px] leading-[1.55] text-[#5F5B53]">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
