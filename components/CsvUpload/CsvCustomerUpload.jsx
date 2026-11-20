'use client';
// Bulk customer import (#24, option C): file (CSV / Excel) → map columns → preview & check → import.
// Nothing is saved before the last step; the server checks everything again and saves it all in one go
// (or nothing). Every import is kept in the import history with who did it and when.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Badge, Button, FileInput, Loader, Modal, Select, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconAlertTriangle, IconDownload, IconFileSpreadsheet, IconHistory } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { readSpreadsheet, csvBlob, downloadBlob } from '@/utils/spreadsheet';
import ProductLineSelect from '@/components/customers/ProductLineSelect';
import { errorMessage } from '@/components/customers/useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Same list as the server (models/customerImportModel.js); the server's copy is used when it loads.
const FALLBACK_FIELDS = [
  { key: 'full_name', label: 'Full Name', required: true, aliases: ['name', 'full name', 'customer name', 'client name', 'customer', 'client'] },
  { key: 'phone_number', label: 'Phone Number', required: true, aliases: ['phone', 'mobile', 'mobile number', 'mobile no', 'phone no', 'contact', 'contact number', 'whatsapp', 'whatsapp number', 'cell'] },
  { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'email id', 'email address', 'mail'] },
  { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { key: 'date_of_birth', label: 'Date of Birth', aliases: ['dob', 'date of birth', 'birth date', 'birthday'] },
  { key: 'anniversary', label: 'Anniversary', aliases: ['anniversary'] },
  { key: 'address', label: 'Address', aliases: ['address', 'city', 'location'] },
  { key: 'company_name', label: 'Company Name', aliases: ['company', 'company name', 'insurer'] },
  { key: 'product_name', label: 'Product Name', aliases: ['product', 'product name', 'plan', 'plan name', 'policy name'] },
  { key: 'policy_number', label: 'Policy Number', aliases: ['policy number', 'policy no', 'policy'] },
  { key: 'premium', label: 'Premium', aliases: ['premium', 'premium amount', 'amount'] },
  { key: 'coverage_amount', label: 'Coverage Amount', aliases: ['coverage', 'coverage amount', 'sum assured', 'sum insured'] },
  { key: 'renewal_date', label: 'Renewal Date', aliases: ['renewal', 'renewal date', 'due date', 'expiry date'] },
  { key: 'status', label: 'Status', aliases: ['status'] },
  { key: 'source', label: 'Source', aliases: ['source', 'lead source'] },
  { key: 'referrer', label: 'Referrer', aliases: ['referrer', 'referred by'] },
  { key: 'notes', label: 'Remarks', aliases: ['notes', 'remarks', 'remark', 'comments'] },
];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SKIP = '__skip__';

// Guess which file column goes to which field: exact field key / label / alias.
const guessMapping = (fields, headers) => {
  const used = new Set();
  const out = {};
  fields.forEach((f) => {
    const names = [f.key, f.label, ...(f.aliases || [])].map(norm);
    const h = headers.find((x) => !used.has(x) && names.includes(norm(x)));
    if (h) {
      out[f.key] = h;
      used.add(h);
    }
  });
  return out;
};

const STEP_TITLES = { file: 'Choose file', map: 'Match columns', review: 'Check & import', done: 'Done' };
const STATUS_BADGE = { new: ['Ready', 'green'], duplicate: ['Duplicate', 'orange'], invalid: ['Error', 'red'] };

