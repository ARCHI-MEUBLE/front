"use client";

import { useState } from "react";
import Link from "next/link";
import { HOME_PILL_DARK, HOME_SECTION } from "@/components/home/homeLayout";
import { FAQ } from "@/components/home/homeData";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section aria-labelledby="faq-title" className={HOME_SECTION}>
      <div className="mb-[clamp(40px,6vw,72px)] flex flex-col items-center gap-[18px] text-center">
        <h2 id="faq-title" className="m-0 text-display text-black">
          On vous répond.
        </h2>
        <p className="m-0 max-w-[44ch] text-lead text-black/70">
          Tout ce qu&apos;il faut savoir sur le devis, la fabrication, la pose et les teintes.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-black/15 bg-white p-6">
          <h3 className="m-0 text-2xl text-black">
            Une question qui n&apos;est pas là ?
          </h3>
          <p className="m-0 text-[15px] text-black/70">Alexis, notre métreur commercial, vous répond directement.</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Link href="/contact-request" className={HOME_PILL_DARK}>Nous contacter →</Link>
            <a
              href="https://wa.me/33601062867"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-black bg-white px-[18px] py-2.5 text-[14px] font-medium text-black transition-transform duration-200 hover:-translate-y-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#000000" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.q}
                className="rounded-[14px] bg-white transition-colors duration-200"
                style={{ border: `1px solid ${isOpen ? "#000000" : "rgba(0,0,0,0.15)"}` }}
              >
                <h3 className="m-0">
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex min-h-[44px] w-full items-center justify-between gap-5 px-[22px] py-5 text-left text-lg font-medium tracking-[-0.02em] text-black"
                  >
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] transition-colors duration-200"
                      style={{ background: isOpen ? "var(--am-mist)" : "color-mix(in srgb, var(--am-mist) 30%, transparent)", border: `1px solid ${isOpen ? "#000000" : "color-mix(in srgb, var(--am-mist) 30%, transparent)"}` }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        style={{ transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: "transform .3s cubic-bezier(.16,1,.3,1)" }}
                      >
                        <path d="M3 5.5 7 9.5 11 5.5" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </h3>
                {isOpen && (
                  <p className="m-0 px-[72px] pb-[22px] text-[16px] leading-[1.55] text-black/70">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
