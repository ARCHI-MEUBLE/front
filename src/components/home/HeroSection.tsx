import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-cream min-h-[90vh] flex items-center">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text content - 60% */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <h1 className="font-serif text-hero text-ink">
              Votre interieur,
              <br />
              sur mesure.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-stone max-w-xl leading-relaxed">
              Des dressings aux bibliotheques, ArchiMeuble concoit des pieces uniques parfaitement adaptees a votre espace.
            </p>
            <div className="mt-10">
              <Link href="/models" className="btn-primary">
                Decouvrir les modeles
              </Link>
            </div>
          </div>

          {/* Image - 40% but visually larger */}
          <div className="lg:col-span-5 order-1 lg:order-2 relative">
            <div className="relative aspect-[4/5] lg:aspect-[3/4] overflow-hidden lg:-mr-12 xl:-mr-24">
              <Image
                src="/images/meuble-moderne.jpg"
                alt="Realisation sur mesure ArchiMeuble"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
