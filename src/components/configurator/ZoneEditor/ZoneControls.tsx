import { useState, useRef, useCallback, useEffect } from 'react';
import { Rows3, Columns3, Archive, Shirt, Minus, Trash2, Lightbulb, Plug, DoorClosed, Square, Sparkles, Hand, BoxSelect, GripVertical, GripHorizontal, Circle, RectangleHorizontal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Zone, ZoneContent, HandleType } from './types';
import { getZoneFacade, isPushContent } from '@/lib/configurator/zoneStats';

// Familles de réglages d'une zone : chaque étape du configurateur en affiche une partie
export type ZoneControlSection = 'division' | 'facades' | 'storage' | 'handles' | 'accessories';

export const ALL_ZONE_SECTIONS: ZoneControlSection[] = ['facades', 'storage', 'handles', 'accessories', 'division'];

// Au-delà de 5 parties, les compartiments deviennent trop étroits pour être utiles
export const MAX_SPLIT_PARTS = 5;

const SPLIT_COUNTS = Array.from({ length: MAX_SPLIT_PARTS - 1 }, (_, i) => i + 2);

interface ZoneControlsProps {
  selectedZone: Zone;
  selectedZoneIds: string[];
  parentZone: Zone | null;
  onSplitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count: number) => void;
  onSetContent: (zoneId: string, content: ZoneContent) => void;
  onSetDoorContent?: (zoneId: string, content: ZoneContent) => void;
  onResetZone: (zoneId: string) => void;
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
    <div className="mt-4 border border-[#E8E6E3] bg-[#FAFAF9] p-3" style={{ borderRadius: '4px' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-[#1A1917]">Position des étagères</span>
          <span className="ml-2 text-[10px] text-[#706F6C]">(hauteur zone: {zoneHeightMm} mm)</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-[#706F6C] hover:text-[#1A1917] transition-colors"
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
          className="relative w-16 h-32 border-2 border-[#1A1917] bg-white cursor-crosshair"
          style={{ borderRadius: '2px' }}
        >
          {/* Étagères */}
          {positions.map((pos, index) => (
            <div
              key={index}
              className={`absolute left-0 right-0 h-1 cursor-ns-resize transition-colors ${
                draggingIndex === index ? 'bg-blue-500' : 'bg-[#1A1917]'
              }`}
              style={{ bottom: `${pos}%`, transform: 'translateY(50%)' }}
              onMouseDown={handleMouseDown(index)}
              title={`Étagère ${index + 1}: ${percentToMm(pos)} mm`}
            >
              {/* Poignée de glissement */}
              <div className={`absolute -left-1 -right-1 -top-1 -bottom-1 ${
                draggingIndex === index ? 'bg-blue-500/20' : ''
              }`} />
            </div>
          ))}

          {/* Labels haut/bas avec hauteur */}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[#706F6C]">{zoneHeightMm} mm</span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-[#706F6C]">0 mm</span>
        </div>

        {/* Contrôles par étagère */}
        <div className="flex-1 space-y-2">
          {positions.map((pos, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-[#706F6C] w-6">É{index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(index, Math.min(95, pos + stepPercent))}
                className="p-1 border border-[#E8E6E3] bg-white hover:border-[#1A1917] transition-colors"
                style={{ borderRadius: '2px' }}
                title={`+${stepMm} mm`}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <span className="text-xs font-mono w-12 text-center font-semibold">{percentToMm(pos)} mm</span>
              <button
                type="button"
                onClick={() => onChange(index, Math.max(5, pos - stepPercent))}
                className="p-1 border border-[#E8E6E3] bg-white hover:border-[#1A1917] transition-colors"
                style={{ borderRadius: '2px' }}
                title={`-${stepMm} mm`}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-[#706F6C]">
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
    <div className="flex items-center gap-4 border border-[#E8E6E3] bg-white px-4 py-3" style={{ borderRadius: '4px' }}>
      {/* Label optionnel pour groupe */}
      {label && (
        <>
          <span className="text-sm font-medium text-[#8B7355]">{label}</span>
          <div className="h-6 w-px bg-[#E8E6E3]" />
        </>
      )}
      {/* Largeur */}
      <div className="flex items-center gap-2">
        <Columns3 className="h-4 w-4 text-[#706F6C]" />
        <span className="text-sm text-[#706F6C]">Largeur:</span>
        {canAdjustWidth && onSetWidth ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decrementWidth}
              className="flex h-8 w-8 items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917]"
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
                className="w-20 text-center font-mono text-sm font-semibold border border-[#E8E6E3] focus:border-[#1A1917] outline-none py-1.5 pr-7"
                style={{ borderRadius: '2px' }}
                min={50}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#706F6C]">mm</span>
            </div>
            <button
              type="button"
              onClick={incrementWidth}
              className="flex h-8 w-8 items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917]"
              style={{ borderRadius: '2px' }}
            >
              <span className="text-sm font-bold">+</span>
            </button>
          </div>
        ) : (
          <span className="font-mono text-sm font-semibold text-[#1A1917]">{widthMm} mm</span>
        )}
      </div>

      <div className="h-6 w-px bg-[#E8E6E3]" />

      {/* Hauteur */}
      <div className="flex items-center gap-2">
        <Rows3 className="h-4 w-4 text-[#706F6C]" />
        <span className="text-sm text-[#706F6C]">Hauteur:</span>
        {canAdjustHeight && onSetHeight ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decrementHeight}
              className="flex h-8 w-8 items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917]"
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
                className="w-20 text-center font-mono text-sm font-semibold border border-[#E8E6E3] focus:border-[#1A1917] outline-none py-1.5 pr-7"
                style={{ borderRadius: '2px' }}
                min={50}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#706F6C]">mm</span>
            </div>
            <button
              type="button"
              onClick={incrementHeight}
              className="flex h-8 w-8 items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917]"
              style={{ borderRadius: '2px' }}
            >
              <span className="text-sm font-bold">+</span>
            </button>
          </div>
        ) : (
          <span className="font-mono text-sm font-semibold text-[#1A1917]">{heightMm} mm</span>
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
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#706F6C]">{children}</p>
      {hint && <p className="mt-1 text-xs text-[#706F6C]">{hint}</p>}
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border border-dashed border-[#C9C6BF] bg-white px-3 py-3 text-xs leading-relaxed text-[#706F6C]"
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
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-1.5 border-2 p-3 transition-all ${
        active
          ? 'border-[#1A1917] bg-[#1A1917] text-white'
          : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
      }`}
      style={{ borderRadius: '4px' }}
    >
      <Icon className="h-5 w-5" />
      <div className="text-center">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        <span className={`mt-0.5 block text-[11px] leading-tight ${active ? 'text-white/70' : 'text-[#706F6C]'}`}>{desc}</span>
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
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconActiveClass: string;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-between gap-3 border-2 p-3 transition-all ${
        active
          ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
          : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
      }`}
      style={{ borderRadius: '4px' }}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${active ? iconActiveClass : ''}`} />
        <div className="text-left">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs text-[#706F6C]">{desc}</span>
        </div>
      </div>
      <div className={`relative h-6 w-10 flex-shrink-0 rounded-full border-2 transition-all ${active ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
        <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${active ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
      </div>
    </button>
  );
}

function SplitCard({
  icon: Icon,
  title,
  desc,
  onSplit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onSplit: (count: number) => void;
}) {
  return (
    <div className="border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '4px' }}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-[#FAFAF9]" style={{ borderRadius: '4px' }}>
          <Icon className="h-5 w-5 text-[#1A1917]" />
        </div>
        <div>
          <span className="block text-base font-semibold text-[#1A1917]">{title}</span>
          <p className="text-xs text-[#706F6C]">{desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SPLIT_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onSplit(count)}
            className="flex h-12 items-center justify-center border-2 border-[#E8E6E3] bg-white text-base font-bold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
            style={{ borderRadius: '4px' }}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

const STORAGE_OPTIONS = [
  { id: 'drawer' as ZoneContent, icon: Archive, label: 'Tiroir', desc: 'Avec poignée' },
  { id: 'push_drawer' as ZoneContent, icon: BoxSelect, label: 'Tiroir Push', desc: 'Sans poignée' },
  { id: 'glass_shelf' as ZoneContent, icon: Square, label: 'Étagère verre', desc: 'Transparente' },
];

const DOOR_OPTIONS = [
  { id: 'door' as ZoneContent, icon: DoorClosed, label: 'Porte gauche', desc: 'Une seule porte' },
  { id: 'door_right' as ZoneContent, icon: DoorClosed, label: 'Porte droite', desc: 'Une seule porte' },
  { id: 'door_double' as ZoneContent, icon: DoorClosed, label: 'Double porte', desc: 'Deux portes' },
  { id: 'push_door' as ZoneContent, icon: Hand, label: 'Porte Push', desc: 'Sans poignée', needsSideChoice: true, dialogType: 'push' as const },
  { id: 'mirror_door' as ZoneContent, icon: Sparkles, label: 'Porte vitrée', desc: 'Vitrage transparent', needsSideChoice: true, dialogType: 'mirror' as const },
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
  onSplitZone,
  onSetContent,
  onSetDoorContent,
  onResetZone,
  onSelectParent,
  onToggleLight,
  onToggleCableHole,
  onToggleDressing,
  onGroupZones,
  onSetHandleType,
  onSetGlassShelfCount,
  onSetGlassShelfPositions,
  zoneHeightMm,
  sections,
}: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';
  const isRoot = selectedZone.id === 'root';
  const visibleSections = sections ?? ALL_ZONE_SECTIONS;
  const show = (section: ZoneControlSection) => visibleSections.includes(section);
  const isMultiSelection = selectedZoneIds.length > 1;

  // Choix du côté d'ouverture pour les portes Push / vitrées
  const [doorSideDialog, setDoorSideDialog] = useState<{
    isOpen: boolean;
    doorType: 'push' | 'mirror' | null;
  }>({ isOpen: false, doorType: null });

  const facade = getZoneFacade(selectedZone);
  const currentFacade = isLeaf ? (selectedZone.content ?? 'empty') : (selectedZone.doorContent ?? 'empty');
  const glassShelfCount = selectedZone.glassShelfCount || 1;

  const applyFacade = (content: ZoneContent) => {
    if (isLeaf) {
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
    const contentId = doorSideDialog.doorType === 'push'
      ? (side === 'left' ? 'push_door' : 'push_door_right')
      : (side === 'left' ? 'mirror_door' : 'mirror_door_right');

    applyFacade(contentId as ZoneContent);
    setDoorSideDialog({ isOpen: false, doorType: null });
  };

  const defaultShelfPositions = (count: number) =>
    Array.from({ length: count }, (_, i) => Math.round(((i + 1) / (count + 1)) * 100));

  const renderBreadcrumbs = () => {
    if (!onSelectParent || !parentZone) {
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-[#1A1917]">
          <span className="bg-[#1A1917] px-2 py-0.5 text-white" style={{ borderRadius: '2px' }}>
            Meuble entier
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-xs font-medium text-[#706F6C]">
        <button
          type="button"
          onClick={() => onSelectParent()}
          className="flex items-center gap-1 transition-colors hover:text-[#1A1917]"
        >
          <BoxSelect className="h-3 w-3" />
          <span className="underline decoration-dotted underline-offset-2">Groupe parent</span>
        </button>
        <span className="text-[#E8E6E3]">/</span>
        <span className="font-bold text-[#1A1917]">Zone actuelle</span>
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
        <div className="border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '2px' }}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] bg-[#FAFAF9]" style={{ borderRadius: '2px' }}>
              <DoorClosed className="h-5 w-5 text-[#1A1917]" />
            </div>
            <div>
              <span className="block text-base font-semibold text-[#1A1917]">{selectedZoneIds.length} compartiments sélectionnés</span>
              <p className="text-xs text-[#706F6C]">Poser une porte sur cet ensemble</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onGroupZones?.(selectedZoneIds, 'door')}
              className="flex w-full items-center justify-center gap-2 bg-[#1A1917] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#2A2927]"
              style={{ borderRadius: '2px' }}
            >
              Porte simple
            </button>
            <button
              type="button"
              onClick={() => onGroupZones?.(selectedZoneIds, 'door_double')}
              className="flex w-full items-center justify-center gap-2 border border-[#E8E6E3] bg-white px-4 py-3 text-sm font-medium text-[#1A1917] transition-all hover:border-[#1A1917]"
              style={{ borderRadius: '2px' }}
            >
              Double porte
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-[#706F6C]">
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
            {DOOR_OPTIONS.map((option) => {
              const { id, icon, label, desc } = option;
              const hasSideChoice = 'needsSideChoice' in option && option.needsSideChoice;
              const isActive = hasSideChoice
                ? currentFacade === id || currentFacade === `${id}_right`
                : currentFacade === id;
              return (
                <OptionTile
                  key={id}
                  icon={icon}
                  label={label}
                  desc={desc}
                  active={isActive}
                  onClick={() => handleDoorOptionClick(option)}
                />
              );
            })}
          </div>

          {doorSideDialog.isOpen && (
            <div className="mt-3 border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '2px' }}>
              <p className="mb-1 text-sm font-medium text-[#1A1917]">Côté d&apos;ouverture</p>
              <p className="mb-3 text-xs text-[#706F6C]">
                {doorSideDialog.doorType === 'push'
                  ? "Choisissez le côté d'ouverture de la porte Push"
                  : "Choisissez le côté d'ouverture de la porte vitrée"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDoorSideChoice('left')}
                  className="flex flex-col items-center justify-center gap-1 border border-[#E8E6E3] bg-white px-2 py-3 text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#FAFAF9]"
                  style={{ borderRadius: '2px' }}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-xs font-medium">Gauche</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDoorSideChoice('right')}
                  className="flex flex-col items-center justify-center gap-1 border border-[#E8E6E3] bg-white px-2 py-3 text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#FAFAF9]"
                  style={{ borderRadius: '2px' }}
                >
                  <ChevronRight className="h-5 w-5" />
                  <span className="text-xs font-medium">Droite</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDoorSideDialog({ isOpen: false, doorType: null })}
                className="mt-3 w-full text-center text-xs text-[#706F6C] hover:text-[#1A1917]"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tiroirs & rangements (compartiments uniquement) ─── */}
      {show('storage') && (
        isLeaf ? (
          <div>
            <SectionLabel hint="Un tiroir ou une étagère remplace la porte de ce compartiment.">
              Tiroirs & rangements
            </SectionLabel>
            <div className="grid grid-cols-3 gap-2.5">
              {STORAGE_OPTIONS.map(({ id, icon, label, desc }) => (
                <OptionTile
                  key={id}
                  icon={icon}
                  label={label}
                  desc={desc}
                  active={(selectedZone.content ?? 'empty') === id}
                  onClick={() => {
                    setDoorSideDialog({ isOpen: false, doorType: null });
                    onSetContent(selectedZone.id, id);
                  }}
                />
              ))}
            </div>

            {selectedZone.content === 'glass_shelf' && onSetGlassShelfCount && (
              <div className="mt-3 flex items-center justify-between border border-[#E8E6E3] bg-white p-3" style={{ borderRadius: '4px' }}>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-[#706F6C]" />
                  <span className="text-sm font-medium text-[#1A1917]">Nombre d&apos;étagères</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetGlassShelfCount(selectedZone.id, Math.max(1, glassShelfCount - 1))}
                    disabled={glassShelfCount <= 1}
                    className="flex h-8 w-8 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold transition-all hover:border-[#1A1917] disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ borderRadius: '4px' }}
                    aria-label="Retirer une étagère"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-base font-bold text-[#1A1917]">{glassShelfCount}</span>
                  <button
                    type="button"
                    onClick={() => onSetGlassShelfCount(selectedZone.id, Math.min(5, glassShelfCount + 1))}
                    disabled={glassShelfCount >= 5}
                    className="flex h-8 w-8 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold transition-all hover:border-[#1A1917] disabled:cursor-not-allowed disabled:opacity-30"
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
                        ? 'border-[#1A1917] bg-[#1A1917] text-white'
                        : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
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
          {isLeaf ? (
            <>
              <SectionLabel hint="Choisissez le nombre de parties : elles seront ensuite ajustables au curseur ou en millimètres.">
                Diviser cette zone
              </SectionLabel>
              <div className="space-y-3">
                <SplitCard
                  icon={Rows3}
                  title="En étagères"
                  desc="Niveaux superposés"
                  onSplit={(count) => onSplitZone(selectedZone.id, 'horizontal', count)}
                />
                <SplitCard
                  icon={Columns3}
                  title="En colonnes"
                  desc="Compartiments côte à côte"
                  onSplit={(count) => onSplitZone(selectedZone.id, 'vertical', count)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <InfoNote>
                {isRoot ? 'Le meuble' : 'Cette zone'} est divisé en {selectedZone.children?.length ?? 0}{' '}
                {selectedZone.type === 'horizontal' ? 'niveaux' : 'colonnes'}. Cliquez sur l&apos;un des compartiments pour le diviser à son tour.
              </InfoNote>
              <button
                type="button"
                onClick={() => onResetZone(selectedZone.id)}
                className="flex w-full items-center justify-center gap-2 border-2 border-[#E8E6E3] bg-white py-3 text-sm font-medium text-[#706F6C] transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                style={{ borderRadius: '4px' }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Annuler cette division</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
