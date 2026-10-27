import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Check, CircleHelp, RotateCcw, RotateCw, X } from 'lucide-react';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import { AR_CHECK_LABELS, AR_MESSAGES, WEBXR_PHASE_MESSAGES, sceneViewerIssueMessage } from '@/components/ar/arMessages';
import { arLaunchPlan, checkArReadiness, requestImmersiveAr, type ArReadiness } from '@/lib/ar/arReadiness';
import { openSceneViewer, type SceneViewerIssue, type SceneViewerMode } from '@/lib/ar/launchAr';
import type { WebXrPhase, WebXrPlacement } from '@/lib/ar/webXrPlacement';

// Gardé hors du composant : la section des Finitions est démontée quand on change d'étape, inutile de revérifier
let cachedReadiness: ArReadiness | null = null;

const CHECK_ICONS = {
  ok: <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-700" />,
  ko: <X aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-am-wine" />,
  unknown: <CircleHelp aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-black/45" />,
};

// Quart de tour par pas de 15° pour les boutons, en plus de la rotation à deux doigts
const ROTATION_STEP = Math.PI / 12;

const OVERLAY_BUTTON = 'flex h-11 w-11 flex-none items-center justify-center rounded-full bg-black/55 text-white';

// Les boutons de l'overlay ne doivent pas poser ni déplacer le meuble : WebXR les prendrait sinon pour un toucher
const blockXrSelect = (node: HTMLDivElement | null) => node?.addEventListener('beforexrselect', (event) => event.preventDefault());

// Pendant la session, Chrome dessine la page par-dessus la caméra et le meuble : le fond beige de html et body les
// cacherait. On les rend transparents et on masque le reste de la page, l'overlay (hors de #__next) restant visible.
function clearPageBehindCamera(): () => void {
  const page = document.getElementById('__next');
  const saved = [document.documentElement.style.background, document.body.style.background, page?.style.visibility ?? ''];
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  if (page) page.style.visibility = 'hidden';
  return () => {
    [document.documentElement.style.background, document.body.style.background] = [saved[0], saved[1]];
    if (page) page.style.visibility = saved[2];
  };
}

const touchAngle = (event: TouchEvent) => {
  const [a, b] = [event.touches[0], event.touches[1]];
  return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
};

