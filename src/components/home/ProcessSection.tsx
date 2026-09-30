"use client";

import Image from "next/image";
import { useState } from "react";
import { HOME_SECTION, HOME_HEADING, HOME_MONO } from "@/components/home/homeLayout";

const steps = [
  {
    tag: "J+0",
    title: "Demande",
    text: "À réception de la demande, un chargé de projet est attribué.",
    image: "/images/home/process-demande.jpg"
  },
  {
    tag: "Devis",
    title: "Maquette 3D",
    text: "Une maquette 3D et un devis détaillé sont transmis pour servir de base à l'affinage du projet.",
    image: "/images/home/process-maquette.jpg"
  },
  {
    tag: "Sur place",
    title: "Prise de mesures",
    text: "Après validation du devis, une prise de mesures précises est effectuée sur place.",
    image: "/images/home/process-mesures.jpg"
  },
  {
    tag: "30 jours",
    title: "Production",
    text: "Les découpes et les perçages sont faits en usine. 30 jours plus tard, le meuble est prêt.",
    image: "/images/home/process-production.jpg"
  },
  {
    tag: "Finitions",
    title: "Pose",
    text: "La pose et les finitions sont réalisées sur place pour une intégration parfaite.",
    image: "/images/home/process-pose.jpg"
  }
];

export function ProcessSection() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <section aria-labelledby="process-title" className={HOME_SECTION}>
      <h2
        id="process-title"
        className={`${HOME_HEADING} mx-auto mb-14 max-w-[16ch] text-balance text-center text-[36px] sm:text-[52px] lg:text-[72px]`}
      >
        De la demande à la pose, un interlocuteur unique.
      </h2>

      <div className="relative mx-auto aspect-video max-w-[880px] min-h-[340px]">
        <div className="absolute inset-x-[8%] bottom-[10%] top-0 rounded-3xl bg-[#3B3832]" />
        <div className="absolute inset-x-[4%] bottom-[6%] top-[4%] rounded-3xl bg-[#5F5B53]" />
        <div className="absolute inset-x-0 bottom-0 top-[8%] overflow-hidden rounded-3xl border border-[#161513] bg-white shadow-[0_40px_80px_-40px_rgba(22,21,19,0.55)]">
          <div className="grid h-full grid-cols-1 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="relative hidden min-h-[220px] overflow-hidden bg-[#EDEBE4] sm:block">
              <Image src={step.image} alt="" fill className="object-cover" />
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-5 p-6 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <span className={`rounded-full border border-[#161513] bg-[#D4FF3A] px-3 py-1 text-[13px] ${HOME_MONO}`}>
                  {String(active + 1).padStart(2, "0")} / 05
                </span>
                <span className={`text-[13px] text-[#5F5B53] ${HOME_MONO}`}>{step.tag}</span>
              </div>
              <div>
                <h3 className="m-0 mb-3.5 text-[28px] font-medium leading-none tracking-[-0.045em] text-[#161513] sm:text-[40px]">
                  {step.title}
                </h3>
                <p className="m-0 max-w-[42ch] text-[17px] leading-[1.5] text-[#5F5B53] sm:text-[20px]">{step.text}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {steps.map((s, index) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Étape ${index + 1} : ${s.title}`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={`h-2.5 w-2.5 rounded-full border border-[#161513] transition-colors ${
              index === active ? "bg-[#D4FF3A]" : "bg-transparent"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
