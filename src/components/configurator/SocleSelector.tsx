interface SocleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SOCLE_OPTIONS = [
  {
    id: 'none',
    label: 'Sans socle',
    description: 'Posé au sol',
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
    description: 'Bois assorti',
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
      <div className="border-b border-[#E8E6E3] pb-2">
        <h3 className="font-serif text-xs text-[#1A1917]">Socle</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SOCLE_OPTIONS.map((option) => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex flex-col items-center border-2 p-2 transition-all duration-200 ${
                isActive
                  ? 'border-[#1A1917] bg-[#1A1917] text-white'
                  : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className={`mb-1.5 h-6 w-8 ${isActive ? 'text-white' : 'text-[#1A1917]'}`}>
                {option.visual}
              </div>
              <span className="text-[10px] font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
