"use client";

import Link from "next/link";
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

// Seule origine dont on accepte les messages : le calendrier Calendly affiché dans la page
const CALENDLY_ORIGIN = "https://calendly.com";

// Accord du visiteur pour charger Calendly (service américain qui dépose des cookies) : retenu 6 mois au plus, comme le
// recommande la CNIL, puis redemandé
const CONSENT_KEY = "archimeuble-calendly-consent";
const CONSENT_MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000;

function readConsent(): boolean {
  try {
    const savedAt = Number(window.localStorage.getItem(CONSENT_KEY));
    return Number.isFinite(savedAt) && savedAt > 0 && Date.now() - savedAt < CONSENT_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function saveConsent() {
  try {
    window.localStorage.setItem(CONSENT_KEY, String(Date.now()));
  } catch {
    // Navigation privée, stockage bloqué : le calendrier s'affiche quand même, l'accord sera redemandé la prochaine fois
  }
}

/**
 * Composant d'intégration Calendly pour la prise de rendez-vous
 *
 * Le calendrier n'est chargé qu'après l'accord du visiteur : tant qu'il n'a pas cliqué, aucune requête ne part vers
 * Calendly (ni cookie, ni adresse IP transmise).
 */
export function CalendlyWidget({ url, prefill }: CalendlyWidgetProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [consented, setConsented] = useState(false);

  // Construire l'URL avec le fuseau horaire Europe/Paris
  const calendlyUrl = url.includes('?')
    ? `${url}&timezone=Europe/Paris`
    : `${url}?timezone=Europe/Paris`;

  // Accord déjà donné : lu après le montage (le stockage du navigateur n'existe pas pendant le rendu serveur)
  useEffect(() => {
    setIsMounted(true);
    setConsented(readConsent());
  }, []);

  useEffect(() => {
    if (!consented) return;

    // Écouter les événements Calendly
    const handleCalendlyEvent = async (e: MessageEvent) => {
      // Un autre onglet ou une autre fenêtre pourrait envoyer un faux message « rendez-vous pris »
      if (e.origin !== CALENDLY_ORIGIN) return;
      // Vérifier que c'est bien un événement Calendly
      if (!e.data?.event || e.data.event !== 'calendly.event_scheduled') {
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
  }, [consented, calendlyUrl]);

  if (!isMounted) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-sm border border-[#e0d7cc] bg-white/80 p-10">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner de chargement */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e0d7cc] border-t-[#2f2a26]"></div>
          <p className="text-sm font-medium text-[#2f2a26]/60">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  if (!consented) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-sm border border-[#e0d7cc] bg-white/80 p-8 text-center">
        <p className="m-0 max-w-md text-[15px] leading-relaxed text-black">
          Le calendrier de réservation est fourni par Calendly, un service situé aux États-Unis. En l&apos;affichant,
          vous acceptez que Calendly dépose des cookies et reçoive votre adresse IP.
        </p>
        <button
          type="button"
          onClick={() => {
            saveConsent();
            setConsented(true);
          }}
          className="rounded-xl bg-am-navy px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-am-navy/90"
        >
          Afficher le calendrier
        </button>
        <p className="m-0 text-[13px] text-black/70">
          Vous préférez ne pas l&apos;utiliser ?{' '}
          <Link href="/contact-request" className="underline hover:text-am-navy">
            Écrivez-nous
          </Link>
          , nous vous rappelons.
        </p>
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
