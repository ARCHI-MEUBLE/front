import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendProjectRequest } from '@/lib/configurator/share';

interface ProjectRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Enregistre le meuble affiché et renvoie son code de partage et le lien qui le rouvre
  getShare: () => Promise<{ code: string; link: string }>;
  price: number;
}

const EMPTY_FORM = { name: '', phone: '', email: '', message: '' };
const CONTACT_EMAIL = 'pro.archimeuble@gmail.com';

// « Valider avec un menuisier » sans compte : le client laisse de quoi le recontacter, la demande part par e-mail
// chez ArchiMeuble avec le lien du meuble, et rien n'est enregistré sur le site (pas de base client).
export default function ProjectRequestDialog({ open, onOpenChange, getShare, price }: ProjectRequestDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState<string | null>(null);

  const update = (field: keyof typeof EMPTY_FORM) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Indiquez un téléphone ou un e-mail pour que nous puissions vous recontacter.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const share = await getShare();
      await sendProjectRequest({ ...form, shareCode: share.code, price });
      setSentLink(share.link);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Votre demande n'a pas pu être envoyée.");
    } finally {
      setSending(false);
    }
  };

  const changeOpen = (isOpen: boolean) => {
    if (sending) return;
    if (!isOpen) {
      setSentLink(null);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-[460px]">
        {sentLink ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-am-mist/40">
                <Check className="h-6 w-6 text-am-navy" />
              </div>
              <DialogTitle>Demande envoyée</DialogTitle>
              <DialogDescription>
                Un menuisier vous recontacte au plus vite pour valider les détails du projet. Après validation, vous
                recevez un lien de paiement sécurisé, puis le meuble est fabriqué sur mesure et livré chez vous.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-black/65">Gardez ce lien pour retrouver votre meuble :</p>
              <input
                readOnly
                value={sentLink}
                aria-label="Lien vers votre meuble"
                onFocus={(event) => event.currentTarget.select()}
                className="w-full border border-black/10 bg-am-paper px-2 py-2 font-mono text-[11px] text-black/70"
                style={{ borderRadius: '2px' }}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="flex flex-1 items-center justify-center border-2 border-black/10 bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:border-am-navy"
                style={{ borderRadius: '2px' }}
              >
                Retour à l&apos;accueil
              </Link>
              <button
                type="button"
                onClick={() => changeOpen(false)}
                className="flex-1 bg-am-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                style={{ borderRadius: '2px' }}
              >
                Continuer à configurer
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Valider avec un menuisier</DialogTitle>
              <DialogDescription>
                Laissez-nous de quoi vous recontacter : un menuisier vérifie votre meuble avec vous avant toute
                commande. Pas besoin de compte.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="request-name">Nom</Label>
              <Input id="request-name" value={form.name} onChange={update('name')} autoComplete="name" maxLength={150} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="request-phone">Téléphone</Label>
                <Input id="request-phone" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" maxLength={30} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-email">E-mail</Label>
                <Input id="request-email" type="email" value={form.email} onChange={update('email')} autoComplete="email" maxLength={200} />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-black/65">Un téléphone ou un e-mail suffit.</p>
            <div className="grid gap-2">
              <Label htmlFor="request-message">Vos questions (facultatif)</Label>
              <Textarea
                id="request-message"
                value={form.message}
                onChange={update('message')}
                placeholder="La pièce, une contrainte, un délai…"
                maxLength={5000}
                rows={3}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-am-wine">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={sending}
              className="flex h-12 items-center justify-center gap-2 bg-am-wine px-6 text-sm font-medium text-white transition-colors hover:bg-am-wine/90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderRadius: '2px' }}
            >
              {sending ? 'Envoi…' : 'Envoyer ma demande'}
            </button>
            <p className="text-[11px] leading-relaxed text-black/65">
              Ces informations servent uniquement à vous recontacter au sujet de ce projet. Elles nous sont envoyées par
              e-mail et ne sont pas enregistrées sur le site. Pour les faire supprimer :{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-black">
                {CONTACT_EMAIL}
              </a>
              .{' '}
              <Link href="/confidentialite" className="underline hover:text-black">
                Politique de confidentialité
              </Link>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
