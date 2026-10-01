import { useState, useEffect, FormEvent } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { DevisInterlocutorCard } from "@/components/devis/DevisInterlocutorCard";
import { DevisChecklist } from "@/components/devis/DevisChecklist";
import { ContactTabs } from "@/components/contact/ContactTabs";
import { ContactForm, ContactFormData } from "@/components/contact/ContactForm";
import { AppointmentPanel } from "@/components/contact/AppointmentPanel";
import { ContactFaqAccordion } from "@/components/contact/ContactFaqAccordion";

export default function ContactRequestPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"contact" | "appointment">("contact");
  const [appointmentType, setAppointmentType] = useState<"phone" | "visio">("phone");
  const [phoneUrl, setPhoneUrl] = useState("");
  const [visioUrl, setVisioUrl] = useState("");

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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setPhoneUrl(data.calendly?.phoneUrl || "");
          setVisioUrl(data.calendly?.visioUrl || "");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la configuration:", err);
      }
    };
    fetchConfig();
  }, []);

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
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>Contact — ArchiMeuble</title>
        <meta
          name="description"
          content="Contactez ArchiMeuble pour vos projets de meubles sur mesure. Devis gratuit et consultation personnalisée."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <section
          aria-labelledby="contact-title"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(24px,4vw,48px)" }}
        >
          <Link href="/" className={`mb-4 inline-block py-2.5 text-[13px] ${HOME_MONO}`}>
            ← Accueil
          </Link>

          <div
            className="grid grid-cols-1 gap-[clamp(40px,6vw,96px)] overflow-hidden rounded-3xl bg-[#EAF4C4] lg:grid-cols-2"
            style={{ padding: "clamp(28px,6vw,88px) clamp(20px,6vw,88px) 0" }}
          >
            <div className="flex min-w-0 flex-col gap-6">
              <h1
                id="contact-title"
                className="m-0 max-w-[13ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
                style={{ fontSize: "clamp(44px,6vw,92px)" }}
              >
                Comment pouvons-nous vous aider ?
              </h1>
              <p className="m-0 max-w-[36ch] text-[#161513]" style={{ fontSize: "clamp(17px,1.4vw,20px)", lineHeight: 1.45 }}>
                Envoyez-nous un message ou réservez directement un créneau pour une consultation gratuite.
              </p>
              <div className="relative mt-6 min-h-[360px] flex-1">
                <Image
                  src="/images/devis-illustration.svg"
                  alt=""
                  aria-hidden="true"
                  fill
                  className="object-contain"
                  style={{ objectPosition: "left bottom" }}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-8" style={{ paddingBottom: "clamp(28px,6vw,88px)" }}>
              <DevisInterlocutorCard />

              {success ? (
                <p className="m-0 text-[17px] text-[#161513]">
                  Message envoyé ! Nous vous répondrons dans les plus brefs délais. Redirection automatique...
                </p>
              ) : (
                <>
                  <ContactTabs active={activeTab} onChange={setActiveTab} />
                  {activeTab === "contact" ? (
                    <ContactForm
                      formData={formData}
                      onChange={handleChange}
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      error={error}
                    />
                  ) : (
                    <AppointmentPanel
                      appointmentType={appointmentType}
                      onTypeChange={setAppointmentType}
                      phoneUrl={phoneUrl}
                      visioUrl={visioUrl}
                    />
                  )}
                </>
              )}

              <DevisChecklist />
            </div>
          </div>
        </section>

        <ContactFaqAccordion />
      </main>
      <Footer />
    </div>
  );
}
