import { Phone, Video, Check } from "lucide-react";
import { CalendlyWidget } from "@/components/CalendlyWidget";
import { HOME_MONO } from "@/components/home/homeLayout";

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
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        {BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-center gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-am-paper">
              <Check className="h-3.5 w-3.5 text-black" />
            </span>
            <span className="text-[15px] text-black">{benefit}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <span className={`text-xs ${HOME_MONO}`}>Format</span>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => onTypeChange("phone")}
            className={`flex flex-1 items-center gap-3 rounded-xl border-[1.5px] border-black p-4 text-left ${
              appointmentType === "phone" ? "bg-am-navy text-white" : "bg-white text-black"
            }`}
          >
            <Phone className="h-5 w-5" strokeWidth={1.5} />
            <span>
              <span className="block font-medium">Téléphone</span>
              <span className={`block text-[13px] ${appointmentType === "phone" ? "text-white/70" : "text-black/70"}`}>
                30 min
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("visio")}
            className={`flex flex-1 items-center gap-3 rounded-xl border-[1.5px] border-black p-4 text-left ${
              appointmentType === "visio" ? "bg-am-navy text-white" : "bg-white text-black"
            }`}
          >
            <Video className="h-5 w-5" strokeWidth={1.5} />
            <span>
              <span className="block font-medium">Visioconférence</span>
              <span className={`block text-[13px] ${appointmentType === "visio" ? "text-white/70" : "text-black/70"}`}>
                45 min
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-[500px] overflow-hidden rounded-xl bg-white">
        {url ? (
          <CalendlyWidget url={url} />
        ) : (
          <div className="flex h-full min-h-[500px] items-center justify-center p-10 text-center">
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
