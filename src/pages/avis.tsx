import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reviews } from "@/components/Reviews";

export default function AvisPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-[#1E1E1E]">
      <Head>
        <title>Avis — ArchiMeuble</title>
        <meta name="description" content="Avis clients sur ArchiMeuble" />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-start px-4 py-10">
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
