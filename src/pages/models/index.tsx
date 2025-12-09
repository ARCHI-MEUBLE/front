import Head from "next/head";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";
import { Phone, ArrowRight, Truck, Shield, Clock } from "lucide-react";

export default function ModelsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Nos Modèles - ArchiMeuble</title>
        <meta
          name="description"
          content="Découvrez notre collection de meubles sur mesure. Dressings, bibliothèques, buffets, bureaux - fabriqués dans notre atelier à Lille."
        />
      </Head>
      <Header />

      <main className="flex flex-1 flex-col">
        {/* Hero Header */}
        <section className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            {/* Mobile */}
            <div className="lg:hidden">
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-[#8B7355]" />
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                  Collection 2025
                </span>
              </div>
              <h1 className="mt-4 font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl">
                Nos modèles
              </h1>
              <p className="mt-4 text-[#706F6C]">
                Chaque meuble est fabriqué sur mesure dans notre atelier au 30 Rue Henri Regnault à Lille.
              </p>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-12 items-end gap-12">
                <div className="col-span-7">
                  <div className="flex items-center gap-4">
                    <div className="h-px w-12 bg-[#8B7355]" />
                    <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#8B7355]">
                      Collection 2025
                    </span>
                  </div>
                  <h1 className="mt-6 font-serif text-5xl tracking-[-0.02em] text-[#1A1917] xl:text-6xl">
                    Nos modèles
                  </h1>
                  <p className="mt-6 max-w-xl text-lg text-[#706F6C]">
                    Chaque meuble est fabriqué sur mesure dans notre atelier au 30 Rue Henri Regnault à Lille.
                    Configurez, personnalisez, nous fabriquons.
                  </p>
                </div>

                <div className="col-span-5">
                  <div className="flex items-center justify-end gap-8">
                    <div className="text-right">
                      <span className="font-mono text-3xl text-[#1A1917]">30j</span>
                      <p className="mt-1 text-xs text-[#706F6C]">de fabrication</p>
                    </div>
                    <div className="h-12 w-px bg-[#E8E6E3]" />
                    <div className="text-right">
                      <span className="font-mono text-3xl text-[#1A1917]">10</span>
                      <p className="mt-1 text-xs text-[#706F6C]">ans de garantie</p>
                    </div>
                    <div className="h-12 w-px bg-[#E8E6E3]" />
                    <div className="text-right">
                      <span className="font-mono text-3xl text-[#1A1917]">100%</span>
                      <p className="mt-1 text-xs text-[#706F6C]">Made in France</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Grid with Filters */}
        <ProductGrid />

        {/* Trust Section */}
        <section className="border-t border-[#E8E6E3] bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[#E8E6E3]">
                  <Clock className="h-5 w-5 text-[#8B7355]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1917]">Fabrication rapide</h3>
                  <p className="mt-1 text-sm text-[#706F6C]">
                    30 jours en moyenne, de la commande à la livraison
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[#E8E6E3]">
                  <Truck className="h-5 w-5 text-[#8B7355]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1917]">Livraison offerte</h3>
                  <p className="mt-1 text-sm text-[#706F6C]">
                    Installation comprise dans toute la France
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[#E8E6E3]">
                  <Shield className="h-5 w-5 text-[#8B7355]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1917]">Garantie 10 ans</h3>
                  <p className="mt-1 text-sm text-[#706F6C]">
                    Qualité artisanale certifiée
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-[#1A1917] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {/* Mobile */}
            <div className="text-center lg:hidden">
              <h2 className="font-serif text-2xl text-white sm:text-3xl">
                Vous ne trouvez pas votre bonheur ?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-white/70">
                Nous réalisons tous types de meubles sur mesure. Décrivez-nous votre projet.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact-request"
                  className="inline-flex h-12 items-center justify-center bg-white px-6 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F5F4]"
                >
                  Faire une demande
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="tel:+33601062867"
                  className="inline-flex h-12 items-center justify-center border border-white/30 px-6 text-sm font-medium text-white transition-colors hover:border-white"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  06 01 06 28 67
                </Link>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden items-center justify-between lg:flex">
              <div className="max-w-xl">
                <h2 className="font-serif text-3xl text-white xl:text-4xl">
                  Vous ne trouvez pas votre bonheur ?
                </h2>
                <p className="mt-4 text-lg text-white/70">
                  Nous réalisons tous types de meubles sur mesure. Décrivez-nous votre projet
                  et nous vous accompagnerons dans sa conception.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/contact-request"
                  className="inline-flex h-14 items-center justify-center bg-white px-8 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F5F4]"
                >
                  Faire une demande sur mesure
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="tel:+33601062867"
                  className="inline-flex h-14 items-center justify-center border border-white/30 px-8 text-sm font-medium text-white transition-colors hover:border-white"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  06 01 06 28 67
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
