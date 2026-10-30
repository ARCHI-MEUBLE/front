import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { arModelPath } from '@/lib/ar/arModelFile';
import {
  createUsdzUrl,
  getArPlatform,
  isPhoneOrTablet,
  openQuickLook,
  type ArPlatform,
} from '@/lib/ar/launchAr';

export type ArDevice = ArPlatform | 'phone-without-ar' | 'desktop';

const detectDevice = (): ArDevice => getArPlatform() ?? (isPhoneOrTablet() ? 'phone-without-ar' : 'desktop');
const subscribe = () => () => {};

// L'appareil n'est connu que dans le navigateur : null pendant le rendu serveur
export function useArDevice(): ArDevice | null {
  return useSyncExternalStore<ArDevice | null>(subscribe, detectDevice, () => null);
}

export type ArModelStatus = 'idle' | 'preparing' | 'ready' | 'error';

// Le fichier d'un QR code existe-t-il encore ? Le backend supprime les vues AR non redéposées depuis 30 jours.
// 'unknown' : le serveur n'a pas répondu, on laisse la page tenter sa chance.
export function useArModelAvailability(file: string | null): 'checking' | 'available' | 'missing' | 'unknown' {
  const [result, setResult] = useState<{ file: string; status: 'available' | 'missing' | 'unknown' } | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    fetch(arModelPath(file), { method: 'HEAD' })
      .then((response) => {
        if (!cancelled) setResult({ file, status: response.ok ? 'available' : response.status === 404 ? 'missing' : 'unknown' });
      })
      .catch(() => {
        if (!cancelled) setResult({ file, status: 'unknown' });
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return result?.file === file ? result.status : 'checking';
}

// Prépare un GLB du générateur pour la réalité augmentée de l'appareil. launch() ouvre Quick Look (iPhone) et doit être
// appelé directement dans un clic : iOS n'ouvre sa vue AR que sur une action de l'utilisateur, d'où la préparation à
// l'avance. Android passe par AndroidArLauncher (WebXR dans la page, sinon Scene Viewer).
export function useArModel(device: ArDevice | null, file: string | null) {
  // iPhone : USDZ converti depuis le GLB, attaché au fichier dont il vient
  const [usdz, setUsdz] = useState<{ file: string; url: string } | null>(null);
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (device !== 'quick-look' || !file) return;
    let cancelled = false;
    let url: string | null = null;
    createUsdzUrl(arModelPath(file))
      .then((created) => {
        url = created;
        if (cancelled) URL.revokeObjectURL(created);
        else setUsdz({ file, url: created });
      })
      .catch((error) => {
        console.warn('Conversion USDZ impossible :', error instanceof Error ? error.message : error);
        if (!cancelled) setFailedFile(file);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [device, file, attempt]);

  let status: ArModelStatus = 'idle';
  if (file && device === 'scene-viewer') status = 'ready';
  else if (file && device === 'quick-look') {
    status = usdz?.file === file ? 'ready' : failedFile === file ? 'error' : 'preparing';
  }

  const launch = useCallback(() => {
    if (!file) return;
    if (device === 'quick-look' && usdz?.file === file) openQuickLook(usdz.url);
  }, [device, file, usdz]);

  const retry = useCallback(() => {
    setFailedFile(null);
    setAttempt((value) => value + 1);
  }, []);

  return { status, launch, retry };
}
