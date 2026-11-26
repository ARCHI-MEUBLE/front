/**
 * Composant DashboardSamples
 * Gestion des échantillons : une seule section, une ligne par matériau,
 * chaque ligne contenant la palette de couleurs du matériau et son prix au m².
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient, type SampleColor, type SampleType, uploadImage } from '@/lib/apiClient';
import { formatPrice } from '@/lib/format';
import { pricingAdminApi, pricingErrorMessage, type MaterialPrice, type MaterialPrices } from '@/lib/pricingAdminApi';
import { InlineNumberField } from '@/components/admin/pricing/InlineNumberField';
import { formatEuro, parseInput, unitSpec, type ParseResult } from '@/components/admin/pricing/gridUnits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Euro, Plus, Trash2, ImageIcon, Hash, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Prix d'un échantillon envoyé au client (0 = offert)
const SAMPLE_PRICE_MAX = 1000;

// Mêmes bornes et même saisie qu'un prix au m² de la grille
const materialParam = (material: string) => ({ category: 'materials', item_type: material, param_name: 'price_per_m2', unit: 'eur_m2' });
const M2_SPEC = unitSpec(materialParam(''));

// Les noms de matière se comparent sans tenir compte de la casse (index unique LOWER(material) en base)
const sameMaterial = (a: string, b: string) => a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');

function parseSamplePrice(raw: string): ParseResult {
  const text = raw.trim().replace(',', '.');
  if (text === '') return { ok: false, error: 'Indiquez un prix (0 si l’échantillon est offert).' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, error: 'Nombre attendu, par exemple 2,50.' };
  if (value < 0) return { ok: false, error: 'Le prix ne peut pas être négatif.' };
  if (value > SAMPLE_PRICE_MAX) return { ok: false, error: `${formatEuro(SAMPLE_PRICE_MAX)} au maximum.` };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

export function DashboardSamples() {
  const [items, setItems] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<MaterialPrices | null>(null);
  const [pricesError, setPricesError] = useState<string | null>(null);

  // silent : rechargement après une modification, sans remplacer la liste par le chargement
  const reload = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      setItems(await apiClient.samples.adminList());
      setError(null);
    } catch (e) {
      if (silent) toast.error(e instanceof Error ? e.message : 'Liste des échantillons non rechargée');
      else setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Prix au m² chargés à part : une panne de ce service ne cache pas les échantillons
  const reloadPrices = useCallback(async () => {
    try {
      setPrices(await pricingAdminApi.materialPrices());
      setPricesError(null);
    } catch (err) {
      setPricesError(pricingErrorMessage(err, 'Prix au m² indisponibles'));
    }
  }, []);

  useEffect(() => {
    reload();
    reloadPrices();
  }, [reload, reloadPrices]);

  const refresh = useCallback(() => {
    reload(true);
    reloadPrices();
  }, [reload, reloadPrices]);

  const byMaterial = useMemo(() => {
    const map: Record<string, SampleType[]> = {};
    for (const t of items) {
      const key = t.material || 'Sans matériau';
      (map[key] ||= []).push(t);
    }
    return map;
  }, [items]);

  // Couleur sélectionnée : retrouvée dans la liste pour rester à jour (et disparaître si elle est supprimée)
  const [selectedColorId, setSelectedColorId] = useState<number | string | null>(null);
  const selected = useMemo(() => {
    if (selectedColorId === null) return null;
    for (const t of items) {
      const color = (t.colors ?? []).find((c) => c.id === selectedColorId);
      if (color) return { color, material: t.material || 'Sans matériau' };
    }
    return null;
  }, [items, selectedColorId]);

  const priceFor = (material: string): MaterialPrice | undefined =>
    prices?.materials.find((m) => sameMaterial(m.material, material));
  const defaultPrice = prices?.defaultPricePerM2 ?? null;

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">Gestion des échantillons</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Gérez la palette de couleurs de chaque matériau visible dans le configurateur. Le prix au m² d&apos;un
          matériau sert au calcul du prix des meubles (structure, fond, étagères, portes, tiroirs) ; le prix d&apos;un
          échantillon est ce que le client paie pour le recevoir (0 = offert).
        </p>
      </div>

      {pricesError && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            Prix au m² des matériaux indisponibles : {pricesError}
          </p>
          <Button variant="outline" size="sm" onClick={reloadPrices}>
            Réessayer
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-5">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chargement des échantillons...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Erreur</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => reload()}>Réessayer</Button>
              </CardContent>
            </Card>
          ) : Object.keys(byMaterial).length === 0 ? (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-10 w-10" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Aucun matériau</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Commencez par créer un matériau et sa première couleur à droite.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(byMaterial).map(([material, types]) => (
                <TypeRow
                  key={material}
                  material={material}
                  types={types}
                  price={priceFor(material)}
                  pricesLoaded={prices !== null}
                  defaultPrice={defaultPrice}
                  onChanged={refresh}
                  onPriceSaved={reloadPrices}
                  selectedColorId={selected?.color.id ?? null}
                  onSelectColor={(id) => setSelectedColorId((cur) => (cur === id ? null : id))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Colonne collée à l'écran ; défile en interne si les deux cadres dépassent la hauteur visible */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:col-span-2 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <CreateMaterialCard
            existingMaterials={Object.keys(byMaterial)}
            defaultPrice={defaultPrice}
            pricesAvailable={prices !== null}
            onCreated={refresh}
          />
          {selected && (
            <ColorInfoCard color={selected.color} material={selected.material} onClose={() => setSelectedColorId(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Nouveau matériau : un nom, son prix au m² et sa première couleur (un matériau n'existe que par ses couleurs) */
function CreateMaterialCard({
  existingMaterials,
  defaultPrice,
  pricesAvailable,
  onCreated,
}: {
  existingMaterials: string[];
  defaultPrice: number | null;
  pricesAvailable: boolean;
  onCreated: () => void;
}) {
  const id = useId();
  const [material, setMaterial] = useState('');
  const [priceM2, setPriceM2] = useState('');
  const [priceEdited, setPriceEdited] = useState(false);

  // Prérempli avec le prix par défaut dès qu'il est connu, tant que l'admin n'y a pas touché
  useEffect(() => {
    if (!priceEdited && defaultPrice !== null) setPriceM2(String(defaultPrice));
  }, [defaultPrice, priceEdited]);

  const name = material.trim();
  // Nom déjà pris : la couleur rejoint ce matériau, sous son nom exact, et son prix ne change pas
  const existing = existingMaterials.find((m) => sameMaterial(m, name));
  const askPrice = !existing && pricesAvailable;
  const priceResult = parseInput(materialParam(name), priceM2);
  const priceError = askPrice && priceEdited && !priceResult.ok ? priceResult.error : null;

  const reset = () => {
    setMaterial('');
    setPriceEdited(false);
    setPriceM2(defaultPrice !== null ? String(defaultPrice) : '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau matériau</CardTitle>
        <CardDescription>Créez un matériau avec son prix au m² et sa première couleur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${id}-material`}>Nom du matériau</Label>
          <Input
            id={`${id}-material`}
            placeholder="Ex : Chêne massif"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
          {existing && (
            <p className="text-xs text-muted-foreground">
              « {existing} » existe déjà : la couleur s&apos;y ajoutera, son prix au m² ne change pas.
            </p>
          )}
        </div>

        {name && askPrice && (
          <div className="space-y-2">
            <Label htmlFor={`${id}-price`}>Prix au m²</Label>
            <div className="relative">
              <Input
                id={`${id}-price`}
                type="number"
                inputMode="decimal"
                min={M2_SPEC.min}
                max={M2_SPEC.max}
                step={M2_SPEC.step}
                value={priceM2}
                onChange={(e) => {
                  setPriceM2(e.target.value);
                  setPriceEdited(true);
                }}
                onBlur={() => setPriceEdited(true)}
                aria-invalid={priceError ? true : undefined}
                aria-describedby={`${id}-price-help`}
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {M2_SPEC.suffix}
              </span>
            </div>
            <p id={`${id}-price-help`} className={priceError ? 'text-xs text-destructive' : 'text-[11px] text-muted-foreground'}>
              {priceError ??
                `Prix des panneaux de ce matériau dans le calcul des meubles${
                  defaultPrice !== null ? ` (prix par défaut : ${formatEuro(defaultPrice)}/m²)` : ''
                }.`}
            </p>
          </div>
        )}

        {name && !existing && !pricesAvailable && (
          <p className="text-xs text-amber-700">
            Prix au m² indisponibles pour le moment : le matériau sera compté au prix par défaut, réglez son prix plus
            tard sur sa carte.
          </p>
        )}

        {name && (
          <>
            <Separator />
            <AddColorForm
              material={existing ?? name}
              existing={[]}
              validate={() => (askPrice && !priceResult.ok ? `Prix au m² : ${priceResult.error}` : null)}
              onAdded={async () => {
                if (askPrice && priceResult.ok) {
                  try {
                    await pricingAdminApi.setMaterialPrice(name, priceResult.value);
                  } catch (err) {
                    toast.error(
                      `Matériau créé, mais son prix au m² n'est pas enregistré : ${pricingErrorMessage(err, 'erreur inconnue')}. Réglez-le sur sa carte.`
                    );
                  }
                }
                toast.success(existing ? `Couleur ajoutée à « ${existing} »` : `Matériau « ${name} » créé`);
                reset();
                onCreated();
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Info couleur : nom, code HEX ou image, et aperçu du rendu sur un meuble */
function ColorInfoCard({ color, material, onClose }: { color: SampleColor; material: string; onClose: () => void }) {
  const surface: React.CSSProperties = color.image_url
    ? { backgroundImage: `url(${JSON.stringify(color.image_url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: color.hex || '#EEE' };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate">Info couleur</CardTitle>
          <CardDescription className="truncate uppercase">{material}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8" onClick={onClose} aria-label="Fermer l'info couleur">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Nom</p>
          <p className="break-words text-sm font-medium">{color.name}</p>
        </div>

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{color.image_url ? 'Image' : 'Code HEX'}</p>
            {color.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- vignette servie par le backend
              <img src={color.image_url} alt={color.name} className="aspect-square w-full rounded-md border object-cover" />
            ) : (
              <p className="font-mono text-sm">{(color.hex || '—').toUpperCase()}</p>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Rendu</p>
            {/* Petit meuble à deux portes habillé de la couleur */}
            <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted p-3">
              <div className="grid h-full w-full grid-cols-2 gap-px rounded-sm bg-black/30 p-px shadow-md">
                {[0, 1].map((i) => (
                  <div key={i} className="relative" style={surface}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-black/20" />
                    <div className={`absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-black/40 ${i === 0 ? 'right-1' : 'left-1'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ajoute une couleur à un matériau : crée un type portant le nom de la couleur, puis la variante */
function AddColorForm({
  material,
  existing,
  validate,
  onAdded,
}: {
  material: string;
  existing: SampleColor[];
  // Contrôle supplémentaire du parent avant l'envoi (message d'erreur, ou null)
  validate?: () => string | null;
  onAdded: () => void | Promise<void>;
}) {
  const id = useId();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'image' | 'hex'>('image');
  const [hex, setHex] = useState('');
  const [unitPrice, setUnitPrice] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitPriceResult = parseSamplePrice(unitPrice);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const colorName = name.trim();
    if (!colorName || (mode === 'image' ? !file : !hex.trim())) return;

    const parentError = validate?.() ?? null;
    if (parentError) {
      setError(parentError);
      return;
    }
    if (!unitPriceResult.ok) {
      setError(`Prix de l'échantillon : ${unitPriceResult.error}`);
      return;
    }

    const normalizedHex = `#${hex.trim().replace(/^#/, '')}`.toUpperCase();
    if (mode === 'hex' && existing.some((c) => c.hex?.toUpperCase() === normalizedHex)) {
      setError('Cette couleur existe déjà pour ce matériau');
      return;
    }

    setSaving(true);
    setError(null);
    let typeId: number | null = null;
    try {
      const visual = mode === 'image' ? { image_url: await uploadImage(file as File) } : { hex: normalizedHex };
      const created = await apiClient.samples.createType({ name: colorName, material });
      typeId = Number(created.id);
      await apiClient.samples.createColor({
        type_id: typeId,
        name: colorName,
        ...visual,
        unit_price: unitPriceResult.value,
      });
      setName('');
      setFile(null);
      setHex('');
      setUnitPrice('0');
      await onAdded();
    } catch (err) {
      // Évite de laisser un type vide si la création de la couleur a échoué
      if (typeId !== null) await apiClient.samples.deleteType(typeId).catch(() => {});
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">Nouvelle couleur</p>
      <Label htmlFor={`${id}-name`} className="sr-only">
        Nom de la couleur
      </Label>
      <Input
        id={`${id}-name`}
        placeholder="Nom (Ex : Chêne Halifax)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-xs"
      />
      <Tabs value={mode} onValueChange={(val) => setMode(val as 'image' | 'hex')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="text-xs">
            <ImageIcon className="mr-2 h-3 w-3" /> Image
          </TabsTrigger>
          <TabsTrigger value="hex" className="text-xs">
            <Hash className="mr-2 h-3 w-3" /> HEX
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="pt-2">
          <Input
            type="file"
            className="text-xs"
            aria-label="Image de la couleur"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept="image/*"
          />
        </TabsContent>

        <TabsContent value="hex" className="pt-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="#FFFFFF"
              aria-label="Code hexadécimal de la couleur"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-8 text-xs font-mono"
            />
            <div
              className="h-8 w-8 shrink-0 rounded border"
              style={{ backgroundColor: hex.startsWith('#') ? hex : `#${hex || 'FFF'}` }}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-1">
        <Label htmlFor={`${id}-unit-price`} className="text-[11px]">
          Prix de l&apos;échantillon
        </Label>
        <div className="relative max-w-[10rem]">
          <Input
            id={`${id}-unit-price`}
            className="h-8 pr-7 text-xs"
            type="number"
            inputMode="decimal"
            min={0}
            max={SAMPLE_PRICE_MAX}
            step={0.01}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            aria-invalid={!unitPriceResult.ok ? true : undefined}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
        </div>
        <p className="text-[11px] text-muted-foreground">0 = échantillon offert.</p>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button size="sm" className="w-full h-8 text-xs" disabled={saving || !name.trim() || (mode === 'image' ? !file : !hex.trim())}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="mr-2 h-3 w-3" />}
        {saving ? 'Ajout...' : 'Ajouter la couleur'}
      </Button>
    </form>
  );
}

/** Un matériau, son prix au m² et sa palette (toutes les couleurs de tous ses types) */
function TypeRow({
  material,
  types,
  price,
  pricesLoaded,
  defaultPrice,
  onChanged,
  onPriceSaved,
  selectedColorId,
  onSelectColor,
}: {
  selectedColorId: number | string | null;
  onSelectColor: (id: number | string) => void;
  material: string;
  types: SampleType[];
  price: MaterialPrice | undefined;
  pricesLoaded: boolean;
  defaultPrice: number | null;
  onChanged: () => void;
  onPriceSaved: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const palette = useMemo(
    () => types.flatMap((t) => (t.colors ?? []).map((color) => ({ color, type: t }))),
    [types],
  );
  const pricePerM2 = price?.price_per_m2 ?? null;
  // Types sans matériau (regroupés sous « Sans matériau ») : pas de prix au m² à leur donner
  const hasMaterialName = types.some((t) => t.material);

  const savePrice = async (value: number) => {
    await pricingAdminApi.setMaterialPrice(price?.material ?? material, value);
    toast.success(`Prix au m² de « ${material} » : ${formatEuro(value)}/m²`);
    onPriceSaved();
  };

  const removeMaterial = async () => {
    if (!confirm(`Attention : supprimer le matériau "${material}" supprimera ses ${palette.length} couleurs. Continuer ?`)) return;
    setIsDeleting(true);
    try {
      // Le backend supprime les couleurs par cascade
      for (const t of types) await apiClient.samples.deleteType(t.id);
      // Plus aucune couleur : son prix au m² ne sert plus (sans gravité s'il reste)
      if (price) await pricingAdminApi.deleteMaterialPrice(price.material).catch(() => {});
      toast.success(`Matériau « ${material} » supprimé`);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression du matériau');
    } finally {
      setIsDeleting(false);
    }
  };

  const removeColor = async (color: SampleColor, type: SampleType) => {
    if (!confirm('Supprimer cette couleur ?')) return;
    try {
      await apiClient.samples.deleteColor(color.id);
      // Le type porte le nom de la couleur : on le retire s'il se retrouve vide
      if ((type.colors ?? []).length <= 1) await apiClient.samples.deleteType(type.id);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg uppercase">{material}</CardTitle>
            <Badge variant="outline">{palette.length} couleurs</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={removeMaterial}
            disabled={isDeleting}
            title={`Supprimer le matériau ${material}`}
            aria-label={`Supprimer le matériau ${material}`}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>

        {pricesLoaded && hasMaterialName && (
          <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
            <span className="pt-1.5 text-sm text-muted-foreground">Prix au m²</span>
            <InlineNumberField
              label={`Prix au m² de ${material}`}
              initial={pricePerM2 === null ? '' : String(pricePerM2)}
              placeholder={defaultPrice !== null ? String(defaultPrice) : undefined}
              suffix={M2_SPEC.suffix}
              min={M2_SPEC.min}
              max={M2_SPEC.max}
              step={M2_SPEC.step}
              parse={(raw) => parseInput(materialParam(material), raw)}
              onSave={savePrice}
            />
            {pricePerM2 === null && (
              <p className="flex items-center gap-1 pt-1.5 text-xs text-amber-700">
                <AlertTriangle className="size-3 shrink-0" />
                Sans prix propre : compté au prix par défaut
                {defaultPrice !== null ? ` (${formatEuro(defaultPrice)}/m²)` : ''}.
              </p>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {palette.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune couleur pour ce matériau.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {palette.map(({ color, type }) => (
              <VariantCard
                key={color.id}
                variant={color}
                materialPrice={pricePerM2 ?? defaultPrice}
                selected={color.id === selectedColorId}
                onSelect={() => onSelectColor(color.id)}
                onChanged={onChanged}
                onDelete={() => removeColor(color, type)}
              />
            ))}
          </div>
        )}

        <Separator />

        <div className="max-w-sm">
          <AddColorForm material={material} existing={palette.map((p) => p.color)} onAdded={onChanged} />
        </div>
      </CardContent>
    </Card>
  );
}

function VariantCard({
  variant,
  materialPrice,
  selected,
  onSelect,
  onChanged,
  onDelete,
}: {
  variant: SampleColor;
  materialPrice: number | null;
  selected: boolean;
  onSelect: () => void;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitPrice, setUnitPrice] = useState(String(Number(variant.unit_price ?? 0)));
  const [colourPrice, setColourPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [colourError, setColourError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const unitPriceValue = Number(variant.unit_price ?? 0);
  const ownColourPrice = variant.furniture_price_per_m2 == null ? null : Number(variant.furniture_price_per_m2);

  const open = () => {
    setUnitPrice(String(unitPriceValue));
    setColourPrice(ownColourPrice === null ? '' : String(ownColourPrice));
    setError(null);
    setColourError(null);
    setSaveError(null);
    setEditing(true);
  };

  // Les deux prix partent dans la même requête : ils sont enregistrés ensemble ou pas du tout
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = parseSamplePrice(unitPrice);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const colourResult = colourPrice.trim() === '' ? null : parseInput(materialParam(variant.name), colourPrice);
    if (colourResult && !colourResult.ok) {
      setColourError(colourResult.error);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.samples.updateColor(variant.id, {
        unit_price: result.value,
        furniture_price_per_m2: colourResult ? colourResult.value : null,
      });
      toast.success(`Prix de « ${variant.name} » enregistrés`);
      setEditing(false);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group relative" title={variant.name}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Voir les infos de la couleur ${variant.name}`}
        className={`block h-14 w-14 overflow-hidden rounded-lg border bg-muted shadow-sm transition-transform [.group:hover_&]:scale-105 ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      >
        {variant.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignette servie par le backend
          <img src={variant.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: variant.hex || '#EEE' }} />
        )}
      </button>

      {/* Boutons d'action rapides */}
      {/* Variantes arbitraires plutôt que group-hover: Tailwind v4 réserve ce dernier à @media (hover: hover), jamais vrai sur certains écrans tactiles */}
      <div className="absolute -right-1 -top-1 z-10 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 [.group:hover_&]:opacity-100">
        <button
          onClick={open}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
          title="Modifier les prix de cette couleur"
          aria-label={`Modifier les prix de la couleur ${variant.name}`}
        >
          <Euro className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
          title="Supprimer"
          aria-label={`Supprimer la couleur ${variant.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1 max-w-[56px] truncate text-[9px] font-bold text-center uppercase text-zinc-600">
        {unitPriceValue > 0 ? formatPrice(unitPriceValue) : 'OFFERT'}
      </div>
      {ownColourPrice !== null && (
        <div className="max-w-[56px] truncate text-center text-[9px] font-semibold text-amber-700" title="Prix au m² propre à cette couleur">
          {ownColourPrice} €/m²
        </div>
      )}

      <Dialog open={editing} onOpenChange={(value) => !saving && setEditing(value)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Prix de « {variant.name} »</DialogTitle>
            <DialogDescription>
              Prix de l&apos;échantillon : ce que le client paie pour le recevoir (0 = offert). Prix au m² : ce que coûte
              cette couleur dans le calcul des meubles, à la place du prix de son matériau.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor={`${id}-unit-price`}>Prix de l&apos;échantillon</Label>
              <div className="relative max-w-[12rem]">
                <Input
                  id={`${id}-unit-price`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={SAMPLE_PRICE_MAX}
                  step={0.01}
                  value={unitPrice}
                  onChange={(e) => {
                    setUnitPrice(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className="pr-7"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
              {error && (
                <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-colour-price`}>Prix au m² de cette couleur</Label>
              <div className="relative max-w-[12rem]">
                <Input
                  id={`${id}-colour-price`}
                  type="number"
                  inputMode="decimal"
                  min={M2_SPEC.min}
                  max={M2_SPEC.max}
                  step={M2_SPEC.step}
                  value={colourPrice}
                  placeholder={materialPrice !== null ? String(materialPrice) : undefined}
                  onChange={(e) => {
                    setColourPrice(e.target.value);
                    setColourError(null);
                  }}
                  aria-invalid={colourError ? true : undefined}
                  aria-describedby={`${id}-colour-help`}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {M2_SPEC.suffix}
                </span>
              </div>
              <p id={`${id}-colour-help`} className={colourError ? 'text-xs text-destructive' : 'text-[11px] text-muted-foreground'}>
                {colourError ??
                  `Laissez vide pour appliquer le prix du matériau${materialPrice !== null ? ` (${formatEuro(materialPrice)}/m²)` : ''}.`}
              </p>
            </div>
            {saveError && (
              <p className="text-xs text-destructive" role="alert">
                {saveError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
