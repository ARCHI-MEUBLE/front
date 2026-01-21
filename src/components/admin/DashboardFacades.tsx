"use client"

import { useState, useEffect } from 'react';
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
} from '@tabler/icons-react';
import { uploadImage } from '@/lib/apiClient';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
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

export function DashboardFacades() {
  const [materials, setMaterials] = useState<FacadeMaterial[]>([]);
  const [settings, setSettings] = useState<FacadeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<FacadeMaterial | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
        }
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
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
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

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-serif font-semibold tracking-tight">Gestion des Façades</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les matériaux, paramètres et tarification des façades
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button onClick={fetchData} variant="outline" className="flex-1 sm:flex-none">
            <IconRefresh className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconRefresh className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="materials" className="w-full">
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
                          Aucun matériau configuré
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
                            {(material.price_per_m2 || 150).toFixed(2)} €
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
                              >
                                <IconEdit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterial(material.id)}
                                className="text-destructive hover:text-destructive"
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
                <SettingsPanel settings={settings} onUpdate={fetchData} />
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <PricingPanel settings={settings} onUpdate={fetchData} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Material Modal */}
      <MaterialModal
        open={showMaterialModal}
        material={editingMaterial}
        onClose={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
        onSuccess={() => { setShowMaterialModal(false); setEditingMaterial(null); fetchData(); }}
      />
    </div>
  );
}

// Modal pour matériaux
function MaterialModal({
  open,
  material,
  onClose,
  onSuccess,
}: {
  open: boolean;
  material: FacadeMaterial | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    color_hex: '#D8C7A1',
    texture_url: '',
    price_per_m2: 150,
    is_active: true,
  });
  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
        price_per_m2: material.price_per_m2 || 150,
        is_active: material.is_active !== false,
      });
      setRenderMode(material.texture_url ? 'texture' : 'color');
    } else {
      setFormData({
        name: '',
        color_hex: '#D8C7A1',
        texture_url: '',
        price_per_m2: 150,
        is_active: true,
      });
      setRenderMode('color');
    }
  }, [material, open]);

  const handleUploadTexture = async () => {
    if (!textureFile) return;
    setUploading(true);
    try {
      // Utiliser la même fonction que les échantillons
      const imageUrl = await uploadImage(textureFile);
      console.log('Upload response:', imageUrl);

      setFormData(prev => ({ ...prev, texture_url: imageUrl }));
      toast.success('Texture uploadée');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

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

      // Si mode texture, uploader le fichier s'il n'est pas encore uploadé
      let finalTextureUrl = formData.texture_url;
      console.log('handleSubmit - renderMode:', renderMode);
      console.log('handleSubmit - formData.texture_url:', formData.texture_url);
      console.log('handleSubmit - textureFile:', textureFile?.name);

      if (renderMode === 'texture') {
        if (!finalTextureUrl && textureFile) {
          // Upload automatique du fichier
          try {
            toast.loading('Upload de la texture...');
            finalTextureUrl = await uploadImage(textureFile);
            toast.dismiss();
          } catch (uploadErr) {
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
      const payload: any = {
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
        toast.error(data.error || 'Erreur lors de la sauvegarde');
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
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</Label>
            <Input
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
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    className="h-9 w-14 rounded border cursor-pointer bg-transparent"
                  />
                  <Input
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prix/m²</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_per_m2}
                  onChange={(e) => setFormData({ ...formData, price_per_m2: Number(e.target.value) })}
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
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

// Composant pour les paramètres
function SettingsPanel({
  settings,
  onUpdate,
}: {
  settings: FacadeSetting[];
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
        if (['max_width', 'max_height', 'fixed_depth', 'hinge_edge_margin', 'hinge_hole_diameter'].includes(key)) {
          const response = await fetch('/backend/api/facade-settings.php', {
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

      toast.success('Paramètres mis à jour');
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const SettingCard = ({
    title,
    settingKey,
    unit = 'mm',
    showCm = true,
    defaultValue,
    description,
    min,
    max,
  }: {
    title: string;
    settingKey: string;
    unit?: string;
    showCm?: boolean;
    defaultValue: string;
    description?: string;
    min?: number;
    max?: number;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconRuler className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label>Valeur ({unit})</Label>
            <Input
              type="number"
              min={min}
              max={max}
              value={formData[settingKey] || ''}
              onChange={(e) => setFormData({ ...formData, [settingKey]: e.target.value })}
            />
          </div>
          {showCm && (
            <div className="text-sm text-muted-foreground pb-2">
              = {Math.round((parseInt(formData[settingKey] || '0')) / 10)} cm
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Valeur par défaut : {defaultValue}
        </p>
        {description && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingCard
            title="Largeur maximale"
            settingKey="max_width"
            defaultValue="600 mm (60 cm)"
            min={100}
            max={1000}
          />
          <SettingCard
            title="Hauteur maximale"
            settingKey="max_height"
            defaultValue="2300 mm (230 cm)"
            min={500}
            max={3000}
          />
          <SettingCard
            title="Épaisseur fixe"
            settingKey="fixed_depth"
            defaultValue="19 mm"
            showCm={false}
            min={10}
            max={50}
          />
          <SettingCard
            title="Marge des charnières"
            settingKey="hinge_edge_margin"
            defaultValue="150 mm (15 cm)"
            description="Distance minimale entre les premiers/derniers trous de charnières et les bords haut/bas de la façade."
            min={10}
            max={300}
          />
          <SettingCard
            title="Diamètre des trous"
            settingKey="hinge_hole_diameter"
            defaultValue="26 mm (standard)"
            showCm={false}
            description="Diamètre standard pour charnières de cuisine/meubles : 26mm ou 35mm."
            min={20}
            max={50}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <IconCheck className="w-4 h-4 mr-2" />
            {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
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
          const response = await fetch('/backend/api/facade-settings.php', {
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

      toast.success('Tarification mise à jour');
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const PricingCard = ({
    title,
    settingKey,
    unit,
    defaultValue,
    example,
  }: {
    title: string;
    settingKey: string;
    unit: string;
    defaultValue: string;
    example: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconCurrencyEuro className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label>Montant</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData[settingKey] || ''}
              onChange={(e) => setFormData({ ...formData, [settingKey]: e.target.value })}
            />
          </div>
          <div className="text-sm text-muted-foreground pb-2">{unit}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Valeur par défaut : {defaultValue}
        </p>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">{example}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PricingCard
            title="Prix de base charnière"
            settingKey="hinge_base_price"
            unit="€ TTC"
            defaultValue="34.20 €"
            example="Si 3 charnières à 34.20 € = 102.60 €"
          />
          <PricingCard
            title="Coefficient multiplicateur"
            settingKey="hinge_coefficient"
            unit={`= ${((parseFloat(formData.hinge_coefficient || '0')) * 100).toFixed(0)}%`}
            defaultValue="0.05 (5%)"
            example="Prix × (coef × nb_charnières)"
          />
          <PricingCard
            title="Prix matériau au m²"
            settingKey="material_price_per_m2"
            unit="€/m²"
            defaultValue="150.00 €/m²"
            example="Façade 60×200cm = 1.2m² × 150€ = 180€"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <IconCheck className="w-4 h-4 mr-2" />
            {loading ? 'Enregistrement...' : 'Enregistrer la tarification'}
          </Button>
        </div>
      </form>
    </div>
  );
}
