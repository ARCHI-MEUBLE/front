/* ****************************************
 * 
 * A panel for the door selection.
 *
 * 
 * ******************************************/

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
        <div className="border-b border-black/10 pb-2">
          <h3 className="text-base text-black">Configuration des Portes</h3>
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
                    ? 'border-am-navy bg-am-navy text-white'
                    : 'border-black/10 bg-white text-black hover:border-am-navy'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <div className={`mb-2 h-6 w-6 ${isActive ? 'text-white' : 'text-black/65'}`}>
                  <Icon className="h-full w-full" />
                </div>
                <span className="eyebrow text-center font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {type === 'single' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="border-b border-black/10 pb-1">
            <h4 className="eyebrow text-black/65">Sens d&apos;ouverture</h4>
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
                      ? 'border-am-navy bg-am-navy text-white'
                      : 'border-black/10 bg-white text-black hover:border-am-navy'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-black/65'}`} />
                  <span className="eyebrow font-medium">{option.label}</span>
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
                ? 'border-am-navy bg-am-navy text-white'
                : 'border-black/10 bg-white text-black hover:border-am-navy'
            }`}
            style={{ borderRadius: '2px' }}
          >
            <DoorOpen className={`h-4 w-4 ${doorsOpen ? 'text-white' : 'text-black/65'}`} />
            <span className="eyebrow">
              {doorsOpen ? 'Fermer les façades' : 'Ouvrir les façades'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
