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
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#FFF5EB] to-white"
    >
      <div className="absolute inset-0 bg-[url('/images/fond.png')] bg-cover bg-center opacity-[0.07]" aria-hidden />
      <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col items-start justify-center px-6 py-24 sm:px-8 lg:px-12">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent/80">
          Artisan du sur-mesure
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-gray-900 md:text-5xl">
          Fabricant de meubles sur mesure
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Le meuble fait pour vous, pensé pour durer. Nous concevons des pièces uniques qui s’intègrent parfaitement à
          votre intérieur et accompagnent votre quotidien.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/models"
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90"
          >
            Configurer un meuble
          </Link>
          {isMobileDevice ? (
            <Link
              href={`tel:${PHONE_URI}`}
              className="inline-flex items-center justify-center rounded-full border border-accent px-6 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Appeler
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowDesktopNumber(true)}
              className="inline-flex items-center justify-center rounded-full border border-accent px-6 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
              aria-label={showDesktopNumber ? "Numéro de téléphone" : "Révéler le numéro de téléphone"}
              aria-live="polite"
              disabled={showDesktopNumber}
            >
              {showDesktopNumber ? PHONE_NUMBER : "Appeler"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
