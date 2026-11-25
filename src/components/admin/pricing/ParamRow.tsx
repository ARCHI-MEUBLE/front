// Une ligne de la grille : libellé (description de la base), clé technique en petit, aide, valeur modifiable sur place
import { Badge } from '@/components/ui/badge';
import type { PricingParam } from '@/lib/pricingAdminApi';
import { InlineNumberField } from './InlineNumberField';
import { fallbackLabel, PARAM_HELP } from './gridTabs';
import { formatParamValue, paramKey, parseInput, toInputValue, unitSpec } from './gridUnits';

interface ParamRowProps {
  param: PricingParam;
  onSave: (param: PricingParam, value: number) => Promise<void>;
}

export function ParamRow({ param, onSave }: ParamRowProps) {
  const key = paramKey(param);
  const spec = unitSpec(param);
  const label = param.description ?? fallbackLabel(param);
  const help = PARAM_HELP[key];

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium leading-snug">{label}</p>
          {!param.is_active && (
            <Badge variant="outline" className="border-amber-300 text-amber-700" title="Ligne désactivée en base">
              Désactivé : ignoré par le calcul
            </Badge>
          )}
        </div>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
        <p className="font-mono text-[11px] text-muted-foreground/80">
          {key} · actuel {formatParamValue(param)}
        </p>
      </div>
      <InlineNumberField
        className="shrink-0"
        label={label}
        initial={toInputValue(param)}
        suffix={spec.suffix}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        parse={(raw) => parseInput(param, raw)}
        onSave={(value) => onSave(param, value)}
      />
    </li>
  );
}
