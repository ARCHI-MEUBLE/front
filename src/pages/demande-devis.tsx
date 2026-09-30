import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { DevisFurnitureTypePicker } from "@/components/devis/DevisFurnitureTypePicker";
import { DevisInterlocutorCard } from "@/components/devis/DevisInterlocutorCard";
import { DevisChecklist } from "@/components/devis/DevisChecklist";

const INPUT_CLASS =
  "min-h-[52px] w-full rounded-xl border border-[#161513] bg-[#FBFDF1] px-4 py-3.5 text-[17px] text-[#161513] outline-none";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed, lastName: trimmed };
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
}

export default function DemandeDevisPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [furnitureType, setFurnitureType] = useState("Dressing");
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", city: "", message: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter((file) => {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      if (!isMedia) {
        setError(`${file.name} : format non supporté. Utilisez des images ou vidéos.`);
        return false;
      }
      if (!isUnder10MB) {
        setError(`${file.name} : fichier trop volumineux (max 10 Mo).`);
        return false;
      }
      return true;
    });
    setFiles(selected);
    if (selected.length > 0) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.phone) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (files.length === 0) {
      setError("Veuillez ajouter au moins une photo ou vidéo");
      return;
    }

    setIsSubmitting(true);
    try {
      const { firstName, lastName } = splitName(formData.name);
      const descriptionLines = [`Type de meuble : ${furnitureType}`];
      if (formData.city) descriptionLines.push(`Ville : ${formData.city}`);
      if (formData.message) descriptionLines.push("", formData.message);

      const body = new FormData();
      body.append("first_name", firstName);
      body.append("last_name", lastName);
      body.append("email", formData.email);
      body.append("phone", formData.phone);
      body.append("description", descriptionLines.join("\n"));
      files.forEach((file) => body.append("files[]", file));

      const response = await fetch("/backend/api/quote-request/index.php", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi de la demande");
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>Demande de devis — ArchiMeuble</title>
        <meta
          name="description"
          content="Parlez-nous de votre projet de meuble sur mesure. Gauthier vous répond personnellement."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <section
          aria-labelledby="devis-title"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(24px,4vw,48px)" }}
        >
          <Link href="/" className={`mb-4 inline-block py-2.5 text-[13px] ${HOME_MONO}`}>
            ← Accueil
          </Link>

          {success ? (
            <div className="rounded-3xl bg-[#EAF4C4] p-[clamp(28px,6vw,88px)] text-center">
              <h1
                id="devis-title"
                className="m-0 mb-3 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
                style={{ fontSize: "clamp(36px,5vw,64px)" }}
              >
                Demande envoyée !
              </h1>
              <p className="m-0 text-[18px] text-[#3B3832]">
                Nous avons bien reçu votre demande de devis. Nous vous recontacterons très prochainement.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-[clamp(40px,6vw,96px)] overflow-hidden rounded-3xl bg-[#EAF4C4] lg:grid-cols-2"
              style={{ padding: "clamp(28px,6vw,88px) clamp(20px,6vw,88px) 0" }}
            >
              <div className="flex min-w-0 flex-col gap-6">
                <h1
                  id="devis-title"
                  className="m-0 max-w-[11ch] font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
                  style={{ fontSize: "clamp(44px,6vw,92px)" }}
                >
                  Parlez-nous de votre projet.
                </h1>
                <p className="m-0 max-w-[34ch] text-[#161513]" style={{ fontSize: "clamp(17px,1.4vw,20px)", lineHeight: 1.45 }}>
                  Demande de devis. Gauthier vous répond personnellement
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

                <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
                  <DevisFurnitureTypePicker value={furnitureType} onChange={setFurnitureType} />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className={`text-xs ${HOME_MONO}`}>Nom</span>
                      <input
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={isSubmitting}
                        className={INPUT_CLASS}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className={`text-xs ${HOME_MONO}`}>Email</span>
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        disabled={isSubmitting}
                        className={INPUT_CLASS}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className={`text-xs ${HOME_MONO}`}>Téléphone</span>
                      <input
                        name="tel"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        disabled={isSubmitting}
                        className={INPUT_CLASS}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className={`text-xs ${HOME_MONO}`}>Ville</span>
                      <input
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        disabled={isSubmitting}
                        className={INPUT_CLASS}
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className={`text-xs ${HOME_MONO}`}>Photo ou vidéo d&apos;inspiration</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="min-h-[52px] w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#161513] bg-[#FBFDF1] px-4 py-3.5 text-[15px]"
                    />
                    {files.length > 0 && (
                      <span className="text-[13px] text-[#5F5B53]">
                        {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className={`text-xs ${HOME_MONO}`}>Votre projet</span>
                    <textarea
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      disabled={isSubmitting}
                      className={`${INPUT_CLASS} resize-y`}
                    />
                  </label>

                  {error && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                      <p className="m-0 text-[14px] text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[56px] self-start rounded-full bg-[#161513] px-8 py-4 text-[16px] font-semibold text-[#F7F6F2] disabled:opacity-60"
                  >
                    {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande →"}
                  </button>
                </form>

                <DevisChecklist />
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
