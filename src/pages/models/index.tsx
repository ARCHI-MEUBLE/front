import Head from "next/head";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";

export default function ModelsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <Head>
        <title>ArchiMeuble — Nos modèles sur mesure</title>
        <meta
          name="description"
          content="Découvrez la collection ArchiMeuble 2025 et configurez un meuble sur mesure qui vous ressemble."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
  <Hero />
  <ProductGrid />
      </main>
      <Footer />
    </div>
  );
}
