import { Phone, Video } from "lucide-react";
import { CalendlyWidget } from "@/components/CalendlyWidget";

const BENEFITS = ["Analyse de votre espace", "Conseils personnalisés", "Estimation budgétaire", "Sans engagement"];

export function AppointmentPanel({
  appointmentType,
  onTypeChange,
  phoneUrl,
  visioUrl,
}: {
  appointmentType: "phone" | "visio";
  onTypeChange: (type: "phone" | "visio") => void;
  phoneUrl: string;
  visioUrl: string;
}) {
  const url = appointmentType === "phone" ? phoneUrl : visioUrl;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[14px] leading-[1.4] text-black">{BENEFITS.join(" · ")}</p>

      <div className="grid grid-cols-2 gap-2.5">
        {([
          { id: "phone", label: "Téléphone", duration: "30 min", Icon: Phone },
          { id: "visio", label: "Visioconférence", duration: "45 min", Icon: Video },
        ] as const).map(({ id, label, duration, Icon }) => {
          const isActive = appointmentType === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTypeChange(id)}
              className={`flex items-center gap-3 rounded-xl border-[1.5px] border-black px-3.5 py-2.5 text-left ${
                isActive ? "bg-am-navy text-white" : "bg-white text-black"
              }`}
            >
              <Icon className="h-5 w-5 flex-none" strokeWidth={1.5} />
              <span className="leading-tight">
                <span className="block text-[15px] font-medium">{label}</span>
                <span className={`block text-[13px] ${isActive ? "text-white/70" : "text-black/70"}`}>{duration}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[340px] overflow-hidden rounded-xl bg-white">
        {url ? (
          <CalendlyWidget url={url} />
        ) : (
          <div className="flex h-full min-h-[340px] items-center justify-center p-8 text-center">
            <div>
              <p className="m-0 text-black">Calendrier de réservation bientôt disponible.</p>
              <p className="m-0 mt-2 text-[14px] text-black/70">
                En attendant, contactez-nous par téléphone ou email.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
