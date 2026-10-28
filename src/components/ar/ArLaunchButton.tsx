import { IconAugmentedReality } from '@tabler/icons-react';

interface ArLaunchButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  // Préparation en cours : roue à la place de l'icône
  busy?: boolean;
}

export default function ArLaunchButton({ label, onClick, disabled, busy }: ArLaunchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className="flex w-full items-center justify-center gap-2 border border-am-navy bg-white px-5 py-3 text-sm font-medium text-am-navy transition-colors hover:bg-am-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-am-navy"
      style={{ borderRadius: '2px' }}
    >
      {busy ? (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <IconAugmentedReality aria-hidden="true" className="h-[18px] w-[18px]" stroke={1.6} />
      )}
      {label}
    </button>
  );
}
