import { useState, useRef, useCallback, useEffect } from 'react';
import { Rows3, Columns3, Archive, Shirt, Minus, Trash2, Lightbulb, Plug, DoorClosed, Square, Hand, BoxSelect, GripVertical, GripHorizontal, Circle, RectangleHorizontal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, SquareDashed } from 'lucide-react';
import { Zone, ZoneContent, HandleType } from './types';
import { getChildRatios, getZoneFacade, isPushContent } from '@/lib/configurator/zoneStats';
import { facadeAvailability, hangingRailAvailability, partSize, splitAvailability } from '@/lib/configurator/constraints';
import { getDivisionCount, isShelfGrid, shelfColumnWidths, type DivisionDirection } from '@/lib/configurator/zoneDivision';

// Familles de réglages d'une zone : chaque étape du configurateur en affiche une partie
export type ZoneControlSection = 'division' | 'facades' | 'storage' | 'handles' | 'accessories';

export const ALL_ZONE_SECTIONS: ZoneControlSection[] = ['facades', 'storage', 'handles', 'accessories', 'division'];



interface ZoneControlsProps {
  selectedZone: Zone;
  selectedZoneIds: string[];
  parentZone: Zone | null;
  onSplitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count: number) => void;
  onSetDivisionCount?: (zoneId: string, direction: DivisionDirection, count: number) => void;
  onSetContent: (zoneId: string, content: ZoneContent) => void;
  onSetDoorContent?: (zoneId: string, content: ZoneContent) => void;
  onResetZone: (zoneId: string) => void;
  // Supprime la section : absent pour le meuble entier
  onDeleteSection?: (zoneId: string) => void;
  onSetSplitRatio: (zoneId: string, ratio: number) => void;
  onSetSplitRatios?: (zoneId: string, ratios: number[]) => void;
  onSelectParent?: () => void;
  onToggleLight?: (zoneId: string) => void;
  onToggleCableHole?: (zoneId: string) => void;
  onToggleDressing?: (zoneId: string) => void;
  onGroupZones?: (zoneIds: string[], forceContent?: ZoneContent) => void;
  onSetHandleType?: (zoneId: string, handleType: HandleType) => void;
  onSetGlassShelfCount?: (zoneId: string, count: number) => void;
  onSetGlassShelfPositions?: (zoneId: string, positions: number[]) => void;
  zoneHeightMm?: number; // Hauteur de la zone en mm
  zoneWidthMm?: number; // Largeur de la zone en mm
  depthMm?: number; // Profondeur du meuble en mm
  selectionWidthMm?: number; // Largeur totale de plusieurs compartiments sélectionnés
  isAdminCreateModel?: boolean;
  sections?: ZoneControlSection[]; // Sections à afficher (toutes par défaut)
}

