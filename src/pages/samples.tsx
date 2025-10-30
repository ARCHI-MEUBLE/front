import Head from "next/head";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function SamplesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-alabaster text-ink">
      <Head>
        <title>Échantillons — ArchiMeuble</title>
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="w-full bg-gradient-to-b from-white/80 to-alabaster py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-sm font-medium uppercase tracking-wider text-ink/60">Collection Échantillons</p>
            <h1 className="heading-serif mt-4 text-5xl text-ink">Nos Échantillons</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
              Touchez et ressentez nos finitions. Commandez vos échantillons physiques pour évaluer les couleurs et textures qui donneront vie à votre meuble sur mesure.
            </p>
            
          </div>
        </section>

        {/* Products Grid (placeholder) */}
        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="text-center">
            <p className="text-ink/70 text-lg">
              Les échantillons seront bientôt disponibles à la vente. Revenez prochainement pour découvrir notre sélection.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
