import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Check, CircleHelp, RotateCcw, RotateCw, X } from 'lucide-react';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import Model3dDialog from '@/components/ar/Model3dDialog';
import { AR_CHECK_LABELS, AR_MESSAGES, WEBXR_PHASE_MESSAGES, sceneViewerIssueMessage } from '@/components/ar/arMessages';
import { arLaunchPlan, checkArReadiness, requestImmersiveAr, type ArReadiness } from '@/lib/ar/arReadiness';
import { openSceneViewer, type SceneViewerIssue } from '@/lib/ar/launchAr';
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

const debugInUrl = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

interface AndroidArLauncherProps {
  // Modèle lu dans la page (réalité augmentée WebXR, vue 3D) : adresse du site ou blob: créé dans le navigateur
  glbPath: string;
  title: string;
  // Adresse https que Scene Viewer télécharge lui-même : dépose le modèle s'il ne l'est pas encore. Absente : glbPath
  getSceneViewerPath?: () => Promise<string>;
}

type SceneViewerFile = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; path: string } | { status: 'error' };

// Android : vérifie le téléphone, puis lance la réalité augmentée dans la page (WebXR, Chrome avec ARCore), sans
// dépendre de l'application Google. Sans WebXR (Firefox, Samsung Internet), passe par Scene Viewer, l'application
// Google ; elle reste proposée en lien. La vue 3D sans caméra s'ouvre dans la page (Model3dDialog).
export default function AndroidArLauncher({ glbPath, title, getSceneViewerPath }: AndroidArLauncherProps) {
  const [readiness, setReadiness] = useState<ArReadiness | null>(() => cachedReadiness);
  const [checking, setChecking] = useState(false);
  const [issue, setIssue] = useState<SceneViewerIssue | null>(null);
  const [show3d, setShow3d] = useState(false);
  const [xrPhase, setXrPhase] = useState<WebXrPhase | 'starting' | null>(null);
  const [xrError, setXrError] = useState<string | null>(null);
  const [xrDebug, setXrDebug] = useState<string | null>(null);
  // Diagnostic affiché par-dessus la caméra : bouton réservé au développement, ou ?debug=1 dans l'adresse
  const [debugAvailable] = useState(() => process.env.NODE_ENV !== 'production' || debugInUrl());
  const [debugMode, setDebugMode] = useState(debugInUrl);
  const [sceneViewerFile, setSceneViewerFile] = useState<SceneViewerFile>(() =>
    getSceneViewerPath ? { status: 'idle' } : { status: 'ready', path: glbPath }
  );
  const overlayRef = useRef<HTMLDivElement>(null);
  const placementRef = useRef<WebXrPlacement | null>(null);
  const lastAngle = useRef<number | null>(null);
  const restorePage = useRef<(() => void) | null>(null);
  const getSceneViewerPathRef = useRef(getSceneViewerPath);
  useEffect(() => {
    getSceneViewerPathRef.current = getSceneViewerPath;
  });

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

  // Scene Viewer télécharge lui-même le modèle : il doit être déposé avant le clic qui le lance (l'ouverture d'une
  // application doit suivre le clic de près). On ne le dépose qu'une fois le visiteur décidé à voir le meuble chez lui.
  const sceneViewerStatus = useRef(sceneViewerFile.status);
  const prepareSceneViewer = useCallback(() => {
    const get = getSceneViewerPathRef.current;
    if (!get || sceneViewerStatus.current === 'loading' || sceneViewerStatus.current === 'ready') return;
    const update = (next: SceneViewerFile) => {
      sceneViewerStatus.current = next.status;
      setSceneViewerFile(next);
    };
    update({ status: 'loading' });
    get()
      .then((path) => update({ status: 'ready', path }))
      .catch((error) => {
        console.warn('Dépôt du modèle pour Scene Viewer impossible :', error instanceof Error ? error.message : error);
        update({ status: 'error' });
      });
  }, []);

  // Vérifications déjà faites (retour sur les Finitions) : le modèle se prépare aussitôt pour Scene Viewer
  useEffect(() => {
    if (cachedReadiness) prepareSceneViewer();
  }, [prepareSceneViewer]);

  const runChecks = async () => {
    setChecking(true);
    setIssue(null);
    prepareSceneViewer();
    try {
      const result = await checkArReadiness();
      cachedReadiness = result;
      setReadiness(result);
    } finally {
      setChecking(false);
    }
  };

  const launchSceneViewer = () => {
    setXrError(null);
    if (sceneViewerFile.status !== 'ready') {
      prepareSceneViewer();
      return;
    }
    setIssue(null);
    openSceneViewer(sceneViewerFile.path, title, setIssue);
  };

  const close3d = useCallback(() => setShow3d(false), []);

  const launchInPage = async () => {
    setIssue(null);
    setXrError(null);
    setXrDebug(null);
    // L'overlay doit exister avant la demande de session, qui le reçoit
    flushSync(() => setXrPhase('starting'));
    restorePage.current = clearPageBehindCamera();
    let session: XRSession | null = null;
    let ended = false;
    // Fin de session, d'où qu'elle vienne (croix, bouton Retour d'Android, échec) : la page réapparaît. Écoutée dès
    // l'ouverture de la session : quitter pendant le démarrage laissait sinon la page masquée et le bouton bloqué.
    const onSessionEnd = () => {
      ended = true;
      placementRef.current = null;
      showPage();
      setXrPhase(null);
    };
    try {
      session = await requestImmersiveAr(overlayRef.current as HTMLDivElement);
      session.addEventListener('end', onSessionEnd);
      const { runWebXrPlacement } = await import('@/lib/ar/webXrPlacement');
      if (ended) return;
      const placement = await runWebXrPlacement({
        session,
        glbUrl: glbPath,
        onPhase: setXrPhase,
        onError: () => setXrError(AR_MESSAGES.webXrModel),
        onDebug: debugMode ? setXrDebug : undefined,
        onEnd: () => undefined,
      });
      if (!ended) placementRef.current = placement;
    } catch (error) {
      // Session refermée par le visiteur pendant le démarrage : l'erreur qui suit n'est pas un échec à signaler
      const quitByVisitor = ended;
      void session?.end().catch(() => undefined);
      onSessionEnd();
      if (quitByVisitor) return;
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
  // Sans WebXR, le bouton principal lance Scene Viewer : il attend que le modèle soit déposé
  const sceneViewerWaiting = !inPage && plan.offerAr && sceneViewerFile.status === 'loading';
  const sceneViewerFailed = sceneViewerFile.status === 'error' ? AR_MESSAGES.sceneViewerUpload : null;
  const issueMessage = issue ? sceneViewerIssueMessage(issue) : (xrError ?? (!inPage && plan.offerAr ? sceneViewerFailed : null));
  const hint = inPage ? AR_MESSAGES.webXrIntro : plan.offerAr ? `${AR_MESSAGES.googleCamera} ${AR_MESSAGES.tip}` : 'Le meuble s’ouvre en 3D, sans caméra.';
  const showRotation = xrPhase === 'placing' || xrPhase === 'estimated' || xrPhase === 'placed';

  return (
    <>
      <ul className="space-y-1.5" aria-label="Vérification de l'appareil">
        {checks.map((check) => (
          <li key={check.key} className="flex gap-2 text-xs leading-relaxed text-black/75">
            {CHECK_ICONS[check.state]}
            {check.label}
          </li>
        ))}
      </ul>

      <ArLaunchButton
        label={sceneViewerWaiting ? AR_MESSAGES.preparing : plan.offerAr ? AR_MESSAGES.launchAr : AR_MESSAGES.launch3d}
        busy={xrPhase !== null || sceneViewerWaiting}
        onClick={() => (inPage ? void launchInPage() : plan.offerAr ? launchSceneViewer() : setShow3d(true))}
      />
      {inPage && debugAvailable && (
        <button
          type="button"
          aria-pressed={debugMode}
          onClick={() => setDebugMode((on) => !on)}
          className={`w-full border px-5 py-2 font-mono text-xs transition-colors ${
            debugMode ? 'border-am-navy bg-am-navy text-white' : 'border-black/20 bg-white text-black/70 hover:border-am-navy hover:text-am-navy'
          }`}
          style={{ borderRadius: '2px' }}
        >
          Diagnostic : {debugMode ? 'activé' : 'désactivé'}
        </button>
      )}
      <p className={`text-xs leading-relaxed ${issueMessage ? 'text-am-wine' : 'text-black/65'}`} role="status">
        {issueMessage ?? hint}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {inPage && (
          <button
            type="button"
            onClick={launchSceneViewer}
            disabled={sceneViewerFile.status === 'loading'}
            className="text-xs text-am-navy underline hover:no-underline disabled:opacity-50"
          >
            {sceneViewerFile.status === 'loading' ? AR_MESSAGES.preparing : AR_MESSAGES.openWithGoogle}
          </button>
        )}
        {plan.offerAr && (
          <button type="button" onClick={() => setShow3d(true)} className="text-xs text-am-navy underline hover:no-underline">
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

      {show3d && <Model3dDialog glbPath={glbPath} title={title} onClose={close3d} />}

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
                {xrDebug && <span className="mt-1 block whitespace-pre-wrap font-mono text-[10px] leading-snug text-white/80">{xrDebug}</span>}
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
