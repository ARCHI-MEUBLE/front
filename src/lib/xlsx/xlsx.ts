// Lecture et écriture minimales de fichiers Excel (.xlsx), sans dépendance : un .xlsx est une archive zip de fichiers
// XML. La lecture décompresse avec DecompressionStream (navigateurs récents et Node 20+) ; l'écriture range les fichiers
// sans compression, ce que lisent Excel, LibreOffice et Numbers. Seules les valeurs comptent : pas de styles relus.

export type Cell = string | number | boolean | null;

export interface Sheet {
  name: string;
  rows: Cell[][];
}

export class XlsxError extends Error {}

// ── Zip ─────────────────────────────────────────────────────────────────────

const decoder = new TextDecoder();
const encoder = new TextEncoder();

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const stream = source.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new XlsxError("Ce fichier n'est pas un classeur Excel (.xlsx).");

  const files = new Map<string, Uint8Array>();
  let offset = view.getUint32(end + 16, true);
  for (let n = view.getUint16(end + 10, true); n > 0; n -= 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new XlsxError('Classeur Excel abîmé.');
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, await inflate(data));
    else throw new XlsxError('Compression du classeur non prise en charge.');
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files: Array<[string, string]>): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

// ── Lecture ─────────────────────────────────────────────────────────────────

const xml = (files: Map<string, Uint8Array>, path: string): Document | null => {
  const data = files.get(path);
  return data ? new DOMParser().parseFromString(decoder.decode(data), 'application/xml') : null;
};

// Texte d'une chaîne partagée ou en ligne, mise en forme partielle comprise (plusieurs <t>)
const textOf = (node: Element): string => Array.from(node.getElementsByTagName('t'), (t) => t.textContent ?? '').join('');

// « AB12 » → colonne 27 (base 0)
function columnIndex(ref: string): number {
  let index = 0;
  for (const char of ref.replace(/\d+$/, '')) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function cellValue(cell: Element, shared: string[]): Cell {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') return textOf(cell);
  const raw = cell.getElementsByTagName('v')[0]?.textContent ?? null;
  if (raw === null) return null;
  if (type === 's') return shared[Number(raw)] ?? null;
  if (type === 'b') return raw === '1';
  if (type === 'str') return raw;
  if (type === 'e') return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : raw;
}

export async function readXlsx(buffer: ArrayBuffer): Promise<Sheet[]> {
  const files = await unzip(buffer);
  const workbook = xml(files, 'xl/workbook.xml');
  if (!workbook) throw new XlsxError("Ce fichier n'est pas un classeur Excel (.xlsx).");
  const rels = xml(files, 'xl/_rels/workbook.xml.rels');
  const targets = new Map(
    Array.from(rels?.getElementsByTagName('Relationship') ?? [], (rel) => [rel.getAttribute('Id'), rel.getAttribute('Target') ?? ''])
  );
  const shared = Array.from(xml(files, 'xl/sharedStrings.xml')?.getElementsByTagName('si') ?? [], textOf);

  return Array.from(workbook.getElementsByTagName('sheet'), (sheet) => {
    const target = targets.get(sheet.getAttribute('r:id')) ?? '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const rows: Cell[][] = [];
    for (const row of Array.from(xml(files, path)?.getElementsByTagName('row') ?? [])) {
      const index = Number(row.getAttribute('r') ?? rows.length + 1) - 1;
      const cells: Cell[] = [];
      for (const cell of Array.from(row.getElementsByTagName('c'))) {
        const ref = cell.getAttribute('r');
        cells[ref ? columnIndex(ref) : cells.length] = cellValue(cell, shared);
      }
      rows[index] = Array.from(cells, (value) => value ?? null);
    }
    return { name: sheet.getAttribute('name') ?? '', rows: Array.from(rows, (row) => row ?? []) };
  });
}

// ── Écriture ────────────────────────────────────────────────────────────────

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function sheetXml(rows: Cell[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((value, c) => {
          const ref = `${columnName(c)}${r + 1}`;
          // Première ligne : en-têtes en gras (style 1)
          const style = r === 0 ? ' s="1"' : '';
          if (value === null || value === '') return '';
          if (typeof value === 'number') return `<c r="${ref}"${style}><v>${value}</v></c>`;
          if (typeof value === 'boolean') return `<c r="${ref}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}

export function writeXlsx(sheets: Sheet[]): Uint8Array {
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip([
    [
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${main}" xmlns:r="${rel}"><sheets>${sheets
        .map((sheet, i) => `<sheet name="${escape(sheet.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      'xl/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${main}"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`,
    ],
    ...sheets.map((sheet, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet.rows)]),
  ]);
}
