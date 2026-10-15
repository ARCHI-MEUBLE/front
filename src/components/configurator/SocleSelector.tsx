/* ****************************************
 * 
 * Socle and foot selection.
 *
 * 
 * ******************************************/

interface SocleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SOCLE_OPTIONS = [
  {
    id: 'none',
    label: 'Posé au sol',
    description: 'Sans pieds',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="10" width="60" height="35" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="10" y1="45" x2="70" y2="45" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'wood',
    label: 'Caisson bois',
    description: 'Plinthe assortie',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="5" width="60" height="30" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="35" width="60" height="10" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="10" y1="45" x2="70" y2="45" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'metal',
    label: 'Pieds métal',
    description: 'Métal noir',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="5" width="60" height="30" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="15" y="35" width="4" height="12" fill="currentColor" />
        <rect x="61" y="35" width="4" height="12" fill="currentColor" />
        <line x1="10" y1="47" x2="70" y2="47" stroke="currentColor" strokeWidth="1" strokeDasharray="2" opacity="0.3" />
      </svg>
    ),
  },
];

export default function SocleSelector({ value, onChange }: SocleSelectorProps) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {SOCLE_OPTIONS.map((option) => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={isActive}
              className={`flex flex-col items-center border-2 p-3 transition-all duration-200 ${
                isActive
                  ? 'border-am-navy bg-am-navy text-white'
                  : 'border-black/10 bg-white text-black hover:border-am-navy'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className={`mb-2 h-8 w-12 ${isActive ? 'text-white' : 'text-black'}`}>
                {option.visual}
              </div>
              <span className="text-[13px] font-semibold leading-tight">{option.label}</span>
              <span className={`mt-0.5 text-[11px] leading-tight ${isActive ? 'text-white/70' : 'text-black/65'}`}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
