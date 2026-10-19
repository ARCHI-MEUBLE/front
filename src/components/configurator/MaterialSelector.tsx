/* ****************************************
 * 
 * A panel for selecting materials and colors.
 *
 * 
 * ******************************************/


import { useMemo, useState } from 'react';
import { Archive, Box, DoorClosed, Frame, PanelBottom, Rows3, type LucideIcon } from 'lucide-react';
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
    displayColorName((allColors.find((c) => c.id === entry.colorId) ?? palette.find((c) => isSameColor(entry, c)))?.name) || 'Couleur par défaut';

  const components = COMPONENT_DEFINITIONS.filter(({ key }) => !hiddenComponents.includes(key));
  const active = components.some((c) => c.key === activeComponent) ? activeComponent : 'structure';
  const activeDefinition = COMPONENT_DEFINITIONS.find((c) => c.key === active)!;
  const activeColor = palette.find((c) => isSameColor(componentColors[active], c));

  // Pastille de couleur : la couleur choisie est entourée de bleu et porte une coche, sans être assombrie.
  // Le nom s'affiche dessous quand la place le permet (sur téléphone, la palette est trop serrée)
  const swatchButton = (component: ColorComponent, color: SampleColor, showName = false) => {
    const isSelected = isSameColor(componentColors[component], color);
    return (
      <button
        key={color.id}
        type="button"
        onClick={() => onComponentColorChange(component, color)}
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
          {/* ── Ordinateur : grille des parties du meuble + palette de la partie choisie ── */}
          <div className="hidden space-y-4 lg:block">
            <div>
              <span className="eyebrow-lg text-black/65">Couleurs</span>
              <p className="mt-1 text-xs text-black/65">Choisissez une partie du meuble, puis sa couleur.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {components.map(({ key, label, Icon }) => {
                const isActive = active === key;
                const entry = componentColors[key];
                return (
                  // La partie en cours de réglage est cerclée de bleu, comme la palette qui lui correspond dessous
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveComponent(key)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 border p-2 text-left text-black transition-all ${
                      isActive
                        ? 'border-am-navy bg-am-mist/30 ring-1 ring-am-navy'
                        : 'border-black/10 bg-white hover:border-am-navy'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <MiniSwatch hex={entry?.hex} imageUrl={entry?.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate text-xs font-medium">{label}</span>
                      </div>
                      <p className="truncate text-[10px] text-black/65">{colorName(entry)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border border-am-navy bg-white p-4" style={{ borderRadius: '2px' }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <activeDefinition.Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-medium text-black">{activeDefinition.label}</h4>
                    <p className="text-xs text-black/65">
                      {activeDefinition.desc} · <span className="font-medium text-black">{colorName(componentColors[active])}</span>
                    </p>
                  </div>
                </div>
                {activeColor && (
                  <button
                    type="button"
                    onClick={() => onApplyToAll(activeColor)}
                    className="text-right text-xs text-am-navy underline hover:no-underline"
                  >
                    Appliquer « {displayColorName(activeColor.name)} » à tout le meuble
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
                {palette.map((color) => swatchButton(active, color, true))}
              </div>
            </div>
          </div>

          {/* ── Téléphone : toutes les couleurs à la suite, une palette par partie du meuble ── */}
          <div className="space-y-5 lg:hidden">
            <span className="eyebrow-lg text-black/65">Couleurs</span>
            {components.map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <MiniSwatch hex={componentColors[key]?.hex} imageUrl={componentColors[key]?.imageUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black">{label}</p>
                    <p className="truncate text-[11px] text-black/65">
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
