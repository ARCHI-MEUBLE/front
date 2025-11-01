import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reviews } from "@/components/Reviews";

export default function AvisPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-light text-text-primary">
      <Head>
        <title>Avis — ArchiMeuble</title>
        <meta name="description" content="Avis clients sur ArchiMeuble" />
      </Head>
      <Header />
      <main className="flex-1">
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
