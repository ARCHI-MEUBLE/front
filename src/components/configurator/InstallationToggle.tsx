import { formatPrice } from '@/lib/format';

interface InstallationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Prix de la pose pour ce meuble (estimation du backend) ; null tant qu'il n'est pas connu
  price: number | null;
  disabled?: boolean;
}

// Pose et montage chez le client : un seul interrupteur, le prix est ajouté à celui du meuble quand il est activé.
// La livraison reste un frais à part, ajouté au panier.
export default function InstallationToggle({ checked, onChange, price, disabled = false }: InstallationToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 border-2 p-3 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-am-navy bg-am-navy/5' : 'border-black/10 bg-white hover:border-am-navy'
      }`}
      style={{ borderRadius: '2px' }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-tight text-black">Pose + montage compris</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-black/65">
          {checked
            ? 'Le meuble est monté et posé chez vous, prêt à servir.'
            : 'Sans : le meuble est livré, vous le montez vous-même.'}
        </span>
      </span>
      {price !== null && price > 0 && (
        <span className={`flex-none font-mono text-xs ${checked ? 'font-semibold text-am-navy' : 'text-black/65'}`}>
          + {formatPrice(price)}
        </span>
      )}
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${checked ? 'bg-am-navy' : 'bg-black/20'}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}
