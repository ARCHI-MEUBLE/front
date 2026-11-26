import { useMemo, useState } from 'react';
import { ChevronDown, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import type { Zone, ZoneContent } from './ZoneEditor/types';
import ColorCheckBadge from './ColorCheckBadge';
import { HandleModelPreview } from '@/components/handles/HandleModelPreview';
import {
  clearZoneHandles,
  defaultHandleModel,
  handleFacadeKind,
  HANDLE_ORIENTATION_LABELS,
  HANDLE_SHAPE_LABELS,
  LEGACY_HANDLE_LABELS,
  legacyOrientation,
  listHandleFacades,
  resolveZoneHandle,
  setZoneHandle,
  shapeHasOrientation,
  type HandleDefaults,
  type HandleFacadeKind,
  type HandleModel,
  type HandleOrientation,
  type ResolvedHandle,
} from '@/lib/configurator/handles';
import { getZoneFacade, isPushContent } from '@/lib/configurator/zoneStats';

interface HandleSelectorProps {
  rootZone: Zone;
  // Zone choisie seule dans la vue 3D ou le plan (null : aucune, ou plusieurs)
  selectedZone: Zone | null;
  models: HandleModel[];
  loading?: boolean;
  defaults: HandleDefaults;
  onDefaultsChange: (defaults: HandleDefaults) => void;
  // Toujours par l'historique de la page (annuler / rétablir)
  onRootZoneChange: (root: Zone) => void;
}

type HandleField = 'model' | 'orientation';

const FACADE_LABELS: Partial<Record<ZoneContent, string>> = {
  door: 'Porte',
  door_right: 'Porte',
  door_double: 'Double porte',
  mirror_door: 'Porte vitrée',
  mirror_door_right: 'Porte vitrée',
  drawer: 'Tiroir',
};

// Même ordre des boutons pour les portes et les tiroirs, pour ne pas dérouter
const ORIENTATIONS: HandleOrientation[] = ['horizontal', 'vertical'];

function facadeContent(zone: Zone): ZoneContent | undefined {
  return getZoneFacade(zone) ?? zone.doorContent;
}

// « Barre ronde noire, verticale » ; un bouton n'a pas de sens de pose, et l'ancien type le porte dans son nom
function handleLabel(resolved: ResolvedHandle): string {
  if (resolved.legacyType) return LEGACY_HANDLE_LABELS[resolved.legacyType];
  const name = resolved.model?.name ?? 'Poignée standard';
  return shapeHasOrientation(resolved.model?.shape)
    ? `${name}, ${HANDLE_ORIENTATION_LABELS[resolved.orientation].toLowerCase()}`
    : name;
}

function modelTitle(model: HandleModel): string {
  const length = model.length_mm ? ` · ${model.length_mm} mm` : '';
  return `${model.name} · ${HANDLE_SHAPE_LABELS[model.shape] ?? model.shape}${length}`;
}

// Vignette d'un modèle : même sélection que les pastilles de couleur (bordure, anneau et coche)
function ModelTile({
  model,
  orientation,
  selected,
  onSelect,
}: {
  model: HandleModel;
  orientation: HandleOrientation;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={model.name}
      title={modelTitle(model)}
      className="group flex min-w-0 flex-col gap-1 text-left"
    >
      <div
        className={`relative aspect-square border-2 p-0.5 transition-all ${
          selected ? 'border-am-navy ring-4 ring-am-navy/15' : 'border-black/10 group-hover:border-am-navy'
        }`}
        style={{ borderRadius: '2px' }}
      >
        <div className="h-full w-full overflow-hidden" aria-hidden="true">
          <HandleModelPreview model={model} orientation={orientation} />
        </div>
        {selected && <ColorCheckBadge />}
      </div>
      <span className={`line-clamp-2 text-[10px] leading-tight ${selected ? 'font-medium text-black' : 'text-black/65'}`}>
        {model.name}
      </span>
    </button>
  );
}

function ModelGrid({
  models,
  orientation,
  selectedId,
  onSelect,
}: {
  models: HandleModel[];
  orientation: HandleOrientation;
  selectedId: number | null;
  onSelect: (model: HandleModel) => void;
}) {
  return (
    // Vignettes compactes : plus de modèles par ligne, le nom complet reste dans l'infobulle
    <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6">
      {models.map((model) => (
        <ModelTile
          key={model.id}
          model={model}
          orientation={orientation}
          selected={model.id === selectedId}
          onSelect={() => onSelect(model)}
        />
      ))}
    </div>
  );
}

// Bascule à deux boutons, comme Plan 2D / Vue 3D au-dessus du viewer
function OrientationToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: HandleOrientation[];
  value: HandleOrientation;
  onChange: (orientation: HandleOrientation) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-black/65">{label}</span>
      <div
        role="group"
        aria-label={`Sens des poignées : ${label.toLowerCase()}`}
        className="flex overflow-hidden border border-black/10 bg-white"
        style={{ borderRadius: '2px' }}
      >
        {options.map((orientation, index) => {
          const active = value === orientation;
          const Icon = orientation === 'vertical' ? RectangleVertical : RectangleHorizontal;
          return (
            <button
              key={orientation}
              type="button"
              onClick={() => onChange(orientation)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                index > 0 ? 'border-l border-black/10' : ''
              } ${active ? 'bg-am-navy text-white' : 'text-black/65 hover:bg-am-mist/30 hover:text-black'}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {HANDLE_ORIENTATION_LABELS[orientation]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-black/65">{children}</p>;
}

export default function HandleSelector({
  rootZone,
  selectedZone,
  models,
  loading = false,
  defaults,
  onDefaultsChange,
  onRootZoneChange,
}: HandleSelectorProps) {
  const facades = useMemo(() => listHandleFacades(rootZone), [rootZone]);
  const hasDoors = facades.some((facade) => facade.kind === 'door');
  const hasDrawers = facades.some((facade) => facade.kind === 'drawer');
  const furnitureModel = defaultHandleModel(models, defaults);
  const customizedCount = facades.filter(
    ({ zone, kind }) => resolveZoneHandle(zone, kind, models, defaults).customized
  ).length;

  const selectedKind = selectedZone ? handleFacadeKind(selectedZone) : null;
  const selectedIsPush = !!selectedZone && !selectedKind && isPushContent(facadeContent(selectedZone));

  // Bloc « une porte ou un tiroir » ouvert d'office quand il a quelque chose à montrer ; un clic sur l'en-tête vaut
  // pour la zone sélectionnée, en choisir une autre le rouvre si elle porte une poignée
  const selectedId = selectedZone?.id ?? null;
  const [toggled, setToggled] = useState<{ zoneId: string | null; open: boolean } | null>(null);
  const autoOpen = selectedKind !== null || customizedCount > 0;
  const partsOpen = toggled && toggled.zoneId === selectedId ? toggled.open : autoOpen;

  // Retire le choix propre des façades seulement s'il y en a un : pas d'étape d'historique pour rien
  const clearOwnChoices = (fields: HandleField[], only?: HandleFacadeKind) => {
    const concerned = facades.some(
      ({ zone, kind }) =>
        (!only || kind === only) &&
        (!!zone.handleType ||
          (fields.includes('model') && zone.handleModelId != null) ||
          (fields.includes('orientation') && !!zone.handleOrientation))
    );
    if (concerned) onRootZoneChange(clearZoneHandles(rootZone, fields, only));
  };

  const chooseFurnitureModel = (model: HandleModel) => {
    onDefaultsChange({ ...defaults, modelId: model.id });
    clearOwnChoices(['model']);
  };

  const chooseFurnitureOrientation = (kind: HandleFacadeKind, orientation: HandleOrientation) => {
    onDefaultsChange(
      kind === 'door' ? { ...defaults, doorOrientation: orientation } : { ...defaults, drawerOrientation: orientation }
    );
    clearOwnChoices(['orientation'], kind);
  };

  if (models.length === 0) {
    return loading ? (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin border-2 border-am-navy border-t-transparent" style={{ borderRadius: '50%' }} />
      </div>
    ) : (
      <Note>Les modèles de poignées ne sont pas disponibles pour le moment.</Note>
    );
  }

  const furnitureShape = furnitureModel?.shape ?? null;

  return (
    <div className="space-y-5">
      {/* Un modèle et un sens de pose pour tout le meuble */}
      <div className="space-y-3">
        <div>
          <span className="eyebrow-lg text-black/65">Pour tout le meuble</span>
          <p className="mt-1 text-xs text-black/65">
            {furnitureModel ? (
              <>
                Toutes les poignées en <span className="font-medium text-black">{furnitureModel.name}</span>
              </>
            ) : (
              'Choisissez le modèle posé sur les portes et les tiroirs.'
            )}
          </p>
        </div>
        <ModelGrid
          models={models}
          orientation={hasDoors ? defaults.doorOrientation : defaults.drawerOrientation}
          selectedId={furnitureModel?.id ?? null}
          onSelect={chooseFurnitureModel}
        />

        {shapeHasOrientation(furnitureShape) ? (
          <div className="space-y-2">
            {hasDoors && (
              <OrientationToggle
                label="Portes"
                options={ORIENTATIONS}
                value={defaults.doorOrientation}
                onChange={(orientation) => chooseFurnitureOrientation('door', orientation)}
              />
            )}
            {hasDrawers && (
              <OrientationToggle
                label="Tiroirs"
                options={ORIENTATIONS}
                value={defaults.drawerOrientation}
                onChange={(orientation) => chooseFurnitureOrientation('drawer', orientation)}
              />
            )}
          </div>
        ) : (
          <Note>{furnitureShape === 'recessed' ? 'Une poignée encastrée se pose sans orientation.' : 'Un bouton se pose sans orientation.'}</Note>
        )}

        {customizedCount > 0 && (
          <div
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border border-black/10 bg-am-mist/15 px-3 py-2 text-xs"
            style={{ borderRadius: '2px' }}
          >
            <span className="text-black/65">
              {customizedCount} façade{customizedCount > 1 ? 's' : ''} personnalisée{customizedCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => clearOwnChoices(['model', 'orientation'])}
              className="font-medium text-am-navy underline hover:no-underline"
            >
              Tout aligner sur le meuble
            </button>
          </div>
        )}
      </div>

      {/* Réglage fin : la poignée d'une seule porte ou d'un seul tiroir */}
      <div className="border border-black/10 bg-white" style={{ borderRadius: '2px' }}>
        <button
          type="button"
          onClick={() => setToggled({ zoneId: selectedId, open: !partsOpen })}
          aria-expanded={partsOpen}
          className="flex w-full items-center justify-between gap-3 p-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium text-black">Personnaliser une porte ou un tiroir</span>
            <span className="block text-xs text-black/65">Un autre modèle ou un autre sens de pose</span>
          </span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${partsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {partsOpen && (
          <div className="border-t border-black/10 p-3">
            {selectedZone && selectedKind ? (
              <ZoneHandlePanel
                rootZone={rootZone}
                zone={selectedZone}
                kind={selectedKind}
                models={models}
                defaults={defaults}
                onRootZoneChange={onRootZoneChange}
              />
            ) : selectedIsPush ? (
              <Note>Cette façade s&apos;ouvre par pression : pas de poignée.</Note>
            ) : (
              <Note>Cliquez sur une porte ou un tiroir dans la vue 3D ou le plan pour lui donner une autre poignée.</Note>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ZoneHandlePanel({
  rootZone,
  zone,
  kind,
  models,
  defaults,
  onRootZoneChange,
}: {
  rootZone: Zone;
  zone: Zone;
  kind: HandleFacadeKind;
  models: HandleModel[];
  defaults: HandleDefaults;
  onRootZoneChange: (root: Zone) => void;
}) {
  const resolved = resolveZoneHandle(zone, kind, models, defaults);
  const shape = resolved.model?.shape ?? (resolved.legacyType === 'knob' || resolved.legacyType === 'recessed' ? resolved.legacyType : null);
  const label = FACADE_LABELS[facadeContent(zone) ?? 'empty'] ?? (kind === 'drawer' ? 'Tiroir' : 'Porte');

  // Le modèle et le sens se choisissent l'un sans l'autre : l'autre réglage reste celui de la façade (ou du meuble)
  const chooseModel = (model: HandleModel) =>
    onRootZoneChange(
      setZoneHandle(rootZone, zone.id, { modelId: model.id, orientation: zone.handleOrientation ?? legacyOrientation(zone.handleType) })
    );
  const chooseOrientation = (orientation: HandleOrientation) =>
    onRootZoneChange(setZoneHandle(rootZone, zone.id, { modelId: zone.handleModelId ?? null, orientation }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-black">Poignée · {label}</p>
          <p className="truncate text-xs text-black/65">
            {resolved.customized ? 'Personnalisée' : 'Comme le reste du meuble'} · {handleLabel(resolved)}
          </p>
        </div>
        {resolved.customized && (
          <button
            type="button"
            onClick={() => onRootZoneChange(setZoneHandle(rootZone, zone.id, null))}
            className="flex-shrink-0 text-xs text-black/65 underline hover:text-black"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <ModelGrid models={models} orientation={resolved.orientation} selectedId={resolved.model?.id ?? null} onSelect={chooseModel} />

      {shapeHasOrientation(shape) && (
        <OrientationToggle
          label={kind === 'drawer' ? 'Ce tiroir' : 'Cette porte'}
          options={ORIENTATIONS}
          value={resolved.orientation}
          onChange={chooseOrientation}
        />
      )}
    </div>
  );
}
