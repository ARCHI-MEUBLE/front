// Import et export des poignées en fichier Excel : le fichier « Poignées LMC » se modifie dans Excel puis se réimporte.
// L'import montre d'abord ce qui changera (aperçu calculé par le serveur, sans rien enregistrer) ; tout ou rien.
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { handleModelsApi, HandleModelsApiError, type HandleImportResult } from '@/lib/handleModelsApi';
import { handleSheetRows, parseHandleSheet, type HandleImportRow, type SheetIssue } from '@/lib/handleSheet';
import { readXlsx, writeXlsx } from '@/lib/xlsx/xlsx';
import type { AdminHandleModel } from '@/lib/configurator/handles';

interface Preview {
  fileName: string;
  rows: HandleImportRow[];
  // Problèmes de lecture (dans le navigateur) et refus du serveur, triés par ligne
  issues: SheetIssue[];
  result: HandleImportResult | null;
}

const ACTIONS = [
  { key: 'create', total: 'created', label: 'à ajouter' },
  { key: 'update', total: 'updated', label: 'à modifier' },
  { key: 'unchanged', total: 'unchanged', label: 'déjà à jour' },
] as const;

function messageOf(err: unknown): string {
  if (err instanceof HandleModelsApiError || err instanceof Error) return err.message || 'Import impossible';
  return 'Import impossible';
}

const hasNameColumn = (rows: unknown[][]) =>
  rows.some((row) => row.some((cell) => typeof cell === 'string' && cell.trim().toLowerCase() === 'nom affiché'));

export function HandleSheetPanel({ models, onImported }: { models: AdminHandleModel[]; onImported: () => Promise<void> | void }) {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'idle' | 'reading' | 'saving'>('idle');
  const [preview, setPreview] = useState<Preview | null>(null);

  const readFile = async (file: File) => {
    setStep('reading');
    try {
      const sheets = await readXlsx(await file.arrayBuffer());
      // La feuille des poignées (le fichier livré a aussi un « Mode d'emploi »)
      const sheet = sheets.find((s) => hasNameColumn(s.rows)) ?? sheets[0];
      const { rows, issues } = parseHandleSheet(sheet?.rows ?? []);
      const result = rows.length > 0 ? await handleModelsApi.importRows(rows, true) : null;
      const all = [...issues, ...(result?.errors ?? [])].sort((a, b) => a.line - b.line);
      setPreview({ fileName: file.name, rows, issues: all, result });
    } catch (err) {
      toast.error(messageOf(err));
      setPreview(null);
    } finally {
      setStep('idle');
      if (input.current) input.current.value = '';
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setStep('saving');
    try {
      const result = await handleModelsApi.importRows(preview.rows, false);
      if (!result.saved) {
        setPreview({ ...preview, result, issues: result.errors });
        toast.error('Import refusé : corrigez les lignes signalées.');
        return;
      }
      toast.success(`Poignées importées : ${result.created} ajoutée${result.created > 1 ? 's' : ''}, ${result.updated} modifiée${result.updated > 1 ? 's' : ''}`);
      setPreview(null);
      await onImported();
    } catch (err) {
      toast.error(messageOf(err));
    } finally {
      setStep('idle');
    }
  };

  const exportFile = () => {
    const data = writeXlsx([{ name: 'Poignées', rows: handleSheetRows(models) }]);
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poignees-archimeuble.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const result = preview?.result;
  const toSave = (result?.created ?? 0) + (result?.updated ?? 0);
  const canImport = !!preview && preview.issues.length === 0 && toSave > 0;

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Fichier Excel des poignées
        </CardTitle>
        <CardDescription>
          Modifiez les modèles dans Excel (références, cotes, prix, photos, actif) puis réimportez le fichier : chaque
          ligne retrouve son modèle par sa référence, ou par son nom.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Fichier Excel des poignées"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readFile(file);
            }}
          />
          <Button onClick={() => input.current?.click()} disabled={step !== 'idle'}>
            {step === 'reading' ? <Loader2 className="animate-spin" /> : <Upload />}
            Importer un fichier Excel
          </Button>
          <Button variant="outline" onClick={exportFile} disabled={models.length === 0}>
            <Download />
            Exporter en Excel
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm" aria-live="polite">
            <p className="font-medium">{preview.fileName}</p>
            {result && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {ACTIONS.map(({ key, total, label }) => {
                  const names = result.changes.filter((change) => change.action === key);
                  return (
                    <li key={key}>
                      <details>
                        <summary className="cursor-pointer">
                          <span className="font-semibold">{result[total]}</span> {label}
                        </summary>
                        <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                          {names.map((change) => (
                            <li key={change.line}>
                              Ligne {change.line} · {change.name}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            {preview.issues.length > 0 && (
              <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2">
                <p className="flex items-center gap-1.5 font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {preview.issues.length} ligne{preview.issues.length > 1 ? 's' : ''} à corriger dans le fichier : rien ne sera
                  enregistré avant
                </p>
                <ul className="max-h-48 overflow-y-auto text-xs">
                  {preview.issues.map((issue, index) => (
                    <li key={`${issue.line}-${index}`}>
                      <span className="font-mono">Ligne {issue.line}</span> : {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!result && preview.issues.length === 0 && <p>Aucune poignée trouvée dans ce fichier.</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={confirm} disabled={!canImport || step !== 'idle'}>
                {step === 'saving' && <Loader2 className="animate-spin" />}
                {toSave > 0 ? `Importer (${toSave} modification${toSave > 1 ? 's' : ''})` : 'Rien à importer'}
              </Button>
              <Button variant="ghost" onClick={() => setPreview(null)} disabled={step === 'saving'}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