// Composant pour l'éditeur visuel de position des étagères
function ShelfPositionEditor({
  shelfCount,
  positions,
  zoneHeightMm,
  onChange,
  onReset,
}: {
  shelfCount: number;
  positions: number[];
  zoneHeightMm: number;
  onChange: (index: number, position: number) => void;
  onReset: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Convertir % en mm
  const percentToMm = (percent: number) => Math.round((percent / 100) * zoneHeightMm);
  // Convertir mm en %
  const mmToPercent = (mm: number) => Math.round((mm / zoneHeightMm) * 100);

  // Pas d'ajustement en mm (environ 10mm)
  const stepMm = 10;
  const stepPercent = mmToPercent(stepMm);

  // Calculer la position depuis un événement souris/touch
  const getPositionFromEvent = useCallback((clientY: number): number => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const percent = 100 - (relativeY / rect.height) * 100;
    return Math.max(5, Math.min(95, percent));
  }, []);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newPos = getPositionFromEvent(moveEvent.clientY);
      onChange(index, Math.round(newPos));
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="mt-4 border border-black/10 bg-am-mist/15 p-3" style={{ borderRadius: '4px' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-black">Position des étagères</span>
          <span className="ml-2 text-[10px] text-black/65">(hauteur zone: {zoneHeightMm} mm)</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-black/65 hover:text-black transition-colors"
          title="Répartition uniforme"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Réinitialiser</span>
        </button>
      </div>

      <div className="flex gap-4">
        {/* Aperçu visuel */}
        <div
          ref={containerRef}
          className="relative w-16 h-32 border-2 border-am-navy bg-white cursor-crosshair"
          style={{ borderRadius: '2px' }}
        >
          {/* Étagères */}
          {positions.map((pos, index) => (
            <div
              key={index}
              className="absolute left-0 right-0 h-1 cursor-ns-resize bg-am-navy"
              style={{ bottom: `${pos}%`, transform: 'translateY(50%)' }}
              onMouseDown={handleMouseDown(index)}
              title={`Étagère ${index + 1}: ${percentToMm(pos)} mm`}
            >
              {/* Poignée de glissement */}
              <div className={`absolute -left-1 -right-1 -top-1 -bottom-1 ${
                draggingIndex === index ? 'bg-am-mist/60' : ''
              }`} />
            </div>
          ))}

          {/* Labels haut/bas avec hauteur */}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-black/65">{zoneHeightMm} mm</span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-black/65">0 mm</span>
        </div>

        {/* Contrôles par étagère */}
        <div className="flex-1 space-y-2">
          {positions.map((pos, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-black/65 w-6">É{index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(index, Math.min(95, pos + stepPercent))}
                className="p-1 border border-black/10 bg-white hover:border-am-navy transition-colors"
                style={{ borderRadius: '2px' }}
                title={`+${stepMm} mm`}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <span className="text-xs font-mono w-12 text-center font-medium">{percentToMm(pos)} mm</span>
              <button
                type="button"
                onClick={() => onChange(index, Math.max(5, pos - stepPercent))}
                className="p-1 border border-black/10 bg-white hover:border-am-navy transition-colors"
                style={{ borderRadius: '2px' }}
                title={`-${stepMm} mm`}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-black/65">
        Glissez les lignes ou utilisez ↑↓ (±{stepMm} mm)
      </p>
    </div>
  );
}

// Composant simplifié pour afficher les dimensions de la zone sélectionnée
// Exporté pour utilisation dans ZoneEditor/index.tsx
export function SelectedZoneDimensions({
  widthMm,
  heightMm,
  canAdjustWidth,
  canAdjustHeight,
  onSetWidth,
  onSetHeight,
  label,
}: {
  widthMm: number;
  heightMm: number;
  canAdjustWidth: boolean;
  canAdjustHeight: boolean;
  onSetWidth?: (newValue: number) => void;
  onSetHeight?: (newValue: number) => void;
  label?: string;
}) {
  const stepMm = 10;
  const [widthInput, setWidthInput] = useState(widthMm.toString());
  const [heightInput, setHeightInput] = useState(heightMm.toString());

  // Sync inputs when props change
  useEffect(() => {
    setWidthInput(widthMm.toString());
  }, [widthMm]);

  useEffect(() => {
    setHeightInput(heightMm.toString());
  }, [heightMm]);

  const applyWidth = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 50 && onSetWidth) {
      onSetWidth(num);
    } else {
      setWidthInput(widthMm.toString());
    }
  };

  const applyHeight = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 50 && onSetHeight) {
      onSetHeight(num);
    } else {
      setHeightInput(heightMm.toString());
    }
  };

  const incrementWidth = () => {
    const currentValue = parseInt(widthInput, 10) || widthMm;
    const newValue = currentValue + stepMm;
    setWidthInput(newValue.toString());
    if (onSetWidth) onSetWidth(newValue);
  };

  const decrementWidth = () => {
    const currentValue = parseInt(widthInput, 10) || widthMm;
    const newValue = Math.max(50, currentValue - stepMm);
    setWidthInput(newValue.toString());
    if (onSetWidth) onSetWidth(newValue);
  };

  const incrementHeight = () => {
    const currentValue = parseInt(heightInput, 10) || heightMm;
    const newValue = currentValue + stepMm;
    setHeightInput(newValue.toString());
    if (onSetHeight) onSetHeight(newValue);
  };

  const decrementHeight = () => {
    const currentValue = parseInt(heightInput, 10) || heightMm;
    const newValue = Math.max(50, currentValue - stepMm);
    setHeightInput(newValue.toString());
    if (onSetHeight) onSetHeight(newValue);
  };

  return (
    <div className="flex items-center gap-4 border border-black/10 bg-white px-4 py-3" style={{ borderRadius: '4px' }}>
      {/* Label optionnel pour groupe */}
      {label && (
        <>
          <span className="text-sm font-medium text-am-navy">{label}</span>
          <div className="h-6 w-px bg-black/10" />
        </>
      )}
      {/* Largeur */}
      <div className="flex items-center gap-2">
        <Columns3 className="h-4 w-4 text-black/65" />
        <span className="text-sm text-black/65">Largeur:</span>
        {canAdjustWidth && onSetWidth ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decrementWidth}
              className="flex h-8 w-8 items-center justify-center border border-black/10 bg-white text-black transition-all hover:border-am-navy"
              style={{ borderRadius: '2px' }}
            >
              <Minus className="h-3 w-3" />
            </button>
            <div className="relative">
              <input
                type="number"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={(e) => applyWidth(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyWidth(widthInput)}
                className="w-20 text-center font-mono text-sm font-medium border border-black/10 focus:border-am-navy outline-none py-1.5 pr-7"
                style={{ borderRadius: '2px' }}
                min={50}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-black/65">mm</span>
            </div>
            <button
              type="button"
              onClick={incrementWidth}
              className="flex h-8 w-8 items-center justify-center border border-black/10 bg-white text-black transition-all hover:border-am-navy"
              style={{ borderRadius: '2px' }}
            >
              <span className="text-sm font-semibold">+</span>
            </button>
          </div>
        ) : (
          <span className="font-mono text-sm font-medium text-black">{widthMm} mm</span>
        )}
      </div>

      <div className="h-6 w-px bg-black/10" />

      {/* Hauteur */}
      <div className="flex items-center gap-2">
        <Rows3 className="h-4 w-4 text-black/65" />
        <span className="text-sm text-black/65">Hauteur:</span>
        {canAdjustHeight && onSetHeight ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decrementHeight}
              className="flex h-8 w-8 items-center justify-center border border-black/10 bg-white text-black transition-all hover:border-am-navy"
              style={{ borderRadius: '2px' }}
            >
              <Minus className="h-3 w-3" />
            </button>
            <div className="relative">
              <input
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onBlur={(e) => applyHeight(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyHeight(heightInput)}
                className="w-20 text-center font-mono text-sm font-medium border border-black/10 focus:border-am-navy outline-none py-1.5 pr-7"
                style={{ borderRadius: '2px' }}
                min={50}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-black/65">mm</span>
            </div>
            <button
              type="button"
              onClick={incrementHeight}
              className="flex h-8 w-8 items-center justify-center border border-black/10 bg-white text-black transition-all hover:border-am-navy"
              style={{ borderRadius: '2px' }}
            >
              <span className="text-sm font-semibold">+</span>
            </button>
          </div>
        ) : (
          <span className="font-mono text-sm font-medium text-black">{heightMm} mm</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Petits blocs d'interface partagés par toutes les sections
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <p className="eyebrow-lg text-black/65">{children}</p>
      {hint && <p className="mt-1 text-xs text-black/65">{hint}</p>}
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border border-dashed border-black/20 bg-white px-3 py-3 text-xs leading-relaxed text-black/65"
      style={{ borderRadius: '2px' }}
    >
      {children}
    </div>
  );
}

