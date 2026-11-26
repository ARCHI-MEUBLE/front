import { Seo } from "@/components/Seo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reviews } from "@/components/Reviews";

export default function AvisPage() {
  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-text-primary">
      <Seo title="Avis clients — ArchiMeuble, menuisier à Lille" description="Les avis de nos clients sur leurs meubles sur mesure ArchiMeuble : conception, fabrication à Lille, délais et pose. Laissez le vôtre." />
      <Header />
      <main className="flex-1">
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
