import Head from "next/head";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";

export default function ModelsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Head>
        <title>ArchiMeuble — Nos modèles sur mesure</title>
        <meta
          name="description"
          content="Découvrez la collection ArchiMeuble 2025 et configurez un meuble sur mesure qui vous ressemble."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        {/* Page Header */}
        <section className="border-b border-[#E8E6E3] bg-white pt-12 pb-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h1 className="font-serif text-4xl text-[#1A1917] md:text-5xl lg:text-6xl">
              Nos modèles
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#706F6C]">
              Chaque meuble est fabriqué sur mesure dans notre atelier lillois
            </p>
          </div>
        </section>

        {/* Product Grid with Filters */}
        <ProductGrid />

        {/* Bottom CTA Section */}
        <section className="bg-[#F5F5F4] py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-serif text-2xl text-[#1A1917] md:text-3xl">
              Vous ne trouvez pas votre bonheur ?
            </h2>
            <p className="mt-4 text-[#706F6C]">
              Nous réalisons tous types de meubles sur mesure. Décrivez-nous votre projet
              et nous vous accompagnerons dans sa conception.
            </p>
            <Link
              href="/contact-request"
              className="mt-8 inline-block rounded-full bg-[#1A1917] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
            >
              Faire une demande sur mesure
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
