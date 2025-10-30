import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PHONE_NUMBER = "06 01 06 28 67";
const PHONE_URI = "+33601062867";
const MOBILE_USER_AGENT_REGEX = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

export function HeroSection() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showDesktopNumber, setShowDesktopNumber] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const userAgent = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    setIsMobileDevice(MOBILE_USER_AGENT_REGEX.test(userAgent));
  }, []);

  return (
    <section id="hero" className="bg-alabaster">
      <div className="mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center gap-8 px-6 py-24 lg:flex-row lg:items-center">
        <div className="flex-1 max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.4em] text-ink/40">Artisan du sur-mesure</span>
          <h1 className="heading-serif mt-6 text-4xl leading-tight text-ink md:text-6xl">
            Fabricant de meubles haut de gamme sur mesure
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Des dressings aux bibliothèques monumentales, ArchiMeuble conçoit des pièces uniques, pérennes et parfaitement
            adaptées à votre intérieur.
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            <Link href="/models" className="button-elevated">
              Découvrir nos modèles
            </Link>
            {isMobileDevice ? (
              <Link href={`tel:${PHONE_URI}`} className="button-outline">
                Appeler l'atelier
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowDesktopNumber(true)}
                className="button-outline"
                aria-label={showDesktopNumber ? "Numéro de téléphone" : "Révéler le numéro de téléphone"}
                aria-live="polite"
                disabled={showDesktopNumber}
              >
                {showDesktopNumber ? PHONE_NUMBER : "Appeler l'atelier"}
              </button>
            )}
            <Link href="/contact-request" className="button-outline">
              Faire une demande
            </Link>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-[42px] bg-[#ede3d7] shadow-lg">
            <div className="relative h-[360px] w-full">
              <Image
                src="/images/meuble-moderne.jpg"
                alt="Réalisation sur mesure ArchiMeuble"
                fill
                className="object-cover object-center"
                priority
              />
            </div>
            <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col justify-end bg-gradient-to-l from-[#ede3d7] via-[#ede3d7]/80 to-transparent p-10">
              <p className="heading-serif text-2xl text-ink">Lignes épurées, matières nobles</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Chaque projet est accompagné par un artisan dédié pour associer esthétique et fonctionnalité jusque dans les
                moindres détails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
