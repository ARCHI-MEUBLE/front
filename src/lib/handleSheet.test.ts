import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readXlsx, writeXlsx, type Cell } from './xlsx/xlsx';
import { handleSheetRows, parseHandleSheet } from './handleSheet';
import type { AdminHandleModel } from './configurator/handles';

// Le fichier livré à l'admin (créé avec openpyxl : chaînes partagées, formules, listes déroulantes, deux feuilles)
const delivered = () => {
  const bytes = readFileSync(resolve(process.cwd(), 'src/lib/xlsx/__fixtures__/poignees-lmc.xlsx'));
  return readXlsx(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
};

describe('readXlsx', () => {
  it('reads both sheets of the delivered file', async () => {
    const sheets = await delivered();
    expect(sheets.map((sheet) => sheet.name)).toEqual(['Poignées', "Mode d'emploi"]);
    const [header, first] = sheets[0].rows;
    expect(header.slice(0, 4)).toEqual(['Référence LMC', 'Famille', 'Nom affiché', 'Forme']);
    expect(first.slice(0, 11)).toEqual([
      'POI9409106AL', 'Fil Ø10', 'Fil Ø10 aluminium anodisé, entraxe 96', 'Barre ronde', 'aluminium anodisé', '#B8BBBE', 96, 106, 10, 30, 22,
    ]);
  });

  it('reads back what it writes, empty cells and accents included', async () => {
    const rows: Cell[][] = [['Nom', 'Prix', 'Actif'], ['Cuvette « LIVING » & co', 28.5, true], [null, 3, false]];
    const data = writeXlsx([{ name: 'Poignées', rows }]);
    const [sheet] = await readXlsx(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    expect(sheet).toEqual({ name: 'Poignées', rows: [['Nom', 'Prix', 'Actif'], ['Cuvette « LIVING » & co', 28.5, true], [null, 3, false]] });
  });

  it('refuses a file that is not a workbook', async () => {
    await expect(readXlsx(new TextEncoder().encode('nom;prix').buffer as ArrayBuffer)).rejects.toThrow("n'est pas un classeur Excel");
  });
});

describe('parseHandleSheet', () => {
  it('turns the 29 LMC rows of the delivered file into models, without any problem', async () => {
    const { rows, issues } = parseHandleSheet((await delivered())[0].rows);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(29);
    expect(rows.find((row) => row.reference === 'POI518448NM')).toEqual({
      line: 14,
      reference: 'POI518448NM',
      name: 'FLAT nickelé mat, entraxe 448',
      shape: 'flat_bar',
      finish_hex: '#B5B7B9',
      center_distance_mm: 448,
      length_mm: 463,
      width_mm: 8,
      projection_mm: 34,
      price_per_unit: 42,
      active: true,
      position: 13,
      image_url: '/images/handles/lmc/flat-nickel-mat.webp',
      supplier_url: 'https://www.lmcstore.com/fr/poignee-flat.html',
    });
    // HEXXA : profilé sans entraxe ; cuvette : plaque de 120 x 40
    expect(rows.find((row) => row.reference === 'POI4491100BR')).toMatchObject({ shape: 'profile', length_mm: 1100, center_distance_mm: null });
    expect(rows.find((row) => row.reference === 'POI447NO')).toMatchObject({ shape: 'cup', length_mm: 120, width_mm: 40 });
  });

  it('accepts what people type in Excel: other shape labels, commas, « non », a colour without #', () => {
    const { rows, issues } = parseHandleSheet([
      ['Nom affiché', 'Forme', 'couleur (#HEX)', 'Longueur (mm)', 'Prix de vente (€)', 'Actif'],
      ['Cuvette test', 'Cuvette', 'c9cccf', '120', '28,50 €', 'non'],
      ['Bouton test', 'knob', '#d8dadc', null, null, null],
    ]);
    expect(issues).toEqual([]);
    expect(rows[0]).toMatchObject({ line: 2, shape: 'cup', finish_hex: '#C9CCCF', length_mm: 120, price_per_unit: 28.5, active: false });
    // Cellules vides : le prix et l'état du modèle existant sont gardés
    expect(rows[1]).not.toHaveProperty('price_per_unit');
    expect(rows[1]).not.toHaveProperty('active');
  });

  it('says what to fix on which line, and skips empty lines', () => {
    const { rows, issues } = parseHandleSheet([
      ['Nom affiché', 'Forme', 'Couleur (#hex)', 'Longueur (mm)', 'Actif'],
      ['Crochet', 'Crochet', '#000000', 100, 'oui'],
      [null, null, null, null, null],
      ['Barre', 'Barre ronde', 'rouge', 12.5, 'peut-être'],
    ]);
    expect(rows).toEqual([]);
    expect(issues).toEqual([
      { line: 2, message: expect.stringMatching(/^forme inconnue « Crochet »/) },
      { line: 4, message: 'couleur invalide (format #RRGGBB) ; longueur : nombre entier de mm attendu ; Actif : répondez oui ou non' },
    ]);
  });

  it('refuses a sheet that is not the handle file', () => {
    expect(parseHandleSheet([['Nom', 'Prix']]).issues[0].message).toMatch(/Colonne « Nom affiché » introuvable/);
    expect(parseHandleSheet([['Nom affiché', 'Prix']]).issues.map((issue) => issue.message)).toEqual([
      'Colonne « Forme » introuvable.',
      'Colonne « Couleur (#hex) » introuvable.',
    ]);
  });

  it('exports the saved models in the same format, so the file can go back and forth', () => {
    const model: AdminHandleModel = {
      id: 3, name: 'COMPACT noir, entraxe 320', shape: 'flat_bar', finish_hex: '#1A1A1A', length_mm: 332, center_distance_mm: 320,
      width_mm: 8, projection_mm: 36, image_url: '/images/handles/lmc/compact-noir-320.webp', position: 21, price_per_unit: '34.00',
      active: false, reference: 'POI286320NO', supplier_url: 'https://www.lmcstore.com/fr/poignee-compact.html',
    };
    const { rows } = parseHandleSheet(handleSheetRows([model]));
    expect(rows).toEqual([
      {
        line: 2, reference: 'POI286320NO', name: model.name, shape: 'flat_bar', finish_hex: '#1A1A1A', center_distance_mm: 320,
        length_mm: 332, width_mm: 8, projection_mm: 36, price_per_unit: 34, active: false, position: 21,
        image_url: model.image_url, supplier_url: model.supplier_url,
      },
    ]);
  });
});
