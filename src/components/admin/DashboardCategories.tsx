import { useState, useEffect } from "react";
import { apiClient, Category, uploadImage } from "@/lib/apiClient";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export function DashboardCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.categories.getAll(false);
      setCategories(data);
    } catch (error) {
      console.error("Erreur lors du chargement des catégories:", error);
      toast.error("Impossible de charger les catégories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        is_active: category.is_active === 1,
      });
      setImagePreview(category.image_url);
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        is_active: true,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-générer le slug à partir du nom
    if (name === "name" && !editingCategory) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = formData.image_url;

      // Upload de l'image si nécessaire
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const categoryData = {
        ...formData,
        image_url: imageUrl,
      };

      if (editingCategory) {
        await apiClient.categories.update(editingCategory.id, categoryData);
        toast.success("Catégorie mise à jour avec succès");
      } else {
        await apiClient.categories.create(categoryData);
        toast.success("Catégorie créée avec succès");
      }

      await loadCategories();
      handleCloseModal();
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?\n\nAttention : Cette action est irréversible et échouera si des modèles utilisent cette catégorie.`)) {
      return;
    }

    try {
      await apiClient.categories.delete(category.id);
      toast.success("Catégorie supprimée");
      await loadCategories();
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error.message || "Impossible de supprimer la catégorie (utilisée par des modèles)");
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await apiClient.categories.update(category.id, {
        is_active: category.is_active === 1 ? 0 : 1,
      });
      toast.success(category.is_active === 1 ? "Catégorie désactivée" : "Catégorie activée");
      await loadCategories();
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      toast.error("Erreur lors du changement de statut");
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setIsDragging(false);

    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex === dropIndex) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(dropIndex, 0, removed);

    setCategories(newCategories);

    try {
      const categoryIds = newCategories.map(cat => cat.id);
      await apiClient.categories.reorder(categoryIds);
      toast.success("Ordre des catégories mis à jour");
    } catch (error) {
      console.error("Erreur lors du réordonnancement:", error);
      toast.error("Erreur lors du réordonnancement");
      await loadCategories();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1917]">Catégories</h2>
          <p className="mt-1 text-sm text-[#6B6560]">
            Gérez les catégories de meubles affichées sur le site
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-[#1A1917] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E8E4DE] bg-white p-4">
          <div className="text-sm text-[#6B6560]">Total</div>
          <div className="mt-1 text-2xl font-bold text-[#1A1917]">{categories.length}</div>
        </div>
        <div className="rounded-lg border border-[#E8E4DE] bg-white p-4">
          <div className="text-sm text-[#6B6560]">Actives</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {categories.filter(c => c.is_active === 1).length}
          </div>
        </div>
        <div className="rounded-lg border border-[#E8E4DE] bg-white p-4">
          <div className="text-sm text-[#6B6560]">Désactivées</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">
            {categories.filter(c => c.is_active === 0).length}
          </div>
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="rounded-lg border border-[#E8E4DE] bg-white">
        <div className="p-4">
          <p className="text-sm text-[#6B6560]">
            Glissez-déposez pour réorganiser l'ordre d'affichage
          </p>
        </div>

        <div className="divide-y divide-[#E8E4DE]">
          {categories.map((category, index) => (
            <div
              key={category.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center gap-4 p-4 transition-colors ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              } hover:bg-[#FAFAF9]`}
            >
              <GripVertical className="h-5 w-5 shrink-0 text-[#6B6560]" />

              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F5F3F0] text-sm text-[#6B6560]">
                  Pas d'image
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#1A1917]">{category.name}</h3>
                  {category.is_active === 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      Désactivée
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[#6B6560]">
                  {category.description || "Aucune description"}
                </p>
                <p className="mt-1 text-xs text-[#8B7D6B]">Slug: {category.slug}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleToggleActive(category)}
                  className="rounded-lg p-2 text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
                  title={category.is_active === 1 ? "Désactiver" : "Activer"}
                >
                  {category.is_active === 1 ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleOpenModal(category)}
                  className="rounded-lg p-2 text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="py-12 text-center text-[#6B6560]">
              Aucune catégorie. Créez-en une pour commencer.
            </div>
          )}
        </div>
      </div>

      {/* Modal de création/édition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1A1917]">
                {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1917]">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-4 py-2 focus:border-[#1A1917] focus:outline-none"
                  placeholder="Ex: Dressing, Bibliothèque..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1917]">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-4 py-2 focus:border-[#1A1917] focus:outline-none"
                  placeholder="Ex: dressing, bibliotheque..."
                  required
                />
                <p className="mt-1 text-xs text-[#6B6560]">
                  Utilisé dans l'URL (pas d'espaces, accents ou caractères spéciaux)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1917]">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-4 py-2 focus:border-[#1A1917] focus:outline-none"
                  placeholder="Ex: Optimisez chaque centimètre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1917]">
                  Image
                </label>
                <div className="mt-2 space-y-2">
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Aperçu"
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                          setFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E8E4DE] bg-white px-4 py-2 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F3F0]">
                    <Upload className="h-4 w-4" />
                    Choisir une image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#E8E4DE] text-[#1A1917] focus:ring-[#1A1917]"
                />
                <label htmlFor="is_active" className="text-sm text-[#1A1917]">
                  Catégorie active (visible sur le site)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-[#E8E4DE] px-4 py-2.5 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F3F0]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 rounded-lg bg-[#1A1917] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-50"
                >
                  {isUploading ? "Enregistrement..." : editingCategory ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
