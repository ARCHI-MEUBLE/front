import { HOME_MONO } from "@/components/home/homeLayout";

const SUBJECTS = [
  { value: "Dressing", label: "Dressing sur mesure" },
  { value: "Bibliothèque", label: "Bibliothèque" },
  { value: "Meuble TV", label: "Meuble TV" },
  { value: "Bureau", label: "Bureau" },
  { value: "Rangement", label: "Rangement / Placard" },
  { value: "Autre", label: "Autre projet" },
];

const INPUT_CLASS =
  "min-h-[52px] w-full rounded-xl border border-[#161513] bg-[#FBFDF1] px-4 py-3.5 text-[17px] text-[#161513] outline-none";

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export function ContactForm({
  formData,
  onChange,
  onSubmit,
  isLoading,
  error,
}: {
  formData: ContactFormData;
  onChange: (field: keyof ContactFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[22px]">
      <fieldset className="m-0 border-0 p-0">
        <legend
          className="mb-4 font-[Geist] font-semibold leading-[1.05] tracking-[-0.04em] text-[#161513]"
          style={{ fontSize: "clamp(26px,2.6vw,38px)" }}
        >
          Type de projet
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {SUBJECTS.map((subject) => {
            const isActive = formData.subject === subject.value;
            return (
              <button
                key={subject.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange("subject", subject.value)}
                className={`min-h-[52px] rounded-full border-[1.5px] border-[#161513] px-6 py-3 text-[16px] ${
                  isActive ? "bg-[#161513] font-semibold text-[#F7F6F2]" : "bg-transparent font-normal text-[#161513]"
                }`}
              >
                {subject.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={`text-xs ${HOME_MONO}`}>Nom</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={`text-xs ${HOME_MONO}`}>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={`text-xs ${HOME_MONO}`}>Téléphone</span>
          <input
            type="tel"
            required
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={`text-xs ${HOME_MONO}`}>Votre projet</span>
        <textarea
          rows={4}
          required
          value={formData.message}
          onChange={(e) => onChange("message", e.target.value)}
          disabled={isLoading}
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
        disabled={isLoading}
        className="min-h-[56px] self-start rounded-full bg-[#161513] px-8 py-4 text-[16px] font-semibold text-[#F7F6F2] disabled:opacity-60"
      >
        {isLoading ? "Envoi en cours..." : "Envoyer ma demande →"}
      </button>
    </form>
  );
}