const CsvCustomersUpload = ({ opened, onClose, onSuccess, defaultFolderIds = [] }) => {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [step, setStep] = useState('file');
  const [fields, setFields] = useState(FALLBACK_FIELDS);
  const [maxRows, setMaxRows] = useState(5000);
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null); // { fields, rows }
  const [folderIds, setFolderIds] = useState(defaultFolderIds);
  const [mapping, setMapping] = useState({});
  const [check, setCheck] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setStep('file');
    setFile(null);
    setSheet(null);
    setFolderIds(defaultFolderIds);
    setMapping({});
    setCheck(null);
    setDecisions({});
    setResult(null);
    setError('');
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customer-data/import/fields`, { headers: await authHeaders() });
        if (res.data?.fields?.length) setFields(res.data.fields);
        if (res.data?.max_rows) setMaxRows(res.data.max_rows);
      } catch (_) {
        /* the built-in list is used */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const mappedRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((r) => Object.fromEntries(fields.filter((f) => mapping[f.key] && mapping[f.key] !== SKIP).map((f) => [f.key, r[mapping[f.key]] ?? ''])));
  }, [sheet, mapping, fields]);

  /* step 1 */
  const pickFile = async (f) => {
    setFile(f);
    setSheet(null);
    setError('');
    if (!f) return;
    setBusy(true);
    try {
      const parsed = await readSpreadsheet(f);
      if (!parsed.rows.length) throw new Error('The file has no customer rows under the header row.');
      if (parsed.rows.length > maxRows) throw new Error(`This file has ${parsed.rows.length} rows. Please import at most ${maxRows} at a time.`);
      setSheet(parsed);
      setMapping(guessMapping(fields, parsed.fields));
    } catch (err) {
      setError(err.message || 'This file could not be read.');
    } finally {
      setBusy(false);
    }
  };
  const toMap = () => {
    if (!sheet) return setError('Please choose a CSV or Excel file.');
    if (!folderIds.length) return setError('Please choose at least one product line for these customers.');
    setError('');
    setStep('map');
  };

  /* step 2 */
  const missingRequired = fields.filter((f) => f.required && (!mapping[f.key] || mapping[f.key] === SKIP));
  const toReview = async () => {
    if (missingRequired.length) return setError(`Please choose the column for: ${missingRequired.map((f) => f.label).join(', ')}.`);
    setError('');
    setBusy(true);
    try {
      const res = await axios.post(`${API_URL}/api/customer-data/import/check`, { rows: mappedRows }, { headers: await authHeaders() });
      setCheck(res.data);
      // Default for duplicates: skip (nothing changes on the saved customer).
      setDecisions(Object.fromEntries(res.data.duplicates.map((d) => [d.row, { action: 'skip', target_id: d.matches.length === 1 ? d.matches[0].id : null }])));
      setStep('review');
    } catch (err) {
      setError(errorMessage(err, 'Could not check the file. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  /* step 3 */
  const setAllDuplicates = (action) => setDecisions((prev) => Object.fromEntries(Object.entries(prev).map(([row, d]) => [row, { ...d, action }])));
  const downloadErrors = () => {
    const byRow = Object.fromEntries((check?.invalid || []).map((e) => [e.row, e.errors.join('; ')]));
    const cols = [{ key: '_row', label: 'Row' }, ...sheet.fields.map((h) => ({ key: h, label: h })), { key: '_reason', label: 'Error Reason' }];
    const rows = (check?.invalid || []).map((e) => ({ ...sheet.rows[e.row - 1], _row: e.row + 1, _reason: byRow[e.row] }));
    downloadBlob(csvBlob(cols, rows), `${(file?.name || 'customers').replace(/\.(csv|xlsx)$/i, '')}_errors.csv`);
  };
  const doImport = async () => {
    const needTarget = check.duplicates.find((d) => decisions[d.row]?.action === 'add' && !decisions[d.row]?.target_id);
    if (needTarget) return setError(`Row ${needTarget.row + 1}: choose which saved customer to add it to.`);
    setError('');
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/customer-data/import/commit`,
        {
          rows: mappedRows,
          folder_ids: folderIds,
          file_name: file?.name || 'customers.csv',
          mapping: Object.fromEntries(Object.entries(mapping).filter(([, v]) => v && v !== SKIP).map(([k, v]) => [v, k])),
          decisions: Object.entries(decisions).map(([row, d]) => ({ row: Number(row), action: d.action, target_id: d.target_id })),
        },
        { headers: await authHeaders() },
      );
      setResult(res.data);
      setStep('done');
      showNotification({ title: 'Import finished', message: `${res.data.imported} new customer(s) added.`, color: 'green' });
      onSuccess?.();
    } catch (err) {
      setError(errorMessage(err, 'Could not import the customers. Nothing was saved. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const downloadReport = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/customer-data/imports/${result.import_id}/report`, { headers: await authHeaders(), responseType: 'text' });
      downloadBlob(new Blob([res.data], { type: 'text/csv;charset=utf-8' }), `${(file?.name || 'customers').replace(/\.(csv|xlsx)$/i, '')}_not_imported.csv`);
    } catch (err) {
      showNotification({ title: 'Could not download', message: errorMessage(err, 'Could not download the report. Please try again.'), color: 'red' });
    }
  };
  const sample = () => downloadBlob(csvBlob(fields.map((f) => ({ key: f.key, label: f.label })), [{ full_name: 'Amit Shah', phone_number: '9876543210', email: 'amit@example.com', gender: 'Male', date_of_birth: '15-08-1990', product_name: 'Term Plan', policy_number: 'P12345', premium: '12000', renewal_date: '01-04-2027', status: 'Active' }]), 'customers_sample.csv');

  const counts = check?.summary;
  const willImport = counts ? counts.new + Object.values(decisions).filter((d) => d.action !== 'skip').length : 0;
  const steps = ['file', 'map', 'review', 'done'];

  return (
    <Modal opened={opened} onClose={() => !busy && onClose()} title="Import customers" size="xl" centered fullScreen={isPhone}>
      {/* steps */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {steps.map((s, i) => (
          <span key={s} className={`flex items-center gap-1 ${s === step ? 'font-semibold text-blue-600' : steps.indexOf(step) > i ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${s === step ? 'border-blue-600' : 'border-current'}`}>{i + 1}</span>
            {STEP_TITLES[s]}
            {i < steps.length - 1 && <span className="mx-1 text-gray-300">›</span>}
          </span>
        ))}
      </div>

      {step === 'file' && (
        <div className="space-y-4">
          <FileInput label="CSV or Excel file" placeholder="Choose .csv or .xlsx" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" icon={<IconFileSpreadsheet size={16} />} value={file} onChange={pickFile} disabled={busy} clearable />
          {busy && <Loader size="sm" />}
          {sheet && <Text size="sm">Found <b>{sheet.rows.length}</b> row(s) and {sheet.fields.length} column(s){sheet.sheetName ? ` in sheet "${sheet.sheetName}"` : ''}.</Text>}
          <ProductLineSelect label="Product line for these customers" required value={folderIds} onChange={(ids) => { setFolderIds(ids); setError(''); }} />
          <Text size="xs" color="dimmed">
            Full name and phone number are needed for every customer. Up to {maxRows} rows per file. Dates like 15-08-1990 or 1990-08-15 work.
          </Text>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Button variant="subtle" size="xs" compact leftIcon={<IconDownload size={14} />} onClick={sample}>Download sample file</Button>
            <Link href="/customer-data-history" className="inline-flex items-center gap-1 text-xs text-blue-600"><IconHistory size={14} /> Import history</Link>
          </div>
        </div>
      )}

      {step === 'map' && sheet && (
        <div className="space-y-3">
          <Text size="sm">Choose which column of your file goes into each customer field. Fields we recognised are already filled in.</Text>
          <div className="max-h-[55vh] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            {fields.map((f) => {
              const col = mapping[f.key] && mapping[f.key] !== SKIP ? mapping[f.key] : null;
              const sampleValue = col ? sheet.rows.find((r) => r[col])?.[col] : '';
              return (
                <div key={f.key} className="grid grid-cols-1 items-center gap-1 border-b border-gray-100 px-3 py-2 last:border-b-0 dark:border-gray-800 sm:grid-cols-[180px_1fr_1fr] sm:gap-3">
                  <Text size="sm" weight={500}>{f.label}{f.required && <span className="text-red-500"> *</span>}</Text>
                  <Select
                    aria-label={`Column for ${f.label}`}
                    data={[{ value: SKIP, label: "— Don't import —" }, ...sheet.fields.map((h) => ({ value: h, label: h }))]}
                    value={mapping[f.key] || SKIP}
                    onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                    size="xs"
                    withinPortal
                    error={f.required && !col}
                  />
                  <Text size="xs" color="dimmed" className="truncate" title={sampleValue || ''}>{col ? `e.g. ${sampleValue || '(empty)'}` : ''}</Text>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 'review' && check && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['Rows in file', counts.total, 'text-gray-700 dark:text-gray-200'], ['Ready to add', counts.new, 'text-green-600'], ['Already customers', counts.duplicates, 'text-orange-600'], ['With errors', counts.invalid, 'text-red-600']].map(([label, n, tone]) => (
              <div key={label} className="rounded-lg border border-gray-200 p-2 text-center dark:border-gray-700">
                <div className={`text-xl font-semibold ${tone}`}>{n}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          <div>
            <Text size="sm" weight={600} mb={4}>Preview</Text>
            <div className="max-h-56 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr><th className="px-2 py-1 text-left">Row</th><th className="px-2 py-1 text-left">Name</th><th className="px-2 py-1 text-left">Phone</th><th className="px-2 py-1 text-left">Product</th><th className="px-2 py-1 text-left">Result</th></tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 50).map((r, i) => {
                    const st = check.statuses[i];
                    const [label, color] = STATUS_BADGE[st];
                    return (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-2 py-1 text-gray-500">{i + 2}</td>
                        <td className="max-w-[160px] truncate px-2 py-1">{r.full_name}</td>
                        <td className="whitespace-nowrap px-2 py-1">{r.phone_number}</td>
                        <td className="max-w-[140px] truncate px-2 py-1">{r.product_name}</td>
                        <td className="px-2 py-1"><Badge size="xs" color={color} variant="light">{label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {mappedRows.length > 50 && <Text size="xs" color="dimmed">Showing the first 50 of {mappedRows.length} rows.</Text>}
          </div>

          {check.duplicates.length > 0 && (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <Text size="sm" weight={600}>Already customers ({check.duplicates.length})</Text>
                <div className="flex gap-1">
                  <Button size="xs" compact variant="light" onClick={() => setAllDuplicates('skip')}>Skip all</Button>
                  <Button size="xs" compact variant="light" onClick={() => setAllDuplicates('add')}>Add all to saved customer</Button>
                </div>
              </div>
              <Text size="xs" color="dimmed" mb={6}>Skip leaves the saved customer as it is. &quot;Add to saved customer&quot; keeps their details and adds this row&apos;s product as a separate policy.</Text>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {check.duplicates.map((d) => {
                  const dec = decisions[d.row] || { action: 'skip' };
                  return (
                    <div key={d.row} className="rounded-md border border-orange-200 p-2 text-xs dark:border-orange-900">
                      <div className="mb-1"><b>Row {d.row + 1}:</b> {d.full_name} · {d.phone_number}{d.email ? ` · ${d.email}` : ''}</div>
                      <div className="mb-1 text-gray-500">Saved: {d.matches.map((m) => `${m.full_name || 'No name'} (${m.matched_on.join(' + ')}${m.assigned_to_name ? `, ${m.assigned_to_name}` : ''})`).join('; ')}</div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Select
                          aria-label={`What to do with row ${d.row + 1}`}
                          size="xs"
                          withinPortal
                          value={dec.action}
                          onChange={(v) => setDecisions((p) => ({ ...p, [d.row]: { ...p[d.row], action: v } }))}
                          data={[{ value: 'skip', label: 'Skip this row' }, { value: 'add', label: 'Add to saved customer' }, { value: 'create', label: 'Save as a new customer' }]}
                        />
                        {dec.action === 'add' && d.matches.length > 1 && (
                          <Select
                            aria-label={`Saved customer for row ${d.row + 1}`}
                            size="xs"
                            withinPortal
                            placeholder="Choose the saved customer"
                            value={dec.target_id ? String(dec.target_id) : null}
                            onChange={(v) => setDecisions((p) => ({ ...p, [d.row]: { ...p[d.row], target_id: Number(v) } }))}
                            data={d.matches.map((m) => ({ value: String(m.id), label: `${m.full_name || 'No name'} · ${m.phone_number || m.email || ''}` }))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {check.invalid.length > 0 && (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <Text size="sm" weight={600} color="red">Rows with errors ({check.invalid.length}) — these will not be imported</Text>
                <Button size="xs" compact variant="light" color="red" leftIcon={<IconDownload size={12} />} onClick={downloadErrors}>Download with reasons</Button>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {check.invalid.slice(0, 100).map((e) => (
                  <div key={e.row} className="break-words"><b>Row {e.row + 1}:</b> {e.errors.join('; ')}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-3">
          <Text weight={600}>{result.status === 'Completed' ? 'All rows were imported.' : 'Import finished. Some rows were not imported.'}</Text>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            <li>{result.imported} new customer(s) added</li>
            {result.added_to_existing > 0 && <li>{result.added_to_existing} added to saved customers (as separate products)</li>}
            {result.created_duplicates > 0 && <li>{result.created_duplicates} saved as new even though the phone / email matched</li>}
            {result.skipped_duplicates > 0 && <li>{result.skipped_duplicates} skipped because they are already customers</li>}
            {result.invalid > 0 && <li>{result.invalid} not imported because of errors</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            {result.has_report && <Button size="xs" variant="light" leftIcon={<IconDownload size={14} />} onClick={downloadReport}>Download rows not imported</Button>}
            <Button size="xs" variant="subtle" component={Link} href="/customer-data-history" leftIcon={<IconHistory size={14} />}>Import history</Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex gap-2 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="default"
          onClick={() => (step === 'map' ? setStep('file') : step === 'review' ? setStep('map') : onClose())}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {step === 'file' || step === 'done' ? 'Close' : 'Back'}
        </Button>
        {step === 'file' && <Button onClick={toMap} disabled={!sheet || busy} className="w-full sm:w-auto">Next: match columns</Button>}
        {step === 'map' && <Button onClick={toReview} loading={busy} className="w-full sm:w-auto">Next: check rows</Button>}
        {step === 'review' && <Button color="green" onClick={doImport} loading={busy} disabled={!willImport} className="w-full sm:w-auto">Import {willImport} customer(s)</Button>}
      </div>
    </Modal>
  );
};

export default CsvCustomersUpload;
