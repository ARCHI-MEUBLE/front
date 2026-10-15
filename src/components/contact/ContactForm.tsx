import { HOME_MONO } from "@/components/home/homeLayout";

const SUBJECTS = [
  { value: "Dressing", label: "Dressing" },
  { value: "Bibliothèque", label: "Bibliothèque" },
  { value: "Meuble TV", label: "Meuble TV" },
  { value: "Bureau", label: "Bureau" },
  { value: "Rangement", label: "Placard" },
  { value: "Autre", label: "Autre" },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-black bg-white px-4 py-2 text-[16px] text-black outline-none";

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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className={`mb-1.5 p-0 text-xs ${HOME_MONO}`}>Type de projet</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => {
            const isActive = formData.subject === subject.value;
            return (
              <button
                key={subject.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange("subject", subject.value)}
                className={`min-h-10 rounded-full border-[1.5px] border-black px-3.5 py-1.5 text-[14px] ${
                  isActive ? "bg-am-navy font-semibold text-white" : "bg-transparent font-normal text-black"
                }`}
              >
                {subject.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5">
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
        <label className="flex flex-col gap-1.5 sm:col-span-2">
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

      <label className="flex flex-col gap-1.5">
        <span className={`text-xs ${HOME_MONO}`}>Votre projet</span>
        <textarea
          rows={3}
          required
          value={formData.message}
          onChange={(e) => onChange("message", e.target.value)}
          disabled={isLoading}
          className={`${INPUT_CLASS} min-h-[84px] resize-y py-2.5`}
        />
      </label>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5">
          <p className="m-0 text-[14px] text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="min-h-12 self-start rounded-full bg-am-navy px-7 py-2.5 text-[16px] font-semibold text-white disabled:opacity-60"
      >
        {isLoading ? "Envoi en cours..." : "Envoyer ma demande →"}
      </button>
    </form>
  );
}
