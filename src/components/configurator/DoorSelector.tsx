import { XCircle, DoorOpen, LayoutGrid, ArrowLeft, ArrowRight } from 'lucide-react';

interface DoorSelectorProps {
  type: 'none' | 'single' | 'double';
  side: 'left' | 'right';
  doorsOpen?: boolean;
  onTypeChange: (type: 'none' | 'single' | 'double') => void;
  onSideChange: (side: 'left' | 'right') => void;
  onToggleDoors?: () => void;
}

const DOOR_TYPE_OPTIONS = [
  { id: 'none', label: 'Sans portes', icon: XCircle },
  { id: 'single', label: 'Porte unique', icon: DoorOpen },
  { id: 'double', label: 'Double porte', icon: LayoutGrid },
];

const DOOR_SIDE_OPTIONS = [
  { id: 'left', label: 'Ouverture gauche', icon: ArrowLeft },
  { id: 'right', label: 'Ouverture droite', icon: ArrowRight },
];

export default function DoorSelector({ type, side, doorsOpen, onTypeChange, onSideChange, onToggleDoors }: DoorSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="border-b border-[#E8E6E3] pb-2">
          <h3 className="font-serif text-base text-[#1A1917]">Configuration des Portes</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DOOR_TYPE_OPTIONS.map((option) => {
            const isActive = type === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onTypeChange(option.id as any)}
                className={`flex flex-col items-center border-2 p-3 transition-all duration-200 ${
                  isActive
                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                    : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <div className={`mb-2 h-6 w-6 ${isActive ? 'text-white' : 'text-[#706F6C]'}`}>
                  <Icon className="h-full w-full" />
                </div>
                <span className="text-[11px] font-medium text-center uppercase tracking-tight">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {type === 'single' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="border-b border-[#E8E6E3] pb-1">
            <h4 className="text-[11px] font-semibold text-[#706F6C] uppercase tracking-wider">Sens d'ouverture</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DOOR_SIDE_OPTIONS.map((option) => {
              const isActive = side === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSideChange(option.id as any)}
                  className={`flex items-center justify-center gap-2 border-2 p-2 transition-all duration-200 ${
                    isActive
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#706F6C]'}`} />
                  <span className="text-[11px] font-medium uppercase tracking-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {type !== 'none' && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onToggleDoors}
            className={`w-full flex items-center justify-center gap-2 border-2 p-2.5 transition-all duration-200 ${
              doorsOpen
                ? 'border-[#1A1917] bg-[#1A1917] text-white'
                : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
            }`}
            style={{ borderRadius: '2px' }}
          >
            <DoorOpen className={`h-4 w-4 ${doorsOpen ? 'text-white' : 'text-[#706F6C]'}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {doorsOpen ? 'Fermer les façades' : 'Ouvrir les façades'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
