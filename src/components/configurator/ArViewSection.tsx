import { useEffect, useRef, useState } from 'react';
import StepSection from '@/components/configurator/steps/StepSection';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import { AR_MESSAGES } from '@/components/ar/arMessages';
import { useArDevice, useArModel } from '@/components/ar/useArViewer';
import { arModelFileFromUrl } from '@/lib/ar/arModelFile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ArViewSectionProps {
  // GLB de l'aperçu en cours : quand il change, la version réalité augmentée est préparée à nouveau
  sourceGlbUrl: string | null;
  // Aperçu en cours de génération
  generating: boolean;
  // Raison pour laquelle le meuble ne peut pas être montré (configuration hors limites)
  disabledReason?: string | null;
  // Adresse du GLB du meuble fermé (tiroirs et portes rentrés), généré si besoin
  prepareModel: () => Promise<string>;
  width: number;
  depth: number;
  height: number;
}

type QrState = { status: 'loading' } | { status: 'ready'; image: string; link: string } | { status: 'error' };

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Dernière section des Finitions : le meuble à taille réelle dans la pièce, par la caméra du téléphone.
// Sur téléphone, le modèle est préparé dès l'arrivée sur la section, pour que le bouton ouvre la vue AR dans le clic.
// Sur ordinateur, le bouton affiche un QR code qui ouvre ce meuble sur le téléphone (page /ar).
export default function ArViewSection({
  sourceGlbUrl,
  generating,
  disabledReason,
  prepareModel,
  width,
  depth,
  height,
}: ArViewSectionProps) {
  const device = useArDevice();
  const arCapable = device === 'quick-look' || device === 'scene-viewer';

  // GLB fermé préparé pour l'aperçu dont il vient : un nouvel aperçu le rend caduc
  const [prepared, setPrepared] = useState<{ source: string; file: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!arCapable || generating || disabledReason || !sourceGlbUrl) return;
    let cancelled = false;
    // Court délai : plusieurs réglages à la suite ne lancent qu'une génération
    const timer = window.setTimeout(() => {
      prepareModel()
        .then((url) => {
          if (cancelled) return;
          const file = arModelFileFromUrl(url);
          if (file) setPrepared({ source: sourceGlbUrl, file });
          else setFailedSource(sourceGlbUrl);
        })
        .catch(() => {
          if (!cancelled) setFailedSource(sourceGlbUrl);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [arCapable, generating, disabledReason, sourceGlbUrl, prepareModel, attempt]);

  const file = !generating && prepared?.source === sourceGlbUrl ? prepared.file : null;
  const ar = useArModel(device, file);

  const [qr, setQr] = useState<QrState | null>(null);
  const qrRequest = useRef(0);

  const openQrCode = async () => {
    const request = ++qrRequest.current;
    setQr({ status: 'loading' });
    try {
      const qrFile = arModelFileFromUrl(await prepareModel());
      if (!qrFile) throw new Error('Fichier 3D inattendu');
      const link = new URL('/ar', window.location.origin);
      link.searchParams.set('m', qrFile);
      link.searchParams.set('l', String(width));
      link.searchParams.set('p', String(depth));
      link.searchParams.set('h', String(height));
      const { toDataURL } = await import('qrcode');
      const image = await toDataURL(link.toString(), { margin: 1, width: 480, errorCorrectionLevel: 'M' });
      if (request === qrRequest.current) setQr({ status: 'ready', image, link: link.toString() });
    } catch (error) {
      console.warn('QR code de la réalité augmentée impossible :', error instanceof Error ? error.message : error);
      if (request === qrRequest.current) setQr({ status: 'error' });
    }
  };

  const closeQrCode = () => {
    qrRequest.current++;
    setQr(null);
  };

  const noModel = !sourceGlbUrl && !generating;
  let button: { label: string; onClick?: () => void; disabled?: boolean; busy?: boolean };
  let note: string | null = null;

  if (device === null) {
    button = { label: AR_MESSAGES.launch, disabled: true };
  } else if (disabledReason) {
    button = { label: AR_MESSAGES.launch, disabled: true };
    note = disabledReason;
  } else if (device === 'phone-without-ar') {
    button = { label: AR_MESSAGES.launch, disabled: true };
    note = AR_MESSAGES.wrongBrowser;
  } else if (noModel) {
    button = { label: AR_MESSAGES.launch, disabled: true };
    note = "Le modèle 3D n'est pas disponible pour le moment.";
  } else if (device === 'desktop') {
    button = generating
      ? { label: AR_MESSAGES.preparing, busy: true }
      : { label: AR_MESSAGES.launch, onClick: openQrCode };
    note = 'Sur ordinateur, un QR code ouvre le meuble sur votre téléphone.';
  } else if (ar.status === 'error' || (failedSource !== null && failedSource === sourceGlbUrl)) {
    button = {
      label: AR_MESSAGES.retry,
      onClick: () => {
        setFailedSource(null);
        setAttempt((value) => value + 1);
        ar.retry();
      },
    };
    note = AR_MESSAGES.failed;
  } else if (ar.status !== 'ready') {
    button = { label: AR_MESSAGES.preparing, busy: true };
  } else {
    button = { label: AR_MESSAGES.launch, onClick: ar.launch };
    note = ar.unavailable ? AR_MESSAGES.unavailable : AR_MESSAGES.tip;
  }

  const onLocalHost = typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname);

  return (
    <StepSection title="Voir chez moi" aside="Réalité augmentée">
      <p className="text-xs leading-relaxed text-black/65">
        Posez le meuble à taille réelle dans votre pièce, avec la caméra de votre téléphone.
      </p>
      <ArLaunchButton {...button} />
      {note && (
        <p className="text-[11px] leading-relaxed text-black/65" role="status">
          {note}
        </p>
      )}

      {!arCapable && (
        <Dialog open={qr !== null} onOpenChange={(open) => !open && closeQrCode()}>
          <DialogContent className="bg-white sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Voir chez moi</DialogTitle>
              <DialogDescription>
                Visez ce code avec l&apos;appareil photo de votre téléphone : le meuble s&apos;ouvre en réalité augmentée, à
                taille réelle.
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-h-[240px] items-center justify-center">
              {qr?.status === 'ready' ? (
                // eslint-disable-next-line @next/next/no-img-element -- image générée dans la page (data:), rien à optimiser
                <img src={qr.image} alt="QR code vers la vue en réalité augmentée" width={240} height={240} />
              ) : qr?.status === 'error' ? (
                <p className="text-center text-sm text-black/65">{AR_MESSAGES.failed}</p>
              ) : (
                <span
                  aria-label={AR_MESSAGES.preparing}
                  role="status"
                  className="h-8 w-8 animate-spin rounded-full border-[3px] border-am-navy border-t-transparent"
                />
              )}
            </div>
            {qr?.status === 'ready' && onLocalHost && (
              <p className="text-[11px] leading-relaxed text-am-wine">
                Le site est ouvert sur localhost : votre téléphone ne peut pas joindre cette adresse. Ouvrez-le avec
                l&apos;adresse réseau de l&apos;ordinateur (par exemple http://192.168.x.x:3000) puis réaffichez ce code.
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </StepSection>
  );
}
