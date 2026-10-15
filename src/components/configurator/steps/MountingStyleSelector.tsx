export type MountingStyle = 'applique' | 'encastre';

interface MountingStyleSelectorProps {
  value: MountingStyle;
  onChange: (value: MountingStyle) => void;
}

const OPTIONS: { id: MountingStyle; label: string; description: string; visual: React.ReactNode }[] = [
  {
    id: 'applique',
    label: 'En applique',
    description: 'Les façades recouvrent le cadre',
    visual: (
      <svg width="40" height="30" viewBox="0 0 32 24" fill="none">
        <rect x="2" y="4" width="28" height="16" stroke="currentColor" strokeWidth="1.5" />
        <rect x="0" y="2" width="12" height="20" fill="currentColor" opacity="0.3" />
        <rect x="0" y="2" width="12" height="20" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'encastre',
    label: 'Encastré',
    description: 'Les façades affleurent dans le cadre',
    visual: (
      <svg width="40" height="30" viewBox="0 0 32 24" fill="none">
        <rect x="2" y="4" width="28" height="16" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="6" width="10" height="12" fill="currentColor" opacity="0.3" />
        <rect x="4" y="6" width="10" height="12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export default function MountingStyleSelector({ value, onChange }: MountingStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {OPTIONS.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={isActive}
            className={`flex flex-col items-center gap-2 border-2 p-3 transition-all ${
              isActive
                ? 'border-am-navy bg-am-navy text-white'
                : 'border-black/10 bg-white text-black hover:border-am-navy'
            }`}
            style={{ borderRadius: '4px' }}
          >
            <span className="opacity-90">{option.visual}</span>
            <span className="text-center">
              <span className="block text-[13px] font-semibold leading-tight">{option.label}</span>
              <span className={`mt-0.5 block text-[11px] leading-tight ${isActive ? 'text-white/70' : 'text-black/65'}`}>
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
