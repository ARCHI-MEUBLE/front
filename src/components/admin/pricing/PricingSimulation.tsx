// Simulation : des meubles de référence estimés par le même calcul que le configurateur, recalculés après chaque
// modification enregistrée pour voir son effet tout de suite (écart affiché par rapport au calcul précédent).
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { pricingAdminApi, pricingErrorMessage, type AdminPriceEstimate } from '@/lib/pricingAdminApi';
import { cn } from '@/lib/utils';
import { formatEuro } from './gridUnits';
import {
  describeDimensions,
  describeMaterial,
  fromModels,
  sampleFurniture,
  type ReferenceFurniture,
} from './referenceFurniture';

const MAX_REFERENCES = 4;

interface SimulationResult {
  estimate: AdminPriceEstimate | null;
  // Estimation avant le dernier recalcul, pour afficher l'écart
  previous: AdminPriceEstimate | null;
  loading: boolean;
  error: string | null;
}

interface PricingSimulationProps {
  // Incrémenté par la page après chaque modification enregistrée
  version: number;
}

export function PricingSimulation({ version }: PricingSimulationProps) {
  const [references, setReferences] = useState<ReferenceFurniture[] | null>(null);
  const [usingSamples, setUsingSamples] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SimulationResult>>({});
  const [run, setRun] = useState(0);

  const loadReferences = useCallback(async () => {
    let models: ReferenceFurniture[] = [];
    try {
      models = fromModels(await pricingAdminApi.referenceModels()).slice(0, MAX_REFERENCES);
      setModelsError(null);
    } catch (err) {
      setModelsError(pricingErrorMessage(err, 'Modèles du site indisponibles'));
    }
    if (models.length > 0) {
      setUsingSamples(false);
      setReferences(models);
      return;
    }
    // Pas de modèle estimable : meubles types, dans une matière réelle (celle qui a un prix, de préférence)
    let material = '';
    try {
      const { materials } = await pricingAdminApi.materialPrices();
      material = (materials.find((m) => m.price_per_m2 !== null && m.colors > 0) ?? materials[0])?.material ?? '';
    } catch {
      // Sans la liste des matières, le calcul prend le prix par défaut
    }
    setUsingSamples(true);
    setReferences(sampleFurniture(material));
  }, []);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    if (!references) return;
    const controller = new AbortController();
    setResults((prev) =>
      Object.fromEntries(
        references.map((ref) => [
          ref.key,
          { estimate: prev[ref.key]?.estimate ?? null, previous: prev[ref.key]?.previous ?? null, loading: true, error: null },
        ])
      )
    );
    for (const ref of references) {
      pricingAdminApi
        .estimate(ref.configData, controller.signal)
        .then((estimate) =>
          setResults((prev) => ({
            ...prev,
            [ref.key]: { estimate, previous: prev[ref.key]?.estimate ?? null, loading: false, error: null },
          }))
        )
        .catch((err) => {
          if (controller.signal.aborted) return;
          setResults((prev) => ({
            ...prev,
            [ref.key]: {
              estimate: null,
              previous: null,
              loading: false,
              error: pricingErrorMessage(err, 'Estimation impossible'),
            },
          }));
        });
    }
    return () => controller.abort();
  }, [references, version, run]);

  const busy = !references || Object.values(results).some((r) => r.loading);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Simulation</CardTitle>
        <CardDescription>
          {usingSamples
            ? 'Aucun modèle du site n’a encore de configuration 3D : estimation de trois meubles types avec la grille enregistrée.'
            : 'Modèles du site estimés avec la grille enregistrée, comme dans le configurateur.'}{' '}
          Recalculée après chaque modification.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setRun((r) => r + 1)}
            disabled={busy}
            aria-label="Recalculer la simulation"
            title="Recalculer"
          >
            <RefreshCw className={cn(busy && 'animate-spin')} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {modelsError && (
          <p className="text-xs text-muted-foreground">Modèles du site non chargés ({modelsError}) : meubles types utilisés.</p>
        )}
        {!references ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Préparation de la simulation...
          </div>
        ) : (
          <ul className="space-y-3" aria-live="polite" aria-label="Meubles de référence">
            {references.map((ref) => (
              <SimulationCard key={ref.key} reference={ref} result={results[ref.key]} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SimulationCard({ reference, result }: { reference: ReferenceFurniture; result?: SimulationResult }) {
  const estimate = result?.estimate ?? null;
  const delta = estimate && result?.previous ? estimate.price - result.previous.price : 0;
  const material = describeMaterial(reference.configData);
  // Le serveur n'a plus de ligne « delivery » ; une ancienne réponse en a encore une, on la signale à part
  const lines = estimate?.lines.filter((line) => line.key !== 'delivery') ?? [];
  const legacyDelivery = estimate?.lines.find((line) => line.key === 'delivery');

  return (
    <li className={cn('space-y-2 rounded-lg border p-3', result?.loading && 'opacity-70')} aria-busy={result?.loading}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={reference.name}>
            {reference.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {describeDimensions(reference.configData)}
            {material ? ` · ${material}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {estimate ? (
            <p className="text-lg font-semibold tabular-nums">{formatEuro(estimate.price)}</p>
          ) : result?.loading ? (
            <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
          ) : null}
          {delta !== 0 && (
            <Badge
              variant="outline"
              className={cn('tabular-nums', delta > 0 ? 'border-amber-300 text-amber-700' : 'border-emerald-300 text-emerald-700')}
              title="Écart avec le calcul précédent"
            >
              {delta > 0 ? '+' : '−'}
              {formatEuro(Math.abs(delta))}
            </Badge>
          )}
        </div>
      </div>

      {result?.error && (
        <p className="text-xs text-destructive" role="alert">
          {result.error}
        </p>
      )}

      {estimate && (
        <>
          <p className="text-xs text-muted-foreground">
            Fourchette affichée au client : {formatEuro(estimate.low)} – {formatEuro(estimate.high)}
          </p>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
            {lines.map((line) => (
              <div key={line.key} className="contents">
                <dt className="truncate text-muted-foreground" title={line.label}>
                  {line.label}
                </dt>
                <dd className="text-right tabular-nums">{formatEuro(line.amount)}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-center gap-1.5 border-t pt-2 text-xs">
            <Truck className="size-3.5 shrink-0 text-muted-foreground" />
            {estimate.delivery !== null ? (
              <span>
                Livraison, facturée à part : <span className="font-medium tabular-nums">{formatEuro(estimate.delivery)}</span>
              </span>
            ) : legacyDelivery ? (
              <span className="text-amber-700">
                Livraison encore comprise dans le prix ({formatEuro(legacyDelivery.amount)}) : le serveur n’est pas à jour.
              </span>
            ) : (
              <span className="text-muted-foreground">Livraison non communiquée par le serveur.</span>
            )}
          </p>
        </>
      )}
    </li>
  );
}
