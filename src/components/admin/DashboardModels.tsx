/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  IconPackage,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconUpload,
  IconExternalLink,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AdminModel {
  id: number;
  name: string;
  description: string;
  prompt: string;
  image_url: string | null;
  created_at: string;
}

type FormState = {
  name: string;
  description: string;
  prompt: string;
  imagePath: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  prompt: '',
  imagePath: '',
};

export function DashboardModels() {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/models');

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Impossible de charger les modèles');
      }

      const data = (await response.json()) as { models: AdminModel[] };
      setModels(data.models);
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue');
      toast.error((err as Error).message ?? 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchModels();
  }, []);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const sortedModels = useMemo(() => models, [models]);

  const stats = {
    total: models.length,
    thisMonth: models.filter(m => {
      const created = new Date(m.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingId(null);
    setFile(null);
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setIsDialogOpen(false);
  };

  const fileToBase64 = (selectedFile: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
          resolve(base64);
        } else {
          reject(new Error('Impossible de lire le fichier'));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(selectedFile);
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formState.prompt.includes('b')) {
      toast.error('Le prompt doit contenir "b" (planche de base obligatoire)');
      setIsSubmitting(false);
      return;
    }

    try {
      let imagePath = formState.imagePath;

      if (file) {
        const base64 = await fileToBase64(file);
        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            data: base64,
          }),
        });

        if (uploadResponse.status === 401) {
          window.location.href = '/admin/login';
          return;
        }

        if (!uploadResponse.ok) {
          throw new Error("L'upload de l'image a échoué");
        }

        const uploadData = (await uploadResponse.json()) as { imagePath: string };
        imagePath = uploadData.imagePath;
      }

      const payload = {
        name: formState.name,
        description: formState.description,
        prompt: formState.prompt,
        imagePath,
      };

      if (!payload.name || !payload.description || !payload.prompt || !payload.imagePath) {
        throw new Error('Tous les champs sont requis');
      }

      const endpoint = editingId ? `/api/admin/models/${editingId}` : '/api/admin/models';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || errorData.message || 'Impossible de sauvegarder le modèle');
      }

      const data = (await response.json()) as { model: AdminModel };

      setModels((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? data.model : item));
        }
        return [data.model, ...prev];
      });

      toast.success(editingId ? 'Modèle mis à jour !' : 'Modèle créé !');
      resetForm();
    } catch (err) {
      const errorMessage = (err as Error).message ?? 'Une erreur est survenue';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (model: AdminModel) => {
    setEditingId(model.id);
    setFormState({
      name: model.name,
      description: model.description,
      prompt: model.prompt,
      imagePath: model.image_url ?? '',
    });
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(model.image_url ?? null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer le modèle "${name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/models/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Impossible de supprimer le modèle');
      }

      setModels((prev) => prev.filter((model) => model.id !== id));
      toast.success('Modèle supprimé');

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      const errorMessage = (err as Error).message ?? 'Une erreur est survenue';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Modèles</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.total}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconPackage className="size-3" />
                Tous
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Modèles au catalogue <IconPackage className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Meubles disponibles
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Ce mois-ci</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.thisMonth}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconTrendingUp className="size-3" />
                Nouveaux
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Ajoutés récemment <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Depuis le début du mois
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 lg:px-6 space-y-4">
        {/* Configurator Link */}
        <Card>
          <CardHeader>
            <CardTitle>Configurateur 3D</CardTitle>
            <CardDescription>Créez un nouveau meuble avec le configurateur Mode EZ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/models" target="_blank" rel="noopener noreferrer">
                <IconExternalLink className="w-4 h-4 mr-2" />
                Ouvrir le configurateur
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Modèles enregistrés</h3>
            <p className="text-sm text-muted-foreground">Gérez votre catalogue de meubles</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <IconPlus className="w-4 h-4 mr-2" />
            Ajouter un modèle
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Models Grid */}
        {sortedModels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-lg font-medium mb-1">Aucun modèle</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez votre premier modèle de meuble
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <IconPlus className="w-4 h-4 mr-2" />
                Ajouter un modèle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedModels.map((model) => (
              <Card key={model.id} className="overflow-hidden">
                {model.image_url && (
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <img
                      src={model.image_url.startsWith('http') ? model.image_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${model.image_url}`}
                      alt={model.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{model.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{model.description}</CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(model)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <IconEdit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    onClick={() => handleDelete(model.id, model.name)}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le modèle' : 'Ajouter un modèle'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Mettez à jour les informations du modèle'
                : 'Créez un nouveau modèle pour le catalogue'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du modèle</Label>
              <Input
                id="name"
                name="name"
                required
                value={formState.name}
                onChange={handleInputChange}
                placeholder="Ex: Bibliothèque modulaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                value={formState.description}
                onChange={handleInputChange}
                placeholder="Décrivez le modèle..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt interne</Label>
              <textarea
                id="prompt"
                name="prompt"
                required
                rows={4}
                value={formState.prompt}
                onChange={handleInputChange}
                placeholder="Le prompt doit contenir 'b' (planche de base)"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image du modèle</Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
              {(preview || formState.imagePath) && (
                <div className="mt-2 rounded-md border bg-muted p-2">
                  <img
                    src={preview ?? formState.imagePath}
                    alt={formState.name || 'Prévisualisation'}
                    className="mx-auto max-h-48 object-contain"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <IconRefresh className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <IconUpload className="w-4 h-4 mr-2" />
                    {editingId ? 'Mettre à jour' : 'Enregistrer'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DashboardModels;
