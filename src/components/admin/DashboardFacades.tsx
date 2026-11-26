"use client"

import { useState, useEffect, useId } from 'react';
import toast from 'react-hot-toast';
import {
  IconRefresh,
  IconEdit,
  IconTrash,
  IconPlus,
  IconCurrencyEuro,
  IconRuler,
  IconCheck,
  IconPhoto,
  IconPalette,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { uploadImage } from '@/lib/apiClient';
import { formatEuro } from '@/components/admin/pricing/gridUnits';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface FacadeSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

// Un réglage de facade_settings tel que l'admin le saisit. « percent » : stocké en ratio (0.05), saisi en % (5).
interface FacadeField {
  key: string;
  title: string;
  kind: 'mm' | 'eur' | 'eur_m2' | 'percent';
  min: number;
  max: number;
  step: number;
  description?: string;
  showCm?: boolean;
}

const SUFFIX: Record<FacadeField['kind'], string> = { mm: 'mm', eur: '€', eur_m2: '€/m²', percent: '%' };

const DIMENSION_FIELDS: FacadeField[] = [
  { key: 'max_width', title: 'Largeur maximale', kind: 'mm', min: 100, max: 5000, step: 1, showCm: true },
  { key: 'max_height', title: 'Hauteur maximale', kind: 'mm', min: 100, max: 5000, step: 1, showCm: true },
  { key: 'fixed_depth', title: 'Épaisseur fixe', kind: 'mm', min: 5, max: 100, step: 1 },
  {
    key: 'hinge_edge_margin',
    title: 'Marge des charnières',
    kind: 'mm',
    min: 10,
    max: 1000,
    step: 1,
    showCm: true,
    description: 'Distance minimale entre les premiers/derniers trous de charnières et les bords haut/bas de la façade.',
  },
  {
    key: 'hinge_hole_diameter',
    title: 'Diamètre des trous',
    kind: 'mm',
    min: 5,
    max: 60,
    step: 1,
    description: 'Diamètre des trous de charnières : 26 mm ou 35 mm en standard.',
  },
];

const PRICING_FIELDS: FacadeField[] = [
  {
    key: 'hinge_base_price',
    title: 'Prix d’une charnière',
    kind: 'eur',
    min: 0,
    max: 100000,
    step: 0.01,
    description: 'Prix TTC de chaque charnière posée (0 = charnières offertes).',
  },
  {
    key: 'hinge_coefficient',
    title: 'Supplément par charnière',
    kind: 'percent',
    min: 0,
    max: 100,
    step: 0.1,
    description: 'Majoration de la façade (surface + charnières), par charnière. Exemple : 5 % × 3 charnières = +15 %.',
  },
  {
    key: 'material_price_per_m2',
    title: 'Prix au m² par défaut',
    kind: 'eur_m2',
    min: 0,
    max: 100000,
    step: 0.01,
    description: 'Appliqué aux matériaux de façade qui n’ont pas leur propre prix au m².',
  },
];

// Valeur stockée -> texte du champ (0.05 en % -> « 5 »)
function toInput(field: FacadeField, stored: string | undefined): string {
  if (stored === undefined || stored.trim() === '') return '';
  const n = Number(stored);
  if (!Number.isFinite(n)) return stored;
  return field.kind === 'percent' ? String(Math.round(n * 100 * 10_000) / 10_000) : String(n);
}

// Texte du champ -> valeur à stocker, ou message d'erreur
function fromInput(field: FacadeField, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const text = raw.trim().replace(',', '.');
  if (text === '') return { ok: false, error: 'Indiquez une valeur.' };
  const n = Number(text);
  if (!Number.isFinite(n)) return { ok: false, error: 'Nombre attendu.' };
  if (field.kind === 'mm' && !Number.isInteger(n)) return { ok: false, error: 'Nombre entier de millimètres attendu.' };
  if (n < field.min || n > field.max) {
    return { ok: false, error: `Entre ${field.min.toLocaleString('fr-FR')} et ${field.max.toLocaleString('fr-FR')} ${SUFFIX[field.kind]}.` };
  }
  return { ok: true, value: field.kind === 'percent' ? String(Math.round((n / 100) * 1_000_000) / 1_000_000) : String(n) };
}

function describeStored(field: FacadeField, stored: string): string {
  const n = Number(stored);
  if (!Number.isFinite(n)) return stored;
  if (field.kind === 'eur') return formatEuro(n);
  if (field.kind === 'eur_m2') return `${formatEuro(n)}/m²`;
  if (field.kind === 'percent') return `${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
  return `${n.toLocaleString('fr-FR')} mm`;
}

// Message d'erreur du backend (facade-settings répond { success: false, message })
async function putSetting(key: string, value: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/backend/api/facade-settings.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ setting_key: key, setting_value: value }),
    });
  } catch {
    throw new Error('Le serveur ne répond pas, réessayez.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.error || `Enregistrement refusé (${response.status})`);
  }
}

export function DashboardFacades() {
  const [materials, setMaterials] = useState<FacadeMaterial[]>([]);
  const [settings, setSettings] = useState<FacadeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<FacadeMaterial | null>(null);
  const [tab, setTab] = useState('materials');

  useEffect(() => {
    fetchData();
  }, []);

  // silent : rechargement après un enregistrement, sans démonter les onglets (on reste sur l'onglet ouvert)
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    const problems: string[] = [];
    try {
      const [materialsRes, settingsRes] = await Promise.all([
        fetch('/backend/api/facade-materials.php'),
        fetch('/backend/api/facade-settings.php'),
      ]);

      // Vérifier si les réponses sont OK avant de parser le JSON
      if (materialsRes.ok) {
        const text = await materialsRes.text();
        try {
          const materialsData = JSON.parse(text);
          if (materialsData.success) {
            setMaterials(materialsData.data || []);
          }
        } catch {
          console.error('Erreur parsing materials:', text.substring(0, 100));
          problems.push('matériaux illisibles');
        }
      } else {
        problems.push(`matériaux (${materialsRes.status})`);
      }

      if (settingsRes.ok) {
        const text = await settingsRes.text();
        try {
          const settingsData = JSON.parse(text);
          if (settingsData.success) {
            setSettings(settingsData.data || []);
          }
        } catch {
          console.error('Erreur parsing settings:', text.substring(0, 100));
          problems.push('réglages illisibles');
        }
      } else {
        problems.push(`réglages (${settingsRes.status})`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      problems.push('le serveur ne répond pas');
    } finally {
      setLoadError(problems.length ? `Chargement incomplet : ${problems.join(', ')}.` : null);
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce matériau ?')) return;

    try {
      const response = await fetch(`/backend/api/facade-materials.php?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setMaterials(materials.filter((m) => m.id !== id));
        toast.success('Matériau supprimé');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const defaultSetting = settings.find((s) => s.setting_key === 'material_price_per_m2');
  const defaultPricePerM2 = defaultSetting && Number.isFinite(Number(defaultSetting.setting_value)) ? Number(defaultSetting.setting_value) : null;

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Gestion des Façades</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les matériaux, paramètres et tarification des façades. Prix TTC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button onClick={() => fetchData()} variant="outline" className="flex-1 sm:flex-none">
            <IconRefresh className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {loadError && !loading && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          {loadError}
        </p>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconRefresh className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-2 mb-6 bg-muted/50 p-2">
                <TabsTrigger value="materials" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                  Matériaux ({materials.length})
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                  Paramètres
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                  Tarification
                </TabsTrigger>
              </TabsList>

              {/* Materials Tab */}
              <TabsContent value="materials" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold">Matériaux disponibles</h4>
                  <Button onClick={() => { setEditingMaterial(null); setShowMaterialModal(true); }}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Ajouter un matériau
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Couleur</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">Prix/m²</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun matériau configuré : les façades sont comptées au prix au m² par défaut
                          {defaultPricePerM2 !== null ? ` (${formatEuro(defaultPricePerM2)}/m²)` : ''}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      materials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div
                              className="w-10 h-10 rounded-lg border shadow-sm overflow-hidden"
                              style={{
                                backgroundColor: material.color_hex || '#E5E7EB',
                                backgroundImage: material.texture_url ? `url(${material.texture_url})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell className="text-right">
                            {Number(material.price_per_m2) > 0 ? (
                              `${formatEuro(Number(material.price_per_m2))}/m²`
                            ) : (
                              <span className="text-muted-foreground">
                                Prix par défaut
                                {defaultPricePerM2 !== null ? ` (${formatEuro(defaultPricePerM2)}/m²)` : ''}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={material.is_active ? 'default' : 'secondary'}>
                              {material.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingMaterial(material); setShowMaterialModal(true); }}
                                aria-label={`Modifier ${material.name}`}
                              >
                                <IconEdit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterial(material.id)}
                                className="text-destructive hover:text-destructive"
                                aria-label={`Supprimer ${material.name}`}
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <SettingsForm
                  fields={DIMENSION_FIELDS}
                  settings={settings}
                  onUpdate={() => fetchData(true)}
                  icon="ruler"
                  submitLabel="Enregistrer les paramètres"
                  gridClassName="md:grid-cols-2"
                />
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <SettingsForm
                  fields={PRICING_FIELDS}
                  settings={settings}
                  onUpdate={() => fetchData(true)}
                  icon="euro"
                  submitLabel="Enregistrer la tarification"
                  gridClassName="md:grid-cols-2 lg:grid-cols-3"
                  footer={(values) => <PricingExample values={values} />}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Material Modal */}
      <MaterialModal
        open={showMaterialModal}
        material={editingMaterial}
        defaultPricePerM2={defaultPricePerM2}
        onClose={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
        onSuccess={() => { setShowMaterialModal(false); setEditingMaterial(null); fetchData(true); }}
      />
    </div>
  );
}

// Modal pour matériaux
function MaterialModal({
  open,
  material,
  defaultPricePerM2,
  onClose,
  onSuccess,
}: {
  open: boolean;
  material: FacadeMaterial | null;
  defaultPricePerM2: number | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    color_hex: '#D8C7A1',
    texture_url: '',
    price_per_m2: 0,
    is_active: true,
  });
  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderMode, setRenderMode] = useState<'color' | 'texture'>('color');

  useEffect(() => {
    // Reset textureFile quand le modal s'ouvre
    setTextureFile(null);

    if (material) {
      setFormData({
        name: material.name || '',
        color_hex: material.color_hex || '#D8C7A1',
        texture_url: material.texture_url || '',
        price_per_m2: Number(material.price_per_m2) || 0,
        is_active: material.is_active !== false,
      });
      setRenderMode(material.texture_url ? 'texture' : 'color');
    } else {
      // Nouveau matériau : prix au m² par défaut des façades, modifiable
      setFormData({
        name: '',
        color_hex: '#D8C7A1',
        texture_url: '',
        price_per_m2: defaultPricePerM2 ?? 0,
        is_active: true,
      });
      setRenderMode('color');
    }
  }, [material, open, defaultPricePerM2]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = material
        ? `/backend/api/facade-materials.php/${material.id}`
        : '/backend/api/facade-materials.php';

      // Validation stricte: soit couleur, soit texture selon le choix
      if (renderMode === 'color' && !formData.color_hex) {
        toast.error('Veuillez choisir une couleur');
        setLoading(false);
        return;
      }

      if (!Number.isFinite(formData.price_per_m2) || formData.price_per_m2 < 0) {
        toast.error('Le prix au m² ne peut pas être négatif');
        setLoading(false);
        return;
      }

      // Si mode texture, uploader le fichier s'il n'est pas encore uploadé
      let finalTextureUrl = formData.texture_url;

      if (renderMode === 'texture') {
        if (!finalTextureUrl && textureFile) {
          // Upload automatique du fichier
          try {
            toast.loading('Upload de la texture...');
            finalTextureUrl = await uploadImage(textureFile);
            toast.dismiss();
          } catch {
            toast.dismiss();
            toast.error("Erreur lors de l'upload de la texture");
            setLoading(false);
            return;
          }
        }

        if (!finalTextureUrl) {
          toast.error('Veuillez sélectionner une image');
          setLoading(false);
          return;
        }
      }

      // Construire le payload en respectant STRICTEMENT le choix renderMode
      // SI couleur unie → envoyer SEULEMENT color_hex, vider texture_url
      // SI texture image → envoyer SEULEMENT texture_url, vider color_hex
      const payload: Record<string, unknown> = {
        name: formData.name,
        price_per_m2: formData.price_per_m2,
        is_active: formData.is_active,
      };

      if (renderMode === 'color') {
        // Mode couleur: envoyer couleur, vider texture
        payload.color_hex = formData.color_hex;
        payload.texture_url = '';
      } else {
        // Mode texture: envoyer texture, vider couleur
        payload.color_hex = '';
        payload.texture_url = finalTextureUrl;
      }

      const response = await fetch(url, {
        method: material ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(material ? 'Matériau modifié' : 'Matériau ajouté');
        onSuccess();
      } else {
        toast.error(data.error || data.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{material ? 'Modifier' : 'Ajouter'} un matériau</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom du matériau */}
          <div className="space-y-1.5">
            <Label htmlFor="facade-material-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</Label>
            <Input
              id="facade-material-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Chêne naturel"
              className="h-9"
              required
            />
          </div>

          <Separator />

          {/* Type de rendu avec Tabs */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Apparence</Label>
            <Tabs value={renderMode} onValueChange={(val) => setRenderMode(val as 'color' | 'texture')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="color" className="text-xs gap-1.5">
                  <IconPalette className="w-3.5 h-3.5" />
                  Couleur
                </TabsTrigger>
                <TabsTrigger value="texture" className="text-xs gap-1.5">
                  <IconPhoto className="w-3.5 h-3.5" />
                  Image
                </TabsTrigger>
              </TabsList>

              {/* Mode couleur */}
              <TabsContent value="color" className="pt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Choisir la couleur"
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    className="h-9 w-14 rounded border cursor-pointer bg-transparent"
                  />
                  <Input
                    aria-label="Code hexadécimal de la couleur"
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    className="flex-1 h-9 font-mono text-xs"
                    placeholder="#FFFFFF"
                  />
                </div>
              </TabsContent>

              {/* Mode texture */}
              <TabsContent value="texture" className="pt-3 space-y-3">
                <Input
                  type="file"
                  aria-label="Image de la texture"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setTextureFile(file);
                    if (file) {
                      setFormData(prev => ({ ...prev, texture_url: '' }));
                    }
                  }}
                  className="h-9 text-xs"
                />
                {(textureFile || formData.texture_url) && (
                  <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                    <div
                      className="w-12 h-12 rounded border bg-muted flex-shrink-0 overflow-hidden"
                      style={{
                        backgroundImage: formData.texture_url
                          ? `url(${formData.texture_url})`
                          : textureFile
                            ? `url(${URL.createObjectURL(textureFile)})`
                            : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {textureFile?.name || formData.texture_url?.split('/').pop()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formData.texture_url ? 'Texture enregistrée' : 'Prêt à uploader'}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Prix et statut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="facade-material-price" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prix/m²</Label>
              <div className="relative">
                <Input
                  id="facade-material-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_per_m2}
                  onChange={(e) => setFormData({ ...formData, price_per_m2: Number(e.target.value) })}
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                0 = prix par défaut{defaultPricePerM2 !== null ? ` (${formatEuro(defaultPricePerM2)}/m²)` : ''}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</Label>
              <Button
                type="button"
                variant={formData.is_active ? 'default' : 'outline'}
                size="sm"
                className="w-full h-9 text-xs"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              >
                {formData.is_active ? 'Actif' : 'Inactif'}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Formulaire d'un groupe de réglages : composant de module (et non défini dans le rendu), pour que les champs
// gardent le focus pendant la saisie
function SettingsForm({
  fields,
  settings,
  onUpdate,
  icon,
  submitLabel,
  gridClassName,
  footer,
}: {
  fields: FacadeField[];
  settings: FacadeSetting[];
  onUpdate: () => void;
  icon: 'ruler' | 'euro';
  submitLabel: string;
  gridClassName: string;
  // Rendu sous les cartes à partir des valeurs saisies (exemple chiffré)
  footer?: (values: Record<string, number | null>) => React.ReactNode;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const stored = (key: string) => settings.find((s) => s.setting_key === key)?.setting_value;

  // Valeurs rechargées (après un enregistrement) : le formulaire les reprend
  useEffect(() => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      data[field.key] = toInput(field, settings.find((s) => s.setting_key === field.key)?.setting_value);
    }
    setFormData(data);
    setErrors({});
  }, [settings, fields]);

  const present = fields.filter((field) => stored(field.key) !== undefined);
  const missing = fields.filter((field) => stored(field.key) === undefined);

  // Valeurs saisies valides, au format stocké (pour l'exemple chiffré)
  const values: Record<string, number | null> = {};
  for (const field of fields) {
    const result = fromInput(field, formData[field.key] ?? '');
    values[field.key] = result.ok ? Number(result.value) : null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const changes: { field: FacadeField; value: string }[] = [];
    for (const field of present) {
      const raw = formData[field.key] ?? '';
      if (raw.trim() === toInput(field, stored(field.key)).trim()) continue;
      const result = fromInput(field, raw);
      if (result.ok) changes.push({ field, value: result.value });
      else nextErrors[field.key] = result.error;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Corrigez les valeurs signalées avant d’enregistrer.');
      return;
    }
    if (changes.length === 0) {
      toast('Aucune modification à enregistrer.');
      return;
    }

    setLoading(true);
    const failed: Record<string, string> = {};
    for (const { field, value } of changes) {
      try {
        await putSetting(field.key, value);
      } catch (error) {
        failed[field.key] = error instanceof Error ? error.message : 'Enregistrement impossible';
      }
    }
    setLoading(false);
    const saved = changes.length - Object.keys(failed).length;
    if (saved > 0) {
      toast.success(saved > 1 ? `${saved} réglages enregistrés` : 'Réglage enregistré');
      onUpdate();
    }
    if (Object.keys(failed).length > 0) {
      setErrors(failed);
      toast.error('Certains réglages n’ont pas été enregistrés.');
    }
  };

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {missing.length > 1 ? 'Ces réglages n’existent' : 'Ce réglage n’existe'} pas encore en base :{' '}
            {missing.map((f) => f.title).join(', ')}. Le calcul utilise une valeur de secours et{' '}
            {missing.length > 1 ? 'ils ne peuvent' : 'il ne peut'} pas être enregistré{missing.length > 1 ? 's' : ''} tant
            que la mise à jour de la base de données n&apos;a pas été appliquée.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className={`grid gap-4 ${gridClassName}`}>
          {fields.map((field) => (
            <SettingCard
              key={field.key}
              field={field}
              icon={icon}
              value={formData[field.key] ?? ''}
              stored={stored(field.key)}
              error={errors[field.key]}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, [field.key]: value }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[field.key];
                  return next;
                });
              }}
            />
          ))}
        </div>

        {footer?.(values)}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || present.length === 0}>
            <IconCheck className="w-4 h-4 mr-2" />
            {loading ? 'Enregistrement...' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SettingCard({
  field,
  icon,
  value,
  stored,
  error,
  onChange,
}: {
  field: FacadeField;
  icon: 'ruler' | 'euro';
  value: string;
  stored: string | undefined;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const Icon = icon === 'ruler' ? IconRuler : IconCurrencyEuro;
  const missing = stored === undefined;
  const mm = Number(value);

  return (
    <Card className={missing ? 'border-amber-300' : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {field.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor={id}>Valeur ({SUFFIX[field.kind]})</Label>
            <div className="relative">
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value}
                disabled={missing}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {SUFFIX[field.kind]}
              </span>
            </div>
          </div>
          {field.showCm && value.trim() !== '' && Number.isFinite(mm) && (
            <div className="text-sm text-muted-foreground pb-2">= {(mm / 10).toLocaleString('fr-FR')} cm</div>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {missing ? (
            <span className="text-amber-700">Réglage absent de la base : non enregistrable pour le moment.</span>
          ) : (
            <>Valeur actuelle : {describeStored(field, stored)}</>
          )}
        </p>
        {field.description && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{field.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Exemple chiffré avec les valeurs saisies : même formule que FacadePriceCalculator
function PricingExample({ values }: { values: Record<string, number | null> }) {
  const hinge = values.hinge_base_price;
  const coefficient = values.hinge_coefficient;
  const perM2 = values.material_price_per_m2;
  if (hinge === null || coefficient === null || perM2 === null) return null;
  const surface = 0.6 * 2;
  const hinges = 3;
  const base = surface * perM2 + hinges * hinge;
  const total = base * (1 + coefficient * hinges);
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
      <p className="font-medium">Exemple avec ces valeurs</p>
      <p className="text-muted-foreground">
        Façade de 60 × 200 cm (1,2 m²) avec {hinges} charnières, au prix au m² par défaut : (1,2 m² ×{' '}
        {formatEuro(perM2)} + {hinges} × {formatEuro(hinge)}) × (1 + {hinges} ×{' '}
        {(coefficient * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %) ={' '}
        <span className="font-semibold text-foreground">{formatEuro(Math.round(total * 100) / 100)}</span>
      </p>
    </div>
  );
}
