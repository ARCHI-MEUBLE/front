import { Seo } from "@/components/Seo";
import { businessJsonLd, faqJsonLd, websiteJsonLd } from "@/lib/seo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ProductsMarquee } from "@/components/home/ProductsMarquee";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { ServiceAreaSection } from "@/components/home/ServiceAreaSection";
import { FaqSection } from "@/components/home/FaqSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { QuoteRequestCTA } from "@/components/home/QuoteRequestCTA";
import { ContactUniqueSection } from "@/components/shared/ContactUniqueSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-am-paper font-sans">
      <Seo
        title="Meubles sur mesure à Lille — ArchiMeuble, menuisier"
        description="Menuisier à Lille, ArchiMeuble conçoit, fabrique et pose vos meubles sur mesure : dressing, bibliothèque, buffet, bureau, meuble TV. Devis gratuit et maquette 3D."
        path="/"
        jsonLd={[businessJsonLd(), websiteJsonLd(), faqJsonLd()]}
      />
      <Header />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <ProductsMarquee />
        <WhyChooseUs />
        <ServiceAreaSection />
        <QuoteRequestCTA />
        <TestimonialsSection />
        <ContactUniqueSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  );
}
