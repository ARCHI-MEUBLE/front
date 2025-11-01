"use client";

import { useEffect, useState } from "react";
import { InlineWidget } from "react-calendly";

/**
 * Interface pour les informations de préfill Calendly
 */
interface CalendlyPrefill {
  name?: string;
  email?: string;
  customAnswers?: {
    a1?: string; // Réponse personnalisée 1
    a2?: string; // Réponse personnalisée 2
    a3?: string; // Réponse personnalisée 3
  };
}

/**
 * Props du composant CalendlyWidget
 */
interface CalendlyWidgetProps {
  /** URL de l'événement Calendly (obligatoire) */
  url: string;
  /** Informations de préfill optionnelles */
  prefill?: CalendlyPrefill;
}

/**
 * Composant d'intégration Calendly pour la prise de rendez-vous
 *
 * Affiche un widget Calendly inline avec un état de chargement
 * et un style cohérent avec le design system ArchiMeuble
 */
export function CalendlyWidget({ url, prefill }: CalendlyWidgetProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Construire l'URL avec le fuseau horaire Europe/Paris
  const calendlyUrl = url.includes('?')
    ? `${url}&timezone=Europe/Paris`
    : `${url}?timezone=Europe/Paris`;

  // Gestion du montage côté client uniquement (évite les erreurs SSR)
  useEffect(() => {
    setIsMounted(true);
    // Log pour debugging
    console.log('🔍 Calendly Widget URL:', calendlyUrl);
  }, [calendlyUrl]);

  if (!isMounted) {
    return (
      <div className="flex min-h-[850px] items-center justify-center rounded-[32px] border border-[#e0d7cc] bg-white/80 p-10">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner de chargement */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e0d7cc] border-t-[#2f2a26]"></div>
          <p className="text-sm font-medium text-[#2f2a26]/60">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-[#e0d7cc] bg-white/80 shadow-lg">
      <InlineWidget
        url={calendlyUrl}
        prefill={prefill}
        styles={{
          height: "850px",
          overflow: "hidden",
        }}
        pageSettings={{
          backgroundColor: "ffffff",
          hideEventTypeDetails: false,
          hideLandingPageDetails: false,
          primaryColor: "2f2a26", // Couleur ink du design system
          textColor: "2f2a26",
        }}
        utm={{
          utmSource: "archimeuble",
          utmMedium: "website",
          utmCampaign: "contact",
        }}
      />
    </div>
  );
}
