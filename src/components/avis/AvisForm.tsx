import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HOME_MONO, HOME_PILL_LIME, HOME_SECTION } from "@/components/home/homeLayout";

const FURNITURE_TYPES = ["Dressing", "Bibliothèque", "Buffet", "Bureau", "Meuble TV", "Autre"];
const INPUT_CLASS =
  "min-h-[50px] w-full rounded-xl border border-[#CFCBC0] bg-[#F7F6F2] px-4 py-3.5 text-[16px] text-[#161513] outline-none";

export function AvisForm({
  isAuthenticated,
  defaultFirstName,
  defaultCity,
  onSubmit,
}: {
  isAuthenticated: boolean;
  defaultFirstName?: string;
  defaultCity?: string;
  onSubmit: (rating: number, authorName: string, text: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [furnitureType, setFurnitureType] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [firstName, setFirstName] = useState(defaultFirstName ?? "");
  const [city, setCity] = useState(defaultCity ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = rating > 0 && text.trim() !== "" && firstName.trim() !== "" && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const authorName = city.trim() ? `${firstName.trim()} · ${city.trim()}` : firstName.trim();
      const prefixedText = furnitureType ? `[${furnitureType}] ${text.trim()}` : text.trim();
      await onSubmit(rating, authorName, prefixedText);
      setDone(true);
      setRating(0);
      setFurnitureType(null);
      setText("");
      setFirstName("");
      setCity("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="leave-title" className={HOME_SECTION}>
      <div
        className="grid grid-cols-1 items-start gap-[clamp(40px,6vw,96px)] border-t border-[#161513] lg:grid-cols-2"
        style={{ paddingTop: "clamp(32px,4vw,56px)" }}
      >
        <div className="flex flex-col gap-5">
          <span className={`text-xs ${HOME_MONO}`}>Votre avis compte</span>
          <h2
            id="leave-title"
            className="m-0 font-[Geist] font-medium leading-[0.98] tracking-[-0.05em] text-[#161513]"
            style={{ fontSize: "clamp(36px,4.6vw,68px)" }}
          >
            Racontez-nous <span className="rounded-[0.08em] bg-[#D4FF3A] px-[0.12em]">votre meuble.</span>
          </h2>
          <p className="m-0 max-w-[40ch] text-[#3B3832]" style={{ fontSize: "clamp(17px,1.4vw,19px)" }}>
            Vous avez fait appel à ArchiMeuble ? Partagez votre expérience : elle aide d&apos;autres familles à se
            lancer, et Gauthier lit chaque avis.
          </p>
          <div className="mt-2 flex items-center gap-3.5">
            <div className="relative h-[52px] w-[52px] flex-none overflow-hidden rounded-full border border-[#E5E2D9]">
              <Image
                src="/images/gauthier-hue.jpeg"
                alt=""
                fill
                className="object-cover"
                style={{ objectPosition: "50% 25%" }}
              />
            </div>
            <span className="text-[15px] leading-[1.35]">
              <strong className="font-semibold">Gauthier Hue</strong>
              <br />
              <span className="text-[#5F5B53]">Fondateur et ingénieur bois</span>
            </span>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#E5E2D9] bg-white p-[clamp(24px,4vw,44px)]">
          {!isAuthenticated ? (
            <div className="flex flex-col items-start gap-5">
              <p className="m-0 text-[17px] text-[#161513]">
                Connectez-vous pour partager votre avis et aider d&apos;autres clients à découvrir ArchiMeuble.
              </p>
              <Link href="/auth/login?redirect=/avis" className={HOME_PILL_LIME}>
                Se connecter →
              </Link>
            </div>
          ) : done ? (
            <p className="m-0 text-[17px] text-[#161513]">
              Merci pour votre avis ! Il sera publié après vérification de votre commande.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
              <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
                <legend className={`mb-3.5 p-0 text-xs ${HOME_MONO}`}>Votre note</legend>
                <div className="flex flex-wrap items-center gap-4">
                  <div role="radiogroup" aria-label="Note sur 5" className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} étoile${n > 1 ? "s" : ""} sur 5`}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="flex h-12 w-12 items-center justify-center rounded-md text-[28px] leading-none text-white"
                        style={{ background: n <= (hoverRating || rating) ? "#00B67A" : "#DCDCE6" }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span aria-live="polite" className="text-[17px] font-medium">
                    {rating > 0 ? ["Décevant", "Moyen", "Bien", "Très bien", "Excellent"][rating - 1] : "Choisissez une note"}
                  </span>
                </div>
              </fieldset>

              <fieldset className="m-0 border-0 p-0">
                <legend className={`mb-3 p-0 text-xs ${HOME_MONO}`}>Votre meuble</legend>
                <div className="flex flex-wrap gap-2">
                  {FURNITURE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={furnitureType === type}
                      onClick={() => setFurnitureType((prev) => (prev === type ? null : type))}
                      className={`min-h-11 rounded-full border px-[18px] py-2.5 text-[15px] ${
                        furnitureType === type ? "border-[#161513] bg-[#161513] text-[#F7F6F2]" : "border-[#CFCBC0] bg-white text-[#161513]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="flex flex-col gap-2">
                <span className={`text-xs ${HOME_MONO}`}>Votre avis</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 600))}
                  rows={5}
                  maxLength={600}
                  placeholder="Ce qui vous a plu, la pose, le suivi…"
                  className={`${INPUT_CLASS} resize-y`}
                />
                <span className={`self-end text-xs ${HOME_MONO}`}>{text.length} / 600</span>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={`text-xs ${HOME_MONO}`}>Prénom et initiale</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="name"
                    placeholder="Marie D."
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={`text-xs ${HOME_MONO}`}>Ville</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                    placeholder="Lille"
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className={`text-xs ${HOME_MONO}`}>Photo de votre meuble (facultatif)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="min-h-[52px] w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#CFCBC0] bg-[#F7F6F2] px-4 py-3.5 text-[15px]"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E2D9] pt-[22px]">
                <span className="max-w-[34ch] text-[14px] text-[#5F5B53]">
                  Votre avis est publié après vérification de votre commande.
                </span>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="min-h-[54px] rounded-full bg-[#161513] px-7 py-4 text-[16px] font-medium text-[#F7F6F2] disabled:opacity-55"
                >
                  {submitting ? "Envoi..." : "Publier mon avis →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
