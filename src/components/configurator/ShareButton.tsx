import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShareButtonProps {
  // Enregistre le meuble affiché et renvoie le lien court qui le rouvre
  getLink: () => Promise<string>;
  disabled?: boolean;
  // Code (prompt) du meuble affiché, montré en petit dans la fenêtre de partage (admin)
  getPrompt?: () => string;
}

type ShareState =
  | { status: 'loading' }
  | { status: 'ready'; link: string; image: string; prompt?: string }
  | { status: 'error'; message: string };

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Passer d'un appareil à l'autre sans compte : un lien court et son QR code rouvrent ce meuble tel qu'il est
// maintenant. Le meuble partagé n'est plus modifié ensuite : un nouveau partage donne un nouveau lien.
export default function ShareButton({ getLink, disabled = false, getPrompt }: ShareButtonProps) {
  const [share, setShare] = useState<ShareState | null>(null);
  const [copied, setCopied] = useState(false);
  const request = useRef(0);

  const open = async () => {
    const id = ++request.current;
    setShare({ status: 'loading' });
    setCopied(false);
    try {
      const link = await getLink();
      const { toDataURL } = await import('qrcode');
      const image = await toDataURL(link, { margin: 1, width: 480, errorCorrectionLevel: 'M' });
      if (id === request.current) setShare({ status: 'ready', link, image, prompt: getPrompt?.() });
    } catch (error) {
      if (id === request.current) {
        setShare({ status: 'error', message: error instanceof Error ? error.message : 'Le lien n’a pas pu être créé.' });
      }
    }
  };

  const close = () => {
    request.current++;
    setShare(null);
  };

  const copyLink = (link: string) => {
    navigator.clipboard
      ?.writeText(link)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  // Téléphone : la feuille de partage du système (SMS, messagerie, e-mail…)
  const canShareNatively = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const shareNatively = (link: string) => {
    navigator.share({ title: 'Mon meuble ArchiMeuble', url: link }).catch(() => {});
  };

  const onLocalHost = typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname);

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label="Partager ce meuble"
        className="flex h-9 items-center gap-2 border border-black/10 px-2.5 text-xs font-medium text-black/65 transition-colors hover:border-am-navy hover:text-black disabled:cursor-not-allowed disabled:opacity-40 lg:h-10 lg:px-3"
        style={{ borderRadius: '2px' }}
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Partager</span>
      </button>

      <Dialog open={share !== null} onOpenChange={(isOpen) => !isOpen && close()}>
        <DialogContent className="bg-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Retrouver ce meuble ailleurs</DialogTitle>
            <DialogDescription>
              Scannez ce code avec votre téléphone, ou ouvrez le lien sur un autre ordinateur : le meuble s&apos;affiche
              tel qu&apos;il est maintenant, sans créer de compte.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[240px] items-center justify-center">
            {share?.status === 'ready' ? (
              // eslint-disable-next-line @next/next/no-img-element -- image générée dans la page (data:), rien à optimiser
              <img src={share.image} alt="QR code vers ce meuble" width={240} height={240} />
            ) : share?.status === 'error' ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-black/65" role="alert">
                  {share.message}
                </p>
                <button
                  type="button"
                  onClick={open}
                  className="border border-am-navy px-4 py-2 text-xs font-medium text-am-navy transition-colors hover:bg-am-navy hover:text-white"
                  style={{ borderRadius: '2px' }}
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <span
                aria-label="Création du lien…"
                role="status"
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-am-navy border-t-transparent"
              />
            )}
          </div>
          {share?.status === 'ready' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={share.link}
                  aria-label="Lien vers ce meuble"
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 border border-black/10 bg-am-paper px-2 py-2 font-mono text-[11px] text-black/70"
                  style={{ borderRadius: '2px' }}
                />
                <button
                  type="button"
                  onClick={() => copyLink(share.link)}
                  className="flex-shrink-0 border border-am-navy px-3 py-2 text-xs font-medium text-am-navy transition-colors hover:bg-am-navy hover:text-white"
                  style={{ borderRadius: '2px' }}
                >
                  {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
              </div>
              {share.prompt && (
                <p className="break-all font-mono text-[11px] text-black/55">
                  Prompt actuel : <span className="text-black/80">{share.prompt}</span>
                </p>
              )}
              {canShareNatively && (
                <button
                  type="button"
                  onClick={() => shareNatively(share.link)}
                  className="flex h-10 items-center justify-center gap-2 bg-am-navy text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  style={{ borderRadius: '2px' }}
                >
                  <Share2 className="h-4 w-4" />
                  Envoyer le lien…
                </button>
              )}
              {onLocalHost && (
                <p className="text-[11px] leading-relaxed text-am-wine">
                  Le site est ouvert sur localhost : votre téléphone ne peut pas joindre cette adresse. Ouvrez-le avec
                  l&apos;adresse réseau de l&apos;ordinateur (par exemple http://192.168.x.x:3000) puis partagez de nouveau.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