function OptionTile({
  icon: Icon,
  label,
  desc,
  active,
  disabledReason,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  active: boolean;
  // Limite physique non respectée : l'option est grisée et affiche la raison
  disabledReason?: string;
  onClick: () => void;
}) {
  const disabled = !!disabledReason && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabledReason}
      className={`flex flex-col items-center justify-center gap-1.5 border-2 p-3 transition-all ${
        active
          ? 'border-am-navy bg-am-navy text-white'
          : disabled
            ? 'cursor-not-allowed border-black/10 bg-am-mist/15 text-black/30'
            : 'border-black/10 bg-white text-black hover:border-am-navy'
      }`}
      style={{ borderRadius: '4px' }}
    >
      <Icon className="h-5 w-5" />
      <div className="text-center">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        <span
          className={`mt-0.5 block text-[11px] leading-tight ${
            disabledReason ? (active ? 'text-am-mist' : 'text-am-wine') : active ? 'text-white/70' : 'text-black/65'
          }`}
        >
          {disabledReason ?? desc}
        </span>
      </div>
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  iconActiveClass,
  label,
  desc,
  active,
  disabledReason,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconActiveClass: string;
  label: string;
  desc: string;
  active: boolean;
  disabledReason?: string;
  onClick: () => void;
}) {
  const disabled = !!disabledReason && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabledReason}
      className={`flex items-center justify-between gap-3 border-2 p-3 transition-all ${
        active
          ? 'border-am-navy bg-am-navy/5 text-black'
          : disabled
            ? 'cursor-not-allowed border-black/10 bg-am-mist/15 text-black/30'
            : 'border-black/10 bg-white text-black hover:border-am-navy'
      }`}
      style={{ borderRadius: '4px' }}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${active ? iconActiveClass : ''}`} />
        <div className="text-left">
          <span className="block text-sm font-semibold">{label}</span>
          <span className={`block text-xs ${disabledReason ? 'text-am-wine' : 'text-black/65'}`}>{disabledReason ?? desc}</span>
        </div>
      </div>
      <div className={`relative h-6 w-10 flex-shrink-0 rounded-full border-2 transition-all ${active ? 'border-am-navy bg-am-navy' : 'border-black/10 bg-am-mist/15'}`}>
        <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${active ? 'right-1 bg-white' : 'left-1 bg-black/35'}`} />
      </div>
    </button>
  );
}

