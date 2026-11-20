// utils/spreadsheet.js
// Read CSV / Excel (.xlsx) files and write CSV / Excel files in the browser, with no extra library.
//   readSpreadsheet(file)            → { fields: [header...], rows: [{ header: value }], sheetName }
//   csvBlob(columns, rows)           → Blob (UTF-8 with BOM so Excel shows ₹ and Hindi text correctly)
//   xlsxBlob(columns, rows, sheet)   → Blob (.xlsx)
//   downloadBlob(blob, fileName)
// columns: [{ key, label }]; rows: [{ key: value }].
// .xlsx files are zip archives of XML; reading uses the browser's DecompressionStream (all current browsers).
import Papa from 'papaparse';

/* ───────────── zip (read) ───────────── */
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

const inflateRaw = async (data) => {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open Excel files. Please save the file as CSV and upload that.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

// { 'path/in/zip': Uint8Array }
const unzip = async (buf) => {
  const b = new Uint8Array(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i -= 1) {
    if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const out = {};
  const dec = new TextDecoder();
  for (let n = 0; n < count; n += 1) {
    if (u32(b, p) !== 0x02014b50) throw new Error('bad zip');
    const method = u16(b, p + 10);
    const csize = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const local = u32(b, p + 42);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = u16(b, local + 26);
    const lExtraLen = u16(b, local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const data = b.subarray(start, start + csize);
    out[name] = { method, data };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    async text(name) {
      const e = out[name];
      if (!e) return null;
      const raw = e.method === 0 ? e.data : e.method === 8 ? await inflateRaw(e.data) : null;
      if (!raw) throw new Error('unsupported compression');
      return dec.decode(raw);
    },
    has: (name) => !!out[name],
  };
};

/* ───────────── xlsx (read) ───────────── */
const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const byTag = (node, tag) => Array.from(node.getElementsByTagName(tag));
// "AB12" → column index 27 (0-based)
const colIndex = (ref) => {
  const letters = String(ref).match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const readXlsx = async (buf) => {
  const zip = await unzip(buf);
  const wb = parseXml(await zip.text('xl/workbook.xml'));
  const sheets = byTag(wb, 'sheet');
  if (!sheets.length) throw new Error('This Excel file has no sheets.');
  const first = sheets[0];
  const rid = first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let path = 'xl/worksheets/sheet1.xml';
  const relsText = await zip.text('xl/_rels/workbook.xml.rels');
  if (relsText && rid) {
    const rel = byTag(parseXml(relsText), 'Relationship').find((r) => r.getAttribute('Id') === rid);
    if (rel) {
      const target = rel.getAttribute('Target').replace(/^\//, '');
      path = target.startsWith('xl/') ? target : `xl/${target}`;
    }
  }
  const shared = [];
  const sst = await zip.text('xl/sharedStrings.xml');
  if (sst) byTag(parseXml(sst), 'si').forEach((si) => shared.push(byTag(si, 't').map((t) => t.textContent).join('')));

  const sheet = parseXml(await zip.text(path));
  const grid = [];
  byTag(sheet, 'row').forEach((row) => {
    const r = Number(row.getAttribute('r')) - 1;
    const cells = [];
    byTag(row, 'c').forEach((c, i) => {
      const ref = c.getAttribute('r');
      const ci = ref ? colIndex(ref) : i;
      const type = c.getAttribute('t');
      const v = byTag(c, 'v')[0]?.textContent;
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = byTag(c, 't').map((t) => t.textContent).join('');
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else value = v ?? '';
      cells[ci] = value;
    });
    grid[Number.isFinite(r) && r >= 0 ? r : grid.length] = cells;
  });
  return { rows: grid.filter(Boolean), sheetName: first.getAttribute('name') || 'Sheet1' };
};

// Grid (first row = headers) → { fields, rows } with unique, non-empty header names.
const fromGrid = (grid) => {
  const headerRow = grid[0] || [];
  const seen = {};
  const fields = [];
  for (let i = 0; i < headerRow.length; i += 1) {
    let h = String(headerRow[i] ?? '').trim();
    if (!h) h = `Column ${i + 1}`;
    if (seen[h]) h = `${h} (${(seen[h] += 1)})`;
    else seen[h] = 1;
    fields.push(h);
  }
  const rows = grid
    .slice(1)
    .map((r) => Object.fromEntries(fields.map((f, i) => [f, r?.[i] === undefined || r?.[i] === null ? '' : String(r[i]).trim()])))
    .filter((r) => Object.values(r).some((v) => v !== ''));
  return { fields, rows };
};

export const readSpreadsheet = async (file) => {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.xls') && !name.endsWith('.xlsx')) throw new Error('Old Excel files (.xls) are not supported. Please save it as .xlsx or CSV and upload again.');
  if (name.endsWith('.xlsx')) {
    let parsed;
    try {
      parsed = await readXlsx(await file.arrayBuffer());
    } catch (err) {
      throw new Error(err?.message && /browser|sheets/.test(err.message) ? err.message : 'This Excel file could not be read. Please check it, or save it as CSV and upload that.');
    }
    return { ...fromGrid(parsed.rows), sheetName: parsed.sheetName, text: null };
  }
  const text = await file.text();
  const res = Papa.parse(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' });
  if (!res.data.length) throw new Error('The file is empty.');
  return { ...fromGrid(res.data), sheetName: null, text };
};

// Excel stores dates as days since 1899-12-30. "45000" → "2023-03-15". Returns null if it isn't one.
export const excelSerialToDate = (v) => {
  const n = Number(String(v).trim());
  if (!/^\d+(\.\d+)?$/.test(String(v).trim()) || n < 1 || n > 80000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
  return d.toISOString().slice(0, 10);
};

/* ───────────── write ───────────── */
const cellText = (v) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v));

export const csvBlob = (columns, rows) => {
  const esc = (v) => {
    let t = cellText(v);
    // Stop spreadsheet apps from running a cell as a formula (=, +, -, @ at the start).
    if (/^[=+\-@]/.test(t) && !/^[+-]?\d/.test(t)) t = `'${t}`;
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(r[c.key])).join(',')));
  return new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
};

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Minimal zip writer (no compression; Excel opens it fine).
const zipStore = (files) => {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const le = (n, size) => {
    const a = new Uint8Array(size);
    for (let i = 0; i < size; i += 1) a[i] = (n >>> (8 * i)) & 0xff;
    return a;
  };
  files.forEach(({ name, text }) => {
    const nameBytes = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);
    const local = [le(0x04034b50, 4), le(20, 2), le(0x0800, 2), le(0, 2), le(0, 2), le(0x21, 2), le(crc, 4), le(data.length, 4), le(data.length, 4), le(nameBytes.length, 2), le(0, 2), nameBytes, data];
    const localLen = local.reduce((s, a) => s + a.length, 0);
    central.push([le(0x02014b50, 4), le(20, 2), le(20, 2), le(0x0800, 2), le(0, 2), le(0, 2), le(0x21, 2), le(crc, 4), le(data.length, 4), le(data.length, 4), le(nameBytes.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(offset, 4), nameBytes]);
    parts.push(...local);
    offset += localLen;
  });
  const centralFlat = central.flat();
  const centralLen = centralFlat.reduce((s, a) => s + a.length, 0);
  const end = [le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2), le(centralLen, 4), le(offset, 4), le(0, 2)];
  return new Blob([...parts, ...centralFlat, ...end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const xmlEsc = (t) => String(t)
  // Characters XML 1.0 does not allow (control characters) are dropped.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const isNumberCell = (v) => typeof v === 'number' && Number.isFinite(v);

export const xlsxBlob = (columns, rows, sheetName = 'Customers') => {
  const cell = (v, r, c, style = 0) => {
    const ref = `${colName(c)}${r}`;
    if (isNumberCell(v)) return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${v}</v></c>`;
    const t = cellText(v);
    if (t === '') return '';
    return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xmlEsc(t.slice(0, 32767))}</t></is></c>`;
  };
  const sheetRows = [`<row r="1">${columns.map((col, c) => cell(col.label, 1, c, 1)).join('')}</row>`];
  rows.forEach((row, i) => sheetRows.push(`<row r="${i + 2}">${columns.map((col, c) => cell(row[col.key], i + 2, c)).join('')}</row>`));
  const widths = columns.map((col, c) => {
    const longest = Math.max(String(col.label).length, ...rows.slice(0, 200).map((r) => cellText(r[col.key]).split('\n')[0].length));
    return `<col min="${c + 1}" max="${c + 1}" width="${Math.min(60, Math.max(8, longest + 2))}" customWidth="1"/>`;
  });
  const safeSheet = xmlEsc(String(sheetName).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1');
  return zipStore([
    { name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.join('')}</cols><sheetData>${sheetRows.join('')}</sheetData></worksheet>` },
  ]);
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// For tests and the import screen.
export const _internal = { readXlsx, unzip, crc32, fromGrid };
