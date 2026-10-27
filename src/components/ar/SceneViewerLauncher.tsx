import { useState } from 'react';
import { Check, CircleHelp, X } from 'lucide-react';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import { AR_CHECK_LABELS, AR_MESSAGES, sceneViewerIssueMessage } from '@/components/ar/arMessages';
import { arLaunchPlan, checkArReadiness, type ArReadiness } from '@/lib/ar/arReadiness';
import { openSceneViewer, type SceneViewerIssue, type SceneViewerMode } from '@/lib/ar/launchAr';

// Gardé hors du composant : la section des Finitions est démontée quand on change d'étape, inutile de revérifier
let cachedReadiness: ArReadiness | null = null;

const CHECK_ICONS = {
  ok: <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-700" />,
  ko: <X aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-am-wine" />,
  unknown: <CircleHelp aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-black/45" />,
};

// Android : vérifie le téléphone avant d'ouvrir Scene Viewer, puis le lance dans un second clic (le téléphone n'ouvre
// l'application Google que dans un clic, et la demande d'autorisation de la caméra a consommé le premier).
// Si Scene Viewer se referme aussitôt, explique comment débloquer l'application Google et propose la vue 3D.
export default function SceneViewerLauncher({ glbPath, title }: { glbPath: string; title: string }) {
  const [readiness, setReadiness] = useState<ArReadiness | null>(() => cachedReadiness);
  const [checking, setChecking] = useState(false);
  const [issue, setIssue] = useState<{ kind: SceneViewerIssue; mode: SceneViewerMode } | null>(null);

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

  const launch = (mode: SceneViewerMode) => {
    setIssue(null);
    openSceneViewer(glbPath, title, (kind) => setIssue(kind ? { kind, mode } : null), mode);
  };

  if (!readiness) {
    return (
      <>
        <ArLaunchButton label={checking ? AR_MESSAGES.checking : AR_MESSAGES.launch} busy={checking} onClick={runChecks} />
        <p className="text-xs leading-relaxed text-black/65">{AR_MESSAGES.checkIntro}</p>
      </>
    );
  }

  const plan = arLaunchPlan(readiness);
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
    : null;

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
        onClick={() => launch(plan.offerAr ? 'ar_preferred' : '3d_only')}
      />
      <p className={`text-xs leading-relaxed ${issueMessage ? 'text-am-wine' : 'text-black/65'}`} role="status">
        {issueMessage ?? (plan.offerAr ? `${AR_MESSAGES.googleCamera} ${AR_MESSAGES.tip}` : 'Le meuble s’ouvre en 3D, sans caméra.')}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {plan.offerAr && (
          <button type="button" onClick={() => launch('3d_only')} className="text-xs text-am-navy underline hover:no-underline">
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
    </>
  );
}
