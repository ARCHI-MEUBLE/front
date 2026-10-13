import { useMemo, useState } from 'react';
import type { SampleType, SampleColor } from '@/lib/apiClient';

// Composant pour afficher une couleur avec fallback si l'image ne charge pas
function ColorSwatch({ color, size = 'md' }: { color: SampleColor; size?: 'sm' | 'md' | 'lg' | 'fill' }) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16 sm:h-24 sm:w-24',
    fill: 'h-full w-full',
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

export type ComponentColors = {
  structure: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  drawers: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  doors: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  shelves: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  back: { colorId: number | null; hex: string | null; imageUrl?: string | null };
  base: { colorId: number | null; hex: string | null; imageUrl?: string | null };
};

export type ColorComponent = keyof ComponentColors;
type ComponentColor = ComponentColors[ColorComponent];

interface MaterialSelectorProps {
  materialsMap: Record<string, SampleType[]>;
  selectedMaterialKey: string;
  onMaterialChange: (materialKey: string) => void;
  loading?: boolean;
  // Couleur actuelle de chaque partie du meuble
  componentColors: ComponentColors;
  onComponentColorChange: (component: ColorComponent, color: SampleColor) => void;
  onApplyToAll: (color: SampleColor) => void;
  // Parties absentes du meuble (ex. pas de porte) : inutile de proposer leur couleur
  hiddenComponents?: ColorComponent[];
}

const COMPONENT_DEFINITIONS: { key: ColorComponent; label: string; icon: string; desc: string }[] = [
  { key: 'structure', label: 'Structure', icon: '🏗️', desc: 'Corps du meuble' },
  { key: 'doors', label: 'Portes', icon: '🚪', desc: 'Toutes les portes' },
  { key: 'drawers', label: 'Tiroirs', icon: '📦', desc: 'Toutes les façades de tiroirs' },
  { key: 'shelves', label: 'Étagères', icon: '📏', desc: 'Tablettes et séparations' },
  { key: 'back', label: 'Fond', icon: '📋', desc: 'Panneau arrière' },
  { key: 'base', label: 'Socle', icon: '⬛', desc: 'Base du meuble' },
];

const isSameColor = (entry: ComponentColor | undefined, color: SampleColor) =>
  !!entry &&
  (entry.colorId === color.id ||
    (!!entry.hex && entry.hex === color.hex && (entry.imageUrl ?? null) === (color.image_url ?? null)));

export default function MaterialSelector({
  materialsMap,
  selectedMaterialKey,
  onMaterialChange,
  loading = false,
  componentColors,
  onComponentColorChange,
  onApplyToAll,
  hiddenComponents = [],
}: MaterialSelectorProps) {
  // Partie dont la palette est ouverte (sur ordinateur)
  const [activeComponent, setActiveComponent] = useState<ColorComponent>('structure');

  // Ordonner les matériaux dynamiquement - tous les matériaux de l'API sont affichés
  const orderedMaterialLabels = useMemo(() => {
    return Object.keys(materialsMap).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [materialsMap]);

  // Retrouver le label correct (casse et accents ignorés)
  const selectedMaterialLabel = useMemo(() => {
    if (materialsMap[selectedMaterialKey]) return selectedMaterialKey;
    const normalizedKey = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const target = normalizedKey(selectedMaterialKey);
    return Object.keys(materialsMap).find((k) => normalizedKey(k) === target) ?? selectedMaterialKey;
  }, [selectedMaterialKey, materialsMap]);

  // Toutes les couleurs de la matière (doublons compris) : sert à retrouver le nom d'une couleur choisie
  const allColors = useMemo<SampleColor[]>(
    () => (materialsMap[selectedMaterialLabel] || []).flatMap((type) => type.colors || []),
    [materialsMap, selectedMaterialLabel]
  );

  // Palette affichée : une seule fois chaque couleur visible, triée par nom
  const palette = useMemo<SampleColor[]>(() => {
    const seen = new Set<string>();
    return allColors
      .filter((color) => {
        const key = `${color.name}-${color.hex}-${color.image_url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
  }, [allColors]);

  const colorName = (entry: ComponentColor) =>
    (allColors.find((c) => c.id === entry.colorId) ?? palette.find((c) => isSameColor(entry, c)))?.name || 'Couleur par défaut';

  const components = COMPONENT_DEFINITIONS.filter(({ key }) => !hiddenComponents.includes(key));
  const active = components.some((c) => c.key === activeComponent) ? activeComponent : 'structure';
  const activeDefinition = COMPONENT_DEFINITIONS.find((c) => c.key === active)!;
  const activeColor = palette.find((c) => isSameColor(componentColors[active], c));

  const swatchButton = (component: ColorComponent, color: SampleColor) => {
    const isSelected = isSameColor(componentColors[component], color);
    return (
      <button
        key={color.id}
        type="button"
        onClick={() => onComponentColorChange(component, color)}
        aria-pressed={isSelected}
        aria-label={color.name || 'Couleur'}
        className={`relative aspect-square overflow-hidden border-2 p-0.5 transition-all ${
          isSelected ? 'border-[#1A1917] ring-2 ring-[#1A1917] ring-offset-1' : 'border-[#E8E6E3] hover:border-[#1A1917]'
        }`}
        style={{ borderRadius: '2px' }}
        title={color.name || 'Sans nom'}
      >
        <ColorSwatch color={color} size="fill" />
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg className="h-4 w-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélection du matériau */}
      <div className="space-y-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">Matière</span>
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

      {palette.length > 0 && (
        <>
          {/* ── Ordinateur : grille des parties du meuble + palette de la partie choisie ── */}
          <div className="hidden space-y-4 lg:block">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">Couleurs</span>
              <p className="mt-1 text-xs text-[#706F6C]">Choisissez une partie du meuble, puis sa couleur.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {components.map(({ key, label, icon }) => {
                const isActive = active === key;
                const entry = componentColors[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveComponent(key)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 border p-2 text-left transition-all ${
                      isActive
                        ? 'border-[#1A1917] bg-[#1A1917] text-white'
                        : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <MiniSwatch hex={entry?.hex} imageUrl={entry?.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{icon}</span>
                        <span className="truncate text-xs font-medium">{label}</span>
                      </div>
                      <p className={`truncate text-[10px] ${isActive ? 'text-white/70' : 'text-[#706F6C]'}`}>{colorName(entry)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border border-[#1A1917] bg-white p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activeDefinition.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-[#1A1917]">{activeDefinition.label}</h4>
                    <p className="text-xs text-[#706F6C]">{activeDefinition.desc}</p>
                  </div>
                </div>
                {activeColor && (
                  <button
                    type="button"
                    onClick={() => onApplyToAll(activeColor)}
                    className="text-right text-xs text-[#8B7355] underline hover:no-underline"
                  >
                    Appliquer « {activeColor.name} » à tout le meuble
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {palette.map((color) => swatchButton(active, color))}
              </div>
            </div>
          </div>

          {/* ── Téléphone : toutes les couleurs à la suite, une palette par partie du meuble ── */}
          <div className="space-y-5 lg:hidden">
            <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">Couleurs</span>
            {components.map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <MiniSwatch hex={componentColors[key]?.hex} imageUrl={componentColors[key]?.imageUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1917]">{label}</p>
                    <p className="truncate text-[11px] text-[#706F6C]">
                      {colorName(componentColors[key])} · {desc}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                  {palette.map((color) => swatchButton(key, color))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="text-xs text-[#8B7355] underline hover:no-underline"
            onClick={() => window.open('/samples', '_blank')}
          >
            Commander des échantillons
          </button>
        </>
      )}
    </div>
  );
}
