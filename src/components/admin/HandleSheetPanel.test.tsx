import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandleSheetPanel } from './HandleSheetPanel';
import { handleModelsApi, type HandleImportResult } from '@/lib/handleModelsApi';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const deliveredFile = () => {
  const bytes = readFileSync(resolve(process.cwd(), 'src/lib/xlsx/__fixtures__/poignees-lmc.xlsx'));
  return new File([bytes], 'poignees-lmc-archimeuble.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const preview = (saved: boolean): HandleImportResult => ({
  created: 19,
  updated: 3,
  unchanged: 7,
  saved,
  changes: [{ line: 2, name: 'Fil Ø10 aluminium anodisé, entraxe 96', action: 'create' }],
  errors: [],
});

afterEach(() => vi.restoreAllMocks());

function choose(file: File) {
  fireEvent.change(screen.getByLabelText('Fichier Excel des poignées'), { target: { files: [file] } });
}

describe('HandleSheetPanel', () => {
  it('previews the delivered file, then imports it once confirmed', async () => {
    const importRows = vi.spyOn(handleModelsApi, 'importRows').mockImplementation(async (_rows, dryRun) => preview(!dryRun));
    const onImported = vi.fn();
    render(<HandleSheetPanel models={[]} onImported={onImported} />);

    choose(deliveredFile());

    const confirm = await screen.findByRole('button', { name: 'Importer (22 modifications)' });
    expect(importRows).toHaveBeenCalledTimes(1);
    const [rows, dryRun] = importRows.mock.calls[0];
    expect(dryRun).toBe(true);
    expect(rows).toHaveLength(29);
    const summaries = Array.from(document.querySelectorAll('summary'), (summary) => summary.textContent);
    expect(summaries).toEqual(['19 à ajouter', '3 à modifier', '7 déjà à jour']);

    fireEvent.click(confirm);
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(importRows).toHaveBeenLastCalledWith(rows, false);
  });

  it('blocks the import and lists the lines to fix', async () => {
    vi.spyOn(handleModelsApi, 'importRows').mockResolvedValue({
      ...preview(false),
      errors: [{ line: 7, message: 'La longueur doit être comprise entre 20 et 1200 mm' }],
    });
    render(<HandleSheetPanel models={[]} onImported={vi.fn()} />);

    choose(deliveredFile());

    expect(await screen.findByText(/1 ligne à corriger dans le fichier/)).toBeInTheDocument();
    expect(screen.getByText('Ligne 7').parentElement?.textContent).toBe('Ligne 7 : La longueur doit être comprise entre 20 et 1200 mm');
    expect(screen.getByRole('button', { name: /Importer \(22/ })).toBeDisabled();
  });

  it('says so when the file is not a workbook', async () => {
    const toast = (await import('react-hot-toast')).default;
    const importRows = vi.spyOn(handleModelsApi, 'importRows');
    render(<HandleSheetPanel models={[]} onImported={vi.fn()} />);

    choose(new File(['nom;prix'], 'poignees.csv'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ce fichier n'est pas un classeur Excel (.xlsx)."));
    expect(importRows).not.toHaveBeenCalled();
  });
});
