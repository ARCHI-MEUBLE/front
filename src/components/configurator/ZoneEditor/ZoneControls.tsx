import { useState, useRef, useCallback, useEffect } from 'react';
import { Rows3, Columns3, Archive, Shirt, Minus, Trash2, Lightbulb, Plug, DoorClosed, Square, Sparkles, Hand, BoxSelect, GripVertical, GripHorizontal, Circle, RectangleHorizontal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Zone, ZoneContent, HandleType, ZONE_CONTENT_META } from './types';

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

export default function ZoneControls({
                                       selectedZone,
                                       selectedZoneIds,
                                       parentZone,
                                       onSplitZone,
                                       onSetContent,
                                       onSetDoorContent,
                                       onResetZone,
                                       onSetSplitRatio,
                                       onSetSplitRatios,
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
                                       isAdminCreateModel,
                                     }: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';

  // State pour le dialogue de choix de côté d'ouverture
  const [doorSideDialog, setDoorSideDialog] = useState<{
    isOpen: boolean;
    doorType: 'push' | 'mirror' | null;
  }>({ isOpen: false, doorType: null });

  const canAdjustRatio = selectedZone.type !== 'leaf' &&
      selectedZone.children?.length === 2;

  const canAdjustMultipleRatios = selectedZone.type !== 'leaf' &&
      (selectedZone.children?.length ?? 0) > 2;

  const parentCanAdjust = parentZone &&
      parentZone.type !== 'leaf' &&
      (parentZone.children?.length ?? 0) >= 2;

  const getCurrentRatios = (): number[] => {
    const children = selectedZone.children ?? [];
    if (children.length === 2 && selectedZone.splitRatio !== undefined) {
      return [selectedZone.splitRatio, 100 - selectedZone.splitRatio];
    }
    if (children.length > 2 && selectedZone.splitRatios?.length === children.length) {
      return selectedZone.splitRatios;
    }
    return children.map(() => Math.round(100 / children.length));
  };

  const handleRatioSliderChange = (index: number, newValue: number) => {
    if (!onSetSplitRatios) return;
    const currentRatios = getCurrentRatios();
    const oldValue = currentRatios[index];
    const delta = newValue - oldValue;

    const adjustIndex = index < currentRatios.length - 1 ? index + 1 : index - 1;
    const newRatios = [...currentRatios];
    newRatios[index] = newValue;
    newRatios[adjustIndex] = Math.max(10, currentRatios[adjustIndex] - delta);

    const sum = newRatios.reduce((a, b) => a + b, 0);
    const normalized = newRatios.map(r => Math.round((r / sum) * 100));
    onSetSplitRatios(selectedZone.id, normalized);
  };

  // ✅ Options de contenu organisées par catégories
  const STORAGE_OPTIONS = [
    { id: 'empty' as ZoneContent, icon: Minus, label: 'Vide', desc: 'Espace libre' },
    { id: 'drawer' as ZoneContent, icon: Archive, label: 'Tiroir', desc: 'Avec poignée' },
    { id: 'push_drawer' as ZoneContent, icon: BoxSelect, label: 'Tiroir Push', desc: 'Sans poignée' },
    { id: 'glass_shelf' as ZoneContent, icon: Square, label: 'Étagère verre', desc: 'Transparente' },
  ];

  const DOOR_OPTIONS = [
    { id: 'door' as ZoneContent, icon: DoorClosed, label: 'Porte gauche', desc: 'Une seule porte' },
    { id: 'door_right' as ZoneContent, icon: DoorClosed, label: 'Porte droite', desc: 'Une seule porte' },
    { id: 'door_double' as ZoneContent, icon: DoorClosed, label: 'Double porte', desc: 'Deux portes' },
    { id: 'push_door' as ZoneContent, icon: Hand, label: 'Porte Push', desc: 'Sans poignée', needsSideChoice: true, dialogType: 'push' as const },
    { id: 'mirror_door' as ZoneContent, icon: Sparkles, label: 'Porte vitrée', desc: 'Porte vitrée', needsSideChoice: true, dialogType: 'mirror' as const },
  ];

  // Fonction pour gérer le clic sur une option de porte
  const handleDoorOptionClick = (option: typeof DOOR_OPTIONS[0]) => {
    if (option.needsSideChoice) {
      setDoorSideDialog({ isOpen: true, doorType: option.dialogType! });
    } else {
      if (isLeaf) {
        onSetContent(selectedZone.id, option.id);
      } else {
        onSetDoorContent?.(selectedZone.id, option.id);
      }
    }
  };

  // Fonction pour appliquer le choix de côté
  const handleDoorSideChoice = (side: 'left' | 'right') => {
    const contentId = doorSideDialog.doorType === 'push'
      ? (side === 'left' ? 'push_door' : 'push_door_right')
      : (side === 'left' ? 'mirror_door' : 'mirror_door_right');

    if (isLeaf) {
      onSetContent(selectedZone.id, contentId as ZoneContent);
    } else {
      onSetDoorContent?.(selectedZone.id, contentId as ZoneContent);
    }
    setDoorSideDialog({ isOpen: false, doorType: null });
  };

  // Calculer le fil d'Ariane (Breadcrumbs)
  const renderBreadcrumbs = () => {
    if (!onSelectParent || !parentZone) {
      return (
        <div className="flex items-center gap-2 mb-4 text-xs font-medium text-[#1A1917]">
          <span className="flex items-center gap-1 bg-[#1A1917] text-white px-2 py-0.5" style={{ borderRadius: '2px' }}>
            Meuble entier
          </span>
          <span className="text-[#E8E6E3]">/</span>
          <span className="text-[#706F6C]">Sélectionnez une zone pour modifier</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 mb-4 text-xs font-medium text-[#706F6C]">
        <button
          onClick={() => onSelectParent()}
          className="flex items-center gap-1 hover:text-[#1A1917] transition-colors"
        >
          <BoxSelect className="h-3 w-3 text-[#706F6C]" />
          <span className="underline decoration-dotted underline-offset-2">Groupe parent</span>
        </button>
        <span className="text-[#E8E6E3]">/</span>
        <span className="text-[#1A1917] font-bold">Zone actuelle</span>
      </div>
    );
  };

  return (
      <div className="space-y-5">
        {renderBreadcrumbs()}

        {selectedZoneIds.length > 1 && (
          <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-5" style={{ borderRadius: '2px' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] bg-white" style={{ borderRadius: '2px' }}>
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
                className="flex items-center justify-center gap-2 w-full bg-[#1A1917] text-white py-3 px-4 text-sm font-medium transition-all hover:bg-[#2A2927]"
                style={{ borderRadius: '2px' }}
              >
                Porte simple
              </button>

              <button
                type="button"
                onClick={() => onGroupZones?.(selectedZoneIds, 'door_double')}
                className="flex items-center justify-center gap-2 w-full border border-[#E8E6E3] bg-white text-[#1A1917] py-3 px-4 text-sm font-medium transition-all hover:border-[#1A1917]"
                style={{ borderRadius: '2px' }}
              >
                Double porte
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-[#706F6C]">
              La porte recouvrira l'intégralité de la zone sélectionnée.
            </p>
          </div>
        )}

        {selectedZoneIds.length <= 1 && (
          <>
            {/* Catégorie: Portes & Façades (Affiché pour leaf et parent) */}
            <div>
              <p className="mb-4 text-lg font-semibold text-[#1A1917]">
                {isLeaf ? "Que mettre dans cette zone ?" : "Ajouter des portes sur ce groupe"}
              </p>
              
              <div className="mb-5">
                <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#706F6C]">
                  Portes & Façades
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => isLeaf ? onSetContent(selectedZone.id, 'empty') : onSetDoorContent?.(selectedZone.id, 'empty')}
                    className={`flex flex-col items-center justify-center gap-2 border-2 p-4 transition-all ${
                      (isLeaf ? (selectedZone.content ?? 'empty') : (selectedZone.doorContent ?? 'empty')) === 'empty'
                        ? 'border-[#1A1917] bg-[#1A1917] text-white'
                        : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                    }`}
                    style={{ borderRadius: '4px' }}
                  >
                    <Minus className="h-6 w-6" />
                    <div className="text-center">
                      <span className="block text-sm font-semibold">Aucune</span>
                      <span className="block text-xs text-[#706F6C] mt-1">Pas de porte</span>
                    </div>
                  </button>

                  {DOOR_OPTIONS.map((option) => {
                    const { id, icon: Icon, label, desc, needsSideChoice } = option;
                    const currentContent = isLeaf ? (selectedZone.content ?? 'empty') : (selectedZone.doorContent ?? 'empty');
                    // Pour push_door et mirror_door, vérifier aussi les variantes _right
                    const isActive = needsSideChoice
                      ? (currentContent === id || currentContent === `${id}_right`)
                      : currentContent === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => handleDoorOptionClick(option)}
                            className={`flex flex-col items-center justify-center gap-2 border-2 p-4 transition-all ${
                                isActive
                                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                                    : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                            }`}
                            style={{ borderRadius: '4px' }}
                        >
                          <Icon className="h-6 w-6" />
                          <div className="text-center">
                            <span className="block text-sm font-semibold">{label}</span>
                            <span className="block text-xs text-[#706F6C] mt-1">{desc}</span>
                          </div>
                        </button>
                    );
                  })}
                </div>

                {/* Dialogue de choix de côté pour porte Push ou Vitrée */}
                {doorSideDialog.isOpen && (
                  <div className="mt-4 border border-[#E8E6E3] bg-[#FAFAF9] p-4" style={{ borderRadius: '2px' }}>
                    <p className="mb-2 text-sm font-medium text-[#1A1917]">
                      Côté d'ouverture
                    </p>
                    <p className="mb-4 text-xs text-[#706F6C]">
                      {doorSideDialog.doorType === 'push'
                        ? 'Choisissez le côté d\'ouverture de la porte Push'
                        : 'Choisissez le côté d\'ouverture de la porte vitrée'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDoorSideChoice('left')}
                        className="flex flex-col items-center justify-center gap-1.5 border border-[#E8E6E3] bg-white py-3 px-2 text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#FAFAF9]"
                        style={{ borderRadius: '2px' }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="text-xs font-medium">Gauche</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDoorSideChoice('right')}
                        className="flex flex-col items-center justify-center gap-1.5 border border-[#E8E6E3] bg-white py-3 px-2 text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#FAFAF9]"
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

              {/* Sélecteur de poignée (pour leaf et parent) */}
              {onSetHandleType && (
                (isLeaf && (
                  selectedZone.content === 'drawer' ||
                  selectedZone.content === 'door' ||
                  selectedZone.content === 'door_right' ||
                  selectedZone.content === 'door_double' ||
                  selectedZone.content === 'mirror_door' ||
                  selectedZone.content === 'mirror_door_right' ||
                  selectedZone.content === 'push_drawer' ||
                  selectedZone.content === 'push_door' ||
                  selectedZone.content === 'push_door_right'
                )) ||
                (!isLeaf && (selectedZone.doorContent && selectedZone.doorContent !== 'empty'))
              ) && (
                <div className="mb-5">
                  <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#706F6C]">
                    Type de poignée
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { type: 'vertical_bar' as HandleType, icon: GripVertical, label: 'Barre V' },
                      { type: 'horizontal_bar' as HandleType, icon: GripHorizontal, label: 'Barre H' },
                      { type: 'knob' as HandleType, icon: Circle, label: 'Bouton' },
                      { type: 'recessed' as HandleType, icon: RectangleHorizontal, label: 'Encastrée' },
                    ].map(({ type, icon: Icon, label }) => {
                      const isActive = (selectedZone.handleType || 'vertical_bar') === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onSetHandleType(selectedZone.id, type)}
                          className={`flex flex-col items-center gap-2 border-2 p-3 transition-all ${
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
                </div>
              )}
            </div>

            {/* Actions pour zones vides (feuilles) uniquement */}
            {isLeaf && (
                <>
                  <div>
                    {/* Catégorie: Rangements */}
                    <div className="mb-5">
                      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#706F6C]">
                        Rangements internes
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {STORAGE_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
                          const isActive = (selectedZone.content ?? 'empty') === id;
                          return (
                              <button
                                  key={id}
                                  type="button"
                                  onClick={() => onSetContent(selectedZone.id, id)}
                                  className={`flex flex-col items-center justify-center gap-2 border-2 p-4 transition-all ${
                                      isActive
                                          ? 'border-[#1A1917] bg-[#1A1917] text-white'
                                          : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                                  }`}
                                  style={{ borderRadius: '4px' }}
                              >
                                <Icon className="h-6 w-6" />
                                <div className="text-center">
                                  <span className="block text-sm font-semibold">{label}</span>
                                  <span className="block text-xs text-[#706F6C] mt-1">{desc}</span>
                                </div>
                              </button>
                          );
                        })}
                      </div>

                      {/* Nombre d'étagères en verre */}
                      {selectedZone.content === 'glass_shelf' && onSetGlassShelfCount && (
                        <div className="mt-4 flex items-center justify-between border border-[#E8E6E3] bg-[#FAFAF9] p-3" style={{ borderRadius: '4px' }}>
                          <div className="flex items-center gap-2">
                            <Square className="h-4 w-4 text-[#706F6C]" />
                            <span className="text-sm font-medium text-[#1A1917]">Nombre d'étagères</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSetGlassShelfCount(selectedZone.id, Math.max(1, (selectedZone.glassShelfCount || 1) - 1))}
                              disabled={(selectedZone.glassShelfCount || 1) <= 1}
                              className="flex h-8 w-8 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold transition-all hover:border-[#1A1917] disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ borderRadius: '4px' }}
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-mono text-base font-bold text-[#1A1917]">
                              {selectedZone.glassShelfCount || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSetGlassShelfCount(selectedZone.id, Math.min(5, (selectedZone.glassShelfCount || 1) + 1))}
                              disabled={(selectedZone.glassShelfCount || 1) >= 5}
                              className="flex h-8 w-8 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold transition-all hover:border-[#1A1917] disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ borderRadius: '4px' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Éditeur de position des étagères (affiché si 2+ étagères) */}
                      {selectedZone.content === 'glass_shelf' && onSetGlassShelfPositions && zoneHeightMm && (selectedZone.glassShelfCount || 1) >= 2 && (
                        <ShelfPositionEditor
                          shelfCount={selectedZone.glassShelfCount || 1}
                          positions={
                            selectedZone.glassShelfPositions?.length === (selectedZone.glassShelfCount || 1)
                              ? selectedZone.glassShelfPositions
                              : Array.from({ length: selectedZone.glassShelfCount || 1 }, (_, i) =>
                                  Math.round(((i + 1) / ((selectedZone.glassShelfCount || 1) + 1)) * 100)
                                )
                          }
                          zoneHeightMm={zoneHeightMm}
                          onChange={(index, position) => {
                            const currentPositions = selectedZone.glassShelfPositions?.length === (selectedZone.glassShelfCount || 1)
                              ? [...selectedZone.glassShelfPositions]
                              : Array.from({ length: selectedZone.glassShelfCount || 1 }, (_, i) =>
                                  Math.round(((i + 1) / ((selectedZone.glassShelfCount || 1) + 1)) * 100)
                                );
                            currentPositions[index] = position;
                            onSetGlassShelfPositions(selectedZone.id, currentPositions);
                          }}
                          onReset={() => {
                            const defaultPositions = Array.from({ length: selectedZone.glassShelfCount || 1 }, (_, i) =>
                              Math.round(((i + 1) / ((selectedZone.glassShelfCount || 1) + 1)) * 100)
                            );
                            onSetGlassShelfPositions(selectedZone.id, defaultPositions);
                          }}
                        />
                      )}
                    </div>

                    {/* Catégorie: Accessoires */}
                    <div className="mb-5">
                      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#706F6C]">
                        Accessoires
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onToggleLight?.(selectedZone.id)}
                        className={`flex items-center justify-between border-2 p-4 transition-all ${
                          selectedZone.hasLight
                            ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
                            : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                        }`}
                        style={{ borderRadius: '4px' }}
                      >
                        <div className="flex items-center gap-3">
                          <Lightbulb className={`h-6 w-6 ${selectedZone.hasLight ? 'text-yellow-500 fill-yellow-200' : ''}`} />
                          <div className="text-left">
                            <span className="block text-base font-semibold">Éclairage LED</span>
                            <span className="block text-sm text-[#706F6C]">Lumière intégrée</span>
                          </div>
                        </div>
                        <div className={`h-6 w-10 rounded-full border-2 transition-all relative ${selectedZone.hasLight ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
                          <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${selectedZone.hasLight ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleCableHole?.(selectedZone.id)}
                        className={`flex items-center justify-between border-2 p-4 transition-all ${
                          selectedZone.hasCableHole
                            ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
                            : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                        }`}
                        style={{ borderRadius: '4px' }}
                      >
                        <div className="flex items-center gap-3">
                          <Plug className={`h-6 w-6 ${selectedZone.hasCableHole ? 'text-blue-500' : ''}`} />
                          <div className="text-left">
                            <span className="block text-base font-semibold">Passe-câble</span>
                            <span className="block text-sm text-[#706F6C]">Trou dans le fond</span>
                          </div>
                        </div>
                        <div className={`h-6 w-10 rounded-full border-2 transition-all relative ${selectedZone.hasCableHole ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
                          <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${selectedZone.hasCableHole ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleDressing?.(selectedZone.id)}
                        className={`flex items-center justify-between border-2 p-4 transition-all ${
                          selectedZone.hasDressing
                            ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
                            : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                        }`}
                        style={{ borderRadius: '4px' }}
                      >
                        <div className="flex items-center gap-3">
                          <Shirt className={`h-6 w-6 ${selectedZone.hasDressing ? 'text-indigo-500' : ''}`} />
                          <div className="text-left">
                            <span className="block text-base font-semibold">Penderie</span>
                            <span className="block text-sm text-[#706F6C]">Tringle intégrée</span>
                          </div>
                        </div>
                        <div className={`h-6 w-10 rounded-full border-2 transition-all relative ${selectedZone.hasDressing ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
                          <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${selectedZone.hasDressing ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
                        </div>
                      </button>
                      </div>
                    </div>
                  </div>

                  {/* ═══════════════════════════════════════════════════════════
                  DIVISION - Termes simplifiés pour seniors
              ═══════════════════════════════════════════════════════════ */}
                  <div className="border-t border-[#E8E6E3] pt-5">
                    <p className="mb-3 text-base font-semibold text-[#1A1917]">
                      Diviser cette zone
                    </p>

                    <div className="space-y-5">
                      {/* Étagères (horizontal) */}
                      <div className="border border-[#E8E6E3] bg-white p-5" style={{ borderRadius: '4px' }}>
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center bg-[#FAFAF9]" style={{ borderRadius: '4px' }}>
                            <Rows3 className="h-6 w-6 text-[#1A1917]" />
                          </div>
                          <div>
                            <span className="block text-lg font-semibold text-[#1A1917]">Ajouter des étagères</span>
                            <p className="text-sm text-[#706F6C]">Divise en niveaux superposés</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {[2, 3, 4, 5].map((count) => (
                              <button
                                  key={`h-${count}`}
                                  type="button"
                                  onClick={() => onSplitZone(selectedZone.id, 'horizontal', count)}
                                  className="flex h-14 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                                  style={{ borderRadius: '4px' }}
                              >
                                {count}
                              </button>
                          ))}
                        </div>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-[#706F6C] hover:text-[#1A1917]">
                            Plus d'options (6 à 10 niveaux)
                          </summary>
                          <div className="mt-3 grid grid-cols-5 gap-2">
                            {[6, 7, 8, 9, 10].map((count) => (
                                <button
                                    key={`h-${count}`}
                                    type="button"
                                    onClick={() => onSplitZone(selectedZone.id, 'horizontal', count)}
                                    className="flex h-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-sm font-semibold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                                    style={{ borderRadius: '4px' }}
                                >
                                  {count}
                                </button>
                            ))}
                          </div>
                        </details>
                      </div>

                      {/* Colonnes (vertical) */}
                      <div className="border border-[#E8E6E3] bg-white p-5" style={{ borderRadius: '4px' }}>
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center bg-[#FAFAF9]" style={{ borderRadius: '4px' }}>
                            <Columns3 className="h-6 w-6 text-[#1A1917]" />
                          </div>
                          <div>
                            <span className="block text-lg font-semibold text-[#1A1917]">Ajouter des colonnes</span>
                            <p className="text-sm text-[#706F6C]">Divise en compartiments côte à côte</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {[2, 3, 4, 5].map((count) => (
                              <button
                                  key={`v-${count}`}
                                  type="button"
                                  onClick={() => onSplitZone(selectedZone.id, 'vertical', count)}
                                  className="flex h-14 items-center justify-center border-2 border-[#E8E6E3] bg-white text-lg font-bold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                                  style={{ borderRadius: '4px' }}
                              >
                                {count}
                              </button>
                          ))}
                        </div>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-[#706F6C] hover:text-[#1A1917]">
                            Plus d'options (6 à 10 colonnes)
                          </summary>
                          <div className="mt-3 grid grid-cols-5 gap-2">
                            {[6, 7, 8, 9, 10].map((count) => (
                                <button
                                    key={`v-${count}`}
                                    type="button"
                                    onClick={() => onSplitZone(selectedZone.id, 'vertical', count)}
                                    className="flex h-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-sm font-semibold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                                    style={{ borderRadius: '4px' }}
                                >
                                  {count}
                                </button>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════
              ACTIONS SECONDAIRES - Boutons clairs
          ═══════════════════════════════════════════════════════════ */}
            {(!isLeaf || (parentZone && parentZone.type !== 'leaf')) && (
                <div className="flex flex-col gap-3 border-t border-[#E8E6E3] pt-5">
                  {/* Supprimer la division actuelle */}
                  {!isLeaf && (
                      <button
                          type="button"
                          onClick={() => onResetZone(selectedZone.id)}
                          className="flex items-center justify-center gap-3 border-2 border-[#E8E6E3] bg-white py-3 text-base font-medium text-[#706F6C] transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                          style={{ borderRadius: '4px' }}
                      >
                        <Trash2 className="h-5 w-5" />
                        <span>Annuler cette division</span>
                      </button>
                  )}
                </div>
            )}
          </>
        )}
      </div>
  );
}