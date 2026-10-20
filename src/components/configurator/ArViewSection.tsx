import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type * as THREE from 'three';
import StepSection from '@/components/configurator/steps/StepSection';
import type { ThreeViewerProps } from '@/components/configurator/ThreeViewer';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import { AR_MESSAGES } from '@/components/ar/arMessages';
import { useArDevice } from '@/components/ar/useArViewer';
import { apiClient } from '@/lib/apiClient';
import { arModelFileFromUrl, arModelPath } from '@/lib/ar/arModelFile';
import { furnitureToGlb, furnitureToUsdzUrl, prepareFurnitureForExport } from '@/lib/ar/exportFurniture';
import { openQuickLook, openSceneViewer } from '@/lib/ar/launchAr';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Scène hors écran montée le temps d'un export (WebGL : navigateur seulement)
const FurnitureSnapshot = dynamic(() => import('@/components/ar/FurnitureSnapshot'), { ssr: false });

interface ArViewSectionProps {
  // Le meuble tel que le montre le configurateur
  furniture: ThreeViewerProps;
  // Change à chaque modification du meuble : la vue AR préparée pour une version précédente est écartée
  configKey: string;
  // Raison pour laquelle le meuble ne peut pas être montré (configuration hors limites)
  disabledReason?: string | null;
}

type QrState = { status: 'loading' } | { status: 'ready'; image: string; link: string } | { status: 'error' };
// Vue AR prête pour une version du meuble : USDZ dans le navigateur (iPhone) ou GLB déposé sur le backend (Android, QR)
type Prepared = { key: string; usdzUrl: string } | { key: string; file: string };
type SnapshotRequest = { id: number; key: string; purpose: 'device' | 'qr' };

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const AR_TITLE = 'Votre meuble';

