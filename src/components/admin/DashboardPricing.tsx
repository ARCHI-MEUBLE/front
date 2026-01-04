import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  IconCurrencyEuro,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface Pricing {
  id: number;
  name: string;
  description: string;
  price_per_m3: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function DashboardPricing() {
  const [pricings, setPricings] = useState<Pricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<Pricing | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_m3: '',
  });

  useEffect(() => {
    loadPricings();
  }, []);

  const loadPricings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/backend/api/pricing/index.php');
      const data = await response.json();

      if (data.success) {
        setPricings(data.data);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du chargement des tarifs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pricing: Pricing) => {
    setEditingPricing(pricing);
    setFormData({
      name: pricing.name,
      description: pricing.description || '',
      price_per_m3: pricing.price_per_m3.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPricing(null);
    setFormData({
      name: '',
      description: '',
      price_per_m3: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price_per_m3) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const price = parseFloat(formData.price_per_m3);
    if (isNaN(price) || price <= 0) {
      toast.error('Le prix doit être un nombre positif');
      return;
    }

    try {
      const url = '/backend/api/pricing/index.php';
      const method = editingPricing ? 'PUT' : 'POST';
      const body = editingPricing
        ? {
            id: editingPricing.id,
            name: formData.name,
            description: formData.description,
            price_per_m3: price,
          }
        : {
            name: formData.name,
            description: formData.description,
            price_per_m3: price,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      toast.success(editingPricing ? 'Tarif mis à jour' : 'Tarif créé');
      setIsDialogOpen(false);
      loadPricings();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) {
      return;
    }

    try {
      const response = await fetch('/backend/api/pricing/index.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('Tarif supprimé');
      loadPricings();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des prix</h2>
          <p className="text-muted-foreground">
            Configurez les prix au mètre cube pour le calcul automatique
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPricings} variant="outline" size="sm">
            <IconRefresh className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setIsInfoDialogOpen(true)} variant="outline" size="sm">
            <IconInfoCircle className="w-4 h-4 mr-2" />
            Comment ça marche ?
          </Button>
          <Button onClick={handleCreate} size="sm">
            <IconPlus className="w-4 h-4 mr-2" />
            Nouveau tarif
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarif moyen</CardTitle>
            <IconCurrencyEuro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pricings.length > 0
                ? formatCurrency(
                    pricings.reduce((sum, p) => sum + p.price_per_m3, 0) / pricings.length
                  )
                : '0 €'}
            </div>
            <p className="text-xs text-muted-foreground">par m³</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix minimum</CardTitle>
            <IconCurrencyEuro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pricings.length > 0
                ? formatCurrency(Math.min(...pricings.map((p) => p.price_per_m3)))
                : '0 €'}
            </div>
            <p className="text-xs text-muted-foreground">par m³</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix maximum</CardTitle>
            <IconCurrencyEuro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pricings.length > 0
                ? formatCurrency(Math.max(...pricings.map((p) => p.price_per_m3)))
                : '0 €'}
            </div>
            <p className="text-xs text-muted-foreground">par m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tarifs</CardTitle>
          <CardDescription>
            Gérez les différents niveaux de prix au mètre cube
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconRefresh className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pricings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun tarif configuré
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Prix / m³</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricings.map((pricing) => (
                  <TableRow key={pricing.id}>
                    <TableCell className="font-medium">{pricing.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {pricing.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(pricing.price_per_m3)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(pricing)}
                          variant="ghost"
                          size="sm"
                        >
                          <IconEdit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(pricing.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <IconX className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing ? 'Modifier le tarif' : 'Nouveau tarif'}
            </DialogTitle>
            <DialogDescription>
              Configurez le prix au mètre cube pour ce tarif
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Standard, Premium, Budget"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Description optionnelle"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Prix par m³ (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="1500.00"
                value={formData.price_per_m3}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price_per_m3: e.target.value }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Prix utilisé pour calculer automatiquement le coût des meubles
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                <IconCheck className="w-4 h-4 mr-2" />
                {editingPricing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Dialog - Comment ça marche ? */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconInfoCircle className="h-5 w-5 text-primary" />
              Comment fonctionne le calcul du prix ?
            </DialogTitle>
            <DialogDescription>
              Les prix sont calculés automatiquement dans le configurateur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formule */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Formule de calcul</h3>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Volume (m³) =</span>{' '}
                  <span className="font-semibold">(largeur × hauteur × profondeur) / 1 000 000 000</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix de base =</span>{' '}
                  <span className="font-semibold">Volume × Prix au m³</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix final =</span>{' '}
                  <span className="font-semibold">Prix de base + Suppléments</span>
                </div>
              </div>
            </div>

            {/* Exemple */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Exemple concret</h3>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5">
                    <IconCurrencyEuro className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Meuble 1500×730×500 mm avec tarif "default" (1500€/m³)</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                        Volume : 0,5475 m³
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                        Prix de base : 0,5475 × 1500 = <span className="font-semibold text-foreground">821€</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                        + Supplément matériau (MDF, plaqué bois...)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                        + Prix socle (métal, bois...)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                        + Prix des tiroirs et penderies
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Note importante */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Note :</span> Le prix se met à jour{' '}
                <span className="font-semibold text-foreground">automatiquement</span> à chaque modification
                des dimensions par le client dans le configurateur.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsInfoDialogOpen(false)}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
