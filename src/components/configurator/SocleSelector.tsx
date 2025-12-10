interface SocleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SOCLE_OPTIONS = [
  {
    id: 'none',
    label: 'Sans socle',
    description: 'Meuble posé directement au sol',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="10" width="60" height="35" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
        <line x1="10" y1="45" x2="70" y2="45" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'wood',
    label: 'Caisson bois',
    description: 'Socle surélevé en bois assorti',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="5" width="60" height="30" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
        <rect x="10" y="35" width="60" height="10" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
        <line x1="10" y1="45" x2="70" y2="45" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'metal',
    label: 'Pieds métal',
    description: 'Pieds en métal noir ou acier',
    visual: (
      <svg viewBox="0 0 80 50" className="h-full w-full">
        <rect x="10" y="5" width="60" height="30" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
        <rect x="15" y="35" width="3" height="12" fill="currentColor" />
        <rect x="62" y="35" width="3" height="12" fill="currentColor" />
        <line x1="10" y1="47" x2="70" y2="47" stroke="currentColor" strokeWidth="1" strokeDasharray="2" opacity="0.3" />
      </svg>
    ),
  },
];

export default function SocleSelector({ value, onChange }: SocleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E8E6E3] pb-4">
        <div>
          <h3 className="font-serif text-lg text-[#1A1917]">Socle</h3>
          <p className="mt-1 text-xs text-[#706F6C]">Choisissez le type de base</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SOCLE_OPTIONS.map((option) => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex flex-col items-center border p-4 transition-all duration-200 ${
                isActive
                  ? 'border-[#1A1917] bg-[#1A1917] text-white'
                  : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className={`mb-3 h-12 w-16 ${isActive ? 'text-white' : 'text-[#1A1917]'}`}>
                {option.visual}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
              <span className={`mt-1 text-center text-xs ${isActive ? 'text-white/70' : 'text-[#706F6C]'}`}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
