// Champ numérique enregistré sur place : valeur actuelle préremplie, unité affichée, erreur en ligne (saisie ou
// serveur), Entrée pour enregistrer, Échap pour annuler. Partagé par la grille, les matières et les échantillons.
import { useEffect, useId, useState } from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pricingErrorMessage } from '@/lib/pricingAdminApi';
import { cn } from '@/lib/utils';
import type { ParseResult } from './gridUnits';

interface InlineNumberFieldProps {
  // Nom accessible du champ (le libellé visible est rendu par le parent)
  label: string;
  // Texte du champ pour la valeur enregistrée ('' si aucune)
  initial: string;
  suffix: string;
  min: number;
  max: number;
  step: number;
  parse: (raw: string) => ParseResult;
  onSave: (value: number) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function InlineNumberField({
  label,
  initial,
  suffix,
  min,
  max,
  step,
  parse,
  onSave,
  placeholder,
  disabled,
  className,
}: InlineNumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Nouvelle valeur enregistrée (après un enregistrement ou un rechargement) : le champ la reprend
  useEffect(() => {
    setDraft(initial);
    setTouched(false);
    setServerError(null);
  }, [initial]);

  const dirty = draft.trim() !== initial.trim();
  const result = parse(draft);
  const inputError = dirty && touched && !result.ok ? result.error : null;
  const error = inputError ?? serverError;

  const reset = () => {
    setDraft(initial);
    setTouched(false);
    setServerError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!dirty || saving) return;
    if (!result.ok) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSave(result.value);
    } catch (err) {
      setServerError(pricingErrorMessage(err, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        <div className="relative w-36 shrink-0">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            placeholder={placeholder}
            disabled={disabled || saving}
            aria-label={label}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              setServerError(null);
            }}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && dirty) {
                e.preventDefault();
                reset();
              }
            }}
            className={cn('h-8 text-right tabular-nums', suffix ? 'pr-12' : '')}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        <Button
          type="submit"
          size="icon-sm"
          variant={dirty ? 'default' : 'ghost'}
          disabled={!dirty || saving || disabled}
          aria-label={`Enregistrer : ${label}`}
          title="Enregistrer (Entrée)"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        {dirty && !saving && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={reset}
            aria-label={`Annuler la saisie : ${label}`}
            title="Annuler (Échap)"
          >
            <RotateCcw />
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
