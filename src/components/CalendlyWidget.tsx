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
 * Interface pour l'événement Calendly
 */
interface CalendlyEvent {
  event: string;
  payload: {
    event: {
      uri: string;
    };
    invitee: {
      name: string;
      email: string;
      uri: string;
    };
  };
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

    // Écouter les événements Calendly
    const handleCalendlyEvent = async (e: MessageEvent) => {
      // Vérifier que c'est bien un événement Calendly
      if (!e.data.event || e.data.event !== 'calendly.event_scheduled') {
        return;
      }

      try {
        const payload = e.data.payload;

        // Vérifier la structure du payload
        if (!payload) {
          console.error('❌ Payload manquant dans l\'événement Calendly');
          return;
        }

        // On envoie simplement les URIs, le backend récupérera les données via l'API Calendly
        const eventData = {
          invitee_uri: payload.invitee?.uri || '',
          event_uri: payload.event?.uri || '',
        };

        if (!eventData.invitee_uri || !eventData.event_uri) {
          console.error('❌ URIs manquantes dans le payload Calendly');
          return;
        }

        // Appeler notre API backend pour envoyer les emails de confirmation
        const response = await fetch('/backend/api/calendly/send-confirmation.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        const result = await response.json();

        if (!result.success) {
          console.error('❌ Erreur lors de l\'envoi des emails', result);
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'appel API:', error);
      }
    };

    window.addEventListener('message', handleCalendlyEvent);

    return () => {
      window.removeEventListener('message', handleCalendlyEvent);
    };
  }, [calendlyUrl]);

  if (!isMounted) {
    return (
      <div className="flex min-h-[850px] items-center justify-center rounded-sm border border-[#e0d7cc] bg-white/80 p-10">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner de chargement */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e0d7cc] border-t-[#2f2a26]"></div>
          <p className="text-sm font-medium text-[#2f2a26]/60">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-[#e0d7cc] bg-white/80 shadow-lg">
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
