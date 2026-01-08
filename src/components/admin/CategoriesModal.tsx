import { useState, useEffect } from "react";
import { apiClient, Category } from "@/lib/apiClient";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/backend/api/categories.php', {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/backend/api/categories.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      toast.success("Catégorie créée avec succès");
      setNewCategoryName("");
      setNewCategoryDescription("");
      await loadCategories();
    } catch (error: any) {
      console.error("Erreur lors de la création:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Supprimer la catégorie "${category.name}" ?\n\nCette action échouera si des modèles utilisent cette catégorie.`)) {
      return;
    }

    try {
      const response = await fetch(`/backend/api/categories.php?id=${category.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Impossible de supprimer");
      }

      toast.success("Catégorie supprimée");
      await loadCategories();
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Impossible de supprimer (utilisée par des modèles)");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1A1917]">Gérer les catégories</h2>
            <p className="mt-1 text-sm text-[#6B6560]">
              Ajoutez ou supprimez des catégories de meubles
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire de création */}
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-[#E8E4DE] bg-[#FAFAF9] p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-[#1A1917]">
              Nom de la catégorie <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-4 py-2 focus:border-[#1A1917] focus:outline-none"
              placeholder="Ex: Dressing, Bibliothèque..."
              disabled={isCreating}
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-[#1A1917]">
              Description (optionnelle)
            </label>
            <input
              type="text"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-4 py-2 focus:border-[#1A1917] focus:outline-none"
              placeholder="Ex: Optimisez chaque centimètre"
              disabled={isCreating}
            />
          </div>

          <button
            type="submit"
            disabled={isCreating || !newCategoryName.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#1A1917] px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Création..." : "Ajouter la catégorie"}
          </button>
        </form>

        {/* Liste des catégories */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-[#1A1917]">
            Catégories existantes ({categories.length})
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B6560]">
              Aucune catégorie. Créez-en une ci-dessus.
            </div>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-[#E8E4DE] bg-white p-3 transition-colors hover:bg-[#FAFAF9]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1A1917]">{category.name}</span>
                      {category.is_active === 0 && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                          Désactivée
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="mt-0.5 text-sm text-[#6B6560]">{category.description}</p>
                    )}
                    <p className="mt-1 text-xs text-[#8B7D6B]">Slug: {category.slug}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(category)}
                    className="ml-4 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E8E4DE] px-6 py-2 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F3F0]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
