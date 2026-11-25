/**
 * Composant DashboardPricingConfig
 * « Prix & livraison » : la grille du prix des meubles sur mesure (pricing_config), rangée en onglets lisibles par un
 * commerçant, les prix au m² des matières, la livraison et l'acompte par défaut. Une simulation à droite montre l'effet
 * de chaque modification sur des meubles de référence.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Info, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pricingAdminApi, pricingErrorMessage, type PricingParam } from '@/lib/pricingAdminApi';
import { GRID_TABS, OTHER_TAB, sortParams, tabForCategory, type GridTab, type GridTabKey } from './pricing/gridTabs';
import { formatParamValue } from './pricing/gridUnits';
import { goToSection } from './pricing/goToSection';
import { MaterialPricesPanel } from './pricing/MaterialPricesPanel';
import { ParamRow } from './pricing/ParamRow';
import { PricingSimulation } from './pricing/PricingSimulation';

export function DashboardPricingConfig() {
  const [params, setParams] = useState<PricingParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<GridTabKey>('workshop');
  // Incrémenté après chaque modification enregistrée : la simulation se recalcule
  const [version, setVersion] = useState(0);

  // silent : rechargement après une modification, sans remplacer la page par le chargement
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      setParams(await pricingAdminApi.grid());
      setError(null);
    } catch (err) {
      if (silent) toast.error(pricingErrorMessage(err, 'Grille non rechargée'));
      else setError(pricingErrorMessage(err, 'Grille des prix indisponible'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byTab = useMemo(() => {
    const groups = new Map<GridTabKey, PricingParam[]>();
    for (const param of params) {
      const key = tabForCategory(param.category);
      groups.set(key, [...(groups.get(key) ?? []), param]);
    }
    return groups;
  }, [params]);

  // L'onglet « Autres » n'apparaît que s'il contient quelque chose
  const tabs: GridTab[] = (byTab.get('other')?.length ?? 0) > 0 ? [...GRID_TABS, OTHER_TAB] : GRID_TABS;

  // Erreur remontée au champ (message en ligne) : pas de toast d'erreur ici
  const saveParam = async (param: PricingParam, value: number) => {
    await pricingAdminApi.updateParam(param.id, value);
    const saved = { ...param, param_value: value };
    toast.success(`${param.description ?? 'Paramètre'} : ${formatParamValue(saved)}`);
    setParams((prev) => prev.map((p) => (p.id === param.id ? saved : p)));
    setVersion((v) => v + 1);
    await load(true);
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">Prix & livraison</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tous les prix sont TTC. Les devis déjà enregistrés gardent leur prix : vos changements s&apos;appliquent aux
            nouvelles estimations du configurateur et aux nouveaux paniers. Chaque valeur s&apos;enregistre seule
            (Entrée ou ✓).
          </p>
        </div>
        <Button onClick={() => load()} variant="outline" className="shrink-0" disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <CardContent>
            {loading ? (
              <div className="flex h-[320px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Chargement de la grille...</p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-3 py-6" role="alert">
                <p className="font-medium text-destructive">Grille des prix indisponible</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={() => load()}>
                  Réessayer
                </Button>
              </div>
            ) : (
              <Tabs value={tab} onValueChange={(value) => setTab(value as GridTabKey)} className="w-full">
                <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1.5">
                  {tabs.map((t) => (
                    <TabsTrigger
                      key={t.key}
                      value={t.key}
                      className="flex-none px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {tabs.map((t) => {
                  const tabParams = sortParams(byTab.get(t.key) ?? [], t);
                  return (
                    <TabsContent key={t.key} value={t.key} className="space-y-4">
                      <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        <p className="text-muted-foreground">{t.intro}</p>
                      </div>

                      {t.key === 'handles' && (
                        <Button variant="outline" size="sm" onClick={() => goToSection('handles')}>
                          Régler le prix des modèles de poignées
                          <ArrowRight />
                        </Button>
                      )}

                      {t.key === 'materials' ? (
                        <MaterialPricesPanel
                          params={tabParams}
                          onSaveParam={saveParam}
                          onMaterialChanged={() => setVersion((v) => v + 1)}
                        />
                      ) : tabParams.length === 0 ? (
                        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Aucun paramètre dans cette rubrique : la mise à jour de la base de données n&apos;a sans
                          doute pas encore été appliquée.
                        </p>
                      ) : (
                        <ul className="divide-y" aria-label={t.label}>
                          {tabParams.map((param) => (
                            <ParamRow key={param.id} param={param} onSave={saveParam} />
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
          <PricingSimulation version={version} />
        </div>
      </div>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">Les autres prix du site</CardTitle>
          <CardDescription>Ils ne dépendent pas de cette grille et se règlent dans leur section.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => goToSection('samples')}>
            Matières et prix des échantillons
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToSection('handles')}>
            Modèles de poignées
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToSection('facades')}>
            Façades sur mesure
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToSection('catalogue')}>
            Catalogue & pièces
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToSection('configs')}>
            Ajuster le prix d&apos;un devis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
