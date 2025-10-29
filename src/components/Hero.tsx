import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative w-full">
      <div className="relative h-[420px] md:h-[560px] lg:h-[720px] w-full overflow-hidden">
        <Image
          src="/images/banniere_salon.jpeg"
          alt="Salon — ArchiMeuble"
          fill
          className="object-cover"
          priority
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />

        {/* Content: left-aligned block with generous left padding on larger screens */}
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 flex w-full items-center">
            <div className="max-w-3xl px-6 md:px-12 lg:px-24">
              <p className="text-sm font-medium uppercase tracking-wider text-white/80">Collection 2025</p>

              <h1 className="heading-serif mt-4 text-3xl font-bold leading-tight drop-shadow-md md:text-5xl lg:text-6xl text-white">
                Configurez votre meuble idéal en quelques clics
              </h1>
              <div className="mt-6 flex gap-4">
                <Link
                  href="#templates"
                  className="inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                >
                  Découvrir nos modèles
                </Link>

                <Link
                  href="/configurator"
                  className="inline-flex items-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/5"
                >
                  Configurer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