// Compteur − / + avec curseur (comme Pickawood) : le maximum vient de la taille minimale d'une case
export function DivisionStepper({
  icon: Icon,
  label,
  value,
  max,
  sizeLabel,
  reason,
  blockedReason,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  // null : les sous-zones n'ont pas toutes le même nombre
  value: number | null;
  max: number;
  // Taille de chaque partie pour la valeur actuelle (ex. « 38 cm »)
  sizeLabel?: string;
  // Pourquoi on ne peut pas aller au-delà de `max`
  reason: string;
  // Réglage impossible pour cette zone (désactive tout le compteur)
  blockedReason?: string;
  onChange: (count: number) => void;
}) {
  const current = value ?? 1;
  const blocked = !!blockedReason;
  const atMax = current >= max;
  const stepButton =
    'flex h-9 w-9 flex-shrink-0 items-center justify-center border-2 border-black/10 bg-white text-lg font-semibold text-black transition-all hover:border-am-navy disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/10';

  return (
    <div className="border border-black/10 bg-white p-4" style={{ borderRadius: '4px' }}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 text-black" />
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-black">{label}</span>
          {sizeLabel && current > 1 && <span className="block text-xs text-black/65">{sizeLabel}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(current - 1)}
          disabled={blocked || current <= 1}
          className={stepButton}
          style={{ borderRadius: '4px' }}
          aria-label={`Retirer : ${label}`}
        >
          −
        </button>
        <span className="w-10 text-center font-mono text-base font-medium text-black" aria-live="polite">
          {value ?? '–'}
        </span>
        <button
          type="button"
          onClick={() => onChange(current + 1)}
          disabled={blocked || atMax}
          title={blocked ? blockedReason : atMax ? reason : undefined}
          className={stepButton}
          style={{ borderRadius: '4px' }}
          aria-label={`Ajouter : ${label}`}
        >
          +
        </button>
      </div>
      {max > 1 && !blocked && (
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={Math.min(current, max)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-3 w-full accent-am-navy"
          aria-label={label}
        />
      )}
      {blocked ? (
        <p className="mt-2 text-[11px] text-black/65">{blockedReason}</p>
      ) : (
        atMax && reason && <p className="mt-2 text-[11px] text-am-wine">{reason}</p>
      )}
    </div>
  );
}

const STORAGE_OPTIONS = [
  { id: 'drawer' as ZoneContent, icon: Archive, label: 'Tiroir', desc: 'Avec poignée' },
  { id: 'push_drawer' as ZoneContent, icon: BoxSelect, label: 'Tiroir Push', desc: 'Sans poignée' },
  { id: 'niche' as ZoneContent, icon: SquareDashed, label: 'Niche', desc: 'Intérieur coloré' },
];

const DOOR_OPTIONS = [
  { id: 'door' as ZoneContent, icon: DoorClosed, label: 'Porte gauche', desc: 'Une seule porte' },
  { id: 'door_right' as ZoneContent, icon: DoorClosed, label: 'Porte droite', desc: 'Une seule porte' },
  { id: 'door_double' as ZoneContent, icon: DoorClosed, label: 'Double porte', desc: 'Deux portes' },
  { id: 'push_door' as ZoneContent, icon: Hand, label: 'Porte Push', desc: 'Sans poignée', needsSideChoice: true, dialogType: 'push' as const },
];

const HANDLE_OPTIONS = [
  { type: 'vertical_bar' as HandleType, icon: GripVertical, label: 'Barre V' },
  { type: 'horizontal_bar' as HandleType, icon: GripHorizontal, label: 'Barre H' },
  { type: 'knob' as HandleType, icon: Circle, label: 'Bouton' },
  { type: 'recessed' as HandleType, icon: RectangleHorizontal, label: 'Encastrée' },
];

export default function ZoneControls({
  selectedZone,
  selectedZoneIds,
  parentZone,
  onSetDivisionCount,
  onSetContent,
  onSetDoorContent,
  onResetZone,
  onDeleteSection,
  onSelectParent,
  onToggleLight,
  onToggleCableHole,
  onToggleDressing,
  onGroupZones,
  onSetHandleType,
  onSetGlassShelfCount,
  onSetGlassShelfPositions,
  zoneHeightMm,
  zoneWidthMm,
  depthMm,
  selectionWidthMm,
  sections,
}: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';
  const isRoot = selectedZone.id === 'root';
  const visibleSections = sections ?? ALL_ZONE_SECTIONS;
  const show = (section: ZoneControlSection) => visibleSections.includes(section);
  const isMultiSelection = selectedZoneIds.length > 1;

  // Choix du côté d'ouverture pour les portes Push
  const [doorSideDialog, setDoorSideDialog] = useState<{
    isOpen: boolean;
    doorType: 'push' | null;
  }>({ isOpen: false, doorType: null });

  const facade = getZoneFacade(selectedZone);

  // Limites physiques : une taille inconnue n'impose aucune restriction
  const zoneWidth = zoneWidthMm ?? 0;
  const zoneHeight = zoneHeightMm ?? 0;
  const depth = depthMm ?? Infinity;
  const knownSize = zoneWidth > 0 && zoneHeight > 0;
  const facadeReason = (content: ZoneContent, width = zoneWidth) =>
    width > 0 ? facadeAvailability(content, width, depth).reason : undefined;
  // Colonnes : chaque rangée garde la largeur de la zone. Étagères : elles se posent dans chaque colonne,
  // c'est donc la colonne la plus contraignante qui fixe le maximum. Impossible quand des groupes sont
  // imbriqués dans l'autre sens : il faut alors choisir la colonne à régler.
  const columnsSplit = knownSize ? splitAvailability('vertical', zoneWidth, zoneHeight) : { maxParts: 1, reason: '' };
  const shelvesGrid = isShelfGrid(selectedZone);
  const shelvesSplit = (() => {
    if (!knownSize || !shelvesGrid) return { maxParts: 1, reason: '' };
    return shelfColumnWidths(selectedZone, zoneWidth)
      .map((width) => splitAvailability('horizontal', width, zoneHeight))
      .reduce((tightest, option) => (option.maxParts < tightest.maxParts ? option : tightest));
  })();
  const columnCount = getDivisionCount(selectedZone, 'vertical');
  const shelfCount = getDivisionCount(selectedZone, 'horizontal');
  const cmLabel = (mm: number) => `${Math.round(mm / 10)} cm`;
  const railReason = knownSize ? hangingRailAvailability(zoneWidth, zoneHeight, depth).reason : undefined;
  const currentFacade = isLeaf ? (selectedZone.content ?? 'empty') : (selectedZone.doorContent ?? 'empty');
  const glassShelfCount = selectedZone.glassShelfCount || 1;

  const applyFacade = (content: ZoneContent) => {
    // Plusieurs compartiments : la porte se pose sur l'ensemble, qui est regroupé pour l'occasion
    if (isMultiSelection) {
      onGroupZones?.(selectedZoneIds, content);
    } else if (isLeaf) {
      onSetContent(selectedZone.id, content);
    } else {
      onSetDoorContent?.(selectedZone.id, content);
    }
  };

  const handleDoorOptionClick = (option: (typeof DOOR_OPTIONS)[number]) => {
    if ('needsSideChoice' in option && option.needsSideChoice) {
      setDoorSideDialog({ isOpen: true, doorType: option.dialogType });
    } else {
      setDoorSideDialog({ isOpen: false, doorType: null });
      applyFacade(option.id);
    }
  };

  const handleDoorSideChoice = (side: 'left' | 'right') => {
    applyFacade(side === 'left' ? 'push_door' : 'push_door_right');
    setDoorSideDialog({ isOpen: false, doorType: null });
  };

  // Mêmes portes pour un compartiment seul, un groupe ou plusieurs compartiments sélectionnés ;
  // seule la largeur couverte change les limites de fabrication
  const doorOptionTiles = (width: number) =>
    DOOR_OPTIONS.map((option) => {
      const { id, icon, label, desc } = option;
      const hasSideChoice = 'needsSideChoice' in option && option.needsSideChoice;
      const isActive =
        !isMultiSelection && (hasSideChoice ? currentFacade === id || currentFacade === `${id}_right` : currentFacade === id);
      return (
        <OptionTile
          key={id}
          icon={icon}
          label={label}
          desc={desc}
          active={isActive}
          disabledReason={facadeReason(id, width)}
          onClick={() => handleDoorOptionClick(option)}
        />
      );
    });

  const renderDoorSideDialog = () =>
    doorSideDialog.isOpen && (
      <div className="mt-3 border border-black/10 bg-white p-4" style={{ borderRadius: '2px' }}>
        <p className="mb-1 text-sm font-medium text-black">Côté d&apos;ouverture</p>
        <p className="mb-3 text-xs text-black/65">Choisissez le côté d&apos;ouverture de la porte Push</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDoorSideChoice('left')}
            className="flex flex-col items-center justify-center gap-1 border border-black/10 bg-white px-2 py-3 text-black transition-all hover:border-am-navy hover:bg-am-mist/30"
            style={{ borderRadius: '2px' }}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-xs font-medium">Gauche</span>
          </button>
          <button
            type="button"
            onClick={() => handleDoorSideChoice('right')}
            className="flex flex-col items-center justify-center gap-1 border border-black/10 bg-white px-2 py-3 text-black transition-all hover:border-am-navy hover:bg-am-mist/30"
            style={{ borderRadius: '2px' }}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="text-xs font-medium">Droite</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDoorSideDialog({ isOpen: false, doorType: null })}
          className="mt-3 w-full text-center text-xs text-black/65 hover:text-black"
        >
          Annuler
        </button>
      </div>
    );

  const defaultShelfPositions = (count: number) =>
    Array.from({ length: count }, (_, i) => Math.round(((i + 1) / (count + 1)) * 100));

  const renderBreadcrumbs = () => {
    if (!onSelectParent || !parentZone) {
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-black">
          <span className="bg-am-navy px-2 py-0.5 text-white" style={{ borderRadius: '2px' }}>
            Meuble entier
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-xs font-medium text-black/65">
        <button
          type="button"
          onClick={() => onSelectParent()}
          className="flex items-center gap-1 transition-colors hover:text-black"
        >
          <BoxSelect className="h-3 w-3" />
          <span className="underline decoration-dotted underline-offset-2">Groupe parent</span>
        </button>
        <span className="text-white/85">/</span>
        <span className="font-semibold text-black">Zone actuelle</span>
      </div>
    );
  };

  // ── Plusieurs compartiments sélectionnés : on ne propose que de poser une porte commune ──
  if (isMultiSelection) {
    if (!show('facades')) {
      return (
        <InfoNote>
          {selectedZoneIds.length} compartiments sélectionnés. Sélectionnez-en un seul pour modifier cette étape.
        </InfoNote>
      );
    }

    return (
      <div className="space-y-4">
        {renderBreadcrumbs()}
        <div className="border border-black/10 bg-white p-4" style={{ borderRadius: '2px' }}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-black/10 bg-am-mist/15" style={{ borderRadius: '2px' }}>
              <DoorClosed className="h-5 w-5 text-black" />
            </div>
            <div>
              <span className="block text-base font-semibold text-black">{selectedZoneIds.length} compartiments sélectionnés</span>
              <p className="text-xs text-black/65">Poser une porte sur cet ensemble</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{doorOptionTiles(selectionWidthMm ?? 0)}</div>
          {renderDoorSideDialog()}

          <p className="mt-3 text-center text-[11px] text-black/65">
            La porte recouvrira l&apos;intégralité de la zone sélectionnée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderBreadcrumbs()}

      {/* ── Portes & façades ─────────────────────────────── */}
      {show('facades') && (
        <div>
          <SectionLabel
            hint={
              isLeaf
                ? undefined
                : isRoot
                  ? 'Une seule façade couvrira tout le meuble.'
                  : 'Les portes recouvriront tout ce groupe de compartiments.'
            }
          >
            {isLeaf ? 'Portes & façades' : isRoot ? 'Portes sur tout le meuble' : 'Portes sur ce groupe'}
          </SectionLabel>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <OptionTile
              icon={Minus}
              label="Aucune"
              desc={isLeaf ? 'Compartiment ouvert' : 'Pas de porte'}
              active={currentFacade === 'empty'}
              onClick={() => {
                setDoorSideDialog({ isOpen: false, doorType: null });
                applyFacade('empty');
              }}
            />
            {doorOptionTiles(zoneWidth)}
          </div>

          {renderDoorSideDialog()}
        </div>
      )}

      {/* ── Tiroirs & rangements (compartiments uniquement) ─── */}
      {show('storage') && (
        isLeaf ? (
          <div>
            <SectionLabel hint="Un tiroir ou une niche remplace la porte de ce compartiment.">
              Tiroirs, niches & rangements
            </SectionLabel>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {STORAGE_OPTIONS.map(({ id, icon, label, desc }) => (
                <OptionTile
                  key={id}
                  icon={icon}
                  label={label}
                  desc={desc}
                  active={(selectedZone.content ?? 'empty') === id}
                  disabledReason={facadeReason(id)}
                  onClick={() => {
                    setDoorSideDialog({ isOpen: false, doorType: null });
                    onSetContent(selectedZone.id, id);
                  }}
                />
              ))}
            </div>

            {selectedZone.content === 'niche' && (
              <div className="mt-3">
                <InfoNote>
                  Donnez-lui sa couleur à l&apos;étape Matières & couleurs : cliquez sur la niche, puis choisissez une teinte.
                </InfoNote>
              </div>
            )}

            {selectedZone.content === 'glass_shelf' && onSetGlassShelfCount && (
              <div className="mt-3 flex items-center justify-between border border-black/10 bg-white p-3" style={{ borderRadius: '4px' }}>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-black/65" />
                  <span className="text-sm font-medium text-black">Nombre d&apos;étagères</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetGlassShelfCount(selectedZone.id, Math.max(1, glassShelfCount - 1))}
                    disabled={glassShelfCount <= 1}
                    className="flex h-8 w-8 items-center justify-center border-2 border-black/10 bg-white text-lg font-semibold transition-all hover:border-am-navy disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ borderRadius: '4px' }}
                    aria-label="Retirer une étagère"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-base font-medium text-black">{glassShelfCount}</span>
                  <button
                    type="button"
                    onClick={() => onSetGlassShelfCount(selectedZone.id, Math.min(5, glassShelfCount + 1))}
                    disabled={glassShelfCount >= 5}
                    className="flex h-8 w-8 items-center justify-center border-2 border-black/10 bg-white text-lg font-semibold transition-all hover:border-am-navy disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ borderRadius: '4px' }}
                    aria-label="Ajouter une étagère"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {selectedZone.content === 'glass_shelf' && onSetGlassShelfPositions && zoneHeightMm && glassShelfCount >= 2 && (
              <ShelfPositionEditor
                shelfCount={glassShelfCount}
                positions={
                  selectedZone.glassShelfPositions?.length === glassShelfCount
                    ? selectedZone.glassShelfPositions
                    : defaultShelfPositions(glassShelfCount)
                }
                zoneHeightMm={zoneHeightMm}
                onChange={(index, position) => {
                  const positions = selectedZone.glassShelfPositions?.length === glassShelfCount
                    ? [...selectedZone.glassShelfPositions]
                    : defaultShelfPositions(glassShelfCount);
                  positions[index] = position;
                  onSetGlassShelfPositions(selectedZone.id, positions);
                }}
                onReset={() => onSetGlassShelfPositions(selectedZone.id, defaultShelfPositions(glassShelfCount))}
              />
            )}
          </div>
        ) : !show('facades') ? (
          <InfoNote>Ce groupe est divisé : cliquez sur l&apos;un de ses compartiments pour y mettre un tiroir.</InfoNote>
        ) : null
      )}

      {/* ── Poignées ─────────────────────────────────────── */}
      {show('handles') && (
        <div>
          <SectionLabel>Poignées</SectionLabel>
          {!facade ? (
            <InfoNote>Posez d&apos;abord une porte ou un tiroir : vous pourrez alors choisir sa poignée.</InfoNote>
          ) : isPushContent(facade) ? (
            <InfoNote>Cette façade s&apos;ouvre par simple pression (Push-to-Open) : elle n&apos;a pas de poignée.</InfoNote>
          ) : onSetHandleType ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {HANDLE_OPTIONS.map(({ type, icon: Icon, label }) => {
                const isActive = (selectedZone.handleType || 'vertical_bar') === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onSetHandleType(selectedZone.id, type)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center gap-1.5 border-2 p-3 transition-all ${
                      isActive
                        ? 'border-am-navy bg-am-navy text-white'
                        : 'border-black/10 bg-white text-black hover:border-am-navy'
                    }`}
                    style={{ borderRadius: '4px' }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Accessoires (compartiments uniquement) ───────── */}
      {show('accessories') && (
        <div>
          <SectionLabel>Accessoires</SectionLabel>
          {isLeaf ? (
            <div className="grid grid-cols-1 gap-2.5">
              <ToggleRow
                icon={Lightbulb}
                iconActiveClass="fill-yellow-200 text-yellow-500"
                label="Éclairage LED"
                desc="Lumière intégrée"
                active={!!selectedZone.hasLight}
                onClick={() => onToggleLight?.(selectedZone.id)}
              />
              <ToggleRow
                icon={Plug}
                iconActiveClass="text-blue-500"
                label="Passe-câble"
                desc="Trou dans le fond"
                active={!!selectedZone.hasCableHole}
                onClick={() => onToggleCableHole?.(selectedZone.id)}
              />
              <ToggleRow
                icon={Shirt}
                iconActiveClass="text-indigo-500"
                label="Penderie"
                desc="Tringle intégrée"
                active={!!selectedZone.hasDressing}
                disabledReason={railReason}
                onClick={() => onToggleDressing?.(selectedZone.id)}
              />
            </div>
          ) : (
            <InfoNote>Ce groupe est divisé : cliquez sur l&apos;un de ses compartiments pour y ajouter des accessoires.</InfoNote>
          )}
        </div>
      )}

      {/* ── Division ─────────────────────────────────────── */}
      {show('division') && (
        <div>
          <SectionLabel hint="Réglez le nombre de colonnes et d'étagères : le maximum dépend de la taille minimale d'une case. Les tailles s'ajustent ensuite sur le plan ou en millimètres.">
            {isRoot ? 'Colonnes et étagères du meuble' : 'Colonnes et étagères de cette zone'}
          </SectionLabel>
          <div className="space-y-3">
            <DivisionStepper
              icon={Columns3}
              label="Colonnes"
              value={columnCount}
              max={Math.max(columnsSplit.maxParts, columnCount ?? 1)}
              sizeLabel={columnCount && knownSize ? `Colonnes de ${cmLabel(partSize(zoneWidth, columnCount))}` : undefined}
              reason={columnsSplit.reason}
              onChange={(count) => onSetDivisionCount?.(selectedZone.id, 'vertical', count)}
            />
            <DivisionStepper
              icon={Rows3}
              label={selectedZone.type === 'vertical' ? 'Étagères par colonne' : 'Étagères'}
              value={shelfCount}
              max={Math.max(shelvesSplit.maxParts, shelfCount ?? 1)}
              sizeLabel={shelfCount && knownSize ? `Casiers de ${cmLabel(partSize(zoneHeight, shelfCount))} de haut` : undefined}
              reason={shelvesSplit.reason}
              blockedReason={shelvesGrid ? undefined : 'Cette zone contient des groupes imbriqués : sélectionnez une colonne pour régler ses étagères.'}
              onChange={(count) => onSetDivisionCount?.(selectedZone.id, 'horizontal', count)}
            />
            {!isLeaf && (
              <button
                type="button"
                onClick={() => onResetZone(selectedZone.id)}
                className="flex w-full items-center justify-center gap-2 border-2 border-black/10 bg-white py-3 text-sm font-medium text-black/65 transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                style={{ borderRadius: '4px' }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Annuler cette division</span>
              </button>
            )}
            {onDeleteSection && !isRoot && !isMultiSelection && (
              <button
                type="button"
                onClick={() => onDeleteSection(selectedZone.id)}
                title="La section voisine prend sa place"
                className="flex w-full items-center justify-center gap-2 border-2 border-black/10 bg-white py-3 text-sm font-medium text-black/65 transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                style={{ borderRadius: '4px' }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Supprimer cette section</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
