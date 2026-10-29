/**
 * Composant DashboardSamples
 * Gestion des échantillons : une seule section, une ligne par matériau,
 * chaque ligne contenant la palette de couleurs du matériau.
 */

import { useEffect, useMemo, useState } from 'react';
import { apiClient, type SampleColor, type SampleType, uploadImage } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ImageIcon, Hash, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DashboardSamples() {
  const [items, setItems] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiClient.samples.adminList());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const byMaterial = useMemo(() => {
    const map: Record<string, SampleType[]> = {};
    for (const t of items) {
      const key = t.material || 'Sans matériau';
      (map[key] ||= []).push(t);
    }
    return map;
  }, [items]);

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Gestion des échantillons</h3>
        <p className="text-sm text-muted-foreground">
          Gérez la palette de couleurs de chaque matériau visible dans le configurateur.
        </p>
      </div>

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
                <Button variant="outline" onClick={reload}>Réessayer</Button>
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
            <MaterialSection byMaterial={byMaterial} onChanged={reload} />
          )}
        </div>

        <div className="lg:col-span-2">
          <CreateMaterialCard onCreated={reload} />
        </div>
      </div>
    </div>
  );
}

/** Section unique : une TypeRow par matériau */
function MaterialSection({ byMaterial, onChanged }: { byMaterial: Record<string, SampleType[]>; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      {Object.entries(byMaterial).map(([material, types]) => (
        <TypeRow key={material} material={material} types={types} onChanged={onChanged} />
      ))}
    </div>
  );
}

/** Nouveau matériau : un nom + sa première couleur (un matériau n'existe que par ses couleurs) */
function CreateMaterialCard({ onCreated }: { onCreated: () => void }) {
  const [material, setMaterial] = useState('');

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Nouveau matériau</CardTitle>
        <CardDescription>Créez un matériau avec sa première couleur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="material-name">Nom du matériau</Label>
          <Input
            id="material-name"
            placeholder="Ex: Bois"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
        </div>
        {material.trim() && (
          <>
            <Separator />
            <AddColorForm
              material={material.trim()}
              existing={[]}
              onAdded={() => {
                setMaterial('');
                onCreated();
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Ajoute une couleur à un matériau : crée un type portant le nom de la couleur, puis la variante */
function AddColorForm({ material, existing, onAdded }: { material: string; existing: SampleColor[]; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'image' | 'hex'>('image');
  const [hex, setHex] = useState('');
  const [priceM2, setPriceM2] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const colorName = name.trim();
    if (!colorName || (mode === 'image' ? !file : !hex.trim())) return;

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
        price_per_m2: parseFloat(priceM2) || 0,
        unit_price: parseFloat(unitPrice) || 0,
      });
      setName('');
      setFile(null);
      setHex('');
      setPriceM2('0');
      setUnitPrice('0');
      onAdded();
    } catch (err) {
      // Évite de laisser un type vide si la création de la couleur a échoué
      if (typeId !== null) await apiClient.samples.deleteType(typeId).catch(() => {});
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">Nouvelle couleur</p>
      <Input
        placeholder="Nom (Ex: Chêne Halifax)"
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
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept="image/*"
          />
        </TabsContent>

        <TabsContent value="hex" className="pt-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="#FFFFFF"
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

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Prix m²</Label>
          <Input className="h-7 text-xs px-2" type="number" value={priceM2} onChange={(e) => setPriceM2(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Prix Echant.</Label>
          <Input className="h-7 text-xs px-2" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button size="sm" className="w-full h-8 text-xs" disabled={saving || !name.trim() || (mode === 'image' ? !file : !hex.trim())}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="mr-2 h-3 w-3" />}
        {saving ? 'Ajout...' : 'Ajouter la couleur'}
      </Button>
    </form>
  );
}

/** Un matériau et sa palette (toutes les couleurs de tous ses types) */
function TypeRow({ material, types, onChanged }: { material: string; types: SampleType[]; onChanged: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const palette = useMemo(
    () => types.flatMap((t) => (t.colors ?? []).map((color) => ({ color, type: t }))),
    [types],
  );

  const removeMaterial = async () => {
    if (!confirm(`Attention : supprimer le matériau "${material}" supprimera ses ${palette.length} couleurs. Continuer ?`)) return;
    setIsDeleting(true);
    try {
      // Le backend supprime les couleurs par cascade
      for (const t of types) await apiClient.samples.deleteType(t.id);
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression du matériau');
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
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
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
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {palette.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune couleur pour ce matériau.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {palette.map(({ color, type }) => (
              <VariantCard key={color.id} variant={color} onChanged={onChanged} onDelete={() => removeColor(color, type)} />
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

function VariantCard({ variant, onChanged, onDelete }: { variant: SampleColor; onChanged: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceM2, setPriceM2] = useState((variant.price_per_m2 ?? 0).toString());
  const [unitPrice, setUnitPrice] = useState((variant.unit_price ?? 0).toString());

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.samples.updateColor(variant.id, {
        price_per_m2: parseFloat(priceM2) || 0,
        unit_price: parseFloat(unitPrice) || 0
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      alert("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group relative" title={variant.name}>
      <div className="h-14 w-14 overflow-hidden rounded-lg border bg-muted shadow-sm transition-transform [.group:hover_&]:scale-105">
        {variant.image_url ? (
          <img src={variant.image_url} alt={variant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: variant.hex || '#EEE' }} />
        )}
      </div>

      {/* Boutons d'action rapides */}
      {/* Variantes arbitraires plutôt que group-hover: Tailwind v4 réserve ce dernier à @media (hover: hover), jamais vrai sur certains écrans tactiles */}
      <div className="absolute -right-1 -top-1 z-10 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 [.group:hover_&]:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
          title="Modifier les prix"
        >
          <Hash className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
          title="Supprimer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1 max-w-[56px] truncate text-[9px] font-bold text-center uppercase text-zinc-600">
        {variant.unit_price > 0 ? `${variant.unit_price}€` : 'OFFERT'}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier les prix : {variant.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priceM2" className="text-right text-xs">Prix m² (€)</Label>
              <Input id="priceM2" type="number" value={priceM2} onChange={e => setPriceM2(e.target.value)} className="col-span-3 h-8" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unitPrice" className="text-right text-xs">Prix Unit. (€)</Label>
              <Input id="unitPrice" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="col-span-3 h-8" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
