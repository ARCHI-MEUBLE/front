import { useMemo, useState, useCallback } from 'react';
import type { SampleType, SampleColor } from '@/lib/apiClient';

// Composant pour afficher une couleur avec fallback si l'image ne charge pas
function ColorSwatch({ color, size = 'md' }: { color: SampleColor; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16 sm:h-24 sm:w-24',
  };

  // L'URL de l'image (le rewrite dans next.config.js gère la redirection vers le backend)
  const imageUrl = color.image_url;
  const hasValidImage = imageUrl && !imgError;
  const bgColor = hasValidImage ? undefined : (color.hex || '#D8C7A1');

  return (
    <div
      className={`${sizeClasses[size]} flex-shrink-0 border border-[#E8E6E3] overflow-hidden`}
      style={{
        borderRadius: '2px',
        backgroundColor: bgColor,
      }}
    >
      {imageUrl && !imgError && (
        <img
          src={imageUrl}
          alt={color.name || ''}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

// Mini swatch pour les aperçus compacts
function MiniSwatch({ hex, imageUrl }: { hex?: string | null; imageUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const hasValidImage = imageUrl && !imgError;
  const bgColor = hasValidImage ? undefined : (hex || '#D8C7A1');

  return (
    <div
      className="h-8 w-8 flex-shrink-0 border border-[#E8E6E3] overflow-hidden"
      style={{
        borderRadius: '2px',
        backgroundColor: bgColor,
      }}
    >
      {imageUrl && !imgError && (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

// Mapping pour les anciens matériaux uniquement (backward compatibility)
export const MATERIAL_KEY_MAP: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

export type ComponentColors = {
  structure: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  drawers: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  doors: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  shelves: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  back: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  base: { colorId: number | null; hex: string | null; imageUrl?: string | null };
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
  onComponentColorChange?: (component: keyof ComponentColors, colorId: number, hex: string, imageUrl?: string | null) => void;
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
  // État pour le composant en cours d'édition en mode multi-couleurs
  const [activeComponent, setActiveComponent] = useState<keyof ComponentColors | null>(null);

  // Ordonner les matériaux dynamiquement - tous les matériaux de l'API sont affichés
  const orderedMaterialLabels = useMemo(() => {
    // On prend TOUS les matériaux présents dans la map (venant de l'API)
    const materials = Object.keys(materialsMap);

    // Tri alphabétique simple en français
    return materials.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [materialsMap]);

  // Retrouver le label correct
  const selectedMaterialLabel = useMemo(() => {
    console.log('[DEBUG] selectedMaterialKey:', selectedMaterialKey);
    console.log('[DEBUG] materialsMap keys:', Object.keys(materialsMap));
    
    // Essai 1: Correspondance exacte (priorité)
    if (materialsMap[selectedMaterialKey]) {
      console.log('[DEBUG] Found exact match in map');
      return selectedMaterialKey;
    }
    
    // Essai 2: Mapping statique (pour les anciens matériaux)
    const mapped = MATERIAL_KEY_MAP[selectedMaterialKey];
    if (mapped && materialsMap[mapped]) {
      console.log('[DEBUG] Found mapped match in map:', mapped);
      return mapped;
    }

    // Essai 3: Recherche insensible à la casse
    const keys = Object.keys(materialsMap);
    const caseInsensitiveKey = keys.find(k => k.toLowerCase() === selectedMaterialKey.toLowerCase());
    if (caseInsensitiveKey) {
      console.log('[DEBUG] Found case-insensitive match:', caseInsensitiveKey);
      return caseInsensitiveKey;
    }

    console.log('[DEBUG] No match found in map for:', selectedMaterialKey);
    return selectedMaterialKey;
  }, [selectedMaterialKey, materialsMap]);
  const materialTypesForSelection = materialsMap[selectedMaterialLabel] || [];

  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    console.log('[DEBUG] Extracting colors for materialTypes:', materialTypesForSelection);
    const list: SampleColor[] = [];
    const seen = new Set<string>(); // Utiliser une clé combinée pour l'unicité
    
    for (const type of materialTypesForSelection) {
      if (type.colors && Array.isArray(type.colors)) {
        for (const colorOption of type.colors) {
          // Clé d'unicité basée sur le nom, l'hex et l'image pour éviter les doublons visuels
          // mais permettre des couleurs différentes avec le même nom si nécessaire
          const uniqueKey = `${colorOption.name}-${colorOption.hex}-${colorOption.image_url}`;
          
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);
          list.push(colorOption);
        }
      }
    }
    // Trier par nom pour la cohérence
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    
    console.log('[DEBUG] Total unique colors found:', list.length);
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
            const isActive = selectedMaterialLabel === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onMaterialChange(label)}
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
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
              Couleurs par composant
            </span>
            <p className="mt-1 text-xs text-[#706F6C]">
              Cliquez sur un composant pour changer sa couleur
            </p>
          </div>

          {/* Grille des composants - vue compacte */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPONENT_DEFINITIONS.map(({ key, label, icon }) => {
              const isActive = activeComponent === key;
              const componentColor = componentColors?.[key];
              const colorName = colorsForMaterial.find(c => c.id === componentColor?.colorId)?.name;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveComponent(isActive ? null : key)}
                  className={`flex items-center gap-2 border p-2 text-left transition-all ${
                    isActive
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <MiniSwatch hex={componentColor?.hex} imageUrl={componentColor?.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-medium truncate">{label}</span>
                    </div>
                    <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-[#706F6C]'}`}>
                      {colorName || 'Non défini'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Palette de couleurs pour le composant actif */}
          {activeComponent && (
            <div
              className="border border-[#1A1917] bg-white p-4 animate-in slide-in-from-top-2 duration-200"
              style={{ borderRadius: '2px' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {COMPONENT_DEFINITIONS.find(c => c.key === activeComponent)?.icon}
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-[#1A1917]">
                      {COMPONENT_DEFINITIONS.find(c => c.key === activeComponent)?.label}
                    </h4>
                    <p className="text-xs text-[#706F6C]">
                      {COMPONENT_DEFINITIONS.find(c => c.key === activeComponent)?.desc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveComponent(null)}
                  className="p-1 text-[#706F6C] hover:text-[#1A1917] transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {colorsForMaterial.map((color) => {
                  const isSelected = componentColors?.[activeComponent]?.colorId === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        onComponentColorChange?.(activeComponent, color.id, color.hex || '#D8C7A1', color.image_url);
                      }}
                      className={`group relative aspect-square border-2 transition-all ${
                        isSelected
                          ? 'border-[#1A1917] ring-2 ring-[#1A1917] ring-offset-1'
                          : 'border-[#E8E6E3] hover:border-[#1A1917]'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title={color.name || 'Sans nom'}
                    >
                      <ColorSwatch color={color} size="md" />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <svg className="h-4 w-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Nom de la couleur sélectionnée */}
              {componentColors?.[activeComponent]?.colorId && (
                <p className="mt-3 text-center text-xs text-[#706F6C]">
                  {colorsForMaterial.find(c => c.id === componentColors[activeComponent]?.colorId)?.name || 'Couleur sélectionnée'}
                </p>
              )}
            </div>
          )}

          {/* Résumé visuel des couleurs */}
          <div className="border-t border-[#E8E6E3] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
                Aperçu
              </span>
              <div className="flex gap-1">
                {COMPONENT_DEFINITIONS.map(({ key }) => (
                  <div
                    key={key}
                    className="h-6 w-6 border border-[#E8E6E3]"
                    style={{
                      borderRadius: '2px',
                      backgroundColor: componentColors?.[key]?.hex || '#D8C7A1',
                      backgroundImage: componentColors?.[key]?.imageUrl ? `url(${componentColors[key].imageUrl})` : undefined,
                      backgroundSize: 'cover',
                    }}
                    title={COMPONENT_DEFINITIONS.find(c => c.key === key)?.label}
                  />
                ))}
              </div>
            </div>
          </div>
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
                    <ColorSwatch color={color} size="md" />
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
            <ColorSwatch color={selectedColor} size="lg" />
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
