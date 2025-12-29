import { useMemo, useState } from 'react';
import type { SampleType, SampleColor } from '@/lib/apiClient';

const MATERIAL_ORDER = [
  'Aggloméré',
  'MDF + revêtement (mélaminé)',
  'Plaqué bois',
];

const MATERIAL_KEY_MAP: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

export type ComponentColors = {
  structure: { colorId: number | null; hex: string | null };
  drawers: { colorId: number | null; hex: string | null };
  doors: { colorId: number | null; hex: string | null };
  shelves: { colorId: number | null; hex: string | null };
  back: { colorId: number | null; hex: string | null };
  base: { colorId: number | null; hex: string | null };
};

interface MaterialSelectorProps {
  materialsMap: Record<string, SampleType[]>;
  selectedMaterialKey: string;
  selectedColorId: number | null;
  onMaterialChange: (materialKey: string) => void;
  onColorChange: (color: SampleColor) => void;
  loading?: boolean;
  // Multi-color mode
  useMultiColor?: boolean;
  onUseMultiColorChange?: (value: boolean) => void;
  componentColors?: ComponentColors;
  onComponentColorChange?: (component: keyof ComponentColors, colorId: number, hex: string) => void;
}

const COMPONENT_DEFINITIONS = [
  { key: 'structure' as const, label: 'Structure', icon: '🏗️', desc: 'Corps du meuble' },
  { key: 'drawers' as const, label: 'Tiroirs', icon: '📦', desc: 'Façades de tiroirs' },
  { key: 'doors' as const, label: 'Portes', icon: '🚪', desc: 'Portes battantes' },
  { key: 'shelves' as const, label: 'Étagères', icon: '📏', desc: 'Tablettes intérieures' },
  { key: 'back' as const, label: 'Fond', icon: '📋', desc: 'Panneau arrière' },
  { key: 'base' as const, label: 'Socle', icon: '⬛', desc: 'Base du meuble' },
];

