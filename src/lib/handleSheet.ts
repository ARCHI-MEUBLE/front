// Fichier Excel des poignées : colonnes reconnues par leur titre (comme dans le fichier livré, « Poignées LMC »), lignes
// converties en modèles pour l'import de l'admin, et export des modèles enregistrés dans le même format.
import { HANDLE_SHAPES, HANDLE_SHAPE_LABELS, isHandleShape, type AdminHandleModel, type HandleShape } from '@/lib/configurator/handles';
import type { Cell } from '@/lib/xlsx/xlsx';

export type SheetField =
  | 'reference'
  | 'name'
  | 'shape'
  | 'finish_hex'
  | 'center_distance_mm'
  | 'length_mm'
  | 'width_mm'
  | 'projection_mm'
  | 'price_per_unit'
  | 'active'
  | 'position'
  | 'image_url'
  | 'supplier_url';

// Titres des colonnes importées, dans l'ordre du fichier livré. Les autres colonnes (Famille, Finition, Prix d'achat,
// Marge, Notes) sont pour l'admin et ne sont pas lues.
export const SHEET_COLUMNS: Array<{ field: SheetField; title: string }> = [
  { field: 'reference', title: 'Référence LMC' },
  { field: 'name', title: 'Nom affiché' },
  { field: 'shape', title: 'Forme' },
  { field: 'finish_hex', title: 'Couleur (#hex)' },
  { field: 'center_distance_mm', title: 'Entraxe (mm)' },
  { field: 'length_mm', title: 'Longueur (mm)' },
  { field: 'width_mm', title: 'Largeur (mm)' },
  { field: 'projection_mm', title: 'Saillie (mm)' },
  { field: 'price_per_unit', title: 'Prix de vente (€)' },
  { field: 'active', title: 'Actif' },
  { field: 'position', title: 'Ordre' },
  { field: 'image_url', title: 'Photo (URL)' },
  { field: 'supplier_url', title: 'Fiche produit (URL)' },
];

const REQUIRED: SheetField[] = ['name', 'shape', 'finish_hex'];

// Ligne envoyée à l'import du backend. Prix, actif et ordre absents d'une cellule vide : le modèle garde les siens.
export interface HandleImportRow {
  line: number;
  reference: string | null;
  name: string;
  shape: HandleShape;
  finish_hex: string;
  center_distance_mm: number | null;
  length_mm: number | null;
  width_mm: number | null;
  projection_mm: number | null;
  image_url: string | null;
  supplier_url: string | null;
  price_per_unit?: number;
  active?: boolean;
  position?: number;
}

export interface SheetIssue {
  line: number;
  message: string;
}

// Titre comparé sans accents, majuscules ni espaces en trop : « prix de vente (€) » = « Prix de vente (€) »
const normalize = (value: Cell) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const text = (value: Cell): string | null => {
  const result = value === null ? '' : String(value).trim();
  return result === '' ? null : result;
};

