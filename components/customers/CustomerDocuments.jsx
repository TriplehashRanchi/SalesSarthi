'use client';
// Customer documents (#27, option C): Policy / KYC / Other, upload many at once, view, download, replace with a
// new version (old ones kept), edit details, history, delete — each allowed only as the permissions say.
// Files are private: they are fetched with the signed-in person's token, never through a public link.
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ActionIcon, Autocomplete, Badge, Button, Loader, Menu, Modal, Progress, Select, Switch, Text, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconDotsVertical, IconDownload, IconEye, IconFile, IconFileSpreadsheet, IconFileText, IconHistory, IconPencil, IconPhoto, IconRefresh,
  IconSettings, IconTrash, IconUpload, IconX,
} from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { downloadBlob } from '@/utils/spreadsheet';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CATS = [
  { value: 'policy', label: 'Policy Documents', short: 'Policy', color: 'blue' },
  { value: 'kyc', label: 'KYC Documents', short: 'KYC', color: 'grape' },
  { value: 'other', label: 'Other Documents', short: 'Other', color: 'gray' },
];
const CAT = Object.fromEntries(CATS.map((c) => [c.value, c]));
const TYPE_SUGGESTIONS = {
  policy: ['Policy copy', 'Premium receipt', 'Proposal form', 'Claim form', 'Renewal notice'],
  kyc: ['Aadhaar card', 'PAN card', 'Passport', 'Voter ID', 'Driving licence', 'Photo', 'Address proof', 'Bank proof'],
  other: ['Medical report', 'Income proof', 'Nominee details', 'Other'],
};
const ALLOWED = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const ext = (n) => (String(n || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmt = (v) => {
  const d = v ? new Date(String(v).replace(' ', 'T')) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};
const iconFor = (mime, name) => {
  if (String(mime).startsWith('image/')) return IconPhoto;
  if (mime === 'application/pdf') return IconFileText;
  if (/sheet|excel/.test(mime) || /xlsx?$/.test(ext(name))) return IconFileSpreadsheet;
  return IconFile;
};
const viewable = (mime) => mime === 'application/pdf' || /^image\/(jpeg|png|webp)$/.test(mime);
const ACTION = { uploaded: 'Uploaded', replaced: 'Replaced with a new version', edited: 'Details changed', downloaded: 'Opened / downloaded', deleted: 'Deleted' };

function Shell({ opened, onClose, title, busy, children, size: s = 'lg' }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  return <Modal opened={opened} onClose={() => !busy && onClose()} title={title} centered size={s} fullScreen={isPhone}>{children}</Modal>;
}
const Buttons = ({ onCancel, busy, label, color = 'blue', disabled }) => (
  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button variant="default" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
    <Button type="submit" color={color} loading={busy} disabled={disabled} className="w-full sm:w-auto">{label}</Button>
  </div>
);

// Checks a picked file before upload (the server checks again, including the file's contents).
const fileProblem = (f) => {
  if (!ALLOWED.includes(ext(f.name))) return `"${f.name}": this type of file can't be uploaded. Use PDF, JPG, PNG, WEBP, HEIC, Word or Excel.`;
  if (!f.size) return `"${f.name}" is empty.`;
  if (f.size > MAX_BYTES) return `"${f.name}" is larger than 10 MB.`;
  return '';
};

export default function CustomerDocuments({ customer, isAdmin = false, onChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cat, setCat] = useState(null);
  const [modal, setModal] = useState(null); // { kind, doc? }
  const [picked, setPicked] = useState([]); // [{ file, name, category, doc_type }]
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState(null);
  const [settings, setSettings] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const replaceRef = useRef(null);

  const base = `${API_URL}/api/customers/${customer.id}/documents`;
  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/customers/${customer.id}/documents`, { headers: await authHeaders() });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the documents. Please try again.'));
    }
  }, [customer.id]);
  useEffect(() => {
    load();
  }, [load]);

  const perms = data?.permissions || { view: false, upload: false, delete: false };
  const docs = data?.documents || [];
  const counts = Object.fromEntries(CATS.map((c) => [c.value, docs.filter((d) => d.category === c.value).length]));
  const shown = cat ? docs.filter((d) => d.category === cat) : docs;
  const close = () => { setModal(null); setFormError(''); setProgress(0); setHistory(null); };
  const done = (title, message) => {
    showNotification({ title, message, color: 'green' });
    close();
    load();
    onChange?.();
  };
  const fail = (err, fallback) => setFormError(errorMessage(err, fallback));

  /* picking files */
  const addFiles = (list) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    const room = Math.max(0, MAX_FILES - picked.length);
    setFormError(files.length > room ? `Please upload at most ${MAX_FILES} files at a time. The extra files were left out.` : '');
    const next = files.slice(0, room).map((file) => ({
      file, problem: fileProblem(file), name: file.name.replace(/\.[a-z0-9]+$/i, ''), category: cat || 'policy', doc_type: '',
    }));
    setPicked((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };
  const setPick = (i, k, v) => setPicked((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const upload = async (e) => {
    e.preventDefault();
    if (!picked.length) return setFormError('Please choose at least one file.');
    const bad = picked.find((p) => p.problem);
    if (bad) return setFormError(`${bad.problem} Remove it to continue.`);
    const noName = picked.find((p) => !p.name.trim());
    if (noName) return setFormError('Please give every document a name.');
    const fd = new FormData();
    picked.forEach((p) => fd.append('files', p.file, p.file.name));
    fd.append('meta', JSON.stringify(picked.map((p) => ({ name: p.name.trim(), category: p.category, doc_type: p.doc_type.trim() }))));
    setBusy(true);
    setFormError('');
    try {
      await axios.post(base, fd, { headers: await authHeaders(), onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)) });
      done('Uploaded', `${picked.length} document(s) saved to ${customer.full_name || 'the customer'}.`);
      setPicked([]);
    } catch (err) {
      fail(err, 'Could not upload the documents. Nothing was saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  /* open / download (with the person's token; never a public link) */
  const fetchFile = async (doc, version, inline) => {
    const res = await axios.get(`${base}/${doc.id}/download`, { headers: await authHeaders(), params: { ...(version ? { version } : {}), ...(inline ? { inline: 1 } : {}) }, responseType: 'blob' });
    return res.data;
  };
  const view = async (doc) => {
    // Open the tab inside the click (so it isn't blocked), then load the file into it.
    const w = window.open('', '_blank');
    try {
      const blob = await fetchFile(doc, null, true);
      const url = URL.createObjectURL(new Blob([blob], { type: doc.mime }));
      if (w) w.location.href = url;
      else downloadBlob(blob, doc.file_name);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (w) w.close();
      showNotification({ title: 'Could not open', message: errorMessage(err, 'Could not open the document. Please try again.'), color: 'red' });
    }
  };
  const download = async (doc, version = null, fileName = null) => {
    try {
      downloadBlob(await fetchFile(doc, version, false), fileName || doc.file_name);
    } catch (err) {
      showNotification({ title: 'Could not download', message: errorMessage(err, 'Could not download the document. Please try again.'), color: 'red' });
    }
  };

  /* replace / edit / delete / history / settings */
  const open = async (kind, doc = null) => {
    setFormError('');
    setProgress(0);
    if (kind === 'upload') setPicked([]);
    if (kind === 'replace') setForm({ file: null, note: '' });
    if (kind === 'edit') setForm({ name: doc.name, category: doc.category, doc_type: doc.doc_type || '' });
    if (kind === 'history') {
      setHistory(null);
      try {
        const res = await axios.get(`${base}/${doc.id}/history`, { headers: await authHeaders() });
        setHistory(res.data);
      } catch (err) {
        setHistory({ error: errorMessage(err, 'Could not load the history. Please try again.') });
      }
    }
    if (kind === 'settings') {
      setSettings(null);
      try {
        const res = await axios.get(`${API_URL}/api/customers/documents/settings`, { headers: await authHeaders() });
        setSettings(res.data);
      } catch (err) {
        setSettings({ error: errorMessage(err, 'Could not load the settings. Please try again.') });
      }
    }
    setModal({ kind, doc });
  };
  const replace = async (e) => {
    e.preventDefault();
    if (!form.file) return setFormError('Please choose the new file.');
    const p = fileProblem(form.file);
    if (p) return setFormError(p);
    const fd = new FormData();
    fd.append('file', form.file, form.file.name);
    fd.append('note', form.note || '');
    setBusy(true);
    try {
      const res = await axios.post(`${base}/${modal.doc.id}/replace`, fd, { headers: await authHeaders(), onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)) });
      done('Document replaced', `"${modal.doc.name}" is now version ${res.data.version}. The earlier version is kept in its history.`);
    } catch (err) {
      fail(err, 'Could not replace the document. Nothing was changed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!String(form.name || '').trim()) return setFormError('Please give the document a name.');
    setBusy(true);
    try {
      await axios.put(`${base}/${modal.doc.id}`, { name: form.name.trim(), category: form.category, doc_type: form.doc_type.trim() }, { headers: await authHeaders() });
      done('Saved', 'The document details were updated.');
    } catch (err) {
      fail(err, 'Could not save the changes. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.delete(`${base}/${modal.doc.id}`, { headers: await authHeaders() });
      done('Document deleted', `"${modal.doc.name}" was deleted. The record of who deleted it is kept.`);
    } catch (err) {
      fail(err, 'Could not delete the document. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const saveSetting = async (key, value) => {
    const prev = settings;
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      const res = await axios.put(`${API_URL}/api/customers/documents/settings`, { [key]: value }, { headers: await authHeaders() });
      setSettings(res.data);
    } catch (err) {
      setSettings(prev);
      showNotification({ title: 'Could not save', message: errorMessage(err, 'Could not save the setting. Please try again.'), color: 'red' });
    }
  };

  const k = modal?.kind;
  if (data && !perms.view) {
    return (
      <div className="mt-6">
        <div className="text-base font-semibold dark:text-white-light">Documents</div>
        <Text size="sm" color="dimmed">Your admin has turned off customer documents for team members.</Text>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="text-base font-semibold dark:text-white-light">Documents {docs.length > 0 && <span className="text-sm font-normal text-gray-500">({docs.length})</span>}</div>
        <div className="flex gap-2">
          {isAdmin && <ActionIcon variant="light" onClick={() => open('settings')} aria-label="Document permissions" title="Who can view, upload and delete"><IconSettings size={16} /></ActionIcon>}
          {perms.upload && <Button size="xs" variant="light" leftIcon={<IconUpload size={14} />} onClick={() => open('upload')}>Upload</Button>}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button></div>
      ) : !data ? (
        <div className="flex justify-center py-4"><Loader size="sm" /></div>
      ) : (
        <>
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {[{ value: null, short: 'All' }, ...CATS].map((c) => {
              const on = cat === c.value;
              return (
                <button key={c.short} type="button" aria-pressed={on} onClick={() => setCat(c.value)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>
                  {c.short} ({c.value ? counts[c.value] : docs.length})
                </button>
              );
            })}
          </div>
          {!shown.length ? (
            <Text size="sm" color="dimmed">{perms.upload ? 'No documents yet. Use "Upload" to add policy copies, KYC (Aadhaar, PAN…) or other files.' : 'No documents yet.'}</Text>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {shown.map((d) => {
                const Icon = iconFor(d.mime, d.file_name);
                return (
                  <div key={d.id} className="flex min-w-0 gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800"><Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Text weight={600} size="sm" className="min-w-0 break-words">{d.name}</Text>
                        <Badge size="xs" color={CAT[d.category]?.color} variant="light">{CAT[d.category]?.short}</Badge>
                        {d.current_version > 1 && <Badge size="xs" color="gray" variant="outline">v{d.current_version}</Badge>}
                      </div>
                      {d.doc_type && <Text size="xs">{d.doc_type}</Text>}
                      <Text size="xs" color="dimmed" className="break-all">{d.file_name} · {size(d.size_bytes)}</Text>
                      <Text size="xs" color="dimmed">
                        {d.current_version > 1 ? `Updated ${fmt(d.version_at)}${d.version_by_name ? ` by ${d.version_by_name}` : ''}` : `Uploaded ${fmt(d.created_at)}${d.created_by_name ? ` by ${d.created_by_name}` : ''}`}
                      </Text>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {viewable(d.mime) && <Button size="xs" compact variant="light" leftIcon={<IconEye size={12} />} onClick={() => view(d)}>View</Button>}
                        <Button size="xs" compact variant="subtle" leftIcon={<IconDownload size={12} />} onClick={() => download(d)}>Download</Button>
                      </div>
                    </div>
                    <Menu withinPortal position="bottom-end" shadow="md">
                      <Menu.Target><ActionIcon variant="subtle" aria-label={`Actions for ${d.name}`}><IconDotsVertical size={18} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        {perms.upload && <Menu.Item icon={<IconRefresh size={14} />} onClick={() => open('replace', d)}>Replace with new file</Menu.Item>}
                        {perms.upload && <Menu.Item icon={<IconPencil size={14} />} onClick={() => open('edit', d)}>Edit details</Menu.Item>}
                        <Menu.Item icon={<IconHistory size={14} />} onClick={() => open('history', d)}>History & versions</Menu.Item>
                        {perms.delete && <Menu.Divider />}
                        {perms.delete && <Menu.Item color="red" icon={<IconTrash size={14} />} onClick={() => open('delete', d)}>Delete</Menu.Item>}
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* upload */}
      <Shell opened={k === 'upload'} onClose={close} busy={busy} title={`Upload documents${customer.full_name ? ` · ${customer.full_name}` : ''}`} size="xl">
        <form onSubmit={upload}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
          >
            <IconUpload size={24} className="text-gray-500" />
            <Text size="sm" weight={500}>Drop files here or tap to choose</Text>
            <Text size="xs" color="dimmed">Up to {MAX_FILES} files, 10 MB each · PDF, JPG, PNG, WEBP, HEIC, Word, Excel</Text>
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx" onChange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }} data-testid="doc-input" />
          </div>
          {picked.length > 0 && (
            <div className="mt-3 max-h-[45vh] space-y-2 overflow-y-auto">
              {picked.map((p, i) => (
                <div key={`${p.file.name}-${i}`} className={`rounded-md border p-2 ${p.problem ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate" title={p.file.name}>{p.file.name} · {size(p.file.size)}</span>
                    <ActionIcon size="sm" variant="subtle" color="red" aria-label={`Remove ${p.file.name}`} onClick={() => setPicked((x) => x.filter((_, j) => j !== i))}><IconX size={14} /></ActionIcon>
                  </div>
                  {p.problem ? (
                    <Text size="xs" color="red">{p.problem}</Text>
                  ) : (
                    <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <TextInput size="xs" label="Name" value={p.name} onChange={(e) => { const v = e.currentTarget.value; setPick(i, 'name', v); }} maxLength={200} />
                      <Select size="xs" label="Category" data={CATS.map((c) => ({ value: c.value, label: c.label }))} value={p.category} onChange={(v) => setPick(i, 'category', v)} withinPortal />
                      <Autocomplete size="xs" label="Type" placeholder="e.g. Aadhaar card" data={TYPE_SUGGESTIONS[p.category]} value={p.doc_type} onChange={(v) => setPick(i, 'doc_type', v)} maxLength={60} withinPortal />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {busy && progress > 0 && <Progress value={progress} mt="sm" size="sm" />}
          {formError && <Text size="sm" color="red" mt="sm">{formError}</Text>}
          <Buttons onCancel={close} busy={busy} label={`Upload ${picked.length || ''}`.trim()} disabled={!picked.length} />
        </form>
      </Shell>

      {/* replace */}
      <Shell opened={k === 'replace'} onClose={close} busy={busy} title="Replace with a new file">
        <form onSubmit={replace} className="space-y-3">
          {modal?.doc && <Text size="sm">&quot;{modal.doc.name}&quot; (now v{modal.doc.current_version}). The current file is kept as an earlier version.</Text>}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" variant="light" leftIcon={<IconUpload size={14} />} onClick={() => replaceRef.current?.click()}>Choose file</Button>
            <Text size="xs" className="min-w-0 break-all">{form.file ? `${form.file.name} · ${size(form.file.size)}` : 'No file chosen'}</Text>
            <input ref={replaceRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx" onChange={(e) => { const file = e.currentTarget.files?.[0] || null; setForm((f) => ({ ...f, file })); setFormError(file ? fileProblem(file) : ''); e.currentTarget.value = ''; }} data-testid="replace-input" />
          </div>
          <TextInput label="Note (optional)" placeholder="e.g. Renewed policy for 2027" value={form.note || ''} onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, note: v })); }} maxLength={500} />
          {busy && progress > 0 && <Progress value={progress} size="sm" />}
          {formError && <Text size="sm" color="red">{formError}</Text>}
          <Buttons onCancel={close} busy={busy} label="Replace" />
        </form>
      </Shell>

      {/* edit */}
      <Shell opened={k === 'edit'} onClose={close} busy={busy} title="Edit document details">
        <form onSubmit={saveEdit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Name" required value={form.name || ''} onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, name: v })); }} maxLength={200} className="sm:col-span-2" />
          <Select label="Category" data={CATS.map((c) => ({ value: c.value, label: c.label }))} value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} withinPortal />
          <Autocomplete label="Type" data={TYPE_SUGGESTIONS[form.category] || []} value={form.doc_type || ''} onChange={(v) => setForm((f) => ({ ...f, doc_type: v }))} maxLength={60} withinPortal />
          {formError && <Text size="sm" color="red" className="sm:col-span-2">{formError}</Text>}
          <div className="sm:col-span-2"><Buttons onCancel={close} busy={busy} label="Save" /></div>
        </form>
      </Shell>

      {/* delete */}
      <Shell opened={k === 'delete'} onClose={close} busy={busy} title="Delete this document?">
        <form onSubmit={remove}>
          <Text size="sm">&quot;{modal?.doc?.name}&quot; and all its versions will be deleted for good. The record of who deleted it and when is kept.</Text>
          {formError && <Text size="sm" color="red" mt="sm">{formError}</Text>}
          <Buttons onCancel={close} busy={busy} label="Delete" color="red" />
        </form>
      </Shell>

      {/* history */}
      <Shell opened={k === 'history'} onClose={close} title={`History · ${modal?.doc?.name || ''}`}>
        {!history ? (
          <div className="flex justify-center py-4"><Loader size="sm" /></div>
        ) : history.error ? (
          <Text size="sm" color="red">{history.error}</Text>
        ) : (
          <div className="space-y-4">
            <div>
              <Text size="sm" weight={600} mb={4}>Versions</Text>
              {history.versions.map((v) => (
                <div key={v.version} className="flex flex-wrap items-center gap-2 border-b border-gray-100 py-1.5 text-sm last:border-b-0 dark:border-gray-800">
                  <Badge size="xs" variant={v.version === modal?.doc?.current_version ? 'filled' : 'outline'}>v{v.version}</Badge>
                  <span className="min-w-0 flex-1 break-all">{v.file_name} · {size(v.size_bytes)}{v.note ? ` · ${v.note}` : ''}</span>
                  <span className="text-xs text-gray-500">{fmt(v.created_at)}{v.by_name ? ` · ${v.by_name}` : ''}</span>
                  {v.available && modal?.doc && <Button size="xs" compact variant="subtle" leftIcon={<IconDownload size={12} />} onClick={() => download(modal.doc, v.version, v.version === modal.doc.current_version ? v.file_name : `v${v.version}_${v.file_name}`)}>Download</Button>}
                </div>
              ))}
            </div>
            <div>
              <Text size="sm" weight={600} mb={4}>Activity</Text>
              {history.events.map((e) => (
                <div key={e.id} className="border-b border-gray-100 py-1.5 text-sm last:border-b-0 dark:border-gray-800">
                  <b>{ACTION[e.action] || e.action}</b>
                  {e.action === 'replaced' && e.details ? ` · v${e.details.from_version} → v${e.details.to_version}` : ''}
                  {e.action === 'edited' && e.details?.after ? ` · ${Object.entries(e.details.after).map(([key, val]) => `${key === 'doc_type' ? 'type' : key}: ${key === 'category' ? CAT[val]?.short || val : val || '—'}`).join(', ')}` : ''}
                  <div className="text-xs text-gray-500">{fmt(e.created_at)}{e.by_name ? ` · ${e.by_name}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Shell>

      {/* permissions (admin) */}
      <Shell opened={k === 'settings'} onClose={close} title="Document permissions for team members">
        {!settings ? (
          <div className="flex justify-center py-4"><Loader size="sm" /></div>
        ) : settings.error ? (
          <Text size="sm" color="red">{settings.error}</Text>
        ) : (
          <div className="space-y-4">
            <Text size="sm" color="dimmed">You (admin) can always do everything. Team members only ever see documents of customers assigned to them.</Text>
            <Switch label="View and download documents" checked={settings.team_can_view} onChange={(e) => saveSetting('team_can_view', e.currentTarget.checked)} />
            <Switch label="Upload, replace and edit documents" checked={settings.team_can_upload} disabled={!settings.team_can_view} onChange={(e) => saveSetting('team_can_upload', e.currentTarget.checked)} />
            <Switch label="Delete documents" checked={settings.team_can_delete} disabled={!settings.team_can_view} onChange={(e) => saveSetting('team_can_delete', e.currentTarget.checked)} />
          </div>
        )}
      </Shell>
    </div>
  );
}
