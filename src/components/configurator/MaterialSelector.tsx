import { useMemo } from 'react';
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

interface MaterialSelectorProps {
  materialsMap: Record<string, SampleType[]>;
  selectedMaterialKey: string;
  selectedColorId: number | null;
  onMaterialChange: (materialKey: string) => void;
  onColorChange: (color: SampleColor) => void;
  loading?: boolean;
}

export default function MaterialSelector({
  materialsMap,
  selectedMaterialKey,
  selectedColorId,
  onMaterialChange,
  onColorChange,
  loading = false,
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
                className={`border px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Sélection de la couleur */}
      {colorsForMaterial.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Finition
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
      )}

      {/* Aperçu sélectionné */}
      {selectedColor && (
        <div className="border border-[#E8E6E3] bg-[#FAFAF9] p-4" style={{ borderRadius: '2px' }}>
          <div className="flex gap-4">
            <div
              className="h-24 w-24 flex-shrink-0 border border-[#E8E6E3] overflow-hidden"
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
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
                Sélectionné
              </span>
              <h4 className="mt-1 font-medium text-[#1A1917]">
                {selectedColor.name || 'Finition personnalisée'}
              </h4>
              <p className="mt-1 text-xs text-[#706F6C]">{selectedMaterialLabel}</p>
              <button
                type="button"
                className="mt-3 text-xs text-[#8B7355] underline hover:no-underline"
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
