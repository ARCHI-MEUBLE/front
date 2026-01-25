/**
 * Composant DashboardSamples
 * Affiche la gestion des échantillons de façades directement dans le dashboard
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, type SampleType, uploadImage } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ChevronLeft, ChevronRight, ImageIcon, Hash, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
      const data = await apiClient.samples.adminList();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const existingMaterials = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.material) set.add(item.material);
    });
    return Array.from(set).sort();
  }, [items]);

  useEffect(() => {
    reload();
  }, []);

  const byMaterial = useMemo(() => {
    console.log('[DEBUG] Grouping materials from items:', items);
    const map: Record<string, SampleType[]> = {};
    for (const t of items) {
      const key = t.material || 'Sans matériau';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [items]);

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-serif font-semibold tracking-tight">Gestion des échantillons</h3>
          <p className="text-sm text-muted-foreground">
            Gérez votre catalogue de matériaux et de finitions visibles dans le configurateur.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-5 space-y-8">
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
              <CardFooter>
                <Button variant="outline" onClick={reload}>Réessayer</Button>
              </CardFooter>
            </Card>
          ) : Object.keys(byMaterial).length === 0 ? (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-10 w-10" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Aucun échantillon</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Vous n'avez pas encore ajouté de types d'échantillons. Commencez par en créer un à droite.
                </p>
              </div>
            </div>
          ) : (
            Object.entries(byMaterial).map(([material, list]) => (
              <MaterialSection key={material} title={material} list={list} onChanged={reload} />
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <CreateTypeCard onCreated={reload} existingMaterials={existingMaterials} />
        </div>
      </div>
    </div>
  );
}

function MaterialSection({ title, list, onChanged }: { title: string; list: SampleType[]; onChanged: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const removeMaterial = async () => {
    if (!confirm(`Attention : Supprimer le matériau "${title}" supprimera également les ${list.length} types et toutes leurs finitions associés. Continuer ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // On supprime chaque type de ce matériau un par un via l'API existante
      // Le backend supprimera les couleurs par cascade
      for (const type of list) {
        await apiClient.samples.deleteType(type.id);
      }
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression du matériau');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-serif font-semibold tracking-tight uppercase text-muted-foreground">{title}</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive" 
            onClick={removeMaterial}
            disabled={isDeleting}
            title={`Supprimer tout le matériau ${title}`}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
        <Badge variant="outline">{list.length} modèles</Badge>
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex w-max space-x-4 p-4">
          {list.map((t) => (
            <div key={t.id} className="w-[350px] shrink-0">
              <TypeRow type={t} onChanged={onChanged} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function CreateTypeCard({ onCreated, existingMaterials }: { onCreated: () => void; existingMaterials: string[] }) {
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Gestion intelligente du mode initial et des changements de liste
  useEffect(() => {
    if (existingMaterials.length === 0) {
      if (!isCustom) setIsCustom(true);
    } else if (!isCustom && !material && existingMaterials.length > 0) {
      // On ne met plus de valeur par défaut automatique pour forcer le choix
      // setMaterial(existingMaterials[0]); 
    }
  }, [existingMaterials, isCustom, material]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Détermination stricte du matériau
    const finalMaterial = isCustom ? customMaterial.trim() : material;
    
    console.log('[DEBUG] Form submission:', { 
      name, 
      finalMaterial, 
      isCustom, 
      customMaterial, 
      material 
    });

    if (!name.trim()) {
      alert('Veuillez donner un nom au modèle.');
      return;
    }
    
    if (!finalMaterial || finalMaterial === 'NEW') {
      alert('Veuillez spécifier un matériau.');
      return;
    }
    
    setSaving(true);
    try {
      const res = await apiClient.samples.createType({ 
        name: name.trim(), 
        material: finalMaterial, 
        description: description.trim()
      });
      
      console.log('[DEBUG] Creation success:', res);

      // Réinitialisation complète
      setName(''); 
      setDescription(''); 
      setCustomMaterial('');
      
      if (isCustom) {
        setIsCustom(false);
      }
      setMaterial(finalMaterial); // On sélectionne celui qu'on vient de créer
      
      onCreated();
    } catch (err) {
      console.error('[DEBUG] Creation error:', err);
      alert('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Nouveau type</CardTitle>
        <CardDescription>
          Créez une nouvelle catégorie de finitions.
        </CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type-name">Nom commercial</Label>
            <Input 
              id="type-name" 
              placeholder="Ex: Chêne Halifax" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type-material">Matériau de base</Label>
            {existingMaterials.length > 0 && !isCustom ? (
              <Select 
                key={`select-${existingMaterials.join('-')}`} // Clé pour forcer le rafraîchissement
                value={material} 
                onValueChange={(val) => {
                  if (val === 'NEW') {
                    setIsCustom(true);
                  } else {
                    setMaterial(val);
                  }
                }}
              >
                <SelectTrigger id="type-material">
                  <SelectValue placeholder="Sélectionner un matériau" />
                </SelectTrigger>
                <SelectContent>
                  {existingMaterials.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                  <Separator className="my-2" />
                  <SelectItem value="NEW" className="text-amber-600 font-medium">+ Autre matériau</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input 
                  autoFocus 
                  placeholder="Nom du nouveau matériau" 
                  value={customMaterial} 
                  onChange={(e) => setCustomMaterial(e.target.value)} 
                />
                {existingMaterials.length > 0 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustom(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type-desc">Description (optionnel)</Label>
            <Textarea 
              id="type-desc" 
              rows={3} 
              placeholder="Détails sur la texture, l'entretien..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={saving || !name}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Création...' : 'Créer le type'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function TypeRow({ type, onChanged }: { type: SampleType; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'image'|'hex'>('image');
  const [hex, setHex] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [newColorPriceM2, setNewColorPriceM2] = useState('0');
  const [newColorUnitPrice, setNewColorUnitPrice] = useState('0');

  const addColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'image' && !file) return;
    if (mode === 'hex' && !hex) return;

    setSaving(true);
    try {
      const derivedName = (type.name || 'Couleur').trim();
      if (mode === 'image') {
        const image_url = await uploadImage(file as File);
        await apiClient.samples.createColor({ 
          type_id: type.id, 
          name: derivedName, 
          image_url,
          price_per_m2: parseFloat(newColorPriceM2) || 0,
          unit_price: parseFloat(newColorUnitPrice) || 0
        });
        setFile(null);
      } else {
        const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
        await apiClient.samples.createColor({ 
          type_id: type.id, 
          name: derivedName, 
          hex: normalized,
          price_per_m2: parseFloat(newColorPriceM2) || 0,
          unit_price: parseFloat(newColorUnitPrice) || 0
        });
        setHex('');
      }
      setNewColorPriceM2('0');
      setNewColorUnitPrice('0');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const removeType = async () => {
    if (!confirm(`Supprimer le type "${type.name}" ?`)) return;
    setRemoving(true);
    try {
      await apiClient.samples.deleteType(type.id);
      onChanged();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{type.name}</CardTitle>
          <CardDescription className="font-medium text-amber-600">{type.material}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={removeType} disabled={removing}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1">
        {type.description && <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{type.description}</p>}
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {type.colors?.map((c) => (
              <VariantCard key={c.id} variant={c} onChanged={onChanged} />
            ))}
          </div>

          <Separator />

          <form onSubmit={addColor} className="space-y-3 pt-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Nouvelle variante</p>
            <Tabs value={mode} onValueChange={(val) => setMode(val as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="text-xs">
                  <ImageIcon className="mr-2 h-3 w-3" /> Image
                </TabsTrigger>
                <TabsTrigger value="hex" className="text-xs">
                  <Hash className="mr-2 h-3 w-3" /> HEX
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="image" className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    className="text-xs" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="hex" className="space-y-3 pt-2">
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
                <Input 
                  className="h-7 text-xs px-2" 
                  type="number" 
                  value={newColorPriceM2} 
                  onChange={e => setNewColorPriceM2(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Prix Echant.</Label>
                <Input 
                  className="h-7 text-xs px-2" 
                  type="number" 
                  value={newColorUnitPrice} 
                  onChange={e => setNewColorUnitPrice(e.target.value)} 
                />
              </div>
            </div>

            <Button size="sm" className="w-full h-8 text-xs" disabled={saving || (mode === 'image' ? !file : !hex)}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="mr-2 h-3 w-3" />}
              {saving ? 'Ajout...' : 'Ajouter la variante'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

import { type SampleColor } from '@/lib/apiClient';

function VariantCard({ variant, onChanged }: { variant: SampleColor, onChanged: () => void }) {
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
    <div className="group relative">
      <div className="h-14 w-14 overflow-hidden rounded-lg border bg-muted shadow-sm transition-transform group-hover:scale-105">
        {variant.image_url ? (
          <img src={variant.image_url} alt={variant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: variant.hex || '#EEE' }} />
        )}
      </div>

      {/* Boutons d'action rapides */}
      <div className="absolute -right-1 -top-1 hidden gap-1 group-hover:flex">
         <button
          onClick={() => setEditing(true)}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
          title="Modifier les prix"
        >
          <Hash className="h-3 w-3" />
        </button>
        <button
          onClick={async () => { if(confirm("Supprimer cette variante ?")) { await apiClient.samples.deleteColor(variant.id); onChanged(); } }}
          className="h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
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
