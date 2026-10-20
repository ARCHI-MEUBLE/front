import { useState, FormEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { DevisInterlocutorCard } from "@/components/devis/DevisInterlocutorCard";
import { DevisChecklist } from "@/components/devis/DevisChecklist";
import { ContactForm, ContactFormData } from "@/components/contact/ContactForm";
import { ContactFaqAccordion } from "@/components/contact/ContactFaqAccordion";

export default function ContactRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.phone || !formData.message) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/backend/api/contact-request/index.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: "",
          subject: formData.subject || "Demande de contact",
          message: formData.message,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi du formulaire");
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du formulaire. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Head>
        <title>Contact — ArchiMeuble</title>
        <meta
          name="description"
          content="Contactez ArchiMeuble pour vos projets de meubles sur mesure. Devis gratuit et consultation personnalisée."
        />
      </Head>
      <Header />
      <main className="flex-1">
        {/* Tout le formulaire et les coordonnées tiennent dans l'écran : la FAQ commence juste dessous */}
        <section aria-labelledby="contact-title" className={`${HOME_SECTION_NO_TOP} pt-4 sm:pt-6`}>
          <div className="grid grid-cols-1 gap-6 rounded-3xl bg-am-mist p-[clamp(20px,3vw,36px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[clamp(32px,4vw,56px)]">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h1 id="contact-title" className="m-0 text-heading text-black">
                  Comment <span className="whitespace-nowrap">pouvons-nous</span> vous aider ?
                </h1>
                <p className="m-0 max-w-[42ch] text-[16px] leading-[1.4] text-black">
                  Écrivez-nous : la consultation est gratuite.
                </p>
              </div>
              <DevisInterlocutorCard />
              <div className="lg:mt-auto">
                <DevisChecklist />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              {success ? (
                <p className="m-0 text-[17px] text-black">
                  Message envoyé ! Nous vous répondrons dans les plus brefs délais. Redirection automatique...
                </p>
              ) : (
                <ContactForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </div>
          </div>
        </section>

        <ContactFaqAccordion />
      </main>
      <Footer />
    </div>
  );
}
