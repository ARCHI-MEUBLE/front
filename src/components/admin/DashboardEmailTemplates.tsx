import { useState, useEffect } from 'react';

interface EmailTemplate {
  id: number;
  template_name: string;
  subject: string;
  header_text: string;
  footer_text: string;
  show_logo: boolean;
  show_gallery: boolean;
  gallery_images: string;
  gallery_images_array: string[];
  custom_css: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplatesResponse {
  success: boolean;
  templates: EmailTemplate[];
}

const TEMPLATE_LABELS: { [key: string]: { label: string; icon: string; description: string } } = {
  confirmation: {
    label: 'Email de Confirmation',
    icon: '✅',
    description: 'Envoyé immédiatement après qu\'un client réserve un rendez-vous'
  },
  reminder_24h: {
    label: 'Rappel 24h avant',
    icon: '⏰',
    description: 'Envoyé 24 heures avant le rendez-vous'
  },
  reminder_1h: {
    label: 'Rappel 1h avant',
    icon: '⏰',
    description: 'Envoyé 1 heure avant le rendez-vous'
  },
  admin_notification: {
    label: 'Notification Admin',
    icon: '📧',
    description: 'Envoyé au menuisier lors de chaque nouveau rendez-vous'
  }
};

const AVAILABLE_IMAGES = ['biblio.jpg', 'buffet.jpg', 'dressing.jpg'];

export function DashboardEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/backend/api/admin/email-templates.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Vous devez être connecté en tant qu'administrateur");
        }
        throw new Error('Erreur lors du chargement des templates');
      }

      const data: TemplatesResponse = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template });
    setSuccessMessage('');
  };

  const handleSave = async () => {
    if (!editedTemplate) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8000/backend/api/admin/email-templates.php', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editedTemplate.id,
          subject: editedTemplate.subject,
          header_text: editedTemplate.header_text,
          footer_text: editedTemplate.footer_text,
          show_logo: editedTemplate.show_logo,
          show_gallery: editedTemplate.show_gallery,
          gallery_images: editedTemplate.gallery_images_array,
          custom_css: editedTemplate.custom_css,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setSuccessMessage('Template sauvegardé avec succès !');
      await loadTemplates();

      // Close modal after 1 second
      setTimeout(() => {
        setSelectedTemplate(null);
        setEditedTemplate(null);
        setSuccessMessage('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleImage = (imageName: string) => {
    if (!editedTemplate) return;

    const currentImages = editedTemplate.gallery_images_array || [];
    let newImages: string[];

    if (currentImages.includes(imageName)) {
      newImages = currentImages.filter(img => img !== imageName);
    } else {
      newImages = [...currentImages, imageName];
    }

    setEditedTemplate({
      ...editedTemplate,
      gallery_images_array: newImages,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Configuration des Emails</h2>
        <p className="text-sm text-gray-600 mt-1">
          Personnalisez les templates d'emails envoyés aux clients et administrateurs
        </p>
      </div>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Liste des templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const info = TEMPLATE_LABELS[template.template_name] || {
            label: template.template_name,
            icon: '📧',
            description: ''
          };

          return (
            <div key={template.id} className="border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">{info.icon}</span>
                    {info.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-700">Sujet:</span>
                  <p className="text-gray-600 mt-0.5">{template.subject}</p>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <span className={`inline-flex items-center gap-1 ${template.show_logo ? 'text-green-600' : 'text-gray-400'}`}>
                    {template.show_logo ? '✓' : '○'} Logo
                  </span>
                  <span className={`inline-flex items-center gap-1 ${template.show_gallery ? 'text-green-600' : 'text-gray-400'}`}>
                    {template.show_gallery ? '✓' : '○'} Galerie ({template.gallery_images_array?.length || 0} images)
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleEdit(template)}
                className="mt-4 w-full px-3 py-2 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-900"
              >
                Modifier →
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal d'édition */}
      {selectedTemplate && editedTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => !isSaving && setSelectedTemplate(null)}
        >
          <div
            className="bg-white border border-gray-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {TEMPLATE_LABELS[selectedTemplate.template_name]?.icon} Modifier: {TEMPLATE_LABELS[selectedTemplate.template_name]?.label}
                </h2>
                <button
                  onClick={() => !isSaving && setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                  disabled={isSaving}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {successMessage && (
                <div className="p-3 border border-green-300 bg-green-50 text-green-700 text-sm">
                  {successMessage}
                </div>
              )}

              {/* Sujet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet de l'email
                </label>
                <input
                  type="text"
                  value={editedTemplate.subject}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-900"
                  disabled={isSaving}
                />
              </div>

              {/* Header text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texte du header (titre dans l'email)
                </label>
                <input
                  type="text"
                  value={editedTemplate.header_text}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, header_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="Ex: ✓ Rendez-vous confirmé"
                  disabled={isSaving}
                />
              </div>

              {/* Footer text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texte du footer
                </label>
                <input
                  type="text"
                  value={editedTemplate.footer_text}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, footer_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="Ex: ArchiMeuble - Meubles sur mesure"
                  disabled={isSaving}
                />
              </div>

              {/* Options Logo & Galerie */}
              <div className="border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Options d'affichage</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedTemplate.show_logo}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, show_logo: e.target.checked })}
                      className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-gray-700">Afficher le logo ArchiMeuble</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedTemplate.show_gallery}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, show_gallery: e.target.checked })}
                      className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-gray-700">Afficher la galerie d'images</span>
                  </label>
                </div>
              </div>

              {/* Galerie d'images */}
              {editedTemplate.show_gallery && (
                <div className="border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Images de réalisations ({editedTemplate.gallery_images_array?.length || 0} sélectionnée(s))
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {AVAILABLE_IMAGES.map((imageName) => {
                      const isSelected = editedTemplate.gallery_images_array?.includes(imageName) || false;
                      return (
                        <div
                          key={imageName}
                          onClick={() => !isSaving && handleToggleImage(imageName)}
                          className={`relative border-2 cursor-pointer transition-all ${
                            isSelected ? 'border-green-600' : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="aspect-video bg-gray-100 flex items-center justify-center">
                            <img
                              src={`http://localhost:8000/backend/api/calendly/assets/${imageName}`}
                              alt={imageName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-gray-400">Image non trouvée</span>';
                              }}
                            />
                          </div>
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-700 truncate">{imageName}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Cliquez sur les images pour les sélectionner/désélectionner
                  </p>
                </div>
              )}

              {/* CSS personnalisé */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSS personnalisé (optionnel)
                </label>
                <textarea
                  value={editedTemplate.custom_css || ''}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, custom_css: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 focus:outline-none focus:border-gray-900"
                  rows={4}
                  placeholder=".header { background-color: #2f2a26; }"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSS appliqué au template HTML de l'email
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => !isSaving && setSelectedTemplate(null)}
                className="px-4 py-2 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-900"
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800"
                disabled={isSaving}
              >
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
