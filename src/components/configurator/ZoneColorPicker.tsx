import React, { useMemo } from 'react';
import { X, Palette } from 'lucide-react';
import type { SampleColor, SampleType } from '@/lib/apiClient';
import type { Zone, ZoneColor } from './ZoneEditor/types';
import ColorCheckBadge from './ColorCheckBadge';
import { displayColorName } from '@/lib/displayNames';

interface ZoneColorPickerProps {
  zone: Zone;
  materialsMap: Record<string, SampleType[]>;
  selectedMaterialKey: string;
  // Couleur que prend la façade tant qu'on ne lui en donne pas une autre (celle des portes ou des tiroirs)
  defaultColor: string;
  defaultImageUrl?: string | null;
  defaultColorName?: string | null;
  onColorChange: (zoneId: string, color: ZoneColor) => void;
  onClose: () => void;
  // Intégré dans le panneau latéral au lieu de flotter sur le viewer
  inline?: boolean;
}

// Labels pour les types de contenu
const CONTENT_LABELS: Record<string, string> = {
  drawer: 'Tiroir',
  push_drawer: 'Tiroir',
  door: 'Porte',
  door_right: 'Porte',
  door_double: 'Portes',
  push_door: 'Porte',
  push_door_right: 'Porte',
  mirror_door: 'Porte vitrée',
  mirror_door_right: 'Porte vitrée',
  niche: 'Niche',
};

export default function ZoneColorPicker({
  zone,
  materialsMap,
  selectedMaterialKey: initialMaterialKey,
  defaultColor,
  defaultImageUrl,
  defaultColorName,
  onColorChange,
  onClose,
  inline = false,
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
  const target = zone.content === 'niche' ? 'cette niche' : 'cette façade';
  const hasCustomColor = !!zone.zoneColor?.hex;
  const currentColor = zone.zoneColor?.hex || defaultColor;
  // Une couleur propre à la façade passe devant celle de la partie du meuble, texture comprise
  const currentImageUrl = hasCustomColor ? zone.zoneColor?.imageUrl : defaultImageUrl;
  const customColorName = colorsForMaterial.find((option) => option.id === zone.zoneColor?.colorId)?.name;

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
    <div
      className={
        inline
          ? 'overflow-hidden border border-black/10 bg-white'
          : 'absolute bottom-4 left-4 z-30 w-72 overflow-hidden border border-black/10 bg-white shadow-2xl'
      }
      style={{ borderRadius: inline ? '2px' : '4px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-am-mist/15">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-black" />
          <span className="text-sm font-medium text-black">
            Couleur · {contentLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-black/65 hover:text-black transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current color preview */}
      <div className="px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 border border-black/10 flex-shrink-0"
            style={{
              backgroundColor: currentColor,
              backgroundImage: currentImageUrl ? `url(${currentImageUrl})` : undefined,
              backgroundSize: 'cover',
              borderRadius: '2px',
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-black/65">
              {hasCustomColor ? `Couleur de ${target}` : 'Couleur actuelle · par défaut'}
            </p>
            <p className="text-sm font-medium text-black truncate">
              {hasCustomColor ? displayColorName(customColorName) || 'Personnalisée' : displayColorName(defaultColorName) || 'Par défaut'}
            </p>
          </div>
          {hasCustomColor && (
            <button
              type="button"
              onClick={handleResetColor}
              className="text-xs text-black/65 hover:text-black underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Color grid */}
      <div className="p-3 max-h-48 overflow-y-auto">
        {colorsForMaterial.length > 0 ? (
          <div className={inline ? 'grid grid-cols-6 gap-2 sm:grid-cols-8' : 'grid grid-cols-6 gap-2'}>
            {colorsForMaterial.map((colorOption) => {
              const isSelected = zone.zoneColor?.colorId === colorOption.id;
              return (
                <button
                  key={colorOption.id}
                  type="button"
                  onClick={() => handleSelectColor(colorOption)}
                  aria-pressed={isSelected}
                  aria-label={displayColorName(colorOption.name) || 'Couleur'}
                  className={`relative aspect-square border-2 transition-all hover:scale-110 ${inline ? '' : 'h-9 w-9'} ${
                    isSelected
                      ? 'border-am-navy ring-4 ring-am-navy/15'
                      : 'border-black/10 hover:border-black/40'
                  }`}
                  style={{
                    backgroundColor: colorOption.hex || '#D8C7A1',
                    backgroundImage: colorOption.image_url ? `url(${colorOption.image_url})` : undefined,
                    backgroundSize: 'cover',
                    borderRadius: '2px',
                  }}
                  title={displayColorName(colorOption.name) || 'Couleur'}
                >
                  {isSelected && <ColorCheckBadge />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-black/65 text-center py-4">
            Aucune couleur disponible pour ce matériau
          </p>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-am-mist/15 border-t border-black/10">
        <p className="text-xs text-black/65">
          Cliquez sur une couleur pour l&apos;appliquer à {target}
        </p>
      </div>
    </div>
  );
}
