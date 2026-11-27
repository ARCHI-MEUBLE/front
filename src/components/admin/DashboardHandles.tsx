/**
 * Composant DashboardHandles
 * Modèles de poignées proposés dans le configurateur (étape Finitions) : une carte par modèle à gauche, création à
 * droite. Même organisation que la gestion des échantillons.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { uploadImage } from '@/lib/apiClient';
import { handleModelsApi, HandleModelsApiError, type HandleModelInput } from '@/lib/handleModelsApi';
import {
  HANDLE_SHAPES,
  HANDLE_SHAPE_LABELS,
  isHandleShape,
  shapeHasOrientation,
  type AdminHandleModel,
  type HandleModel,
  type HandleShape,
} from '@/lib/configurator/handles';
import { HandleModelPreview } from '@/components/handles/HandleModelPreview';
import { HandleSheetPanel } from './HandleSheetPanel';
import { SHAPE_DEFAULT_DIMENSIONS, modelHandleDimensions } from '@/components/configurator/scene/handleGeometry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Finitions courantes, proposées en pastilles (le champ hexadécimal reste libre)
const FINISH_PRESETS = [
  { name: 'Noir mat', hex: '#1C1C1C' },
  { name: 'Laiton', hex: '#B08D57' },
  { name: 'Inox brossé', hex: '#C9CCCF' },
  { name: 'Blanc', hex: '#F2F2F2' },
  { name: 'Bronze', hex: '#6E5843' },
  { name: 'Or', hex: '#C8A951' },
];

// Entraxes standard des poignées du commerce
const CENTER_DISTANCE_SHORTCUTS = [96, 128, 160, 192, 256, 320];

// Mêmes bornes que la validation du backend (admin/handle-models.php)
const NAME_MAX = 80;
const LENGTH_MIN = 20;
const LENGTH_MAX = 1200;
const PRICE_MAX = 1000;
const CENTER_DISTANCE_RANGE = { min: 10, max: 800 };
const WIDTH_RANGE = { min: 2, max: 100 };
const PROJECTION_RANGE = { min: 0, max: 100 };

// Cote facultative en mm : vide → null ; sinon le nombre saisi (NaN si illisible)
const optionalMm = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw));
const mmError = (value: number | null, { min, max }: { min: number; max: number }): string | undefined =>
  value !== null && (!Number.isInteger(value) || value < min || value > max) ? `Entre ${min} et ${max} mm, nombre entier.` : undefined;

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

type PreviewModel = Pick<HandleModel, 'name' | 'shape' | 'finish_hex' | 'length_mm' | 'image_url' | 'center_distance_mm'>;

function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '');
  return /^[0-9A-Fa-f]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : null;
}

function formatPrice(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? priceFormatter.format(amount) : '—';
}

// « entraxe 128 · largeur 10 · saillie 30 mm » : cotes du plan saisies, null s'il n'y en a aucune
function planSummary(model: Pick<HandleModel, 'center_distance_mm' | 'width_mm' | 'projection_mm'>): string | null {
  const parts = [
    model.center_distance_mm != null ? `entraxe ${model.center_distance_mm}` : null,
    model.width_mm != null ? `largeur ${model.width_mm}` : null,
    model.projection_mm != null ? `saillie ${model.projection_mm}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(' · ')} mm` : null;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HandleModelsApiError) return err.message;
  // fetch rejeté (backend arrêté, réseau coupé) : le message du navigateur est en anglais
  if (err instanceof TypeError) return 'Le serveur ne répond pas, réessayez.';
  return err instanceof Error && err.message ? err.message : fallback;
}

// Ordre d'affichage du configurateur : position, puis nom, puis id
function byPosition(a: AdminHandleModel, b: AdminHandleModel): number {
  return a.position - b.position || a.name.localeCompare(b.name, 'fr') || a.id - b.id;
}

export function DashboardHandles() {
  const [models, setModels] = useState<AdminHandleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Modèles dont une modification est en cours (boutons désactivés)
  const [pending, setPending] = useState<number[]>([]);
  // Le modèle reste en mémoire après fermeture, pour que le titre ne se vide pas pendant l'animation
  const [editing, setEditing] = useState<AdminHandleModel | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminHandleModel | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  // silent : rechargement après une modification, sans remplacer la liste par le chargement
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      setModels(await handleModelsApi.adminList());
      setError(null);
    } catch (err) {
      if (silent) toast.error(errorMessage(err, 'Liste des poignées non rechargée'));
      else setError(errorMessage(err, 'Erreur inconnue'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => [...models].sort(byPosition), [models]);
  const activeCount = sorted.filter((m) => m.active).length;

  const withPending = async (ids: number[], task: () => Promise<void>) => {
    setPending((prev) => [...prev, ...ids]);
    try {
      await task();
    } finally {
      setPending((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const toggleActive = (model: AdminHandleModel, active: boolean) =>
    withPending([model.id], async () => {
      setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, active } : m)));
      try {
        await handleModelsApi.update(model.id, { active });
        toast.success(
          active
            ? `« ${model.name} » est proposé dans le configurateur`
            : `« ${model.name} » n'est plus proposé dans le configurateur`
        );
      } catch (err) {
        toast.error(errorMessage(err, 'Modification impossible'));
      }
      await load(true);
    });

  const move = (index: number, delta: -1 | 1) => {
    const current = sorted[index];
    const neighbour = sorted[index + delta];
    if (!current || !neighbour) return;

    let changes: Array<{ id: number; position: number }>;
    if (current.position !== neighbour.position) {
      changes = [
        { id: current.id, position: neighbour.position },
        { id: neighbour.id, position: current.position },
      ];
    } else {
      // Positions égales (modèles saisis à la main en base) : échanger ne changerait rien, on renumérote la liste
      const order = [...sorted];
      [order[index], order[index + delta]] = [order[index + delta], order[index]];
      changes = order
        .map((m, i) => ({ id: m.id, position: i + 1 }))
        .filter((c) => sorted.find((m) => m.id === c.id)?.position !== c.position);
    }

    return withPending(
      changes.map((c) => c.id),
      async () => {
        setModels((prev) =>
          prev.map((m) => {
            const change = changes.find((c) => c.id === m.id);
            return change ? { ...m, position: change.position } : m;
          })
        );
        try {
          await Promise.all(changes.map((c) => handleModelsApi.update(c.id, { position: c.position })));
        } catch (err) {
          toast.error(errorMessage(err, 'Ordre non enregistré'));
        }
        await load(true);
      }
    );
  };

  const create = async (input: HandleModelInput) => {
    await handleModelsApi.create(input);
    toast.success(`Modèle « ${input.name} » ajouté`);
    await load(true);
  };

  const save = async (input: HandleModelInput) => {
    if (!editing) return;
    await handleModelsApi.update(editing.id, input);
    toast.success(`Modèle « ${input.name} » enregistré`);
    setEditOpen(false);
    await load(true);
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await handleModelsApi.remove(deleting.id);
      toast.success(`Modèle « ${deleting.name} » supprimé`);
      setDeleteOpen(false);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Suppression impossible'));
    } finally {
      setRemoving(false);
    }
  };

  const deactivateInstead = () => {
    if (!deleting) return;
    setDeleteOpen(false);
    toggleActive(deleting, false);
  };

  const takenNames = (exceptId?: number) => sorted.filter((m) => m.id !== exceptId).map((m) => m.name);

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold tracking-tight">Poignées</h3>
          {!loading && !error && sorted.length > 0 && (
            <Badge variant="outline">
              {sorted.length} modèle{sorted.length > 1 ? 's' : ''} · {activeCount} actif{activeCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Les modèles actifs sont proposés dans le configurateur, à l&apos;étape Finitions : le client choisit la
          poignée de tout le meuble, puis peut la changer porte par porte ou tiroir par tiroir. Chaque modèle se pose à
          l&apos;horizontale ou à la verticale, selon l&apos;orientation choisie (sauf les boutons et les poignées encastrées).
        </p>
      </div>

      {!loading && !error && <HandleSheetPanel models={sorted} onImported={() => load(true)} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chargement des poignées...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Erreur</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => load()}>Réessayer</Button>
              </CardContent>
            </Card>
          ) : sorted.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center px-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-10 w-10" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Aucun modèle de poignée</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Créez le premier avec le formulaire « Nouveau modèle ». Tant qu&apos;aucun modèle n&apos;est actif,
                  le configurateur pose une poignée standard.
                </p>
              </div>
            </div>
          ) : (
            <ul className="@container space-y-3" aria-label="Modèles de poignées">
              {sorted.map((model, index) => (
                <HandleModelCard
                  key={model.id}
                  model={model}
                  isFirst={index === 0}
                  isLast={index === sorted.length - 1}
                  busy={pending.includes(model.id)}
                  // Un seul déplacement à la fois : deux échanges simultanés liraient des positions périmées
                  reorderLocked={pending.length > 0}
                  onToggle={(active) => toggleActive(model, active)}
                  onMove={(delta) => move(index, delta)}
                  onEdit={() => {
                    setEditing(model);
                    setEditOpen(true);
                  }}
                  onDelete={() => {
                    setDeleting(model);
                    setDeleteOpen(true);
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div>
          <CreateHandleCard takenNames={takenNames()} onCreate={create} />
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier « {editing?.name} »</DialogTitle>
            <DialogDescription>Le configurateur affichera ces changements dès l&apos;enregistrement.</DialogDescription>
          </DialogHeader>
          {editing && (
            <HandleModelForm
              key={editing.id}
              initial={editing}
              takenNames={takenNames(editing.id)}
              submitLabel="Enregistrer"
              onSubmit={save}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => !removing && setDeleteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer « {deleting?.name} » ?</DialogTitle>
            <DialogDescription>
              Les configurations qui utilisent ce modèle passeront à la poignée choisie pour l&apos;ensemble du meuble.
              La suppression est définitive.
            </DialogDescription>
          </DialogHeader>
          {deleting?.active && (
            <p className="rounded-md border bg-muted/40 p-3 text-sm">
              Pour seulement le retirer du configurateur sans toucher aux devis existants, préférez{' '}
              <strong>Désactiver</strong> : vous pourrez le réactiver plus tard.
            </p>
          )}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={removing}>
              Annuler
            </Button>
            {deleting?.active && (
              <Button variant="outline" onClick={deactivateInstead} disabled={removing}>
                Désactiver
              </Button>
            )}
            <Button variant="destructive" onClick={confirmRemove} disabled={removing}>
              {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Carte de création, collante à droite sur grand écran */
