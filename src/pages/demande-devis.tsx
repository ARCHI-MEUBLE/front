import { useState } from "react";
import { Seo } from "@/components/Seo";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HOME_MONO, HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { DevisFurnitureTypePicker } from "@/components/devis/DevisFurnitureTypePicker";
import { DevisInterlocutorCard } from "@/components/devis/DevisInterlocutorCard";
import { DevisChecklist } from "@/components/devis/DevisChecklist";
import { FileDropzone, fileKey, isMediaFile, withMediaType } from "@/components/shared/FileDropzone";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Tous les fichiers partent dans une seule requête : au-delà, le serveur la refuse en bloc
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-black bg-white px-4 py-2 text-[16px] text-black outline-none";

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

  const addFiles = (incoming: File[]) => {
    let rejection = "";
    const accepted = incoming.filter((file) => {
      if (!isMediaFile(file)) {
        rejection = `${file.name} : format non supporté. Utilisez des images ou vidéos.`;
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejection = `${file.name} : fichier trop volumineux (max 10 Mo).`;
        return false;
      }
      return true;
    });
    const known = new Set(files.map(fileKey));
    const next = [...files];
    let totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    for (const file of accepted) {
      if (known.has(fileKey(file))) continue;
      if (next.length >= MAX_FILES) {
        rejection = `${MAX_FILES} fichiers maximum par demande.`;
        break;
      }
      if (totalBytes + file.size > MAX_TOTAL_BYTES) {
        rejection = `${file.name} : la demande dépasserait 50 Mo au total.`;
        continue;
      }
      known.add(fileKey(file));
      next.push(file);
      totalBytes += file.size;
    }
    setFiles(next);
    setError(rejection);
  };

  const removeFile = (index: number) => setFiles((previous) => previous.filter((_, i) => i !== index));

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
      files.forEach((file) => body.append("files[]", withMediaType(file)));

      const response = await fetch("/backend/api/quote-request/index.php", { method: "POST", body });
      // Une requête trop lourde revient en page d'erreur HTML, pas en JSON
      const data = await response.json().catch(() => {
        throw new Error(
          response.status === 413
            ? "Vos fichiers sont trop lourds pour être envoyés ensemble. Retirez-en quelques-uns et réessayez."
            : "Erreur lors de l'envoi de la demande"
        );
      });
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
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Seo title="Devis gratuit pour un meuble sur mesure — ArchiMeuble Lille" description="Décrivez votre projet de meuble sur mesure : un menuisier lillois vous répond personnellement avec un devis gratuit et une maquette 3D." />
      <Header />
      <main className="flex-1">
        {/* Tout le formulaire et les coordonnées tiennent dans l'écran */}
        <section aria-labelledby="devis-title" className={`${HOME_SECTION_NO_TOP} pb-10 pt-4 sm:pt-6`}>
          {success ? (
            <div className="rounded-3xl bg-am-mist p-[clamp(28px,6vw,72px)] text-center">
              <h1 id="devis-title" className="m-0 mb-3 text-title text-black">
                Demande envoyée !
              </h1>
              <p className="m-0 text-[18px] text-black/85">
                Nous avons bien reçu votre demande de devis. Nous vous recontacterons très prochainement.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 rounded-3xl bg-am-mist p-[clamp(20px,3vw,36px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[clamp(32px,4vw,56px)]">
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <h1 id="devis-title" className="m-0 text-heading text-black">
                    <span className="whitespace-nowrap">Parlez-nous</span> de votre projet.
                  </h1>
                  <p className="m-0 max-w-[42ch] text-[16px] leading-[1.4] text-black">
                    Devis gratuit : Gauthier vous répond personnellement.
                  </p>
                </div>
                <DevisInterlocutorCard />
                <div className="lg:mt-auto">
                  <DevisChecklist />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-3">
                <DevisFurnitureTypePicker value={furnitureType} onChange={setFurnitureType} />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={HOME_MONO}>Nom</span>
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
                  <label className="flex flex-col gap-1.5">
                    <span className={HOME_MONO}>Email</span>
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
                  <label className="flex flex-col gap-1.5">
                    <span className={HOME_MONO}>Téléphone</span>
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
                  <label className="flex flex-col gap-1.5">
                    <span className={HOME_MONO}>Ville</span>
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

                <div className="flex flex-col gap-1.5">
                  <span id="devis-files-label" className={HOME_MONO}>
                    Photo ou vidéo d&apos;inspiration
                  </span>
                  <FileDropzone
                    compact
                    files={files}
                    onAdd={addFiles}
                    onRemove={removeFile}
                    disabled={isSubmitting}
                    labelledBy="devis-files-label"
                  />
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={HOME_MONO}>Votre projet</span>
                  <textarea
                    name="message"
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    disabled={isSubmitting}
                    className={`${INPUT_CLASS} min-h-[72px] resize-y py-2.5`}
                  />
                </label>

                {error && (
                  <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5">
                    <p className="m-0 text-[14px] text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-12 self-start rounded-full bg-am-navy px-7 py-2.5 text-[16px] font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande →"}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
