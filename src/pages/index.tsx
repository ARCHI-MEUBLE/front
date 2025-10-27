import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { ContactSection } from "@/components/home/ContactSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-[#1E1E1E]">
      <Head>
        <title>ArchiMeuble — Fabricant de meubles sur mesure</title>
        <meta
          name="description"
          content="Archimeuble, menuisiers à Lille, conçoit et fabrique des meubles sur mesure durables : dressing, bibliothèque, buffet, bureau ou meuble TV pour votre intérieur."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <WhyChooseUs />
        <CategoriesSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}