function CreateHandleCard({
  takenNames,
  onCreate,
}: {
  takenNames: string[];
  onCreate: (input: HandleModelInput) => Promise<void>;
}) {
  // Changer la clé remonte le formulaire : retour aux valeurs par défaut après un ajout
  const [formKey, setFormKey] = useState(0);

  return (
    // Hauteur bornée : le formulaire est plus haut que bien des écrans, il défile dans sa carte
    <Card className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <CardHeader>
        <CardTitle>Nouveau modèle</CardTitle>
        <CardDescription>Il est proposé dans le configurateur dès sa création.</CardDescription>
      </CardHeader>
      <CardContent>
        <HandleModelForm
          key={formKey}
          takenNames={takenNames}
          submitLabel="Ajouter le modèle"
          onSubmit={async (input) => {
            await onCreate(input);
            setFormKey((k) => k + 1);
          }}
        />
      </CardContent>
    </Card>
  );
}

interface HandleModelCardProps {
  model: AdminHandleModel;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  reorderLocked: boolean;
  onToggle: (active: boolean) => void;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function HandleModelCard({ model, isFirst, isLast, busy, reorderLocked, onToggle, onMove, onEdit, onDelete }: HandleModelCardProps) {
  const hasOrientation = shapeHasOrientation(model.shape);
  const finish = model.finish_hex.toUpperCase();
  const preset = FINISH_PRESETS.find((p) => p.hex === finish);

  return (
    <li>
      <Card className={cn('gap-0 py-0', !model.active && 'bg-muted/40')}>
        <div className="flex flex-col gap-4 p-4 @2xl:flex-row @2xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className={cn('flex shrink-0 items-end gap-2', !model.active && 'opacity-60')}>
              <div className="h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                <HandleModelPreview model={model} />
              </div>
              {hasOrientation && (
                // Toujours le dessin (pas la photo) : c'est le sens de pose qu'on montre
                <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted" title="Posée à la verticale">
                  <HandleModelPreview model={{ ...model, image_url: null }} orientation="vertical" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <p className="truncate font-semibold leading-tight" title={model.name}>
                {model.name}
              </p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-muted-foreground">Forme</dt>
                <dd>{HANDLE_SHAPE_LABELS[model.shape] ?? model.shape}</dd>
                <dt className="text-muted-foreground">Longueur</dt>
                <dd>{hasOrientation && model.length_mm ? `${model.length_mm} mm` : '—'}</dd>
                <dt className="text-muted-foreground">Cotes</dt>
                <dd>{planSummary(model) ?? 'proportions de la forme'}</dd>
                <dt className="text-muted-foreground">Finition</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: finish }}
                    aria-hidden="true"
                  />
                  <span className="font-mono">{finish}</span>
                  {preset && <span className="truncate text-muted-foreground">· {preset.name}</span>}
                </dd>
                <dt className="text-muted-foreground">Prix</dt>
                <dd className="font-medium">{formatPrice(model.price_per_unit)} / poignée</dd>
                {model.reference && (
                  <>
                    <dt className="text-muted-foreground">Référence</dt>
                    <dd className="font-mono">
                      {model.supplier_url ? (
                        <a href={model.supplier_url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                          {model.reference}
                        </a>
                      ) : (
                        model.reference
                      )}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 @2xl:flex-col @2xl:items-end @2xl:border-0 @2xl:pt-0">
            <div className="flex items-center gap-2">
              <Badge variant={model.active ? 'default' : 'outline'}>{model.active ? 'Actif' : 'Inactif'}</Badge>
              <ActiveSwitch
                checked={model.active}
                disabled={busy}
                label={`Proposer « ${model.name} » dans le configurateur`}
                onChange={onToggle}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onMove(-1)}
                disabled={isFirst || reorderLocked}
                aria-label={`Monter « ${model.name} »`}
                title="Monter"
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onMove(1)}
                disabled={isLast || reorderLocked}
                aria-label={`Descendre « ${model.name} »`}
                title="Descendre"
              >
                <ArrowDown />
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
                <Pencil />
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                disabled={busy}
                aria-label={`Supprimer « ${model.name} »`}
                title="Supprimer"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </li>
  );
}

/** Interrupteur (pas de composant Switch dans components/ui) */
function ActiveSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

type FieldName = 'name' | 'finish' | 'length' | 'centerDistance' | 'width' | 'projection' | 'price';

interface HandleModelFormProps {
  initial?: AdminHandleModel;
  // Noms des autres modèles : le backend refuse un doublon (sans tenir compte de la casse)
  takenNames: string[];
  submitLabel: string;
  onSubmit: (input: HandleModelInput) => Promise<void>;
  onCancel?: () => void;
}

/** Formulaire complet d'un modèle, partagé par la création et la modification */
function HandleModelForm({ initial, takenNames, submitLabel, onSubmit, onCancel }: HandleModelFormProps) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [shape, setShape] = useState<HandleShape>(initial && isHandleShape(initial.shape) ? initial.shape : 'bar');
  const [finish, setFinish] = useState(initial?.finish_hex.toUpperCase() ?? FINISH_PRESETS[0].hex);
  const [length, setLength] = useState(String(initial?.length_mm ?? 160));
  const [centerDistance, setCenterDistance] = useState(initial?.center_distance_mm != null ? String(initial.center_distance_mm) : '');
  const [width, setWidth] = useState(initial?.width_mm != null ? String(initial.width_mm) : '');
  const [projection, setProjection] = useState(initial?.projection_mm != null ? String(initial.projection_mm) : '');
  const [price, setPrice] = useState(initial ? String(Number(initial.price_per_unit) || 0) : '0');
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [step, setStep] = useState<'idle' | 'upload' | 'save'>('idle');
  const submitting = step !== 'idle';

  // Aperçu local de la photo choisie, libéré quand elle change
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const trimmedName = name.trim();
  const hasLength = shapeHasOrientation(shape);
  const finishHex = normalizeHex(finish);
  const lengthMm = Number(length);
  const centerDistanceMm = hasLength ? optionalMm(centerDistance) : null;
  const widthMm = optionalMm(width);
  const projectionMm = optionalMm(projection);
  const priceValue = Number(price.replace(',', '.'));

  const errors: Partial<Record<FieldName, string>> = {};
  if (!trimmedName) errors.name = 'Donnez un nom au modèle.';
  else if ([...trimmedName].length > NAME_MAX) errors.name = `${NAME_MAX} caractères au maximum.`;
  else if (takenNames.some((n) => n.trim().toLocaleLowerCase('fr') === trimmedName.toLocaleLowerCase('fr'))) {
    errors.name = 'Un autre modèle porte déjà ce nom.';
  }
  if (!finishHex) errors.finish = 'Couleur au format #RRGGBB, par exemple #1C1C1C.';
  if (hasLength) {
    if (length.trim() === '' || !Number.isInteger(lengthMm)) errors.length = 'Longueur en millimètres, nombre entier.';
    else if (lengthMm < LENGTH_MIN || lengthMm > LENGTH_MAX) errors.length = `Entre ${LENGTH_MIN} et ${LENGTH_MAX} mm.`;
    const centerDistanceError = mmError(centerDistanceMm, CENTER_DISTANCE_RANGE);
    if (centerDistanceError) errors.centerDistance = centerDistanceError;
    else if (centerDistanceMm !== null && !errors.length && centerDistanceMm > lengthMm) {
      errors.centerDistance = "L'entraxe ne peut pas dépasser la longueur.";
    }
  }
  const widthError = mmError(widthMm, WIDTH_RANGE);
  if (widthError) errors.width = widthError;
  const projectionError = mmError(projectionMm, PROJECTION_RANGE);
  if (projectionError) errors.projection = projectionError;
  if (price.trim() === '' || !Number.isFinite(priceValue)) errors.price = 'Indiquez un prix (0 si la poignée est offerte).';
  else if (priceValue < 0) errors.price = 'Le prix ne peut pas être négatif.';
  else if (priceValue > PRICE_MAX) errors.price = `${formatPrice(PRICE_MAX)} au maximum.`;

  // Erreur affichée une fois le champ quitté, ou après une tentative d'envoi
  const errorFor = (field: FieldName) => (showErrors || touched[field] ? errors[field] : undefined);
  const touch = (field: FieldName) => setTouched((prev) => ({ ...prev, [field]: true }));
  const fieldProps = (field: FieldName) => {
    const message = errorFor(field);
    return {
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${id}-${field}-error` : undefined,
    };
  };

  // Aperçu en direct : toujours le dessin, c'est lui que le configurateur pose en 3D
  const preview: PreviewModel = {
    name: trimmedName || HANDLE_SHAPE_LABELS[shape],
    shape,
    finish_hex: finishHex ?? '#1C1C1C',
    length_mm: hasLength && !errors.length ? lengthMm : null,
    center_distance_mm: errors.centerDistance ? null : centerDistanceMm,
    image_url: null,
  };
  const shapeDefaults = SHAPE_DEFAULT_DIMENSIONS[shape];
  const photoSrc = filePreview ?? imageUrl;

  const removePhoto = () => {
    setFile(null);
    setImageUrl(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || !finishHex) return;

    try {
      let finalImage = imageUrl;
      if (file) {
        setStep('upload');
        try {
          finalImage = await uploadImage(file);
        } catch (err) {
          toast.error(`Photo non envoyée : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
          return;
        }
        // Photo gardée si l'enregistrement échoue : un nouvel essai ne la renvoie pas
        setImageUrl(finalImage);
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
      }

      setStep('save');
      const input: HandleModelInput = {
        name: trimmedName,
        shape,
        finish_hex: finishHex,
        length_mm: hasLength ? lengthMm : null,
        center_distance_mm: centerDistanceMm,
        width_mm: widthMm,
        projection_mm: projectionMm,
        price_per_unit: Math.round(priceValue * 100) / 100,
      };
      // Sans photo, rien à envoyer à la création ; en modification, null efface l'ancienne
      if (finalImage || initial?.image_url) input.image_url = finalImage ?? null;
      await onSubmit(input);
    } catch (err) {
      toast.error(errorMessage(err, 'Enregistrement impossible'));
    } finally {
      setStep('idle');
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* Aperçu en direct */}
      <div className="flex items-start justify-center gap-4 rounded-lg border bg-muted/30 p-3">
        <figure className="space-y-1">
          <div className="h-24 w-24 overflow-hidden rounded-md border">
            <HandleModelPreview model={preview} orientation="horizontal" />
          </div>
          <figcaption className="text-center text-[11px] text-muted-foreground">
            {hasLength ? "À l'horizontale" : shape === 'recessed' ? 'Encastrée' : 'Bouton'}
          </figcaption>
        </figure>
        {hasLength && (
          <figure className="space-y-1">
            <div className="h-24 w-24 overflow-hidden rounded-md border">
              <HandleModelPreview model={preview} orientation="vertical" />
            </div>
            <figcaption className="text-center text-[11px] text-muted-foreground">À la verticale</figcaption>
          </figure>
        )}
      </div>

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Nom</Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => touch('name')}
          placeholder="Ex : Barre ronde noire"
          maxLength={NAME_MAX}
          autoComplete="off"
          {...fieldProps('name')}
        />
        <FieldError id={`${id}-name-error`} message={errorFor('name')} />
      </div>

      {/* Forme */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium leading-none">Forme</legend>
        <div className="grid grid-cols-4 gap-2">
          {HANDLE_SHAPES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={shape === s}
              onClick={() => setShape(s)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[11px] font-medium leading-tight transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                shape === s ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent'
              )}
            >
              <span className="block aspect-square w-full overflow-hidden rounded-md" aria-hidden="true">
                <HandleModelPreview
                  model={{
                    name: HANDLE_SHAPE_LABELS[s],
                    shape: s,
                    finish_hex: finishHex ?? '#1C1C1C',
                    length_mm: 160,
                    image_url: null,
                  }}
                />
              </span>
              {HANDLE_SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Finition */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium leading-none">Finition</legend>
        <div className="flex flex-wrap gap-2">
          {FINISH_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              aria-pressed={finishHex === p.hex}
              aria-label={`${p.name} (${p.hex})`}
              title={p.name}
              onClick={() => setFinish(p.hex)}
              className={cn(
                'h-8 w-8 rounded-full border shadow-sm transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                finishHex === p.hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-105'
              )}
              style={{ backgroundColor: p.hex }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="color"
            aria-label="Choisir une couleur sur la palette"
            // Le sélecteur n'accepte qu'une couleur valide en minuscules
            value={(finishHex ?? '#1C1C1C').toLowerCase()}
            onChange={(e) => setFinish(e.target.value.toUpperCase())}
            className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <Label htmlFor={`${id}-finish`} className="sr-only">
            Code hexadécimal de la finition
          </Label>
          <Input
            id={`${id}-finish`}
            value={finish}
            onChange={(e) => setFinish(e.target.value)}
            onBlur={() => {
              touch('finish');
              if (finishHex) setFinish(finishHex);
            }}
            placeholder="#1C1C1C"
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-xs uppercase"
            {...fieldProps('finish')}
          />
        </div>
        <FieldError id={`${id}-finish-error`} message={errorFor('finish')} />
      </fieldset>

      {/* Longueur : sans objet pour un bouton ou une poignée encastrée (envoyée à null) */}
      {hasLength ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-length`}>Longueur</Label>
          <div className="relative">
            <Input
              id={`${id}-length`}
              type="number"
              inputMode="numeric"
              min={LENGTH_MIN}
              max={LENGTH_MAX}
              step={1}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              onBlur={() => touch('length')}
              className="pr-12"
              {...fieldProps('length')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              mm
            </span>
          </div>
          {errorFor('length') ? (
            <FieldError id={`${id}-length-error`} message={errorFor('length')} />
          ) : (
            <p className="text-[11px] text-muted-foreground">Longueur totale, d&apos;un bout à l&apos;autre de la poignée.</p>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {shape === 'recessed' ? 'Une poignée encastrée ronde' : 'Un bouton'} n&apos;a ni longueur ni sens de pose.
        </p>
      )}

      {/* Cotes du plan du fabricant : la vue 3D les reprend ; vides, elle garde les proportions de la forme */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium leading-none">
          Cotes du plan <span className="font-normal text-muted-foreground">(facultatives)</span>
        </legend>
        <p className="text-[11px] text-muted-foreground">
          Reprises de la fiche du fabricant. Un champ vide garde la valeur habituelle de la forme, affichée en gris.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {hasLength && (
            <MmField
              id={`${id}-center-distance`}
              label="Entraxe"
              hint="entre les vis"
              value={centerDistance}
              placeholder={
                length.trim() !== '' && !errors.length
                  ? String(Math.round(modelHandleDimensions({ shape, length_mm: lengthMm }, lengthMm / 1000).spacing * 1000))
                  : undefined
              }
              range={CENTER_DISTANCE_RANGE}
              onChange={setCenterDistance}
              onBlur={() => touch('centerDistance')}
              fieldProps={fieldProps('centerDistance')}
            />
          )}
          <MmField
            id={`${id}-width`}
            label="Largeur"
            hint={shape === 'bar' || shape === 'knob' || shape === 'recessed' ? 'diamètre' : 'vue de face'}
            value={width}
            placeholder={String(shapeDefaults.width)}
            range={WIDTH_RANGE}
            onChange={setWidth}
            onBlur={() => touch('width')}
            fieldProps={fieldProps('width')}
          />
          <MmField
            id={`${id}-projection`}
            label="Saillie"
            hint="depuis la façade"
            value={projection}
            placeholder={String(shapeDefaults.projection)}
            range={PROJECTION_RANGE}
            onChange={setProjection}
            onBlur={() => touch('projection')}
            fieldProps={fieldProps('projection')}
          />
        </div>
        {hasLength && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Entraxes courants">
            {CENTER_DISTANCE_SHORTCUTS.map((mm) => {
              const selected = centerDistanceMm === mm;
              return (
                <button
                  key={mm}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCenterDistance(String(mm))}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                >
                  {mm}
                </button>
              );
            })}
          </div>
        )}
        {(['centerDistance', 'width', 'projection'] as const).map((field) => (
          <FieldError key={field} id={`${id}-${field}-error`} message={errorFor(field)} />
        ))}
      </fieldset>

      {/* Prix */}
      <div className="space-y-2">
        <Label htmlFor={`${id}-price`}>Prix par poignée</Label>
        <div className="relative">
          <Input
            id={`${id}-price`}
            type="number"
            inputMode="decimal"
            min={0}
            max={PRICE_MAX}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => touch('price')}
            className="pr-8"
            {...fieldProps('price')}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            €
          </span>
        </div>
        {errorFor('price') ? (
          <FieldError id={`${id}-price-error`} message={errorFor('price')} />
        ) : (
          <p className="text-[11px] text-muted-foreground">Ajouté au prix du meuble pour chaque poignée posée.</p>
        )}
      </div>

      {/* Photo facultative */}
      <div className="space-y-2">
        <Label htmlFor={`${id}-photo`}>
          Photo <span className="font-normal text-muted-foreground">(facultative)</span>
        </Label>
        {photoSrc && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo du backend */}
            <img src={photoSrc} alt="Photo du modèle" className="h-14 w-14 shrink-0 rounded border object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{file?.name ?? 'Photo enregistrée'}</p>
              <p className="text-[11px] text-muted-foreground">Remplace le dessin dans la vignette du configurateur.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={removePhoto} disabled={submitting}>
              <X />
              Retirer
            </Button>
          </div>
        )}
        <Input
          id={`${id}-photo`}
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
          disabled={submitting}
        />
        <p className="text-[11px] text-muted-foreground">
          PNG, JPEG ou WebP. Sans photo, le configurateur affiche le dessin ci-dessus.
        </p>
      </div>

      {showErrors && hasErrors && (
        <p className="text-xs text-destructive" role="alert">
          Corrigez les champs signalés avant d&apos;enregistrer.
        </p>
      )}

      <div className={cn('flex gap-2', onCancel ? 'justify-end' : '')}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
        )}
        <Button type="submit" className={onCancel ? '' : 'w-full'} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : initial ? <Check /> : <Plus />}
          {step === 'upload' ? 'Envoi de la photo...' : step === 'save' ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Cote du plan en millimètres (vide : valeur habituelle de la forme, en placeholder) */
function MmField({
  id,
  label,
  hint,
  value,
  placeholder,
  range,
  onChange,
  onBlur,
  fieldProps,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder?: string;
  range: { min: number; max: number };
  onChange: (value: string) => void;
  onBlur: () => void;
  fieldProps: { 'aria-invalid'?: boolean; 'aria-describedby'?: string };
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label} <span className="font-normal text-muted-foreground">({hint})</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={range.min}
          max={range.max}
          step={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="pr-9"
          {...fieldProps}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}
