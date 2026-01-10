"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  IconPlus,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconUpload,
  IconCamera,
  IconCalendar,
  IconMapPin,
  IconRuler2,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface Realisation {
  id: number;
  titre: string;
  description: string;
  image_url: string | null;
  date_projet: string;
  categorie: string;
  lieu: string;
  dimensions: string;
  created_at: string;
}

type FormState = {
  titre: string;
  description: string;
  date_projet: string;
  categorie: string;
  lieu: string;
  dimensions: string;
  imagePath: string;
};

const EMPTY_FORM: FormState = {
  titre: '',
  description: '',
  date_projet: '',
  categorie: '',
  lieu: '',
  dimensions: '',
  imagePath: '',
};

export function DashboardRealisations() {
  const [realisations, setRealisations] = useState<Realisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/backend/api/categories.php?active=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Erreur chargement categories:", error);
    }
  };

  const fetchRealisations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/backend/api/admin/realisations.php', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRealisations(data.realisations || []);
      }
    } catch (error) {
      console.error("Erreur chargement réalisations:", error);
      toast.error("Erreur lors du chargement des réalisations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealisations();
    fetchCategories();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
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
      let imageUrl = formState.imagePath;

      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      const payload = {
        ...formState,
        id: editingId,
        image_url: imageUrl
      };

      const response = await fetch('/backend/api/admin/realisations.php', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success(editingId ? "Réalisation modifiée" : "Réalisation créée");
        fetchRealisations();
        resetForm();
      } else {
        throw new Error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (real: Realisation) => {
    setEditingId(real.id);
    setFormState({
      titre: real.titre,
      description: real.description || '',
      date_projet: real.date_projet || '',
      categorie: real.categorie || '',
      lieu: real.lieu || '',
      dimensions: real.dimensions || '',
      imagePath: real.image_url || '',
    });
    setPreview(real.image_url);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette réalisation ?")) return;

    try {
      const response = await fetch(`/backend/api/admin/realisations.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        toast.success("Réalisation supprimée");
        fetchRealisations();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-serif font-semibold tracking-tight">Réalisations</h3>
          <p className="text-sm text-muted-foreground">Gérer les photos et détails des projets réels</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="flex-1 sm:flex-none">
          <IconPlus className="w-4 h-4 mr-2" />
          Ajouter une réalisation
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <IconRefresh className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {realisations.map((real) => (
            <Card key={real.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted relative">
                {real.image_url ? (
                  <img src={real.image_url} alt={real.titre} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <IconCamera size={48} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button size="icon" variant="secondary" onClick={() => handleEdit(real)}>
                    <IconEdit size={16} />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(real.id)}>
                    <IconTrash size={16} />
                  </Button>
                </div>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">{real.titre}</CardTitle>
                <CardDescription className="line-clamp-2">{real.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconCalendar size={14} />
                  <span>{real.date_projet || 'Non précisé'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconMapPin size={14} />
                  <span>{real.lieu || 'Non précisé'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconRuler2 size={14} />
                  <span>{real.dimensions || 'Non précisé'}</span>
                </div>
                <div className="mt-2 inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {real.categorie || 'Sans catégorie'}
                </div>
              </CardContent>
            </Card>
          ))}
          {realisations.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/50">
              <IconCamera className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-muted-foreground">Aucune réalisation pour le moment</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="mt-4">
                Créer votre première réalisation
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la réalisation" : "Ajouter une réalisation"}</DialogTitle>
            <DialogDescription>Remplissez les informations du projet</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="titre">Titre du projet</Label>
                <Input id="titre" name="titre" value={formState.titre} onChange={handleInputChange} required placeholder="Ex: Dressing sur mesure" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} rows={3} placeholder="Détails du projet..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_projet">Date du projet</Label>
                <Input id="date_projet" name="date_projet" value={formState.date_projet} onChange={handleInputChange} placeholder="Ex: 2024 ou Mai 2024" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorie">Catégorie</Label>
                <select
                  id="categorie"
                  name="categorie"
                  value={formState.categorie}
                  onChange={(e) => setFormState(prev => ({ ...prev, categorie: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lieu">Lieu</Label>
                <Input id="lieu" name="lieu" value={formState.lieu} onChange={handleInputChange} placeholder="Ex: Lille Centre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input id="dimensions" name="dimensions" value={formState.dimensions} onChange={handleInputChange} placeholder="Ex: 3.2m x 2.8m" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="image">Image du projet</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleFileChange} />
                {(preview || formState.imagePath) && (
                  <div className="mt-2 rounded-md border bg-muted p-2">
                    <img src={preview || formState.imagePath} alt="Preview" className="mx-auto max-h-48 object-contain" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><IconRefresh className="mr-2 animate-spin" size={18} /> Enregistrement...</> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
