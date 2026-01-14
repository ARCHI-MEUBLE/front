"use client"

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  IconSettings,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconPlus,
  IconCurrencyEuro,
  IconRuler,
  IconInfoCircle,
  IconCheck,
} from '@tabler/icons-react';
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
import { Switch } from '@/components/ui/switch';

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
                              className="w-10 h-10 rounded-lg border shadow-sm"
                              style={{ backgroundColor: material.color_hex }}
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        color_hex: material.color_hex || '#D8C7A1',
        texture_url: material.texture_url || '',
        price_per_m2: material.price_per_m2 || 150,
        is_active: material.is_active !== false,
      });
    } else {
      setFormData({
        name: '',
        color_hex: '#D8C7A1',
        texture_url: '',
        price_per_m2: 150,
        is_active: true,
      });
    }
  }, [material, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = material
        ? `/backend/api/facade-materials.php?id=${material.id}`
        : '/backend/api/facade-materials.php';

      const response = await fetch(url, {
        method: material ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? 'Modifier' : 'Ajouter'} un matériau</DialogTitle>
          <DialogDescription>
            Configurez les propriétés du matériau de façade
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color_hex}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                className="h-10 w-20 rounded border cursor-pointer"
              />
              <Input
                value={formData.color_hex}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="texture">URL de texture (optionnel)</Label>
            <Input
              id="texture"
              value={formData.texture_url}
              onChange={(e) => setFormData({ ...formData, texture_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix au m² (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price_per_m2}
              onChange={(e) => setFormData({ ...formData, price_per_m2: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="active">Actif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'En cours...' : 'Enregistrer'}
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
      <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <IconInfoCircle className="w-5 h-5 text-blue-600" />
        <p className="text-sm text-blue-900 dark:text-blue-100">
          Ces paramètres définissent les limites maximales que les utilisateurs peuvent configurer pour leurs façades.
        </p>
      </div>

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
            defaultValue="20 mm (2 cm)"
            description="Distance minimale entre les premiers/derniers trous de charnières et les bords haut/bas de la façade."
            min={10}
            max={100}
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
      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <IconCurrencyEuro className="w-5 h-5 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Configuration de la tarification
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Ces paramètres définissent comment le prix des façades est calculé
          </p>
        </div>
      </div>

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