export default function MaterialSelector({
  materialsMap,
  selectedMaterialKey,
  selectedColorId,
  onMaterialChange,
  onColorChange,
  loading = false,
  useMultiColor = false,
  onUseMultiColorChange,
  componentColors,
  onComponentColorChange,
}: MaterialSelectorProps) {
  // Ordonner les matériaux
  const orderedMaterialLabels = useMemo(() => {
    const collected = new Set<string>();
    const ordered: string[] = [];

    for (const label of MATERIAL_ORDER) {
      if (materialsMap[label] && !collected.has(label)) {
        ordered.push(label);
        collected.add(label);
      }
    }

    Object.keys(materialsMap)
      .filter((label) => !collected.has(label))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .forEach((label) => {
        ordered.push(label);
        collected.add(label);
      });

    return ordered;
  }, [materialsMap]);

  // Couleurs pour le matériau sélectionné
  const selectedMaterialLabel = MATERIAL_KEY_MAP[selectedMaterialKey] || selectedMaterialKey;
  const materialTypesForSelection = materialsMap[selectedMaterialLabel] || [];

  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    const list: SampleColor[] = [];
    const seen = new Set<number>();
    for (const type of materialTypesForSelection) {
      for (const colorOption of type.colors || []) {
        if (seen.has(colorOption.id)) continue;
        seen.add(colorOption.id);
        list.push(colorOption);
      }
    }
    return list;
  }, [materialTypesForSelection]);

  const selectedColor = colorsForMaterial.find((c) => c.id === selectedColorId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E6E3] pb-4">
          <h3 className="font-serif text-lg text-[#1A1917]">Matériaux & Finitions</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E8E6E3] pb-4">
        <h3 className="font-serif text-lg text-[#1A1917]">Matériaux & Finitions</h3>
        <p className="mt-1 text-xs text-[#706F6C]">
          Sélectionnez la structure puis la finition
        </p>
      </div>

      {/* Sélection du matériau */}
      <div className="space-y-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Structure
        </span>
        <div className="flex flex-wrap gap-2">
          {orderedMaterialLabels.map((label) => {
            const key = Object.entries(MATERIAL_KEY_MAP).find(([, v]) => v === label)?.[0] || label;
            const isActive = selectedMaterialKey === key;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onMaterialChange(key)}
                className={`border px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  isActive
                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                    : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle multi-couleurs */}
      {onUseMultiColorChange && (
        <div className="flex items-center justify-between gap-3 border border-[#E8E6E3] bg-[#FAFAF9] p-3 sm:p-4" style={{ borderRadius: '2px' }}>
          <div>
            <span className="text-sm font-medium text-[#1A1917]">Mode de coloration</span>
            <p className="mt-0.5 text-xs text-[#706F6C]">
              {useMultiColor
                ? 'Couleurs personnalisées par composant'
                : 'Couleur unique pour tout le meuble'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUseMultiColorChange(!useMultiColor)}
            className={`relative flex h-6 w-11 items-center border transition-colors ${
              useMultiColor ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-white'
            }`}
            style={{ borderRadius: '2px' }}
          >
            <span
              className={`block h-4 w-4 border transition-transform ${
                useMultiColor
                  ? 'translate-x-6 border-[#1A1917] bg-white'
                  : 'translate-x-1 border-[#E8E6E3] bg-[#706F6C]'
              }`}
              style={{ borderRadius: '1px' }}
            />
          </button>
        </div>
      )}

      {/* Mode multi-couleurs */}
      {useMultiColor && componentColors && onComponentColorChange && colorsForMaterial.length > 0 ? (
        <div className="space-y-4">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Couleurs par composant
          </span>
          <p className="text-xs text-[#706F6C]">
            Sélectionnez une couleur différente pour chaque partie du meuble
          </p>

          {COMPONENT_DEFINITIONS.map(({ key, label, icon, desc }) => (
            <div
              key={key}
              className="border border-[#E8E6E3] bg-white p-4"
              style={{ borderRadius: '2px' }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-[#1A1917]">{label}</h4>
                  <p className="text-xs text-[#706F6C]">{desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorsForMaterial.map((color) => {
                  const isActive = componentColors?.[key]?.colorId === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => onComponentColorChange?.(key, color.id, color.hex || '#D8C7A1')}
                      className={`flex items-center gap-2 border px-3 py-2 text-left text-xs transition-colors ${
                        isActive
                          ? 'border-[#1A1917] bg-[#FAFAF9]'
                          : 'border-[#E8E6E3] bg-white hover:border-[#1A1917]'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      <span
                        className="inline-flex h-6 w-6 flex-shrink-0 overflow-hidden border border-[#E8E6E3]"
                        style={{
                          borderRadius: '1px',
                          backgroundColor: color.image_url ? undefined : (color.hex || '#D8C7A1'),
                        }}
                      >
                        {color.image_url && (
                          <img src={color.image_url} alt={color.name || ''} className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className={`text-xs font-medium ${isActive ? 'text-[#1A1917]' : 'text-[#706F6C]'}`}>
                        {color.name || 'Sans nom'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode couleur unique */
        colorsForMaterial.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
              Finition
            </span>
            <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
              {colorsForMaterial.map((color) => {
                const isActive = selectedColorId === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onColorChange(color)}
                    className={`flex items-center gap-3 border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-[#1A1917] bg-[#FAFAF9]'
                        : 'border-[#E8E6E3] bg-white hover:border-[#1A1917]'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <div
                      className="h-10 w-10 flex-shrink-0 border border-[#E8E6E3] overflow-hidden"
                      style={{
                        borderRadius: '2px',
                        backgroundColor: color.image_url ? undefined : (color.hex || '#D8C7A1'),
                      }}
                    >
                      {color.image_url && (
                        <img
                          src={color.image_url}
                          alt={color.name || ''}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-[#1A1917]' : 'text-[#706F6C]'}`}>
                      {color.name || 'Sans nom'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Aperçu sélectionné (mode unique seulement) */}
      {!useMultiColor && selectedColor && (
        <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-3 sm:p-4" style={{ borderRadius: '2px' }}>
          <div className="flex gap-3 sm:gap-4">
            <div
              className="h-16 w-16 flex-shrink-0 border border-[#E8E6E3] overflow-hidden sm:h-24 sm:w-24"
              style={{
                borderRadius: '2px',
                backgroundColor: selectedColor.image_url ? undefined : (selectedColor.hex || '#D8C7A1'),
              }}
            >
              {selectedColor.image_url && (
                <img
                  src={selectedColor.image_url}
                  alt={selectedColor.name || ''}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
                Sélectionné
              </span>
              <h4 className="mt-1 truncate text-sm font-medium text-[#1A1917] sm:text-base">
                {selectedColor.name || 'Finition personnalisée'}
              </h4>
              <p className="mt-1 text-xs text-[#706F6C]">{selectedMaterialLabel}</p>
              <button
                type="button"
                className="mt-2 text-xs text-[#8B7355] underline hover:no-underline sm:mt-3"
                onClick={() => window.open('/samples', '_blank')}
              >
                Commander des échantillons
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
