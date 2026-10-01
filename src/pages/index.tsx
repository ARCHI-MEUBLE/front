import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ProductsMarquee } from "@/components/home/ProductsMarquee";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ServiceAreaSection } from "@/components/home/ServiceAreaSection";
import { FaqSection } from "@/components/home/FaqSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { QuoteRequestCTA } from "@/components/home/QuoteRequestCTA";
import { ConfiguratorDemoSection } from "@/components/home/ConfiguratorDemoSection";
import { ColorsAndFinishesSection } from "@/components/home/ColorsAndFinishesSection";
import { ContactUniqueSection } from "@/components/shared/ContactUniqueSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] font-[Geist]">
      <Head>
        <title>Archimeuble | Menuisier sur mesure a Lille</title>
        <meta
          name="description"
          content="Archimeuble, menuisiers a Lille, concoit et fabrique des meubles sur mesure durables : dressing, bibliotheque, buffet, bureau ou meuble TV pour votre interieur."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <ProductsMarquee />
        <ConfiguratorDemoSection />
        <ColorsAndFinishesSection />
        <WhyChooseUs />
        <ProcessSection />
        <QuoteRequestCTA />
        <TestimonialsSection />
        <ServiceAreaSection />
        <ContactUniqueSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  );
}
