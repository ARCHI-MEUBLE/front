import { useState, useEffect } from 'react';

interface FacadeMaterial {
  id: number;
  name: string;
  color_hex: string;
  texture_url: string;
  price_modifier: number;
  price_per_m2: number;
  is_active: boolean;
  created_at: string;
}

interface DrillingType {
  id: number;
  name: string;
  description: string;
  icon_svg: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

interface FacadeSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

export function DashboardFacades() {
  const [materials, setMaterials] = useState<FacadeMaterial[]>([]);
  const [drillingTypes, setDrillingTypes] = useState<DrillingType[]>([]);
  const [settings, setSettings] = useState<FacadeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'settings' | 'pricing'>('materials');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showDrillingModal, setShowDrillingModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<FacadeMaterial | null>(null);
  const [editingDrilling, setEditingDrilling] = useState<DrillingType | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [materialsRes, drillingsRes, settingsRes] = await Promise.all([
        fetch(`${apiUrl}/backend/api/facade-materials.php`),
        fetch(`${apiUrl}/backend/api/facade-drilling-types.php`),
        fetch(`${apiUrl}/backend/api/facade-settings.php`),
      ]);

      const materialsData = await materialsRes.json();
      const drillingsData = await drillingsRes.json();
      const settingsData = await settingsRes.json();

      if (materialsData.success) {
        setMaterials(materialsData.data);
      }
      if (drillingsData.success) {
        setDrillingTypes(drillingsData.data);
      }
      if (settingsData.success) {
        setSettings(settingsData.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce matériau ?')) return;

    try {
      const response = await fetch(`${apiUrl}/backend/api/facade-materials/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setMaterials(materials.filter((m) => m.id !== id));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteDrilling = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce type de perçage ?')) return;

    try {
      const response = await fetch(`${apiUrl}/backend/api/facade-drilling-types/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setDrillingTypes(drillingTypes.filter((d) => d.id !== id));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-[#E8E6E3]">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'materials'
              ? 'border-b-2 border-[#1A1917] text-[#1A1917]'
              : 'text-[#706F6C] hover:text-[#1A1917]'
          }`}
        >
          Matériaux ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'border-b-2 border-[#1A1917] text-[#1A1917]'
              : 'text-[#706F6C] hover:text-[#1A1917]'
          }`}
        >
          Paramètres
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'pricing'
              ? 'border-b-2 border-[#1A1917] text-[#1A1917]'
              : 'text-[#706F6C] hover:text-[#1A1917]'
          }`}
        >
          Tarification
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div>
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => {
                setEditingMaterial(null);
                setShowMaterialModal(true);
              }}
              className="px-6 py-2.5 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors font-medium"
            >
              + Ajouter un matériau
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <div
                key={material.id}
                className="rounded-lg border border-[#E8E6E3] bg-white p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-16 h-16 rounded-lg shadow-sm"
                    style={{ backgroundColor: material.color_hex }}
                  />
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      material.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {material.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-[#1A1917] mb-2">
                  {material.name}
                </h3>
                <p className="text-sm text-[#706F6C] mb-4">
                  Couleur: {material.color_hex}
                </p>
                <p className="text-sm text-[#706F6C] mb-4">
                  Prix: {material.price_per_m2?.toFixed(2) || '150.00'} €/m²
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingMaterial(material);
                      setShowMaterialModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-[#E8E6E3] rounded hover:bg-[#FAFAF9] transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(material.id)}
                    className="flex-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsPanel settings={settings} onUpdate={fetchData} />
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <PricingPanel settings={settings} onUpdate={fetchData} />
      )}

      {/* Modals */}
      {showMaterialModal && (
        <MaterialModal
          material={editingMaterial}
          onClose={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          onSuccess={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
            fetchData();
          }}
        />
      )}

      {showDrillingModal && (
        <DrillingModal
          drilling={editingDrilling}
          onClose={() => {
            setShowDrillingModal(false);
            setEditingDrilling(null);
          }}
          onSuccess={() => {
            setShowDrillingModal(false);
            setEditingDrilling(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Modal pour matériaux
function MaterialModal({
  material,
  onClose,
  onSuccess,
}: {
  material: FacadeMaterial | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    color_hex: material?.color_hex || '#D8C7A1',
    texture_url: material?.texture_url || '',
    price_per_m2: material?.price_per_m2 || 150,
    is_active: material?.is_active !== false,
  });
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = material
        ? `${apiUrl}/backend/api/facade-materials/${material.id}`
        : `${apiUrl}/backend/api/facade-materials`;

      const response = await fetch(url, {
        method: material ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-[#1A1917]">
          {material ? 'Modifier' : 'Ajouter'} un matériau
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Couleur (Hex)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color_hex}
                onChange={(e) =>
                  setFormData({ ...formData, color_hex: e.target.value })
                }
                className="h-10 w-20 rounded border border-[#E8E6E3]"
              />
              <input
                type="text"
                value={formData.color_hex}
                onChange={(e) =>
                  setFormData({ ...formData, color_hex: e.target.value })
                }
                className="flex-1 px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              URL de texture (optionnel)
            </label>
            <input
              type="text"
              value={formData.texture_url}
              onChange={(e) =>
                setFormData({ ...formData, texture_url: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Prix au m² (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price_per_m2}
              onChange={(e) =>
                setFormData({ ...formData, price_per_m2: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
            />
            <p className="text-xs text-[#706F6C] mt-1">
              Prix du matériau par mètre carré (utilisé dans les calculs)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm text-[#1A1917]">
              Actif
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors disabled:opacity-50"
            >
              {loading ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal pour perçages
function DrillingModal({
  drilling,
  onClose,
  onSuccess,
}: {
  drilling: DrillingType | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: drilling?.name || '',
    description: drilling?.description || '',
    icon_svg: drilling?.icon_svg || '<circle cx="12" cy="12" r="5"/>',
    price: drilling?.price || 0,
    is_active: drilling?.is_active !== false,
  });
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = drilling
        ? `${apiUrl}/backend/api/facade-drilling-types/${drilling.id}`
        : `${apiUrl}/backend/api/facade-drilling-types`;

      const response = await fetch(url, {
        method: drilling ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-[#1A1917]">
          {drilling ? 'Modifier' : 'Ajouter'} un type de perçage
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Icône SVG (path)
            </label>
            <input
              type="text"
              value={formData.icon_svg}
              onChange={(e) =>
                setFormData({ ...formData, icon_svg: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1917] mb-2">
              Prix (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_drilling"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="mr-2"
            />
            <label htmlFor="is_active_drilling" className="text-sm text-[#1A1917]">
              Actif
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors disabled:opacity-50"
            >
              {loading ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// Composant pour les paramtres
function SettingsPanel({
  settings,
  onUpdate,
}: {
  settings: FacadeSetting[];
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const data: Record<string, string> = {};
    settings.forEach(s => {
      data[s.setting_key] = s.setting_value;
    });
    setFormData(data);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      for (const [key, value] of Object.entries(formData)) {
        const response = await fetch('/backend/api/facade-settings.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setting_key: key, setting_value: value }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error('Erreur lors de la mise  jour de ' + key);
        }
      }

      alert('Paramtres mis  jour avec succs !');
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise  jour des paramtres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          ? Ces paramtres dfinissent les limites maximales que les utilisateurs peuvent configurer pour leurs faades.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Largeur maximale
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Valeur (mm)
              </label>
              <input
                type="number"
                min="100"
                max="1000"
                step="10"
                value={formData.max_width || ''}
                onChange={(e) => setFormData({ ...formData, max_width: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              = {Math.round((parseInt(formData.max_width || '0')) / 10)} cm
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par dfaut : 600 mm (60 cm)
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Hauteur maximale
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Valeur (mm)
              </label>
              <input
                type="number"
                min="500"
                max="3000"
                step="10"
                value={formData.max_height || ''}
                onChange={(e) => setFormData({ ...formData, max_height: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              = {Math.round((parseInt(formData.max_height || '0')) / 10)} cm
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par dfaut : 2300 mm (230 cm)
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            paisseur fixe
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Valeur (mm)
              </label>
              <input
                type="number"
                min="10"
                max="50"
                step="1"
                value={formData.fixed_depth || ''}
                onChange={(e) => setFormData({ ...formData, fixed_depth: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par dfaut : 19 mm
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Marge des charnières
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Distance des bords (mm)
              </label>
              <input
                type="number"
                step="1"
                value={formData.hinge_edge_margin || ''}
                onChange={(e) => setFormData({ ...formData, hinge_edge_margin: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              = {Math.round((parseInt(formData.hinge_edge_margin || '0')) / 10)} cm
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par défaut : 20 mm (2 cm)
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>Description :</strong> Distance minimale entre les premiers/derniers trous de charnières et les bords haut/bas de la façade.<br/>
              <strong>Exemple :</strong> Avec une marge de 20mm sur une façade de 2000mm de hauteur, les trous seront positionnés à 20mm du haut et 20mm du bas.
            </p>
          </div>
        </div>

        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Diamètre des trous de charnières
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Diamètre (mm)
              </label>
              <input
                type="number"
                step="1"
                value={formData.hinge_hole_diameter || ''}
                onChange={(e) => setFormData({ ...formData, hinge_hole_diameter: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              mm
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par défaut : 26 mm (standard pour charnières de meuble)
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>Info :</strong> Diamètre standard pour charnières de cuisine/meubles : 26mm ou 35mm.<br/>
              Charnières piano ou invisibles : peuvent nécessiter des diamètres différents.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les paramtres'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant pour la tarification
function PricingPanel({
  settings,
  onUpdate,
}: {
  settings: FacadeSetting[];
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const data: Record<string, string> = {};
    settings.forEach(s => {
      data[s.setting_key] = s.setting_value;
    });
    setFormData(data);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      for (const [key, value] of Object.entries(formData)) {
        if (['hinge_base_price', 'hinge_coefficient', 'material_price_per_m2'].includes(key)) {
          const response = await fetch(`${apiUrl}/backend/api/facade-settings.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting_key: key, setting_value: value }),
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error('Erreur lors de la mise à jour de ' + key);
          }
        }
      }

      alert('Paramètres de tarification mis à jour avec succès !');
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">
          💡 <strong>Configuration de la tarification</strong>
        </p>
        <p className="text-xs text-blue-800">
          Ces paramètres définissent comment le prix des façades est calculé :
        </p>
        <ul className="text-xs text-blue-800 mt-2 ml-4 list-disc space-y-1">
          <li>Prix de base d'une charnière (€ par unité)</li>
          <li>Coefficient multiplicateur : augmente le prix total selon le nombre de charnières</li>
          <li>Prix du matériau au m² (base de calcul selon la surface)</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prix de base des charnières */}
        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Prix de base d'une charnière
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Montant (€)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                step="0.01"
                value={formData.hinge_base_price || ''}
                onChange={(e) => setFormData({ ...formData, hinge_base_price: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              € TTC
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par défaut : 34.20 €
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>Exemple :</strong> Si une charnière coûte 34.20 € et que le client choisit 3 charnières,
              le coût des charnières sera de 3 × 34.20 € = 102.60 €
            </p>
          </div>
        </div>

        {/* Coefficient par nombre de charnières */}
        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Coefficient multiplicateur par charnière
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Coefficient (décimal)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.hinge_coefficient || ''}
                onChange={(e) => setFormData({ ...formData, hinge_coefficient: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              = {((parseFloat(formData.hinge_coefficient || '0')) * 100).toFixed(0)}% par charnière
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par défaut : 0.05 (5% par charnière)
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-2">
              <strong>Formule :</strong> Prix total × (coefficient × nb_charnières)
            </p>
            <p className="text-xs text-gray-600">
              <strong>Exemple :</strong> Avec 3 charnières et un coefficient de 0.05 :<br/>
              Si le prix de base (matériau + charnières) = 500 €<br/>
              Supplément = 500 € × (0.05 × 3) = 500 € × 0.15 = 75 €<br/>
              <strong>Prix final = 500 € + 75 € = 575 €</strong>
            </p>
          </div>
        </div>

        {/* Prix du matériau au m² */}
        <div className="p-6 bg-white border border-[#E8E6E3] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1A1917] mb-4">
            Prix du matériau au m²
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1A1917] mb-2">
                Montant (€/m²)
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                step="0.01"
                value={formData.material_price_per_m2 || ''}
                onChange={(e) => setFormData({ ...formData, material_price_per_m2: e.target.value })}
                className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
              />
            </div>
            <div className="text-sm text-[#706F6C] pb-2">
              € / m²
            </div>
          </div>
          <p className="text-xs text-[#706F6C] mt-2">
            Valeur par défaut : 150.00 €/m²
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">
              <strong>Exemple :</strong> Une façade de 60 cm × 200 cm = 1.2 m²<br/>
              Prix matériau = 1.2 m² × 150 €/m² = 180 €<br/>
              (Les modificateurs de prix des matériaux s'ajoutent ensuite)
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer la tarification'}
          </button>
        </div>
      </form>
    </div>
  );
}
