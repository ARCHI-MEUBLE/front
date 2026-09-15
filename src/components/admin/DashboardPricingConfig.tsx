import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  IconCurrencyEuro,
  IconEdit,
  IconRefresh,
  IconCheck,
  IconInfoCircle,
  IconChevronRight,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PricingParam {
  id: number;
  category: string;
  item_type: string;
  param_name: string;
  param_value: number;
  unit: string;
  description: string;
  is_active: number;
}

interface CategoryData {
  [item_type: string]: {
    [param_name: string]: PricingParam;
  };
}

export function DashboardPricingConfig() {
  const [allParams, setAllParams] = useState<PricingParam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<PricingParam | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadAllParams();
  }, []);

  const loadAllParams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/backend/api/pricing-config/index.php');
      const data = await response.json();

      if (data.success) {
        setAllParams(data.data);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (param: PricingParam) => {
    setEditingParam(param);
    setEditValue(param.param_value.toString());
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingParam) return;

    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      toast.error('La valeur doit être un nombre positif');
      return;
    }

    try {
      const response = await fetch('/backend/api/pricing-config/index.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingParam.id,
          param_value: value,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      toast.success('Paramètre mis à jour');
      setIsEditDialogOpen(false);
      loadAllParams();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const getParamsByCategory = (category: string): CategoryData => {
    const filtered = allParams.filter((p) => p.category === category);
    const grouped: CategoryData = {};

    filtered.forEach((param) => {
      if (!grouped[param.item_type]) {
        grouped[param.item_type] = {};
      }
      grouped[param.item_type][param.param_name] = param;
    });

    return grouped;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatUnit = (unit: string) => {
    const units: Record<string, string> = {
      eur: '€',
      eur_m2: '€/m²',
      eur_m3: '€/m³',
      coefficient: 'coef',
      eur_linear_m: '€/m',
      mm: 'mm',
      units: '',
    };
    return units[unit] || unit;
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'eur' || unit === 'eur_m2' || unit === 'eur_m3' || unit === 'eur_linear_m') {
      return formatCurrency(value);
    }
    return `${value} ${formatUnit(unit)}`;
  };

  // Rendu des tableaux par catégorie
  const renderDrawersTable = () => {
    const data = getParamsByCategory('drawers');
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Prix de base</TableHead>
            <TableHead className="text-right">Coefficient</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([type, params]) => (
            <TableRow key={type}>
              <TableCell className="font-medium capitalize">{type}</TableCell>
              <TableCell className="text-right">
                {params.base_price && formatValue(params.base_price.param_value, params.base_price.unit)}
              </TableCell>
              <TableCell className="text-right">
                {params.coefficient && formatValue(params.coefficient.param_value, params.coefficient.unit)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {params.base_price && (
                    <Button onClick={() => handleEdit(params.base_price)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  )}
                  {params.coefficient && (
                    <Button onClick={() => handleEdit(params.coefficient)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderDoorsTable = () => {
    const data = getParamsByCategory('doors');
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type de porte</TableHead>
            <TableHead className="text-right">Coefficient</TableHead>
            <TableHead className="text-right">Nombre charnières</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([type, params]) => (
            <TableRow key={type}>
              <TableCell className="font-medium capitalize">{type}</TableCell>
              <TableCell className="text-right">
                {params.coefficient && formatValue(params.coefficient.param_value, params.coefficient.unit)}
              </TableCell>
              <TableCell className="text-right">
                {params.hinge_count && params.hinge_count.param_value}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {params.coefficient && (
                    <Button onClick={() => handleEdit(params.coefficient)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  )}
                  {params.hinge_count && (
                    <Button onClick={() => handleEdit(params.hinge_count)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderBasesTable = () => {
    const data = getParamsByCategory('bases');
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type de socle</TableHead>
            <TableHead className="text-right">Paramètres</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([type, params]) => (
            <TableRow key={type}>
              <TableCell className="font-medium capitalize">{type === 'none' ? 'Pas de socle' : type}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1 text-sm">
                  {params.fixed_price && <span>Prix fixe: {formatValue(params.fixed_price.param_value, params.fixed_price.unit)}</span>}
                  {params.price_per_m3 && <span>Prix/m³: {formatValue(params.price_per_m3.param_value, params.price_per_m3.unit)}</span>}
                  {params.height && <span>Hauteur: {params.height.param_value}mm</span>}
                  {params.price_per_foot && <span>Prix/pied: {formatValue(params.price_per_foot.param_value, params.price_per_foot.unit)}</span>}
                  {params.foot_interval && <span>Intervalle: {params.foot_interval.param_value}mm</span>}
                  {params.base_foot_count && <span>Pieds min: {params.base_foot_count.param_value}</span>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {Object.values(params).map((param) => (
                    <Button key={param.id} onClick={() => handleEdit(param)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderDisplayTable = () => {
    const data = getParamsByCategory('display');
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Élément</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
            <TableHead className="text-right">Description</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([type, params]) => (
            <React.Fragment key={type}>
              {Object.entries(params).map(([paramName, param]) => (
                <TableRow key={param.id}>
                  <TableCell className="font-medium">
                    {paramName === 'display_mode' ? 'Mode d\'affichage' : 
                     paramName === 'deviation_range' ? 'Écart type' : paramName}
                  </TableCell>
                  <TableCell className="text-right">
                    {paramName === 'display_mode' ? (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${param.param_value === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {param.param_value === 1 ? 'INTERVALLE' : 'DIRECT'}
                      </span>
                    ) : formatValue(param.param_value, param.unit)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {param.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleEdit(param)} variant="ghost" size="sm">
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-serif font-semibold tracking-tight">Gestion des prix</h3>
          <p className="text-sm text-muted-foreground">
            Configurez tous les paramètres de tarification pour le calcul automatique
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button onClick={loadAllParams} variant="outline" className="flex-1 sm:flex-none">
            <IconRefresh className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Tabs pour chaque catégorie */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconRefresh className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="casing" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-10 bg-muted/50 p-2">
                <TabsTrigger value="drawers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Tiroirs</TabsTrigger>
                <TabsTrigger value="shelves" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Étagères</TabsTrigger>
                <TabsTrigger value="lighting" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">LED</TabsTrigger>
                <TabsTrigger value="cables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Câbles</TabsTrigger>
                <TabsTrigger value="bases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Socles</TabsTrigger>
                <TabsTrigger value="hinges" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Charnières</TabsTrigger>
                <TabsTrigger value="doors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Portes</TabsTrigger>
                <TabsTrigger value="columns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Colonnes</TabsTrigger>
                <TabsTrigger value="wardrobe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Penderie</TabsTrigger>
                <TabsTrigger value="handles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Poignées</TabsTrigger>
                <TabsTrigger value="casing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Caisson</TabsTrigger>
                <TabsTrigger value="display" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Affichage Prix</TabsTrigger>
              </TabsList>

              <TabsContent value="drawers" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Tiroirs</h4>
                  </div>
                  {renderDrawersTable()}

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = base_price + coefficient × largeur × profondeur
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Exemple :</strong> Tiroir 500mm × 400mm avec base 35€ et coef 0.0001 → 35€ + (0.0001 × 500 × 400) = 35€ + 20€ = <strong>55€</strong>
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="shelves" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Étagères</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix au m²</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('shelves')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'glass' ? 'Étagère verre' : type === 'standard' ? 'Étagère standard' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_m2 && formatValue(params.price_per_m2.param_value, params.price_per_m2.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_m2 && (
                              <Button onClick={() => handleEdit(params.price_per_m2)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formules de calcul</h5>
                    <div className="space-y-2">
                      <div className="font-mono text-xs bg-background p-2 rounded">
                        Verre : Prix par étagère = prix_m² × surface (longueur × largeur)
                      </div>
                      <div className="font-mono text-xs bg-background p-2 rounded">
                        Standard : Prix par étagère = prix_m² × profondeur × largeur
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 space-y-2">
                      <p><strong>Important :</strong> Chaque étagère est calculée individuellement selon ses propres dimensions.</p>

                      <p><strong>Exemple Verre :</strong> 1 étagère 1000mm × 300mm à 250€/m² → 250€ × 0.3m² = <strong>75€</strong></p>

                      <p><strong>Exemple Standard :</strong> 1 étagère 800mm × 250mm en MDF (80€/m²) → 80€ × 0.2m² = <strong>16€</strong></p>

                      <p>Si vous avez plusieurs étagères de dimensions différentes, le prix total = somme de tous les calculs individuels.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lighting" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Éclairage LED</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix au mètre linéaire</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('lighting')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'led' ? 'LED' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_linear_meter && formatValue(params.price_per_linear_meter.param_value, params.price_per_linear_meter.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_linear_meter && (
                              <Button onClick={() => handleEdit(params.price_per_linear_meter)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = prix_LED × largeur (en mètres)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Exemple :</strong> Largeur 1500mm avec LED à 15€/m → 15€ × 1.5 = <strong>22.50€</strong>
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cables" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Gestion des Câbles</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix fixe</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('cables')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'pass_cable' ? 'Passe-câble' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.fixed_price && formatValue(params.fixed_price.param_value, params.fixed_price.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.fixed_price && (
                              <Button onClick={() => handleEdit(params.fixed_price)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = Prix fixe par passe-câble
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Simple : chaque passe-câble a un prix fixe (ex: 10€).
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bases" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Socles</h4>
                  </div>
                  {renderBasesTable()}

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formules de calcul</h5>
                    <div className="space-y-2">
                      <div className="font-mono text-xs bg-background p-2 rounded">
                        Bois : Prix = Prix/m³ × Volume (L × P × H)
                      </div>
                      <div className="font-mono text-xs bg-background p-2 rounded">
                        Métal : Prix = prix_pied × nombre_pieds
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-3 space-y-3">
                      {/* Socle Bois */}
                      <div>
                        <p><strong>Socle Bois (Massif) :</strong> Prix basé sur le volume de bois utilisé</p>
                        <p className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                          ⚠️ <strong>Important :</strong> La hauteur du socle est <strong>FIXE</strong> (80mm par défaut).
                          Elle ne change jamais, peu importe les dimensions du meuble.
                          Cette hauteur sert uniquement au calcul du volume de bois nécessaire.
                        </p>
                        <p className="mt-2"><strong>Formule :</strong></p>
                        <div className="font-mono text-xs bg-background/50 p-2 rounded my-2">
                          Volume = Largeur meuble × Profondeur meuble × Hauteur fixe du socle<br/>
                          Prix = Prix/m³ × Volume en m³
                        </div>
                        <p className="mt-1"><strong>Exemple :</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Meuble 1500mm × 500mm (largeur × profondeur)</li>
                          <li>Socle hauteur fixe : 80mm (paramètre configurable ici)</li>
                          <li>Prix bois : 800€/m³</li>
                          <li>Volume = 1500 × 500 × 80 = 60 000 000 mm³ = 0.06 m³</li>
                          <li>Prix = 800€/m³ × 0.06 m³ = <strong>48€</strong></li>
                        </ul>
                      </div>

                      {/* Socle Métal */}
                      <div className="border-t pt-3">
                        <p><strong>Socle Métal (Pieds) :</strong> 2 pieds tous les 2 mètres de largeur</p>
                        <p className="mt-1"><strong>Formule :</strong> Nombre de pieds = (largeur / 2m) arrondi au supérieur × 2</p>
                        <p className="mt-1"><strong>Exemples :</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>1000mm (1m) → ceil(1/2) × 2 = 1 × 2 = <strong>2 pieds</strong> → 20€ × 2 = <strong>40€</strong></li>
                          <li>2000mm (2m) → ceil(2/2) × 2 = 1 × 2 = <strong>2 pieds</strong> → 20€ × 2 = <strong>40€</strong></li>
                          <li>2500mm (2.5m) → ceil(2.5/2) × 2 = 2 × 2 = <strong>4 pieds</strong> → 20€ × 4 = <strong>80€</strong></li>
                          <li>4500mm (4.5m) → ceil(4.5/2) × 2 = 3 × 2 = <strong>6 pieds</strong> → 20€ × 6 = <strong>120€</strong></li>
                        </ul>
                        <p className="mt-2"><em>Toujours un nombre pair de pieds (2, 4, 6, 8...)</em></p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hinges" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Charnières</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('hinges')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'standard' ? 'Charnière standard' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_unit && formatValue(params.price_per_unit.param_value, params.price_per_unit.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_unit && (
                              <Button onClick={() => handleEdit(params.price_per_unit)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = prix_unitaire × nombre_de_charnières
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Le nombre de charnières dépend du type de porte (2 pour simple/push, 4 pour double).
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="doors" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Portes</h4>
                  </div>
                  {renderDoorsTable()}

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = coefficient × longueur × hauteur + (prix_charnière × nb_charnières)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Exemple :</strong> Porte simple 600×2000mm, coef 0.00004, 2 charnières à 5€ → (0.00004 × 600 × 2000) + (5 × 2) = 48€ + 10€ = <strong>58€</strong>
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Colonnes</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix au m²</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('columns')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'standard' ? 'Colonne standard' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_m2 && formatValue(params.price_per_m2.param_value, params.price_per_m2.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_m2 && (
                              <Button onClick={() => handleEdit(params.price_per_m2)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix = prix_m² × profondeur × hauteur × nombre_colonnes
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calcule la surface de chaque colonne et multiplie par le nombre de colonnes.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wardrobe" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration de la Penderie</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix au mètre linéaire</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('wardrobe')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize">
                            {type === 'rod' ? 'Barre de penderie' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_linear_meter && formatValue(params.price_per_linear_meter.param_value, params.price_per_linear_meter.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_linear_meter && (
                              <Button onClick={() => handleEdit(params.price_per_linear_meter)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix Penderie = Prix par mètre × Largeur du meuble (en mètres)
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 space-y-2">
                      <p>
                        La penderie est une <strong>barre horizontale</strong> sur laquelle suspendre des vêtements.
                        Le prix est calculé selon la longueur de la barre.
                      </p>
                      <p className="mt-2"><strong>Exemple :</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Meuble largeur 1500mm (1.5m)</li>
                        <li>Prix barre penderie : 20€/m</li>
                        <li><strong>Prix = 20€ × 1.5m = 30€</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="handles" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration des Poignées</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de poignée</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('handles')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium">
                            {type === 'horizontal_bar' ? 'Barre horizontale' :
                             type === 'vertical_bar' ? 'Barre verticale' :
                             type === 'knob' ? 'Bouton' :
                             type === 'recessed' ? 'Poignée encastrée' :
                             type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_unit && formatValue(params.price_per_unit.param_value, params.price_per_unit.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.price_per_unit && (
                              <Button onClick={() => handleEdit(params.price_per_unit)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul</h5>
                    <div className="font-mono text-xs bg-background p-2 rounded mb-2">
                      Prix Poignée = Prix fixe selon le type
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 space-y-2">
                      <p>
                        Chaque type de poignée a un <strong>prix fixe</strong>, peu importe la taille du meuble.
                      </p>
                      <p className="mt-2"><strong>Types disponibles :</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li><strong>horizontal_bar</strong> : Barre horizontale</li>
                        <li><strong>vertical_bar</strong> : Barre verticale</li>
                        <li><strong>knob</strong> : Bouton</li>
                        <li><strong>recessed</strong> : Poignée encastrée</li>
                      </ul>
                      <p className="mt-2"><strong>Exemple :</strong></p>
                      <p className="ml-2">
                        Si une zone a une porte avec une poignée &quot;barre horizontale&quot; à 15€,
                        le prix total inclura automatiquement ces 15€.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="casing" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Configuration du Caisson</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Coefficient</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getParamsByCategory('casing')).map(([type, params]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium">
                            {type === 'full' ? 'Caisson complet' : type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.coefficient && formatValue(params.coefficient.param_value, params.coefficient.unit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {params.coefficient && (
                              <Button onClick={() => handleEdit(params.coefficient)} variant="ghost" size="sm">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Formule */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Formule de calcul - Prix du Caisson/Structure</h5>

                    <div className="font-mono text-xs bg-background p-2 rounded mb-3">
                      Prix Caisson = Prix_échantillon (€/m²) × Surface_totale × Coefficient
                    </div>

                    <div className="text-xs text-muted-foreground space-y-3">
                      <p className="p-2 bg-green-50 border border-green-200 rounded text-green-800">
                        <strong>💡 Le prix du matériau = le prix de l&apos;échantillon</strong><br/>
                        Définissez le prix au m² dans <strong>Dashboard → Gestion des échantillons</strong>
                      </p>

                      <p><strong>Le caisson = la boîte principale du meuble (5 faces - OUVERT devant)</strong></p>

                      <div className="bg-background/50 p-2 rounded font-mono text-xs">
                        <pre className="whitespace-pre">
{`Un caisson VIDE a 5 faces (pas de devant !) :

    ┌─────────────┐ ← Dessus
    │             │
    │             │
    │   OUVERT    │ ← Pas de face devant !
    │             │
    │ ┌─────────┐ │ ← Arrière (fond)
    └─┴─────────┴─┘ ← Dessous
    ↑             ↑
  Gauche       Droite`}
                        </pre>
                      </div>

                      <p><strong>Calcul de la surface totale (en m²) :</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Arrière = Largeur × Hauteur</li>
                        <li>Gauche + Droite = (Profondeur × Hauteur) × 2</li>
                        <li>Dessus + Dessous = (Largeur × Profondeur) × 2</li>
                      </ul>

                      <p className="mt-3"><strong>Exemple : Meuble 1500mm × 730mm × 500mm avec échantillon &quot;Chêne&quot; à 150€/m²</strong></p>

                      <p className="ml-2">Étape 1 - Calculer la surface :</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Arrière = 1.5m × 0.73m = 1.095 m²</li>
                        <li>Gauche + Droite = (0.5m × 0.73m) × 2 = 0.73 m²</li>
                        <li>Dessus + Dessous = (1.5m × 0.5m) × 2 = 1.50 m²</li>
                        <li><strong>Surface totale = 1.095 + 0.73 + 1.50 = 3.325 m²</strong></li>
                      </ul>

                      <p className="ml-2 mt-2">Étape 2 - Calculer le prix :</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Prix échantillon &quot;Chêne&quot; = 150€/m²</li>
                        <li>Coefficient fabrication = 1.2</li>
                        <li><strong>Prix caisson = 150€ × 3.325m² × 1.2 = 598€</strong></li>
                      </ul>

                      <p className="mt-2 italic">Ensuite on ajoute : tiroirs, portes, socle, étagères, LED, etc.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="display" className="mt-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted">
                    <h4 className="text-lg font-bold tracking-tight">Paramètres d&apos;affichage du prix</h4>
                  </div>
                  {renderDisplayTable()}

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-2">Options d&apos;affichage</h5>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>
                        <strong>Mode d&apos;affichage :</strong> Définit si le prix est affiché de manière exacte (DIRECT) ou sous forme de fourchette (INTERVALLE).
                        <br /><em>Note: Utilisez 0 pour DIRECT et 1 pour INTERVALLE.</em>
                      </p>
                      <p>
                        <strong>Écart type :</strong> La valeur à ajouter et soustraire du prix calculé pour créer l&apos;intervalle.
                        <br /><em>Exemple: Si le prix est de 2000€ et l&apos;écart est de 100€, l&apos;affichage sera &quot;1 900€ - 2 100€&quot;.</em>
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le paramètre</DialogTitle>
            <DialogDescription>{editingParam?.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">
                Valeur ({formatUnit(editingParam?.unit || '')}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="value"
                type="number"
                step="0.0001"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Paramètre: <span className="font-mono">{editingParam?.param_name}</span> pour{' '}
                <span className="font-mono">{editingParam?.item_type}</span>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                <IconCheck className="w-4 h-4 mr-2" />
                Mettre à jour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Dialog - Guide des formules */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconInfoCircle className="h-5 w-5 text-primary" />
              Guide des formules de calcul
            </DialogTitle>
            <DialogDescription>Comprendre comment chaque élément est tarifé</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tiroirs */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Tiroirs
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = base_price + coefficient × largeur × profondeur
                </p>
                <p className="text-muted-foreground">
                  Exemple: Tiroir 500mm × 400mm avec base 35€ et coefficient 0.0001
                  <br />→ 35€ + (0.0001 × 500 × 400) = 35€ + 20€ = <strong>55€</strong>
                </p>
              </div>
            </div>

            {/* Étagères en verre */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Étagères en verre
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = prix_verre_m² × (longueur × largeur)
                </p>
                <p className="text-muted-foreground">
                  Surface en m². Exemple: Étagère 1000mm × 300mm avec verre à 250€/m²
                  <br />→ 250€ × (1 × 0.3) = <strong>75€</strong>
                </p>
              </div>
            </div>

            {/* LED */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Éclairage LED
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">Prix = prix_led × largeur (en mètres)</p>
                <p className="text-muted-foreground">
                  Exemple: Largeur 1500mm avec LED à 15€/m
                  <br />→ 15€ × 1.5 = <strong>22.50€</strong>
                </p>
              </div>
            </div>

            {/* Socle métal */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Socle pieds métal
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = prix_pied × nombre_pieds
                  <br />
                  Nombre = base_count + (largeur_mm / intervalle_mm)
                </p>
                <p className="text-muted-foreground">
                  2 pieds de base + 2 pieds tous les 1m.
                  <br />
                  Exemple: Largeur 2500mm, prix pied 20€
                  <br />→ 20€ × (2 + 2) = <strong>80€</strong>
                </p>
              </div>
            </div>

            {/* Socle bois */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Socle caisson bois
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = coefficient × largeur × profondeur
                </p>
              </div>
            </div>

            {/* Portes */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Portes
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = coefficient × longueur × hauteur + (prix_charnière × nb_charnières)
                </p>
                <p className="text-muted-foreground">
                  Le coefficient varie selon le type (simple, double, vitrée, push).
                  <br />
                  Exemple: Porte simple 600mm × 2000mm, coef 0.00004, 2 charnières à 5€
                  <br />→ (0.00004 × 600 × 2000) + (5 × 2) = 48€ + 10€ = <strong>58€</strong>
                </p>
              </div>
            </div>

            {/* Colonnes */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Colonnes
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = prix_m² × profondeur × hauteur × nombre_colonnes
                </p>
              </div>
            </div>

            {/* Caisson */}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <IconChevronRight className="h-4 w-4 text-primary" />
                Caisson complet
              </h4>
              <div className="pl-6 space-y-2 text-sm">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Prix = prix_échantillon (€/m²) × surface_totale × coefficient
                </p>
                <p className="text-muted-foreground">
                  Surface totale = arrière + 2×côtés + dessus + dessous (pas de devant)
                  <br />
                  Le prix du matériau = prix de l&apos;échantillon sélectionné.
                  <br />
                  Le coefficient majore le prix pour la complexité de fabrication.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsInfoDialogOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
