import { useState, useEffect } from "react";
import { Category } from "@/lib/apiClient";
import { Plus, Trash2, X, ImageIcon, Pencil, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/categories', {
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        toast.error("Accès non autorisé aux catégories");
        return;
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Erreur lors du chargement des catégories:", error);
      toast.error("Impossible de charger les catégories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCategoryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setNewCategoryImage(null);
    setImagePreview(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || "");
    setImagePreview(category.image_url || null);
    setNewCategoryImage(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setIsCreating(true);

    try {
      let imageUrl = editingCategory?.image_url || "";

      if (newCategoryImage) {
        const formData = new FormData();
        formData.append('image', newCategoryImage);

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

      if (!imagePreview && !newCategoryImage) {
        imageUrl = "";
      }

      if (editingCategory) {
        const response = await fetch('/api/admin/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingCategory.id,
            name: newCategoryName.trim(),
            description: newCategoryDescription.trim() || "",
            image_url: imageUrl || "",
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
          throw new Error(errorData.error || "Erreur lors de la mise à jour");
        }

        toast.success("Catégorie mise à jour");
      } else {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newCategoryName.trim(),
            description: newCategoryDescription.trim() || undefined,
            image_url: imageUrl || undefined,
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
          throw new Error(errorData.error || "Erreur lors de la création");
        }

        toast.success("Catégorie créée");
      }

      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryImage(null);
      setImagePreview(null);
      await loadCategories();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Supprimer "${category.name}" ?`)) return;

    try {
      const response = await fetch(`/api/admin/categories?id=${category.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Impossible de supprimer");

      toast.success("Catégorie supprimée");
      await loadCategories();
    } catch (error) {
      toast.error("Impossible de supprimer (utilisée par des modèles)");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Gérer les catégories</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border bg-muted/30">
            {editingCategory && (
              <div className="flex items-center justify-between pb-2">
                <Badge variant="secondary" className="text-xs">
                  Modification : {editingCategory.name}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 text-xs">
                  Annuler
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Nom */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Dressing"
                  className="h-9"
                  disabled={isCreating}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Description
                </Label>
                <Input
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Ex: Optimisez chaque centimètre"
                  className="h-9"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Image d'accueil
              </Label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="h-16 w-24 rounded-md object-cover border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isCreating}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground hover:border-foreground hover:bg-muted/50 transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    <span>Choisir une image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isCreating}
                    />
                  </label>
                )}
                <Button type="submit" size="sm" disabled={isCreating || !newCategoryName.trim()} className="ml-auto">
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingCategory ? (
                    "Mettre à jour"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Ajouter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <Separator />

          {/* Liste des catégories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Catégories existantes
              </p>
              <Badge variant="outline" className="text-xs">
                {categories.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune catégorie
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Image */}
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-12 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{category.name}</span>
                        {category.is_active === 0 && (
                          <Badge variant="secondary" className="text-[10px]">Désactivée</Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 font-mono">{category.slug}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
