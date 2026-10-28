import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { IconEdit, IconRefresh, IconCheck } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

// Grille lue par le calcul du backend (FurniturePriceCalculator), dans l'ordre où le prix se construit
const CATEGORIES: { key: string; label: string; formula: string }[] = [
  { key: 'workshop', label: 'Atelier', formula: 'Forfait fixe par meuble : conception, découpe, assemblage, finitions.' },
  {
    key: 'materials',
    label: 'Matières',
    formula: 'Panneaux = surface (2 côtés + dessus + dessous + fond × part du fond + étagères + montants) × prix au m² de la matière.',
  },
  { key: 'panels', label: 'Panneaux', formula: 'Le fond, plus fin, ne compte que pour une part de son prix au m².' },
  {
    key: 'fronts',
    label: 'Portes et tiroirs',
    formula: 'Façade = forfait (charnières ou coulisses) + surface × prix au m² de la matière × majoration façade. Une double porte compte deux forfaits.',
  },
  { key: 'handles', label: 'Poignées', formula: 'Une poignée par battant ou par tiroir, sauf en push (supplément push à la place).' },
  { key: 'options', label: 'Options', formula: 'Penderie et LED au mètre de largeur de la case, passe-câble à l’unité.' },
  { key: 'bases', label: 'Socles', formula: 'Pieds métal : une paire par écart maximal, deux paires au moins. Socle bois : au mètre de largeur.' },
  { key: 'delivery', label: 'Livraison', formula: 'Au m² de façade du meuble (largeur × hauteur) : les grands meubles coûtent plus à livrer.' },
  {
    key: 'uncertainty',
    label: 'Fourchette',
    formula:
      'Chaque poste a une incertitude relative. Écart type = √(Σ (montant du poste × incertitude)²). Le client voit prix ± écart type, arrondi à 10 €.',
  },
];

const UNIT_LABELS: Record<string, string> = {
  eur: '€',
  eur_m2: '€/m²',
  eur_linear_m: '€/m',
  coefficient: 'coef.',
  ratio: '',
  mm: 'mm',
};

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatValue(value: number, unit: string): string {
  if (unit === 'eur') return euro.format(value);
  if (unit === 'eur_m2' || unit === 'eur_linear_m') return `${euro.format(value)}${UNIT_LABELS[unit].slice(1)}`;
  if (unit === 'ratio') return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  if (unit === 'coefficient') return `× ${value.toLocaleString('fr-FR')}`;
  return `${value.toLocaleString('fr-FR')} ${UNIT_LABELS[unit] ?? unit}`.trim();
}

export function DashboardPricingConfig() {
  const [allParams, setAllParams] = useState<PricingParam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      if (!data.success) throw new Error(data.error || 'Erreur lors du chargement');
      setAllParams(data.data.map((param: PricingParam) => ({ ...param, param_value: Number(param.param_value) })));
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (param: PricingParam) => {
    setEditingParam(param);
    setEditValue(param.param_value.toString());
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingParam.id, param_value: value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde');
      toast.success('Paramètre mis à jour');
      setEditingParam(null);
      loadAllParams();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Gestion des prix</h3>
          <p className="text-sm text-muted-foreground">
            Grille du prix estimé des meubles du configurateur. Le client voit une fourchette : prix ± écart type.
          </p>
        </div>
        <Button onClick={loadAllParams} variant="outline" className="flex-1 sm:flex-none">
          <IconRefresh className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconRefresh className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue={CATEGORIES[0].key} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8 h-auto bg-muted/50 p-2">
                {CATEGORIES.map((category) => (
                  <TabsTrigger
                    key={category.key}
                    value={category.key}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIES.map((category) => (
                <TabsContent key={category.key} value={category.key} className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paramètre</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allParams
                        .filter((param) => param.category === category.key)
                        .map((param) => (
                          <TableRow key={param.id}>
                            <TableCell>
                              <div className="font-medium">{param.description || param.param_name}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {param.item_type}.{param.param_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatValue(param.param_value, param.unit)}</TableCell>
                            <TableCell className="text-right">
                              <Button onClick={() => handleEdit(param)} variant="ghost" size="sm" aria-label="Modifier">
                                <IconEdit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="text-sm font-semibold mb-1">Calcul</h5>
                    <p className="text-xs text-muted-foreground">{category.formula}</p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingParam !== null} onOpenChange={(open) => !open && setEditingParam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le paramètre</DialogTitle>
            <DialogDescription>{editingParam?.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">
                Valeur {editingParam?.unit === 'ratio' ? '(0,10 = 10 %)' : `(${UNIT_LABELS[editingParam?.unit || ''] ?? editingParam?.unit})`}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input id="value" type="number" step="0.01" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Paramètre : <span className="font-mono">{editingParam?.item_type}.{editingParam?.param_name}</span>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingParam(null)}>
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
    </div>
  );
}