// « 24,5 », « 24.50 € », 24.5 → 24.5 ; null si vide ; NaN si illisible
function numberOf(value: Cell): number | null {
  if (typeof value === 'number') return value;
  const raw = text(value);
  if (raw === null) return null;
  const cleaned = raw.replace(/[\s  €]/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

const SHAPE_BY_LABEL = new Map<string, HandleShape>(
  HANDLE_SHAPES.flatMap((shape) => [
    [normalize(HANDLE_SHAPE_LABELS[shape]), shape],
    [normalize(shape), shape],
    // Libellé court (« Cuvette », « Encastrée ») comme dans l'admin
    [normalize(HANDLE_SHAPE_LABELS[shape].replace(/^Poignée /, '')), shape],
  ])
);

function activeOf(value: Cell): boolean | null | undefined {
  if (typeof value === 'boolean') return value;
  const raw = normalize(value);
  if (raw === '') return undefined;
  if (['oui', 'o', 'yes', 'vrai', 'true', '1', 'x'].includes(raw)) return true;
  if (['non', 'n', 'no', 'faux', 'false', '0'].includes(raw)) return false;
  return null;
}

// Lignes d'une feuille → modèles à importer, et problèmes repérés avant l'envoi (le serveur vérifie le reste)
export function parseHandleSheet(rows: Cell[][]): { rows: HandleImportRow[]; issues: SheetIssue[] } {
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalize(cell) === normalize('Nom affiché')));
  if (headerIndex < 0) {
    return { rows: [], issues: [{ line: 1, message: 'Colonne « Nom affiché » introuvable : ce n\'est pas le fichier des poignées.' }] };
  }
  const header = rows[headerIndex].map(normalize);
  const columns = new Map(SHEET_COLUMNS.map(({ field, title }) => [field, header.indexOf(normalize(title))]));
  const missing = SHEET_COLUMNS.filter(({ field }) => REQUIRED.includes(field) && columns.get(field)! < 0);
  if (missing.length > 0) {
    return { rows: [], issues: missing.map(({ title }) => ({ line: headerIndex + 1, message: `Colonne « ${title} » introuvable.` })) };
  }

  const result: HandleImportRow[] = [];
  const issues: SheetIssue[] = [];
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const line = headerIndex + offset + 2;
    const cell = (field: SheetField): Cell => {
      const index = columns.get(field) ?? -1;
      return index < 0 ? null : row[index] ?? null;
    };
    if (SHEET_COLUMNS.every(({ field }) => text(cell(field)) === null)) return;

    const problems: string[] = [];
    const name = text(cell('name'));
    if (!name) problems.push('nom manquant');
    const shapeRaw = text(cell('shape'));
    const shape = shapeRaw ? SHAPE_BY_LABEL.get(normalize(shapeRaw)) : undefined;
    if (!shape) problems.push(shapeRaw ? `forme inconnue « ${shapeRaw} » (${Object.values(HANDLE_SHAPE_LABELS).join(', ')})` : 'forme manquante');
    const hex = text(cell('finish_hex'))?.replace(/^#?/, '#').toUpperCase() ?? null;
    if (!hex || !/^#[0-9A-F]{6}$/.test(hex)) problems.push('couleur invalide (format #RRGGBB)');

    const mm = (field: SheetField, label: string): number | null => {
      const value = numberOf(cell(field));
      if (value !== null && !Number.isInteger(value)) problems.push(`${label} : nombre entier de mm attendu`);
      return value;
    };
    const dimensions = {
      center_distance_mm: mm('center_distance_mm', 'entraxe'),
      length_mm: mm('length_mm', 'longueur'),
      width_mm: mm('width_mm', 'largeur'),
      projection_mm: mm('projection_mm', 'saillie'),
    };
    const price = numberOf(cell('price_per_unit'));
    if (price !== null && Number.isNaN(price)) problems.push('prix illisible');
    const active = activeOf(cell('active'));
    if (active === null) problems.push('Actif : répondez oui ou non');
    const position = numberOf(cell('position'));
    if (position !== null && !Number.isInteger(position)) problems.push('ordre : nombre entier attendu');

    if (problems.length > 0 || !name || !shape || !hex) {
      issues.push({ line, message: problems.join(' ; ') });
      return;
    }
    const importRow: HandleImportRow = {
      line,
      reference: text(cell('reference')),
      name,
      shape: isHandleShape(shape) ? shape : 'bar',
      finish_hex: hex,
      ...dimensions,
      image_url: text(cell('image_url')),
      supplier_url: text(cell('supplier_url')),
    };
    if (price !== null) importRow.price_per_unit = price;
    if (typeof active === 'boolean') importRow.active = active;
    if (position !== null) importRow.position = position;
    result.push(importRow);
  });
  return { rows: result, issues };
}

// Modèles enregistrés → feuille « Poignées » au format du fichier d'import
export function handleSheetRows(models: AdminHandleModel[]): Cell[][] {
  const value = (model: AdminHandleModel, field: SheetField): Cell => {
    if (field === 'shape') return HANDLE_SHAPE_LABELS[model.shape] ?? model.shape;
    if (field === 'active') return model.active ? 'oui' : 'non';
    if (field === 'price_per_unit') return Number(model.price_per_unit);
    return (model[field as keyof AdminHandleModel] as Cell | undefined) ?? null;
  };
  return [SHEET_COLUMNS.map(({ title }) => title), ...models.map((model) => SHEET_COLUMNS.map(({ field }) => value(model, field)))];
}
