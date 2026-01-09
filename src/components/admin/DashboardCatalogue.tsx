"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  IconPackage,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconUpload,
  IconPhoto,
  IconCategory,
  IconCheck,
  IconX,
  IconAdjustmentsHorizontal
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CatalogueItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  material: string | null;
  dimensions: string | null;
  unit_price: number;
  unit: string;
  stock_quantity: number;
  min_order_quantity: number;
  is_available: number;
  image_url: string | null;
  weight: number | null;
  tags: string | null;
  variation_label: string | null;
  created_at: string;
}

export interface Variation {
  id: number;
  color_name: string;
  image_url: string;
  is_default: number;
}

type FormState = {
  name: string;
  category: string;
  description: string;
  material: string;
  dimensions: string;
  unit_price: string;
  unit: string;
  stock_quantity: string;
  min_order_quantity: string;
  is_available: boolean;
  tags: string;
  variation_label: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: 'Portes',
  description: '',
  material: '',
  dimensions: '',
  unit_price: '',
  unit: 'pièce',
  stock_quantity: '0',
  min_order_quantity: '1',
  is_available: true,
  tags: '',
  variation_label: 'Couleur / Finition',
};

export function DashboardCatalogue() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // État pour les variations
  const [selectedItem, setSelectedItem] = useState<CatalogueItem | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isAddingVariation, setIsAddingVariation] = useState(false);
  const [varForm, setVarForm] = useState({ color_name: '', is_default: false });
  const [varFile, setVarFile] = useState<File | null>(null);
  const [varPreview, setVarPreview] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/catalogue?action=list');
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error("Erreur chargement catalogue:", error);
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/catalogue?action=categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Erreur chargement categories:", error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormState(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingId(null);
    setFile(null);
    setPreview(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = editingId ? items.find(it => it.id === editingId)?.image_url : null;

      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          throw new Error("Échec de l'upload de l'image");
        }
      }

      const payload = {
        ...formState,
        unit_price: parseFloat(formState.unit_price),
        stock_quantity: parseInt(formState.stock_quantity),
        min_order_quantity: parseInt(formState.min_order_quantity),
        is_available: formState.is_available ? 1 : 0,
        image_url: imageUrl
      };

      const response = await fetch(`/api/admin/catalogue?action=${editingId ? 'update' : 'create'}${editingId ? `&id=${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingId ? "Article mis à jour" : "Article créé");
        fetchItems();
        fetchCategories();
        resetForm();
      } else {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: CatalogueItem) => {
    setEditingId(item.id);
    setFormState({
      name: item.name,
      category: item.category,
      description: item.description || '',
      material: item.material || '',
      dimensions: item.dimensions || '',
      unit_price: item.unit_price.toString(),
      unit: item.unit,
      stock_quantity: item.stock_quantity.toString(),
      min_order_quantity: item.min_order_quantity.toString(),
      is_available: item.is_available === 1,
      tags: item.tags || '',
      variation_label: item.variation_label || 'Couleur / Finition',
    });
    setPreview(item.image_url);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet article ?")) return;

    try {
      const response = await fetch(`/api/admin/catalogue?action=delete&id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Article supprimé");
        fetchItems();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // --- Gestion des variations ---
  const openVariations = async (item: CatalogueItem) => {
    setSelectedItem(item);
    setIsVariationsOpen(true);
    fetchVariations(item.id);
  };

  const fetchVariations = async (itemId: number) => {
    try {
      const res = await fetch(`/api/admin/catalogue-variations?action=list&item_id=${itemId}`);
      const data = await res.json();
      if (data.success) {
        setVariations(data.data);
      }
    } catch (error) {
      toast.error("Erreur chargement variations");
    }
  };

  const handleAddVariation = async (e: FormEvent) => {
    e.preventDefault();
    if (!varFile || !selectedItem) {
      toast.error("Veuillez choisir une image");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload image
      const formData = new FormData();
      formData.append('image', varFile);
      const uploadRes = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) throw new Error(uploadData.error);

      // 2. Save variation
      const res = await fetch('/api/admin/catalogue-variations?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogue_item_id: selectedItem.id,
          color_name: varForm.color_name,
          image_url: uploadData.url,
          is_default: varForm.is_default ? 1 : 0
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Variation ajoutée");
        fetchVariations(selectedItem.id);
        setIsAddingVariation(false);
        setVarForm({ color_name: '', is_default: false });
        setVarFile(null);
        setVarPreview(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVariation = async (id: number) => {
    if (!confirm("Supprimer cette variation ?")) return;
    try {
      const res = await fetch(`/api/admin/catalogue-variations?action=delete&id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Variation supprimée");
        if (selectedItem) fetchVariations(selectedItem.id);
      }
    } catch (error) {
      toast.error("Erreur suppression");
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Catalogue & Pièces</h2>
          <p className="text-muted-foreground">Gérez les articles, portes et accessoires disponibles à la vente</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-primary">
          <IconPlus size={18} />
          Ajouter un article
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted/50 h-64" />
          ))
        ) : items.map((item) => (
          <Card key={item.id} className="overflow-hidden flex flex-col group border-border/50 hover:border-primary/50 transition-colors">
            <div className="aspect-square bg-muted relative">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <IconPhoto size={48} stroke={1} />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md" onClick={() => handleEdit(item)}>
                  <IconEdit size={14} />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8 shadow-md" onClick={() => handleDelete(item.id)}>
                  <IconTrash size={14} />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2">
                <Badge variant={item.is_available ? "default" : "destructive"} className="shadow-sm">
                  {item.is_available ? "Disponible" : "Indisponible"}
                </Badge>
              </div>
            </div>
            <CardHeader className="p-4 flex-1">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{item.category}</p>
                  <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{item.unit_price}€</p>
                  <p className="text-[10px] text-muted-foreground">par {item.unit}</p>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="p-4 pt-0 border-t bg-muted/20 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 gap-2 text-xs h-8" onClick={() => openVariations(item)}>
                <IconAdjustmentsHorizontal size={14} />
                Variations
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Dialog Article */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{editingId ? "Modifier l'article" : "Ajouter un article"}</DialogTitle>
            <DialogDescription>Remplissez les caractéristiques techniques de la pièce</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 py-2">
            <form id="catalogue-form" onSubmit={handleSubmit} className="space-y-4 pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nom de l'article</Label>
                  <Input id="name" name="name" value={formState.name} onChange={handleInputChange} required placeholder="Ex: Porte Chêne Massif" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <select
                    id="category"
                    name="category"
                    value={formState.category}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="NEW">+ Nouvelle catégorie...</option>
                  </select>
                  {formState.category === 'NEW' && (
                    <Input 
                      className="mt-2" 
                      placeholder="Nom de la catégorie" 
                      onBlur={(e) => setFormState(p => ({...p, category: e.target.value}))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Prix unitaire (€)</Label>
                  <Input id="unit_price" name="unit_price" type="number" step="0.01" value={formState.unit_price} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Input id="unit" name="unit" value={formState.unit} onChange={handleInputChange} placeholder="Ex: pièce, m², lot" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock initial</Label>
                  <Input id="stock_quantity" name="stock_quantity" type="number" value={formState.stock_quantity} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} rows={3} placeholder="Détails, matériaux, usage..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Matériau</Label>
                  <Input id="material" name="material" value={formState.material} onChange={handleInputChange} placeholder="Ex: MDF, Chêne, Verre" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions standards</Label>
                  <Input id="dimensions" name="dimensions" value={formState.dimensions} onChange={handleInputChange} placeholder="Ex: 60x40x1.8cm" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="image">Image principale</Label>
                  <div className="flex gap-4 items-start">
                    <Input id="image" type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
                    {(preview || formState.imagePath) && (
                      <div className="h-20 w-20 rounded border bg-muted p-1 overflow-hidden shrink-0">
                        <img src={preview || formState.imagePath} alt="Aperçu" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="variation_label">Libellé des variations</Label>
                  <Input id="variation_label" name="variation_label" value={formState.variation_label} onChange={handleInputChange} placeholder="Ex: Couleur / Finition, Taille, Modèle..." />
                  <p className="text-[10px] text-muted-foreground italic">Ce texte s'affichera au dessus des boutons de sélection sur le site.</p>
                </div>
                <div className="flex items-center space-x-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    name="is_available"
                    checked={formState.is_available}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_available">Rendre cet article visible sur le catalogue</Label>
                </div>
              </div>
            </form>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Annuler</Button>
            <Button type="submit" form="catalogue-form" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? <IconRefresh className="mr-2 animate-spin" size={18} /> : <IconUpload className="mr-2" size={18} />}
              {editingId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Variations */}
      <Dialog open={isVariationsOpen} onOpenChange={setIsVariationsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex justify-between items-center mr-6">
              <div>
                <DialogTitle>Variations : {selectedItem?.name}</DialogTitle>
                <DialogDescription>Gérez les différentes options de couleurs et finitions</DialogDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddingVariation(!isAddingVariation)} variant={isAddingVariation ? "ghost" : "default"}>
                {isAddingVariation ? <IconX size={18} /> : <><IconPlus size={18} className="mr-2" /> Ajouter</>}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isAddingVariation && (
              <div className="p-6 bg-muted/30 border-b animate-in slide-in-from-top duration-200">
                <form onSubmit={handleAddVariation} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de la couleur / finition</Label>
                    <Input 
                      value={varForm.color_name} 
                      onChange={e => setVarForm(p => ({...p, color_name: e.target.value}))} 
                      placeholder="Ex: Bleu Canard" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image de la variation</Label>
                    <div className="flex gap-2">
                      <Input type="file" accept="image/*" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setVarFile(f);
                          const r = new FileReader();
                          r.onloadend = () => setVarPreview(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }} required />
                      {varPreview && <img src={varPreview} className="h-10 w-10 rounded border" alt="Preview" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_def" checked={varForm.is_default} onChange={e => setVarForm(p => ({...p, is_default: e.target.checked}))} />
                    <Label htmlFor="is_def">Variation par défaut</Label>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="sm:col-start-2">
                    {isSubmitting ? <IconRefresh className="animate-spin" size={18} /> : "Valider l'ajout"}
                  </Button>
                </form>
              </div>
            )}

            <ScrollArea className="flex-1 p-6">
              {variations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <IconPhoto size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Aucune variation enregistrée pour cet article</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {variations.map((v) => (
                    <div key={v.id} className="relative group border rounded-lg overflow-hidden bg-card">
                      <div className="aspect-square bg-muted relative">
                        <img src={v.image_url} alt={v.color_name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteVariation(v.id)}>
                            <IconTrash size={14} />
                          </Button>
                        </div>
                        {v.is_default === 1 && (
                          <div className="absolute top-1 left-1">
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[8px] h-4 px-1">Défaut</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-center text-xs font-medium">
                        {v.color_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardCatalogue;
