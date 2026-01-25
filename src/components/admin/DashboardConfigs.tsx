"use client"

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';
import {
  IconEye,
  IconPackage,
  IconRefresh,
  IconLayoutColumns,
  IconChevronDown,
  IconFilter,
  IconX,
  IconBox,
  IconEdit,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminConfiguration {
  id: number;
  name?: string | null;
  customer_email: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  model_name: string | null;
  model_id?: number | null;
  price: number;
  created_at: string;
  status?: string;
  prompt?: string | null;
  glb_url?: string | null;
  dxf_url?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  en_attente_validation: { label: 'En attente', variant: 'outline' },
  validee: { label: 'Validée', variant: 'secondary' },
  payee: { label: 'Payée', variant: 'default' },
  en_production: { label: 'En production', variant: 'default' },
  livree: { label: 'Livrée', variant: 'secondary' },
  annulee: { label: 'Annulée', variant: 'destructive' },
  en_commande: { label: 'En commande', variant: 'default' },
};

export function DashboardConfigs() {
  const [configs, setConfigs] = useState<AdminConfiguration[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<AdminConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AdminConfiguration | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    name: true,
    client: true,
    model: true,
    price: true,
    status: true,
    date: true,
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    filterConfigurations();
  }, [configs, statusFilter, searchTerm]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/configurations', { credentials: 'include' });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Vous devez être connecté");
        throw new Error(errorData.error || 'Impossible de charger');
      }

      const data = await res.json();
      setConfigs(data.configurations || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger');
    } finally {
      setLoading(false);
    }
  };

  const filterConfigurations = () => {
    let filtered = [...configs];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toString().includes(searchTerm)
      );
    }

    setFilteredConfigs(filtered);
  };

  const viewDetails = (config: AdminConfiguration) => {
    setSelectedConfig(config);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch('/backend/api/admin/update-configuration-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error('Erreur mise à jour');

      await loadConfigurations();

      if (selectedConfig && selectedConfig.id === id) {
        setSelectedConfig({ ...selectedConfig, status: newStatus });
      }

      toast.success('Statut mis à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const createOrderFromConfig = async (configId: number) => {
    if (isCreatingOrder) return;

    if (!confirm('Créer une commande ?')) return;

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/admin/create-order-from-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ configuration_id: configId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur création');
      }

      toast.success(`Commande ${data.data.order_number} créée !`);

      await loadConfigurations();
      setSelectedConfig(null);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'orders' }));
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive mx-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={loadConfigurations} variant="outline" size="sm">
              <IconRefresh className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Table Section */}
      <div className="flex flex-col gap-3 px-4 lg:px-6">
            {/* Toolbar - Stack sur mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 sm:gap-2">
                  <div className="relative flex-1 sm:max-w-sm">
                    <Input
                      placeholder="Rechercher ID, client, modèle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 pr-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8"
                        onClick={() => setSearchTerm('')}
                      >
                        <IconX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px]">
                      <IconFilter className="h-4 w-4 mr-2 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto">
                      <IconLayoutColumns className="h-4 w-4 sm:mr-2" />
                      <span>Colonnes</span>
                      <IconChevronDown className="h-4 w-4 ml-auto sm:ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {Object.entries(columnVisibility).map(([key, value]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        className="capitalize"
                        checked={value}
                        onCheckedChange={(checked) =>
                          setColumnVisibility(prev => ({ ...prev, [key]: checked }))
                        }
                      >
                        {key === 'id' ? 'ID' : key.charAt(0).toUpperCase() + key.slice(1)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Table - Scroll horizontal sur mobile */}
              {filteredConfigs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <h3 className="text-base sm:text-lg font-medium mb-1">Aucune configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Aucun résultat'
                        : 'Aucune configuration'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {columnVisibility.id && <TableHead className="w-[70px] font-semibold">ID</TableHead>}
                          {columnVisibility.name && <TableHead className="min-w-[140px] font-semibold">Nom</TableHead>}
                          {columnVisibility.client && <TableHead className="min-w-[180px] font-semibold">Client</TableHead>}
                          {columnVisibility.model && <TableHead className="min-w-[140px] font-semibold">Modèle</TableHead>}
                          {columnVisibility.price && <TableHead className="w-[90px] font-semibold">Prix</TableHead>}
                          {columnVisibility.status && <TableHead className="w-[110px] font-semibold">Statut</TableHead>}
                          {columnVisibility.date && <TableHead className="min-w-[100px] font-semibold">Date</TableHead>}
                          <TableHead className="text-right min-w-[180px] sticky right-0 bg-muted/50 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConfigs.map((config) => {
                          const statusConfig = STATUS_CONFIG[config.status || 'en_attente_validation'] || STATUS_CONFIG.en_attente_validation;

                          return (
                            <TableRow key={config.id} className="hover:bg-muted/30">
                              {columnVisibility.id && (
                                <TableCell className="font-mono font-medium text-xs">#{config.id}</TableCell>
                              )}
                              {columnVisibility.name && (
                                <TableCell className="text-sm font-medium">
                                  {config.name || `Configuration #${config.id}`}
                                </TableCell>
                              )}
                              {columnVisibility.client && (
                                <TableCell className="text-sm">
                                  <div className="max-w-[180px] truncate">{config.customer_email || '—'}</div>
                                </TableCell>
                              )}
                              {columnVisibility.model && (
                                <TableCell className="text-sm text-muted-foreground">
                                  {config.model_name || (config.model_id ? `M${config.model_id}` : '—')}
                                </TableCell>
                              )}
                              {columnVisibility.price && (
                                <TableCell className="font-semibold tabular-nums">{Math.round(config.price)}€</TableCell>
                              )}
                              {columnVisibility.status && (
                                <TableCell>
                                  <Badge variant={statusConfig.variant} className="text-xs">
                                    {statusConfig.label}
                                  </Badge>
                                </TableCell>
                              )}
                              {columnVisibility.date && (
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(config.created_at)}
                                </TableCell>
                              )}
                              <TableCell className="text-right sticky right-0 bg-background">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    onClick={() => {
                                      const match = config.prompt?.match(/^(M[1-5])\(/);
                                      const templateKey = config.model_id ? String(config.model_id) : (match ? match[1] : 'M1');
                                      window.open(`/configurator/${templateKey}?mode=view&configId=${config.id}&fromAdmin=true`, '_blank');
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 sm:px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <IconBox className="h-4 w-4" />
                                    <span className="ml-1 hidden sm:inline">Voir 3D</span>
                                  </Button>
                                  <Button
                                    onClick={() => viewDetails(config)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 sm:px-3"
                                  >
                                    <IconEye className="h-4 w-4" />
                                    <span className="ml-1 hidden sm:inline">Détails</span>
                                  </Button>
                                  {config.status === 'en_attente_validation' && (
                                    <Button
                                      onClick={() => createOrderFromConfig(config.id)}
                                      disabled={isCreatingOrder}
                                      size="sm"
                                      className="h-8 px-2 sm:px-3"
                                    >
                                      <IconPackage className="h-4 w-4" />
                                      <span className="ml-1 hidden sm:inline">{isCreatingOrder ? '...' : 'Créer'}</span>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="text-xs sm:text-sm text-muted-foreground px-2">
                {filteredConfigs.length} résultat{filteredConfigs.length > 1 ? 's' : ''}
                {statusFilter !== 'all' || searchTerm ? ' trouvé' + (filteredConfigs.length > 1 ? 's' : '') : ''}
              </div>
      </div>

      {/* Details Sheet - Full screen sur mobile */}
      <Sheet open={!!selectedConfig} onOpenChange={(open) => !open && setSelectedConfig(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {selectedConfig && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-4 sm:px-6 py-4 sm:py-6 border-b">
                <SheetTitle className="text-lg sm:text-xl">{selectedConfig.name || `Config #${selectedConfig.id}`}</SheetTitle>
                <SheetDescription className="text-sm">Détails et gestion</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Visualisation</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Voir ou modifier la configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={() => {
                        const match = selectedConfig.prompt?.match(/^(M[1-5])\(/);
                        const templateKey = selectedConfig.model_id ? String(selectedConfig.model_id) : (match ? match[1] : 'M1');
                        window.open(`/configurator/${templateKey}?mode=view&configId=${selectedConfig.id}&fromAdmin=true`, '_blank');
                      }}
                      variant="outline"
                      className="w-full h-10"
                    >
                      <IconEye className="w-4 h-4 mr-2" />
                      Voir en 3D (lecture seule)
                    </Button>
                    <Button
                      onClick={() => {
                        const match = selectedConfig.prompt?.match(/^(M[1-5])\(/);
                        const templateKey = selectedConfig.model_id ? String(selectedConfig.model_id) : (match ? match[1] : 'M1');
                        window.open(`/configurator/${templateKey}?mode=edit&configId=${selectedConfig.id}&fromAdmin=true`, '_blank');
                      }}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                    >
                      <IconEdit className="w-4 h-4 mr-2" />
                      Modifier la configuration
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base">Statut</CardTitle>
                      <Badge variant={STATUS_CONFIG[selectedConfig.status || 'en_attente_validation']?.variant}>
                        {STATUS_CONFIG[selectedConfig.status || 'en_attente_validation']?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                        <Button
                          key={key}
                          onClick={() => updateStatus(selectedConfig.id, key)}
                          disabled={selectedConfig.status === key}
                          variant={selectedConfig.status === key ? "default" : "outline"}
                          size="sm"
                          className="text-xs sm:text-sm h-9"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {selectedConfig.status === 'en_attente_validation' && (
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base">Créer commande</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Après validation client</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => createOrderFromConfig(selectedConfig.id)}
                        disabled={isCreatingOrder}
                        className="w-full h-10"
                      >
                        <IconPackage className="w-4 h-4 mr-2" />
                        {isCreatingOrder ? 'Création...' : 'Créer la commande'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs sm:text-sm">
                    <div><span className="font-medium">Nom:</span> {selectedConfig.customer_first_name} {selectedConfig.customer_last_name}</div>
                    <div><span className="font-medium">Email:</span> {selectedConfig.customer_email || 'N/A'}</div>
                    {selectedConfig.customer_phone && (
                      <div><span className="font-medium">Tél:</span> {selectedConfig.customer_phone}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Modèle</p>
                        <p className="font-medium">{selectedConfig.model_name || (selectedConfig.model_id ? `M${selectedConfig.model_id}` : '—')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Prix</p>
                        <p className="font-semibold tabular-nums">{Math.round(selectedConfig.price)}€</p>
                      </div>
                    </div>

                    {selectedConfig.prompt && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground mb-2 block">Prompt</Label>
                          <code className="text-xs font-mono bg-muted p-3 rounded-md block whitespace-pre-wrap break-words">
                            {selectedConfig.prompt}
                          </code>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Fichiers</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Button asChild variant="outline" size="sm" disabled={!selectedConfig.glb_url}>
                      {selectedConfig.glb_url ? (
                        <a href={selectedConfig.glb_url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm">
                          GLB (3D)
                        </a>
                      ) : (
                        <span className="text-xs sm:text-sm text-muted-foreground opacity-50">GLB (non généré)</span>
                      )}
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/api/files/dxf?id=${selectedConfig.id}`} download className="text-xs sm:text-sm">
                        DXF {!selectedConfig.dxf_url && '(générique)'}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default DashboardConfigs;
