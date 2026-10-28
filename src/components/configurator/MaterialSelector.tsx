/* ****************************************
 * 
 * A panel for selecting materials and colors.
 *
 * 
 * ******************************************/


import { useMemo, useState } from 'react';
import { Archive, Box, ChevronDown, DoorClosed, Frame, PanelBottom, Rows3, type LucideIcon } from 'lucide-react';
import type { SampleType, SampleColor } from '@/lib/apiClient';
import { displayColorName, displayMaterialName } from '@/lib/displayNames';
import ColorCheckBadge from './ColorCheckBadge';

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
      className={`${sizeClasses[size]} flex-shrink-0 border border-black/10 overflow-hidden`}
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
      className="h-8 w-8 flex-shrink-0 border border-black/10 overflow-hidden"
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

const COMPONENT_DEFINITIONS: { key: ColorComponent; label: string; Icon: LucideIcon; desc: string }[] = [
  { key: 'structure', label: 'Structure', Icon: Box, desc: 'Corps du meuble' },
  { key: 'doors', label: 'Portes', Icon: DoorClosed, desc: 'Toutes les portes' },
  { key: 'drawers', label: 'Tiroirs', Icon: Archive, desc: 'Toutes les façades de tiroirs' },
  { key: 'shelves', label: 'Étagères', Icon: Rows3, desc: 'Tablettes et séparations' },
  { key: 'back', label: 'Fond', Icon: Frame, desc: 'Panneau arrière' },
  { key: 'base', label: 'Socle', Icon: PanelBottom, desc: 'Base du meuble' },
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
  // Réglage par partie replié par défaut : la plupart des clients veulent une seule couleur pour tout le meuble
  const [showParts, setShowParts] = useState(false);

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
    displayColorName((allColors.find((c) => c.id === entry.colorId) ?? palette.find((c) => isSameColor(entry, c)))?.name) || 'Couleur par défaut';

  const components = COMPONENT_DEFINITIONS.filter(({ key }) => !hiddenComponents.includes(key));
  // Couleur commune du meuble : celle de la structure, si toutes les parties visibles la partagent
  const structureColor = palette.find((c) => isSameColor(componentColors.structure, c));
  const wholeColor = structureColor && components.every(({ key }) => isSameColor(componentColors[key], structureColor)) ? structureColor : undefined;
  const partsOpen = showParts || !wholeColor;

  // Pastille de couleur : la couleur choisie est entourée de bleu et porte une coche, sans être assombrie.
  // Le nom s'affiche dessous quand la place le permet (sur téléphone, la palette est trop serrée)
  const swatchButton = (color: SampleColor, isSelected: boolean, onSelect: () => void, showName = false) => {
    return (
      <button
        key={color.id}
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={displayColorName(color.name) || 'Couleur'}
        title={displayColorName(color.name) || 'Sans nom'}
        className="group flex min-w-0 flex-col gap-1.5 text-left"
      >
        <div
          className={`relative aspect-square border-2 p-0.5 transition-all ${
            isSelected ? 'border-am-navy ring-4 ring-am-navy/15' : 'border-black/10 group-hover:border-am-navy'
          }`}
          style={{ borderRadius: '2px' }}
        >
          <ColorSwatch color={color} size="fill" />
          {isSelected && <ColorCheckBadge />}
        </div>
        {showName && (
          <span className={`line-clamp-2 text-[11px] leading-tight ${isSelected ? 'font-medium text-black' : 'text-black/65'}`}>
            {displayColorName(color.name) || 'Sans nom'}
          </span>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin border-2 border-am-navy border-t-transparent" style={{ borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélection du matériau */}
      <div className="space-y-3">
        <span className="eyebrow-lg text-black/65">Matière</span>
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
                    ? 'border-am-navy bg-am-navy text-white'
                    : 'border-black/10 bg-white text-black hover:border-am-navy'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {displayMaterialName(label)}
              </button>
            );
          })}
        </div>
      </div>

      {palette.length > 0 && (
        <>
          {/* Une couleur pour tout le meuble, en un clic */}
          <div className="space-y-3">
            <div>
              <span className="eyebrow-lg text-black/65">Couleur du meuble</span>
              <p className="mt-1 text-xs text-black/65">
                {wholeColor ? (
                  <>
                    Tout le meuble en <span className="font-medium text-black">{displayColorName(wholeColor.name)}</span>
                  </>
                ) : (
                  'Couleurs personnalisées par partie : choisissez une couleur pour tout remettre à l’identique.'
                )}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5">
              {palette.map((color) => swatchButton(color, !!wholeColor && isSameColor(componentColors.structure, color), () => onApplyToAll(color), true))}
            </div>
          </div>

          {/* Réglage fin : une ligne de pastilles par partie, visibles toutes ensemble */}
          <div className="border border-black/10 bg-white" style={{ borderRadius: '2px' }}>
            <button
              type="button"
              onClick={() => setShowParts((open) => !open)}
              aria-expanded={partsOpen}
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
            >
              <span>
                <span className="block text-sm font-medium text-black">Personnaliser une partie</span>
                <span className="block text-xs text-black/65">Portes, tiroirs ou étagères d’une autre couleur</span>
              </span>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${partsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {partsOpen && (
              <div className="space-y-5 border-t border-black/10 p-3">
                {components.map(({ key, label, desc, Icon }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MiniSwatch hex={componentColors[key]?.hex} imageUrl={componentColors[key]?.imageUrl} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 text-sm font-medium text-black">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          {label}
                        </p>
                        <p className="truncate text-[11px] text-black/65">
                          {colorName(componentColors[key])} · {desc}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                      {palette.map((color) =>
                        swatchButton(color, isSameColor(componentColors[key], color), () => onComponentColorChange(key, color))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="text-xs text-am-navy underline hover:no-underline"
            onClick={() => window.open('/samples', '_blank')}
          >
            Commander des échantillons
          </button>
        </>
      )}
    </div>
  );
}
