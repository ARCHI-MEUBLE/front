import Head from "next/head";
import Link from 'next/link'
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FiltersBar } from "@/components/FiltersBar";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-[#1E1E1E]">
      <Head>
        <title>ArchiMeuble — Configurez votre meuble idéal</title>
        <meta
          name="description"
          content="ArchiMeuble, la plateforme artisanale pour concevoir des meubles sur mesure inspirés du design contemporain."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <div className="max-w-6xl mx-auto p-6">
          <Link href="/configurator/select" className="inline-block btn btn-primary">Lancer le configurateur 3D</Link>
        </div>
        <FiltersBar />
        <ProductGrid />
      </main>
      <Footer />
    </div>
  );
}