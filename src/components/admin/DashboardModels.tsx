/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

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

    // Validation : le prompt doit contenir "b" (planche de base)
    if (!formState.prompt.includes('b')) {
      setError('Le prompt doit contenir "b" (planche de base obligatoire)');
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
        console.error('Error response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Impossible de sauvegarder le modèle');
      }

      const data = (await response.json()) as { model: AdminModel };

      setModels((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? data.model : item));
        }
        return [data.model, ...prev];
      });

      resetForm();
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue');
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
  };

  const handleDelete = async (id: number) => {
    const confirmation = window.confirm('Supprimer ce modèle ?');
    if (!confirmation) {
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

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue');
    }
  };

  return (
  <div className="space-y-6">
    {/* Bouton Configurateur Admin - Design sobre */}
    <div className="flex items-center justify-between border border-gray-200 bg-white p-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">🛠️ Configurateur Admin</h3>
        <p className="mt-1 text-xs text-gray-600">
          Créez un nouveau meuble personnalisé en Mode EZ avec le configurateur 3D
        </p>
      </div>
      <a
        href="/configurator/select"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-gray-900 text-white font-medium text-xs uppercase hover:bg-gray-800 transition"
      >
        Ouvrir le configurateur
      </a>
    </div>

    {/* Formulaire - Design sobre */}
    <section className="border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">
        {editingId ? 'Modifier le modèle' : 'Ajouter un modèle'}
      </h2>
      <p className="text-xs text-gray-500 mt-1">
        {editingId
          ? 'Mettez à jour les informations du modèle sélectionné.'
          : 'Renseignez un nouveau modèle pour le catalogue numérique.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
            Nom du modèle
          </label>
          <input
            id="name"
            name="name"
            required
            value={formState.name}
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            value={formState.description}
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="prompt" className="block text-xs font-medium text-gray-700 mb-1">
            Prompt interne
          </label>
          <textarea
            id="prompt"
            name="prompt"
            required
            rows={4}
            value={formState.prompt}
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="image" className="block text-xs font-medium text-gray-700 mb-1">
            Image du modèle
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            className="w-full text-xs text-gray-600"
          />
          {(preview || formState.imagePath) && (
            <img
              src={preview ?? formState.imagePath}
              alt={formState.name || 'Prévisualisation du modèle'}
              className="mt-3 w-full border border-gray-200"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-900 px-4 py-2 text-xs font-medium text-white uppercase hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isSubmitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </section>

    {/* Liste des modèles - Design sobre */}
    <div className="border-t border-gray-200 pt-4">
      <h2 className="text-base font-semibold text-gray-900">Modèles enregistrés</h2>
      <p className="text-xs text-gray-500 mt-1">
        Gérez votre catalogue de meubles et leurs prompts génératifs.
      </p>
    </div>
    {error && (
      <div className="border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </div>
    )}

    {isLoading ? (
      <div className="border border-gray-200 bg-white p-4 text-xs text-gray-500">
        Chargement des modèles...
      </div>
    ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {sortedModels.map((model) => (
          <article key={model.id} className="border border-gray-200 bg-white p-3">
            {model.image_url && (
              <img
                src={model.image_url}
                alt={model.name}
                className="mb-3 w-full border border-gray-200"
              />
            )}
            <h3 className="text-sm font-semibold text-gray-900">{model.name}</h3>
            <p className="mt-2 text-xs text-gray-600">{model.description}</p>
            <p className="mt-2 text-xs text-gray-400">
              Ajouté le {new Date(model.created_at).toLocaleString()}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleEdit(model)}
                className="flex-1 border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => handleDelete(model.id)}
                className="flex-1 border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
        {sortedModels.length === 0 && (
          <div className="border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
            Aucun modèle enregistré pour le moment.
          </div>
        )}
      </div>
    )}
  </div>
);

}

export default DashboardModels;