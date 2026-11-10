// Download a table as CSV or as a real Excel .xlsx (built with JSZip; no extra library).
// rows: array of plain objects; columns: [{ key, label }]. Works on web and in the mobile app (Capacitor).
import JSZip from 'jszip';
import Papa from 'papaparse';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(blob);
    });

export const saveBlob = async (blob, fileName) => {
    if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Documents });
        return 'documents';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
};

const esc = (v) =>
    String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // characters Excel's XML refuses
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const colName = (i) => {
    let n = i + 1;
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};

const cellXml = (value, ref, styleId) => {
    if (value === null || value === undefined || value === '') return `<c r="${ref}"${styleId ? ` s="${styleId}"` : ''}/>`;
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${styleId ? ` s="${styleId}"` : ''}><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${styleId ? ` s="${styleId}"` : ''}><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
};

export const buildXlsx = async (rows, columns, sheetName = 'Sheet1') => {
    const header = `<row r="1">${columns.map((c, i) => cellXml(c.label, `${colName(i)}1`, 1)).join('')}</row>`;
    const body = rows
        .map((r, ri) => `<row r="${ri + 2}">${columns.map((c, ci) => cellXml(r[c.key], `${colName(ci)}${ri + 2}`, 0)).join('')}</row>`)
        .join('');
    const widths = columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(10, String(c.label).length + 4, ...rows.slice(0, 200).map((r) => String(r[c.key] ?? '').length + 2)))}" customWidth="1"/>`).join('');

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${header}${body}</sheetData></worksheet>`);
    return zip.generateAsync({ type: 'blob', mimeType: XLSX_MIME });
};

// format: 'csv' | 'xlsx'
export const exportTable = async ({ rows, columns, fileBase, format = 'csv', sheetName }) => {
    if (format === 'xlsx') {
        const blob = await buildXlsx(rows, columns, sheetName);
        return saveBlob(blob, `${fileBase}.xlsx`);
    }
    const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ''])));
    const csv = Papa.unparse(data, { columns: columns.map((c) => c.label) });
    return saveBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `${fileBase}.csv`);
};