// Android : vérifie le téléphone, puis lance la réalité augmentée dans la page (WebXR, Chrome avec ARCore), sans
// dépendre de l'application Google. Sans WebXR (Firefox, Samsung Internet), passe par Scene Viewer, l'application
// Google, comme avant ; elle reste proposée en lien, avec la vue 3D sans caméra.
export default function AndroidArLauncher({ glbPath, title }: { glbPath: string; title: string }) {
  const [readiness, setReadiness] = useState<ArReadiness | null>(() => cachedReadiness);
  const [checking, setChecking] = useState(false);
  const [issue, setIssue] = useState<{ kind: SceneViewerIssue; mode: SceneViewerMode } | null>(null);
  const [xrPhase, setXrPhase] = useState<WebXrPhase | 'starting' | null>(null);
  const [xrError, setXrError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const placementRef = useRef<WebXrPlacement | null>(null);
  const lastAngle = useRef<number | null>(null);
  const restorePage = useRef<(() => void) | null>(null);

  const showPage = () => {
    restorePage.current?.();
    restorePage.current = null;
  };

  useEffect(
    () => () => {
      placementRef.current?.end();
      showPage();
    },
    []
  );

  const runChecks = async () => {
    setChecking(true);
    setIssue(null);
    try {
      const result = await checkArReadiness();
      cachedReadiness = result;
      setReadiness(result);
    } finally {
      setChecking(false);
    }
  };

  const launchSceneViewer = (mode: SceneViewerMode) => {
    setIssue(null);
    setXrError(null);
    openSceneViewer(glbPath, title, (kind) => setIssue(kind ? { kind, mode } : null), mode);
  };

  const launchInPage = async () => {
    setIssue(null);
    setXrError(null);
    // L'overlay doit exister avant la demande de session, qui le reçoit
    flushSync(() => setXrPhase('starting'));
    restorePage.current = clearPageBehindCamera();
    let session: XRSession | null = null;
    try {
      session = await requestImmersiveAr(overlayRef.current as HTMLDivElement);
      const { runWebXrPlacement } = await import('@/lib/ar/webXrPlacement');
      placementRef.current = await runWebXrPlacement({
        session,
        glbUrl: glbPath,
        onPhase: setXrPhase,
        onError: () => setXrError(AR_MESSAGES.webXrModel),
        onEnd: () => {
          placementRef.current = null;
          showPage();
          setXrPhase(null);
        },
      });
    } catch (error) {
      void session?.end().catch(() => undefined);
      showPage();
      setXrPhase(null);
      setXrError(error instanceof Error && error.name === 'NotAllowedError' ? AR_MESSAGES.webXrDenied : AR_MESSAGES.webXrFailed);
    }
  };

  // Deux doigts qui tournent sur l'écran font tourner le meuble dans le même sens, vu de dessus
  const onTouchMove = useCallback((event: TouchEvent) => {
    if (event.touches.length !== 2) {
      lastAngle.current = null;
      return;
    }
    const angle = touchAngle(event);
    if (lastAngle.current !== null) placementRef.current?.rotate(lastAngle.current - angle);
    lastAngle.current = angle;
  }, []);

  if (!readiness) {
    return (
      <>
        <ArLaunchButton label={checking ? AR_MESSAGES.checking : AR_MESSAGES.launch} busy={checking} onClick={runChecks} />
        <p className="text-xs leading-relaxed text-black/65">{AR_MESSAGES.checkIntro}</p>
      </>
    );
  }

  const plan = arLaunchPlan(readiness);
  const inPage = plan.offerAr && readiness.ar === 'supported';
  const checks = [
    { key: 'ar', state: readiness.ar === 'supported' ? 'ok' : readiness.ar === 'unsupported' ? 'ko' : 'unknown', label: AR_CHECK_LABELS.ar[readiness.ar] },
    {
      key: 'camera',
      state: readiness.camera === 'granted' ? 'ok' : readiness.camera === 'unknown' ? 'unknown' : 'ko',
      label: AR_CHECK_LABELS.camera[readiness.camera],
    },
  ] as const;
  // Même la vue 3D s'est refermée : c'est l'application Google elle-même qui bloque
  const issueMessage = issue
    ? issue.kind === 'closed-quickly' && issue.mode === '3d_only'
      ? "Le meuble ne s'est pas ouvert, même en 3D : mettez à jour l'application Google dans le Play Store, puis réessayez."
      : sceneViewerIssueMessage(issue.kind)
    : xrError;
  const hint = inPage ? AR_MESSAGES.webXrIntro : plan.offerAr ? `${AR_MESSAGES.googleCamera} ${AR_MESSAGES.tip}` : 'Le meuble s’ouvre en 3D, sans caméra.';
  const showRotation = xrPhase === 'placing' || xrPhase === 'estimated' || xrPhase === 'placed';

  return (
    <>
      <ul className="space-y-1.5" aria-label="Vérification du téléphone">
        {checks.map((check) => (
          <li key={check.key} className="flex gap-2 text-xs leading-relaxed text-black/75">
            {CHECK_ICONS[check.state]}
            {check.label}
          </li>
        ))}
      </ul>

      <ArLaunchButton
        label={plan.offerAr ? AR_MESSAGES.launchAr : AR_MESSAGES.launch3d}
        busy={xrPhase !== null}
        onClick={() => (inPage ? void launchInPage() : launchSceneViewer(plan.offerAr ? 'ar_preferred' : '3d_only'))}
      />
      <p className={`text-xs leading-relaxed ${issueMessage ? 'text-am-wine' : 'text-black/65'}`} role="status">
        {issueMessage ?? hint}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {inPage && (
          <button type="button" onClick={() => launchSceneViewer('ar_preferred')} className="text-xs text-am-navy underline hover:no-underline">
            {AR_MESSAGES.openWithGoogle}
          </button>
        )}
        {plan.offerAr && (
          <button type="button" onClick={() => launchSceneViewer('3d_only')} className="text-xs text-am-navy underline hover:no-underline">
            {AR_MESSAGES.launch3dLink}
          </button>
        )}
        {plan.canRecheck && (
          <button
            type="button"
            onClick={runChecks}
            disabled={checking}
            className="text-xs text-am-navy underline hover:no-underline disabled:opacity-50"
          >
            {checking ? AR_MESSAGES.checking : AR_MESSAGES.recheck}
          </button>
        )}
      </div>

      {xrPhase &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[1000] flex flex-col justify-between p-4"
            style={{ touchAction: 'none' }}
            onTouchMove={onTouchMove}
            onTouchEnd={() => (lastAngle.current = null)}
          >
            <div ref={blockXrSelect} className="flex items-start gap-3">
              <p className="flex-1 bg-black/55 px-3 py-2 text-sm leading-relaxed text-white" style={{ borderRadius: '2px' }} role="status">
                {WEBXR_PHASE_MESSAGES[xrPhase]}
              </p>
              <button type="button" aria-label="Quitter la réalité augmentée" onClick={() => placementRef.current?.end()} className={OVERLAY_BUTTON}>
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {showRotation && (
              <div ref={blockXrSelect} className="flex justify-center gap-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <button type="button" aria-label="Tourner à gauche" onClick={() => placementRef.current?.rotate(ROTATION_STEP)} className={OVERLAY_BUTTON}>
                  <RotateCcw aria-hidden="true" className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Tourner à droite" onClick={() => placementRef.current?.rotate(-ROTATION_STEP)} className={OVERLAY_BUTTON}>
                  <RotateCw aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
