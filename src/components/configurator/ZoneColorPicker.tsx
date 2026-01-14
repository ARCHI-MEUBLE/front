import React, { useMemo } from 'react';
import { X, Palette } from 'lucide-react';
import type { SampleColor, SampleType } from '@/lib/apiClient';
import type { Zone, ZoneColor } from './ZoneEditor/types';

interface ZoneColorPickerProps {
  zone: Zone;
  materialsMap: Record<string, SampleType[]>;
  selectedMaterialKey: string;
  defaultColor: string;
  defaultImageUrl?: string | null;
  onColorChange: (zoneId: string, color: ZoneColor) => void;
  onClose: () => void;
}

// Labels pour les types de contenu
const CONTENT_LABELS: Record<string, string> = {
  drawer: 'Tiroir',
  push_drawer: 'Tiroir',
  door: 'Porte',
  door_right: 'Porte',
  door_double: 'Portes',
  push_door: 'Porte',
  mirror_door: 'Porte vitrée',
};

export default function ZoneColorPicker({
  zone,
  materialsMap,
  selectedMaterialKey: initialMaterialKey,
  defaultColor,
  defaultImageUrl,
  onColorChange,
  onClose,
}: ZoneColorPickerProps) {
  // Récupérer les couleurs disponibles pour le matériau sélectionné
  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    // Résolution robuste du matériau dans la map
    let materialKey = initialMaterialKey;
    if (!materialsMap[materialKey]) {
      const keys = Object.keys(materialsMap);
      const normalizedTarget = materialKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const match = keys.find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedTarget);
      if (match) materialKey = match;
    }

    console.log('🎨 ZoneColorPicker - materialKey résolu:', materialKey);
    const materialTypes = materialsMap[materialKey] || [];
    console.log('🎨 ZoneColorPicker - materialTypes trouvés:', materialTypes.length);
    const list: SampleColor[] = [];
    const seen = new Set<number>();

    for (const type of materialTypes) {
      for (const colorOption of type.colors || []) {
        if (seen.has(colorOption.id)) continue;
        seen.add(colorOption.id);
        list.push(colorOption);
      }
    }
    return list;
  }, [materialsMap, initialMaterialKey]);

  const contentLabel = zone.content ? CONTENT_LABELS[zone.content] || 'Élément' : 'Élément';
  const currentColor = zone.zoneColor?.hex || defaultColor;

  const handleSelectColor = (colorOption: SampleColor) => {
    onColorChange(zone.id, {
      colorId: colorOption.id,
      hex: colorOption.hex || defaultColor,
      imageUrl: colorOption.image_url || null,
    });
  };

  const handleResetColor = () => {
    onColorChange(zone.id, {
      colorId: null,
      hex: null,
      imageUrl: null,
    });
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 w-72 bg-white shadow-2xl border border-[#E8E6E3] overflow-hidden" style={{ borderRadius: '4px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E6E3] bg-[#FAFAF9]">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-[#1A1917]" />
          <span className="text-sm font-medium text-[#1A1917]">
            Couleur du {contentLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#706F6C] hover:text-[#1A1917] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current color preview */}
      <div className="px-4 py-3 border-b border-[#E8E6E3]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 border border-[#E8E6E3] flex-shrink-0"
            style={{
              backgroundColor: currentColor,
              backgroundImage: zone.zoneColor?.imageUrl ? `url(${zone.zoneColor.imageUrl})` : undefined,
              backgroundSize: 'cover',
              borderRadius: '2px',
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#706F6C]">Couleur actuelle</p>
            <p className="text-sm font-medium text-[#1A1917] truncate">
              {zone.zoneColor?.hex ? 'Personnalisée' : 'Par défaut'}
            </p>
          </div>
          {zone.zoneColor?.hex && (
            <button
              type="button"
              onClick={handleResetColor}
              className="text-xs text-[#706F6C] hover:text-[#1A1917] underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Color grid */}
      <div className="p-3 max-h-48 overflow-y-auto">
        {colorsForMaterial.length > 0 ? (
          <div className="grid grid-cols-6 gap-2">
            {colorsForMaterial.map((colorOption) => {
              const isSelected = zone.zoneColor?.colorId === colorOption.id;
              return (
                <button
                  key={colorOption.id}
                  type="button"
                  onClick={() => handleSelectColor(colorOption)}
                  className={`relative w-9 h-9 border-2 transition-all hover:scale-110 ${
                    isSelected
                      ? 'border-[#1A1917] ring-2 ring-[#1A1917] ring-offset-1'
                      : 'border-[#E8E6E3] hover:border-[#706F6C]'
                  }`}
                  style={{
                    backgroundColor: colorOption.hex || '#D8C7A1',
                    backgroundImage: colorOption.image_url ? `url(${colorOption.image_url})` : undefined,
                    backgroundSize: 'cover',
                    borderRadius: '2px',
                  }}
                  title={colorOption.name || 'Couleur'}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#706F6C] text-center py-4">
            Aucune couleur disponible pour ce matériau
          </p>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-[#FAFAF9] border-t border-[#E8E6E3]">
        <p className="text-xs text-[#706F6C]">
          Cliquez sur une couleur pour l'appliquer à ce {contentLabel.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
