import { useState, useRef, useCallback, useEffect } from 'react';
import { Rows3, Columns3, Archive, Shirt, Minus, Trash2, Lightbulb, Plug, DoorClosed, Square, Sparkles, Hand, BoxSelect, GripVertical, GripHorizontal, Circle, RectangleHorizontal, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
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

// Composant pour éditer les positions exactes des diviseurs (étagères/colonnes)
// Exporté pour utilisation dans ZoneEditor/index.tsx
export function DividerPositionEditor({
  zone,
  totalDimensionMm,
  isHorizontal,
  onRatiosChange,
}: {
  zone: Zone;
  totalDimensionMm: number;
  isHorizontal: boolean; // true = étagères (hauteur), false = colonnes (largeur)
  onRatiosChange: (ratios: number[]) => void;
}) {
  const children = zone.children ?? [];
  const childCount = children.length;

  // Obtenir les ratios actuels
  const getCurrentRatios = (): number[] => {
    if (zone.splitRatios?.length === childCount) {
      return zone.splitRatios;
    }
    if (childCount === 2 && zone.splitRatio !== undefined) {
      return [zone.splitRatio, 100 - zone.splitRatio];
    }
    return children.map(() => 100 / childCount);
  };

  const ratios = getCurrentRatios();

  // Calculer les positions des diviseurs en mm (positions cumulatives)
  // Pour horizontal: position depuis le HAUT (première section en haut)
  // Pour vertical: position depuis la GAUCHE
  const getDividerPositions = (): number[] => {
    const positions: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < ratios.length - 1; i++) {
      cumulative += (ratios[i] / 100) * totalDimensionMm;
      positions.push(Math.round(cumulative));
    }
    return positions;
  };

  const [dividerPositions, setDividerPositions] = useState<number[]>(getDividerPositions());
  const [inputValues, setInputValues] = useState<string[]>(getDividerPositions().map(p => p.toString()));

  // Mettre à jour quand les ratios changent
  useEffect(() => {
    const newPositions = getDividerPositions();
    setDividerPositions(newPositions);
    setInputValues(newPositions.map(p => p.toString()));
  }, [zone.splitRatio, zone.splitRatios, totalDimensionMm]);

  // Convertir les positions en ratios (haute précision pour éviter les erreurs d'arrondi)
  const positionsToRatios = (positions: number[]): number[] => {
    const newRatios: number[] = [];
    let prevPos = 0;
    for (let i = 0; i < positions.length; i++) {
      const size = positions[i] - prevPos;
      newRatios.push((size / totalDimensionMm) * 100);
      prevPos = positions[i];
    }
    // Dernière section
    newRatios.push(((totalDimensionMm - prevPos) / totalDimensionMm) * 100);
    // Garder 4 décimales pour la précision au mm
    return newRatios.map(r => Math.max(5, Math.round(r * 10000) / 10000));
  };

  // Gérer le changement d'input
  const handleInputChange = (index: number, value: string) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);
  };

  // Appliquer la valeur quand on quitte le champ ou appuie sur Entrée
  const applyValue = (index: number) => {
    const value = parseInt(inputValues[index], 10);
    if (isNaN(value)) {
      // Restaurer la valeur précédente
      setInputValues(dividerPositions.map(p => p.toString()));
      return;
    }

    // Limites: doit être entre le diviseur précédent (+50mm min) et le suivant (-50mm min)
    const minPos = index === 0 ? 50 : dividerPositions[index - 1] + 50;
    const maxPos = index === dividerPositions.length - 1
      ? totalDimensionMm - 50
      : dividerPositions[index + 1] - 50;

    const clampedValue = Math.max(minPos, Math.min(maxPos, value));

    const newPositions = [...dividerPositions];
    newPositions[index] = clampedValue;
    setDividerPositions(newPositions);
    setInputValues(newPositions.map(p => p.toString()));

    // Convertir en ratios et appliquer
    const newRatios = positionsToRatios(newPositions);
    onRatiosChange(newRatios);
  };

  // Ajuster avec les boutons +/- (pas de 10mm)
  const adjustPosition = (index: number, delta: number) => {
    const currentPos = dividerPositions[index];
    const newPos = currentPos + delta;

    const minPos = index === 0 ? 50 : dividerPositions[index - 1] + 50;
    const maxPos = index === dividerPositions.length - 1
      ? totalDimensionMm - 50
      : dividerPositions[index + 1] - 50;

    const clampedValue = Math.max(minPos, Math.min(maxPos, newPos));

    const newPositions = [...dividerPositions];
    newPositions[index] = clampedValue;
    setDividerPositions(newPositions);
    setInputValues(newPositions.map(p => p.toString()));

    const newRatios = positionsToRatios(newPositions);
    onRatiosChange(newRatios);
  };

  // Calculer la taille de chaque section
  const getSectionSizes = (): number[] => {
    const sizes: number[] = [];
    let prevPos = 0;
    for (const pos of dividerPositions) {
      sizes.push(pos - prevPos);
      prevPos = pos;
    }
    sizes.push(totalDimensionMm - prevPos);
    return sizes;
  };

  const sectionSizes = getSectionSizes();
  const labelPlural = isHorizontal ? 'étagères' : 'colonnes';
  const dimensionLabel = isHorizontal ? 'Hauteur' : 'Largeur';

  return (
    <div className="border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '4px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isHorizontal ? (
            <Rows3 className="h-5 w-5 text-[#1A1917]" />
          ) : (
            <Columns3 className="h-5 w-5 text-[#1A1917]" />
          )}
          <span className="text-base font-semibold text-[#1A1917]">
            Ajuster les {labelPlural}
          </span>
        </div>
        <span className="font-mono text-sm text-[#706F6C]">
          {dimensionLabel}: {totalDimensionMm} mm
        </span>
      </div>

      {/* Liste des positions */}
      <div className="space-y-3">
        {dividerPositions.map((pos, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#706F6C] w-24">
              {isHorizontal ? `Étagère ${index + 1}` : `Séparation ${index + 1}`}
            </span>
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => adjustPosition(index, -10)}
                className="flex h-10 w-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                style={{ borderRadius: '4px' }}
                title="-10 mm"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="relative flex-1 max-w-32">
                <input
                  type="number"
                  value={inputValues[index]}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onBlur={() => applyValue(index)}
                  onKeyDown={(e) => e.key === 'Enter' && applyValue(index)}
                  className="w-full text-center font-mono text-base font-bold border-2 border-[#E8E6E3] focus:border-[#1A1917] outline-none py-2 pr-10"
                  style={{ borderRadius: '4px' }}
                  min={50}
                  max={totalDimensionMm - 50}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#706F6C]">mm</span>
              </div>
              <button
                type="button"
                onClick={() => adjustPosition(index, 10)}
                className="flex h-10 w-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                style={{ borderRadius: '4px' }}
                title="+10 mm"
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Résumé des tailles */}
      <div className="mt-4 pt-4 border-t border-[#E8E6E3]">
        <p className="text-sm text-[#706F6C] mb-2">Dimensions des sections :</p>
        <div className="flex flex-wrap gap-2">
          {sectionSizes.map((size, index) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E6E3] font-mono text-sm text-[#1A1917]"
              style={{ borderRadius: '4px' }}
            >
              {isHorizontal ? `Niveau ${index + 1}` : `Colonne ${index + 1}`}: <strong>{size} mm</strong>
            </span>
          ))}
        </div>
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
    { id: 'push_door' as ZoneContent, icon: Hand, label: 'Porte Push', desc: 'Sans poignée' },
    { id: 'mirror_door' as ZoneContent, icon: Sparkles, label: 'Porte vitrée', desc: 'Porte vitrée' },
  ];

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
          className="flex items-center gap-1 hover:text-[#3B82F6] transition-colors"
        >
          <BoxSelect className="h-3 w-3 text-[#3B82F6]" />
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
          <div className="border-2 border-[#FF9800] bg-[#FF9800]/5 p-6 shadow-md" style={{ borderRadius: '4px' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center bg-[#FF9800] text-white" style={{ borderRadius: '2px' }}>
                <DoorClosed className="h-7 w-7" />
              </div>
              <div>
                <span className="block text-xl font-bold text-[#1A1917]">{selectedZoneIds.length} compartiments sélectionnés</span>
                <p className="text-sm text-[#706F6C]">Souhaitez-vous poser une porte sur cet ensemble ?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onGroupZones?.(selectedZoneIds, 'door')}
                className="flex items-center justify-center gap-3 w-full bg-[#1A1917] text-white py-4 px-6 text-lg font-bold transition-all hover:bg-[#2A2927]"
                style={{ borderRadius: '2px' }}
              >
                Poser une porte simple
              </button>
              
              <button
                type="button"
                onClick={() => onGroupZones?.(selectedZoneIds, 'door_double')}
                className="flex items-center justify-center gap-3 w-full bg-white border-2 border-[#1A1917] text-[#1A1917] py-3 px-6 text-base font-semibold transition-all hover:bg-[#F5F5F4]"
                style={{ borderRadius: '2px' }}
              >
                Poser une double porte
              </button>
            </div>
            
            <p className="mt-4 text-center text-xs text-[#706F6C]">
              La porte recouvrira l'intégralité de la zone sélectionnée en orange.
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

                  {DOOR_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
                    const isActive = (isLeaf ? (selectedZone.content ?? 'empty') : (selectedZone.doorContent ?? 'empty')) === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => isLeaf ? onSetContent(selectedZone.id, id) : onSetDoorContent?.(selectedZone.id, id)}
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
              </div>

              {/* Sélecteur de poignée (pour leaf et parent) */}
              {onSetHandleType && (
                (isLeaf && (
                  selectedZone.content === 'drawer' || 
                  selectedZone.content === 'door' || 
                  selectedZone.content === 'door_right' || 
                  selectedZone.content === 'door_double' || 
                  selectedZone.content === 'mirror_door' ||
                  selectedZone.content === 'push_drawer' ||
                  selectedZone.content === 'push_door'
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