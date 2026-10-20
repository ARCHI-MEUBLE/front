import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import ArLaunchButton from '@/components/ar/ArLaunchButton';
import { AR_MESSAGES } from '@/components/ar/arMessages';
import { useArDevice, useArModel } from '@/components/ar/useArViewer';
import { isArModelFile } from '@/lib/ar/arModelFile';

const STEPS = [
  'Visez le sol de la pièce et bougez doucement le téléphone.',
  'Le meuble apparaît à taille réelle : faites-le glisser pour le placer, tournez-le avec deux doigts.',
  'Prenez une photo pour la garder ou la partager.',
];

const dimension = (value: string | string[] | undefined) =>
  typeof value === 'string' && /^\d{2,5}$/.test(value) ? Number(value) : null;

// Page ouverte sur le téléphone par le QR code du configurateur (étape Finitions, « Voir chez moi ») :
// le meuble configuré sur l'ordinateur, en réalité augmentée.
export default function ArPage() {
  const router = useRouter();
  const { m, l, p, h } = router.query;
  const file = typeof m === 'string' && isArModelFile(m) ? m : null;
  const size = [dimension(l), dimension(p), dimension(h)];
  const device = useArDevice();
  const arCapable = device === 'quick-look' || device === 'scene-viewer';
  const ar = useArModel(device, file);

  let content: React.ReactNode;
  if (!router.isReady || device === null) {
    content = <ArLaunchButton label={AR_MESSAGES.launch} disabled />;
  } else if (!file) {
    content = (
      <p className="text-sm leading-relaxed text-black/65">
        Ce lien ne correspond à aucun meuble. Affichez un nouveau QR code depuis le configurateur, à l&apos;étape
        Finitions.
      </p>
    );
  } else if (!arCapable) {
    content = (
      <p className="text-sm leading-relaxed text-black/65">
        {device === 'desktop' ? 'Ouvrez ce lien sur votre téléphone pour voir le meuble chez vous.' : AR_MESSAGES.wrongBrowser}
      </p>
    );
  } else if (ar.status === 'error') {
    content = (
      <>
        <ArLaunchButton label={AR_MESSAGES.retry} onClick={ar.retry} />
        <p className="text-xs leading-relaxed text-black/65" role="status">
          {AR_MESSAGES.failed}
        </p>
      </>
    );
  } else {
    content = (
      <>
        {ar.status === 'ready' ? (
          <ArLaunchButton label={AR_MESSAGES.launch} onClick={ar.launch} />
        ) : (
          <ArLaunchButton label={AR_MESSAGES.preparing} busy />
        )}
        {ar.unavailable && (
          <p className="text-xs leading-relaxed text-am-wine" role="status">
            {AR_MESSAGES.unavailable}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Voir chez moi - ArchiMeuble</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Header />

      <main className="min-h-screen bg-am-paper">
        <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
          <p className="eyebrow text-black/65">Réalité augmentée</p>
          <h1 className="mt-3 text-heading text-black">Votre meuble, chez vous</h1>
          {size.every((value) => value !== null) && (
            <p className="mt-3 font-mono text-sm text-black/70">
              {size[0]} × {size[1]} × {size[2]} mm
            </p>
          )}

          <div className="mt-8 space-y-3">{content}</div>

          <ol className="mt-10 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-black/70">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-black/15 bg-white font-mono text-xs text-black"
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <p className="mt-10 text-xs leading-relaxed text-black/65">
            La réalité augmentée aide à juger l&apos;encombrement ; pour la commande, gardez les mesures prises au mètre.
          </p>
          <Link href="/models" className="mt-6 inline-block text-sm text-black underline underline-offset-4 hover:text-am-navy">
            Voir nos modèles
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
