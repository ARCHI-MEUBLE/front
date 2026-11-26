// Onglet « Matières » : prix au m² par défaut (grille) et prix au m² de chaque matière des échantillons
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  pricingAdminApi,
  pricingErrorMessage,
  type MaterialPrice,
  type PricingParam,
} from '@/lib/pricingAdminApi';
import { InlineNumberField } from './InlineNumberField';
import { ParamRow } from './ParamRow';
import { goToSection } from './goToSection';
import { formatEuro, paramKey, parseInput, unitSpec } from './gridUnits';

// Paramètre fictif pour réutiliser les bornes et la saisie d'un prix au m²
const materialParam = (material: string) => ({
  category: 'materials',
  item_type: material,
  param_name: 'price_per_m2',
  unit: 'eur_m2',
});

interface MaterialPricesPanelProps {
  // Lignes « materials » de la grille (prix par défaut, et anciennes lignes tant que la base n'est pas migrée)
  params: PricingParam[];
  onSaveParam: (param: PricingParam, value: number) => Promise<void>;
  // Un prix de matière a changé : la simulation se recalcule
  onMaterialChanged: () => void;
}

export function MaterialPricesPanel({ params, onSaveParam, onMaterialChanged }: MaterialPricesPanelProps) {
  const [materials, setMaterials] = useState<MaterialPrice[]>([]);
  const [serverDefault, setServerDefault] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await pricingAdminApi.materialPrices();
      setMaterials([...data.materials].sort((a, b) => a.material.localeCompare(b.material, 'fr')));
      setServerDefault(data.defaultPricePerM2);
      setError(null);
    } catch (err) {
      if (silent) toast.error(pricingErrorMessage(err, 'Prix des matières non rechargés'));
      else setError(pricingErrorMessage(err, 'Prix des matières indisponibles'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const defaultParam = params.find((p) => paramKey(p) === 'materials.default.price_per_m2');
  const defaultPrice = defaultParam?.param_value ?? serverDefault;
  const unpriced = materials.filter((m) => m.price_per_m2 === null && m.colors > 0);
  const spec = unitSpec(materialParam(''));

  const saveMaterial = async (material: string, value: number) => {
    await pricingAdminApi.setMaterialPrice(material, value);
    toast.success(`Prix au m² de « ${material} » enregistré`);
    setMaterials((prev) => prev.map((m) => (m.material === material ? { ...m, price_per_m2: value } : m)));
    onMaterialChanged();
    await load(true);
  };

  const removeMaterial = async (material: string) => {
    setRemoving(material);
    try {
      await pricingAdminApi.deleteMaterialPrice(material);
      toast.success(`Prix de « ${material} » retiré`);
      onMaterialChanged();
      await load(true);
    } catch (err) {
      toast.error(pricingErrorMessage(err, 'Suppression impossible'));
    } finally {
      setRemoving(null);
    }
  };

  // Le prix par défaut sert aussi aux matières sans prix : on recharge pour mettre les mentions à jour
  const saveDefault = async (param: PricingParam, value: number) => {
    await onSaveParam(param, value);
    await load(true);
  };

  return (
    <div className="space-y-6">
      {params.length > 0 && (
        <ul className="divide-y" aria-label="Prix au m² par défaut">
          {params.map((param) => (
            <ParamRow key={param.id} param={param} onSave={paramKey(param) === 'materials.default.price_per_m2' ? saveDefault : onSaveParam} />
          ))}
        </ul>
      )}

      <section className="space-y-3" aria-labelledby="material-prices-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h4 id="material-prices-title" className="text-sm font-semibold">
              Prix au m² de chaque matière
            </h4>
            {!loading && !error && unpriced.length > 0 && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                <AlertTriangle className="size-3" />
                {unpriced.length} sans prix
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => goToSection('samples')}>
            Ajouter une matière dans Échantillons
            <ArrowRight />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Chargement des matières...
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Réessayer
            </Button>
          </div>
        ) : materials.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune matière. Créez-en une dans la section Échantillons, avec sa première couleur.
          </p>
        ) : (
          <ul className="divide-y rounded-md border px-4" aria-label="Matières">
            {materials.map((m) => (
              <li key={m.material} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{m.material}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.colors === 0 ? 'Aucune couleur' : `${m.colors} couleur${m.colors > 1 ? 's' : ''}`}
                  </p>
                  {m.price_per_m2 === null && (
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="size-3 shrink-0" />
                      Sans prix propre : comptée au prix par défaut
                      {defaultPrice !== null ? ` (${formatEuro(defaultPrice)}/m²)` : ''}.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <InlineNumberField
                    label={`Prix au m² de ${m.material}`}
                    initial={m.price_per_m2 === null ? '' : String(m.price_per_m2)}
                    placeholder={defaultPrice !== null ? String(defaultPrice) : undefined}
                    suffix={spec.suffix}
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    parse={(raw) => parseInput(materialParam(m.material), raw)}
                    onSave={(value) => saveMaterial(m.material, value)}
                  />
                  {m.colors === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={removing === m.material}
                      onClick={() => removeMaterial(m.material)}
                      aria-label={`Retirer le prix de ${m.material} (aucune couleur ne l'utilise)`}
                      title="Retirer : aucune couleur n'utilise cette matière"
                    >
                      {removing === m.material ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
