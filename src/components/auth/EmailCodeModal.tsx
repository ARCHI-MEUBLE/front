import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { HOME_MONO, HOME_PILL_DARK } from "@/components/home/homeLayout";
import type { LoginCodeRequest } from "@/context/CustomerContext";

const INPUT_CLASS =
  "min-h-[50px] w-full rounded-xl border border-black/30 bg-am-paper px-4 py-3.5 text-[16px] text-black outline-none focus:border-black";

type Step = "email" | "code";

// Identification sans compte : le visiteur reçoit un code à 6 chiffres par email (son nom n'est demandé qu'à la première fois)
export default function EmailCodeModal({
  isOpen,
  requestCode,
  verifyCode,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  requestCode: (email: string, firstName?: string, lastName?: string) => Promise<LoginCodeRequest>;
  verifyCode: (email: string, code: string) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("email");
      setCode("");
      setError("");
      setNotice("");
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  if (!isOpen) return null;

  const sendCode = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const result = await requestCode(email.trim(), needsName ? firstName.trim() : undefined, needsName ? lastName.trim() : undefined);
      if ("needsName" in result) {
        setNeedsName(true);
        return;
      }
      setStep("code");
      setNotice(`Code envoyé à ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyCode(email.trim(), code);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-code-title"
        className="relative w-full max-w-md rounded-[20px] border border-black/15 bg-white p-[clamp(24px,4vw,40px)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-am-mist/30"
        >
          <X className="h-5 w-5" />
        </button>

        <span className={HOME_MONO}>{step === "email" ? "Étape 1 sur 2" : "Étape 2 sur 2"}</span>
        <h2 id="email-code-title" className="mb-2 mt-3 text-subheading text-black">
          {step === "email" ? "Votre adresse email" : "Saisissez le code"}
        </h2>
        <p className="m-0 mb-6 text-[15px] leading-relaxed text-black/75">
          {step === "email"
            ? "Pas de compte à créer : nous vous envoyons un code pour confirmer votre adresse et suivre votre commande."
            : "Nous venons de vous envoyer un code à 6 chiffres, valable 15 minutes."}
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className={HOME_MONO}>Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNeedsName(false);
                }}
                placeholder="vous@exemple.fr"
                className={INPUT_CLASS}
              />
            </label>
            {needsName && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={HOME_MONO}>Prénom</span>
                  <input
                    required
                    autoFocus
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={HOME_MONO}>Nom</span>
                  <input
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>
            )}
            {error && <p role="alert" className="m-0 text-[14px] text-am-wine">{error}</p>}
            <button type="submit" disabled={loading} className={`${HOME_PILL_DARK} mt-2 disabled:opacity-60`}>
              {loading ? "Envoi…" : "Recevoir mon code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className={HOME_MONO}>Code à 6 chiffres</span>
              <input
                ref={codeInput}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${INPUT_CLASS} text-center font-mono text-[22px] tracking-[0.4em]`}
              />
            </label>
            {notice && !error && <p className="m-0 text-[14px] text-black/65">{notice}</p>}
            {error && <p role="alert" className="m-0 text-[14px] text-am-wine">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className={`${HOME_PILL_DARK} mt-2 disabled:opacity-60`}>
              {loading ? "Vérification…" : "Confirmer"}
            </button>
            <div className="flex flex-wrap justify-between gap-2 text-[14px]">
              <button type="button" onClick={() => setStep("email")} className="text-black/65 underline underline-offset-4 hover:text-black">
                Changer d&apos;adresse
              </button>
              <button type="button" disabled={loading} onClick={() => void sendCode()} className="text-black/65 underline underline-offset-4 hover:text-black">
                Renvoyer le code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