// Dernière section des Finitions : le meuble à taille réelle dans la pièce, par la caméra du téléphone.
// La vue AR est exportée de la scène du configurateur elle-même (portes et tiroirs fermés, poignées, couleurs et
// textures comprises), pas du modèle simplifié du générateur Python.
// Sur téléphone, elle est préparée dès l'arrivée sur la section, pour que le bouton ouvre la vue AR dans le clic.
// Sur ordinateur, le bouton affiche un QR code qui ouvre ce meuble sur le téléphone (page /ar).
export default function ArViewSection({ furniture, configKey, disabledReason }: ArViewSectionProps) {
  const device = useArDevice();
  const arCapable = device === 'quick-look' || device === 'scene-viewer';

  const [snapshot, setSnapshot] = useState<SnapshotRequest | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Android : Chrome est revenu sur la page faute de Scene Viewer (ARCore absent)
  const [unavailable, setUnavailable] = useState(false);
  const [qr, setQr] = useState<QrState | null>(null);

  const requestId = useRef(0);
  const qrRequest = useRef(0);
  const latestKey = useRef(configKey);
  // Dernier GLB déposé : le QR code d'un meuble inchangé ne relance ni export ni envoi
  const uploaded = useRef<{ key: string; file: string } | null>(null);

  useEffect(() => {
    latestKey.current = configKey;
  }, [configKey]);

  // Téléphone : prépare la vue AR du meuble affiché, après un court délai (plusieurs réglages à la suite = un export)
  useEffect(() => {
    if (!arCapable || disabledReason) return;
    const timer = window.setTimeout(() => {
      setSnapshot({ id: ++requestId.current, key: configKey, purpose: 'device' });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [arCapable, configKey, disabledReason, attempt]);

  // L'USDZ d'une version précédente n'est plus utile
  useEffect(() => {
    const url = prepared && 'usdzUrl' in prepared ? prepared.usdzUrl : null;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [prepared]);

  const uploadGlb = useCallback(async (root: THREE.Group, key: string) => {
    if (uploaded.current?.key === key) return uploaded.current.file;
    const file = arModelFileFromUrl(await apiClient.arModels.upload(await furnitureToGlb(root)));
    if (!file) throw new Error('Adresse du fichier 3D inattendue');
    uploaded.current = { key, file };
    return file;
  }, []);

  const showQrCode = useCallback(
    async (file: string, request: number) => {
      const link = new URL('/ar', window.location.origin);
      link.searchParams.set('m', file);
      link.searchParams.set('l', String(furniture.width));
      link.searchParams.set('p', String(furniture.depth));
      link.searchParams.set('h', String(furniture.height));
      const { toDataURL } = await import('qrcode');
      const image = await toDataURL(link.toString(), { margin: 1, width: 480, errorCorrectionLevel: 'M' });
      if (request === qrRequest.current) setQr({ status: 'ready', image, link: link.toString() });
    },
    [furniture.width, furniture.depth, furniture.height]
  );

  const handleSnapshotReady = useCallback(
    (object: THREE.Object3D) => {
      const request = snapshot;
      if (!request) return;
      const root = prepareFurnitureForExport(object);
      setSnapshot(null);

      if (request.purpose === 'qr') {
        const qrId = qrRequest.current;
        uploadGlb(root, request.key)
          .then((file) => showQrCode(file, qrId))
          .catch((error) => {
            console.warn('QR code de la réalité augmentée impossible :', error instanceof Error ? error.message : error);
            if (qrId === qrRequest.current) setQr({ status: 'error' });
          });
        return;
      }

      const stale = () => request.key !== latestKey.current;
      const fail = (error: unknown) => {
        console.warn('Vue en réalité augmentée impossible :', error instanceof Error ? error.message : error);
        if (!stale()) setFailedKey(request.key);
      };
      if (device === 'quick-look') {
        furnitureToUsdzUrl(root)
          .then((usdzUrl) => {
            if (stale()) URL.revokeObjectURL(usdzUrl);
            else setPrepared({ key: request.key, usdzUrl });
          })
          .catch(fail);
      } else {
        uploadGlb(root, request.key)
          .then((file) => {
            if (!stale()) setPrepared({ key: request.key, file });
          })
          .catch(fail);
      }
    },
    [snapshot, device, uploadGlb, showQrCode]
  );

  const openQrCode = () => {
    const qrId = ++qrRequest.current;
    setQr({ status: 'loading' });
    if (uploaded.current?.key === configKey) {
      const { file } = uploaded.current;
      showQrCode(file, qrId).catch(() => qrId === qrRequest.current && setQr({ status: 'error' }));
      return;
    }
    setSnapshot({ id: ++requestId.current, key: configKey, purpose: 'qr' });
  };

  const closeQrCode = () => {
    qrRequest.current++;
    setQr(null);
  };

  const launch = () => {
    if (!prepared || prepared.key !== configKey) return;
    if ('usdzUrl' in prepared) {
      openQuickLook(prepared.usdzUrl);
    } else {
      setUnavailable(false);
      openSceneViewer(arModelPath(prepared.file), AR_TITLE, () => setUnavailable(true));
    }
  };

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
  } else if (device === 'desktop') {
    button = { label: AR_MESSAGES.launch, onClick: openQrCode };
    note = 'Sur ordinateur, un QR code ouvre le meuble sur votre téléphone.';
  } else if (prepared?.key === configKey) {
    button = { label: AR_MESSAGES.launch, onClick: launch };
    note = unavailable ? AR_MESSAGES.unavailable : AR_MESSAGES.tip;
  } else if (failedKey === configKey) {
    button = {
      label: AR_MESSAGES.retry,
      onClick: () => {
        setFailedKey(null);
        setAttempt((value) => value + 1);
      },
    };
    note = AR_MESSAGES.failed;
  } else {
    button = { label: AR_MESSAGES.preparing, busy: true };
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

      {snapshot && <FurnitureSnapshot key={snapshot.id} furniture={furniture} onReady={handleSnapshotReady} />}

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
