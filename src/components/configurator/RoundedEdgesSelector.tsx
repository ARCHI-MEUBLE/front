/* ****************************************
 *
 * Rounded front corners selection (full-height solid end caps on the left/right sides),
 * indépendants l'un de l'autre : on peut arrondir un seul côté ou les deux, et régler pour
 * chacun la largeur de l'extension et la profondeur de sa partie arrondie (voir le schéma
 * fourni : la largeur dépasse la planche latérale sur toute la profondeur sauf sur la partie
 * arrondie, où elle revient flush en courbe).
 *
 * ******************************************/

import type { ReactNode } from 'react';

interface RoundedEdgesSelectorProps {
  left: boolean;
  leftWidth: number;
  leftDepth: number;
  onLeftChange: (value: boolean) => void;
  onLeftWidthChange: (value: number) => void;
  onLeftDepthChange: (value: number) => void;
  right: boolean;
  rightWidth: number;
  rightDepth: number;
  onRightChange: (value: boolean) => void;
  onRightWidthChange: (value: number) => void;
  onRightDepthChange: (value: number) => void;
  // Profondeur du meuble (mm), base de calcul des 3 gabarits proposés
  furnitureDepthMm?: number;
}

const VISUAL_LEFT_ROUND = (
  <svg viewBox="0 0 80 50" className="h-full w-full">
    <path
      d="M 22 10 H 70 V 45 H 22 A 12 12 0 0 1 10 33 V 22 A 12 12 0 0 1 22 10 Z"
      fill="currentColor"
      opacity="0.1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const VISUAL_RIGHT_ROUND = (
  <svg viewBox="0 0 80 50" className="h-full w-full">
    <path
      d="M 58 10 H 10 V 45 H 58 A 12 12 0 0 0 70 33 V 22 A 12 12 0 0 0 58 10 Z"
      fill="currentColor"
      opacity="0.1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

function RoundedEdgeToggle({
  label,
  visual,
  active,
  onChange,
}: {
  label: string;
  visual: ReactNode;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      className={`flex flex-col items-center border-2 p-3 transition-all duration-200 ${
        active
          ? 'border-am-navy bg-am-navy text-white'
          : 'border-black/10 bg-white text-black hover:border-am-navy'
      }`}
      style={{ borderRadius: '2px' }}
    >
      <div className={`mb-2 h-8 w-12 ${active ? 'text-white' : 'text-black'}`}>{visual}</div>
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
      <span className={`mt-0.5 text-[11px] leading-tight ${active ? 'text-white/70' : 'text-black/65'}`}>
        {active ? 'Arrondi, pleine hauteur' : 'Coin vif'}
      </span>
    </button>
  );
}

// Trois gabarits prédéfinis, exprimés en fraction de la profondeur du meuble : plus de sliders,
// la largeur de l'extension et la profondeur de l'arrondi sont fixées par le gabarit choisi.
const ROUNDED_EDGE_PRESETS = [
  { id: 'elance', label: 'Arrondi élancé', width: (depthMm: number) => depthMm / 2, depth: (depthMm: number) => depthMm },
  { id: 'integral', label: 'Arrondi intégral', width: (depthMm: number) => depthMm, depth: (depthMm: number) => depthMm },
  { id: 'epaulement', label: 'Arrondi à épaulement', width: (depthMm: number) => depthMm, depth: (depthMm: number) => depthMm / 2 },
];

function RoundedEdgePresets({
  title,
  width,
  depth,
  furnitureDepthMm,
  onWidthChange,
  onDepthChange,
}: {
  title: string;
  width: number;
  depth: number;
  furnitureDepthMm: number;
  onWidthChange: (value: number) => void;
  onDepthChange: (value: number) => void;
}) {
  return (
    <div className="border border-black/10 bg-white p-3" style={{ borderRadius: '4px' }}>
      <div className="mb-2 text-sm font-semibold text-black">{title}</div>

      <div className="grid grid-cols-3 gap-2">
        {ROUNDED_EDGE_PRESETS.map((preset) => {
          const presetWidth = preset.width(furnitureDepthMm);
          const presetDepth = preset.depth(furnitureDepthMm);
          const active = Math.round(width) === Math.round(presetWidth) && Math.round(depth) === Math.round(presetDepth);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onWidthChange(presetWidth);
                onDepthChange(presetDepth);
              }}
              aria-pressed={active}
              className={`flex flex-col items-center justify-center p-2.5 text-center transition-all duration-200 ${
                active
                  ? 'border-2 border-am-navy bg-am-navy text-white'
                  : 'border-2 border-black/10 bg-white text-black hover:border-am-navy'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <span className="text-[12px] font-semibold leading-tight">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RoundedEdgesSelector({
  left,
  leftWidth,
  leftDepth,
  onLeftChange,
  onLeftWidthChange,
  onLeftDepthChange,
  right,
  rightWidth,
  rightDepth,
  onRightChange,
  onRightWidthChange,
  onRightDepthChange,
  furnitureDepthMm,
}: RoundedEdgesSelectorProps) {
  const depthMm = furnitureDepthMm || 500;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <RoundedEdgeToggle label="Bord gauche arrondi" visual={VISUAL_LEFT_ROUND} active={left} onChange={onLeftChange} />
        <RoundedEdgeToggle label="Bord droit arrondi" visual={VISUAL_RIGHT_ROUND} active={right} onChange={onRightChange} />
      </div>

      {left && (
        <RoundedEdgePresets
          title="Bord gauche arrondi"
          width={leftWidth}
          depth={leftDepth}
          furnitureDepthMm={depthMm}
          onWidthChange={onLeftWidthChange}
          onDepthChange={onLeftDepthChange}
        />
      )}

      {right && (
        <RoundedEdgePresets
          title="Bord droit arrondi"
          width={rightWidth}
          depth={rightDepth}
          furnitureDepthMm={depthMm}
          onWidthChange={onRightWidthChange}
          onDepthChange={onRightDepthChange}
        />
      )}
    </div>
  );
}
