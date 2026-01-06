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
  IconHelpCircle,
} from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

const PromptGuideContent = () => (
  <div className="space-y-8">
    <div className="grid gap-8 sm:grid-cols-2">
      {/* Structure Column */}
      <div className="space-y-4">
        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="h-[1px] w-4 bg-zinc-300" /> Structure globale
        </h5>
        <div className="space-y-3">
          <div className="flex items-center group">
            <code className="min-w-[60px] text-xs font-bold text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">M1</code>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-4 group-hover:text-primary transition-colors">Modèle de base</span>
          </div>
          <div className="flex items-center group">
            <code className="min-w-[60px] text-xs font-bold text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">(L,P,H)</code>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-4 group-hover:text-primary transition-colors">Dimensions (mm)</span>
          </div>
          <div className="flex items-center group">
            <code className="min-w-[60px] text-xs font-bold text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">H / V</code>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-4 group-hover:text-primary transition-colors">Découpe Horiz. / Vert.</span>
          </div>
          <div className="flex items-center group">
            <code className="min-w-[60px] text-xs font-bold text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">[x,y]</code>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-4 group-hover:text-primary transition-colors">Ratios des divisions</span>
          </div>
        </div>
      </div>

      {/* Content Column */}
      <div className="space-y-4">
        <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="h-[1px] w-4 bg-zinc-300" /> Équipements & Options
        </h5>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-blue-600 dark:text-blue-400">v</code>
              <span className="text-xs text-zinc-500">Étagère Verre</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-emerald-600 dark:text-emerald-400">p</code>
              <span className="text-xs text-zinc-500">Pegboard</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-primary">T</code>
              <span className="text-xs text-zinc-500">Tiroir std</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-primary">To</code>
              <span className="text-xs text-zinc-500">Tiroir Push</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-primary">P / Pd</code>
              <span className="text-xs text-zinc-500">Porte G / D</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-primary">P2</code>
              <span className="text-xs text-zinc-500">Double Porte</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-xs font-bold text-primary">D</code>
              <span className="text-xs text-zinc-500">Penderie</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Example Section - KEPT AS BLACK BOX */}
    <div className="bg-zinc-950 rounded-xl p-6 font-mono text-xs overflow-hidden border border-zinc-800 shadow-2xl relative">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <IconPackage className="w-12 h-12" />
      </div>
      <div className="flex justify-between items-center mb-4 text-zinc-500 border-b border-zinc-800/50 pb-3">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Structure du Prompt
        </span>
        <Badge variant="outline" className="text-[10px] h-5 border-zinc-800 text-zinc-400 uppercase tracking-widest px-2">Syntaxe</Badge>
      </div>
      <div className="space-y-4">
        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
          <p className="text-sm leading-relaxed tracking-wider">
            <span className="text-blue-400 font-bold">M1</span>
            <span className="text-zinc-600">(</span>
            <span className="text-amber-400">1000,400,2000</span>
            <span className="text-zinc-600">)</span>
            <span className="text-purple-400 font-bold">V</span>
            <span className="text-zinc-600">[</span>
            <span className="text-emerald-400">50,50</span>
            <span className="text-zinc-600">](</span>
            <span className="text-white font-bold underline decoration-zinc-700 underline-offset-4">T</span>
            <span className="text-zinc-600">,</span>
            <span className="text-white font-bold underline decoration-zinc-700 underline-offset-4">v</span>
            <span className="text-zinc-600">)</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-blue-400" /> Modèle & Dimensions
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-purple-400" /> Structure & Ratios
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-white" /> Équipements
          </div>
        </div>
      </div>
    </div>
  </div>
);

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
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/backend/api/models.php');

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

      const endpoint = editingId ? `/backend/api/models.php?id=${editingId}` : '/backend/api/models.php';
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
      const response = await fetch(`/backend/api/models.php?id=${id}`, {
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
            <CardTitle>Conception visuelle</CardTitle>
            <CardDescription>Utilisez le configurateur 3D pour concevoir un meuble et l'ajouter directement au catalogue.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center">
            <Button asChild className="bg-[#8B7355] hover:bg-[#705D45]">
              <a href="/configurator/M1?adminMode=createModel" target="_blank" rel="noopener noreferrer">
                <IconExternalLink className="w-4 h-4 mr-2" />
                Lancer la création visuelle
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
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt">Prompt interne</Label>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-2" onClick={() => setIsGuideOpen(true)}>
                  <IconHelpCircle className="w-4 h-4" />
                  <span className="text-xs">Guide du prompt</span>
                </Button>
              </div>
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

      {/* Guide du Prompt Dialog */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guide du prompt ArchiMeuble</DialogTitle>
            <DialogDescription>
              Syntaxe et codes pour créer vos modèles de meubles
            </DialogDescription>
          </DialogHeader>
          <PromptGuideContent />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DashboardModels;
