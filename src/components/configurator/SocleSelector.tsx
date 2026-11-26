/* ****************************************
 *
 * Socle and foot selection.
 *
 *
 * ******************************************/

import { useEffect, useState } from 'react';
import { PLINTH_HEIGHT_M } from '@/lib/configurator/zoneBounds';

// Accès désactivé pour l'instant (aucune géométrie 3D derrière) : la fonction reste en place,
// prête à être réactivée, mais le panneau ne s'affiche plus tant que c'est à false.
const DEFONCE_PLINTHE_ENABLED = false;

// Largeur (profondeur) de la défonce : jamais plus que 50 mm
const DEFONCE_MAX_WIDTH_MM = 50;
// Hauteur de la défonce : jamais plus que la hauteur réelle du caisson bois (plinthe), sinon elle en sortirait
const DEFONCE_MAX_HEIGHT_MM = PLINTH_HEIGHT_M * 1000;

interface SocleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  // Défonce pour plinthe (mm) : n'a de sens que pour un caisson bois ('wood')
  defonceHeight: number;
  defonceWidth: number;
  onDefonceHeightChange: (value: number) => void;
  onDefonceWidthChange: (value: number) => void;
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

// Champ mm éditable à la main : on garde la saisie en cours en local, on ne la valide (et clampe à
// un entier entre 0 et `max`) qu'à la sortie du champ, pour ne pas gêner la frappe (effacer, retaper...).
function MmField({ label, value, onChange, max }: { label: string; value: number; onChange: (value: number) => void; max: number }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(0, parsed));
      onChange(clamped);
      setText(String(clamped));
    } else {
      setText(String(value));
    }
  };

  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-black">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-16 border-2 border-black/10 bg-white px-1.5 py-1 text-right font-mono text-[12px] text-black outline-none transition-colors hover:border-am-navy focus:border-am-navy"
          style={{ borderRadius: '2px' }}
        />
        <span className="text-[10px] text-black/65">mm</span>
      </span>
    </label>
  );
}

export default function SocleSelector({ value, onChange, defonceHeight, defonceWidth, onDefonceHeightChange, onDefonceWidthChange }: SocleSelectorProps) {
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

      {DEFONCE_PLINTHE_ENABLED && value === 'wood' && (
        <div className="border border-black/10 bg-white p-3" style={{ borderRadius: '2px' }}>
          <p className="mb-2 text-[13px] font-semibold text-black">Défonce pour plinthe</p>
          <div className="space-y-2">
            <MmField label="Hauteur" value={defonceHeight} onChange={onDefonceHeightChange} max={DEFONCE_MAX_HEIGHT_MM} />
            <MmField label="Largeur" value={defonceWidth} onChange={onDefonceWidthChange} max={DEFONCE_MAX_WIDTH_MM} />
          </div>
        </div>
      )}
    </div>
  );
}
