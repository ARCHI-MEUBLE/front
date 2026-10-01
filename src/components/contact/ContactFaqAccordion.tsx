"use client";

import { useState } from "react";
import { HOME_SECTION } from "@/components/home/homeLayout";

const CONTACT_FAQ: { q: string; a: string }[] = [
  { q: "Quel est le délai de fabrication ?", a: "Comptez 4 à 8 semaines selon la complexité du projet, de la validation du devis à l'installation." },
  { q: "Intervenez-vous hors métropole lilloise ?", a: "Nous intervenons principalement dans les Hauts-de-France. Pour d'autres régions, contactez-nous pour étudier la faisabilité." },
  { q: "Le devis est-il gratuit ?", a: "Oui, le devis et la consultation sont entièrement gratuits et sans engagement." },
  { q: "Proposez-vous la pose ?", a: "Oui, nous assurons la fabrication et la pose de tous nos meubles pour un résultat parfait." },
];

export function ContactFaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section aria-labelledby="contact-faq-title" className={HOME_SECTION}>
      <h2
        id="contact-faq-title"
        className="m-0 mb-10 text-center font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
        style={{ fontSize: "clamp(32px,4.4vw,56px)" }}
      >
        Questions fréquentes
      </h2>
      <div className="mx-auto flex max-w-[680px] flex-col gap-3">
        {CONTACT_FAQ.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.q}
              className="rounded-[14px] bg-white transition-colors duration-200"
              style={{ border: `1px solid ${isOpen ? "#161513" : "#E5E2D9"}` }}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex min-h-11 w-full items-center justify-between gap-5 px-[22px] py-5 text-left font-[Geist] font-medium tracking-[-0.02em] text-[#161513]"
                  style={{ fontSize: "clamp(17px,1.4vw,19px)" }}
                >
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] transition-colors duration-200"
                    style={{ background: isOpen ? "#D4FF3A" : "#EDEBE4", border: `1px solid ${isOpen ? "#161513" : "#EDEBE4"}` }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      style={{ transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: "transform .3s cubic-bezier(.16,1,.3,1)" }}
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
    </section>
  );
}
