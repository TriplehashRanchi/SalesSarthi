'use client';
import { useCallback, useEffect, useState } from 'react';
import superAdminAxios from '@/utils/superAdminAxios';
import toast from 'react-hot-toast';
import { IconArrowDown, IconArrowUp, IconEye, IconEyeOff, IconListDetails, IconLock, IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';

function FolderModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Folder name is required');
    setSaving(true);
    try {
      if (initial) await superAdminAxios.put(`/api/superadmin/customer-folders/${initial.id}`, { name });
      else await superAdminAxios.post('/api/superadmin/customer-folders', { name });
      toast.success(initial ? 'Folder renamed' : 'Folder created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save folder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#0e1726] sm:p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Rename folder' : 'New customer folder'}</h3>
        <label className="block text-sm">
          Folder name
          <input autoFocus maxLength={60} className="form-input mt-1 w-full" placeholder="e.g. Loans, PMS, SIF, AIF"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {initial && initial.customer_count > 0 && name.trim() !== initial.name && (
          <p className="mt-2 rounded bg-warning-light p-2 text-xs text-warning">
            The {initial.customer_count} customer(s) in &quot;{initial.name}&quot; will show under the new name.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Amount (₹)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'yesno', label: 'Yes / No' },
];
const typeLabel = (t) => FIELD_TYPES.find((x) => x.value === t)?.label || t;

// Product-specific fields of one product line (#05): shown on the customer and product forms when this line is chosen.
function FieldsModal({ folder, onClose }) {
  const [fields, setFields] = useState(null);
  const [edit, setEdit] = useState(null); // null | { id?, label, type, options, required }
  const [saving, setSaving] = useState(false);
  const base = `/api/superadmin/customer-folders/${folder.id}/fields`;

  const load = useCallback(async () => {
    try {
      const { data } = await superAdminAxios.get(base);
      setFields(data.fields || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the fields');
      setFields([]);
    }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!edit.label.trim()) return toast.error('Please give the field a name');
    if (edit.type === 'select' && edit.options.split('\n').map((o) => o.trim()).filter(Boolean).length < 2) return toast.error('A dropdown needs at least two choices (one per line)');
    setSaving(true);
    try {
      const body = { label: edit.label, type: edit.type, required: edit.required, options: edit.type === 'select' ? edit.options.split('\n') : undefined };
      if (edit.id) await superAdminAxios.put(`${base}/${edit.id}`, body);
      else await superAdminAxios.post(base, body);
      toast.success(edit.id ? 'Field saved' : 'Field added');
      setEdit(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the field');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (f) => {
    try {
      await superAdminAxios.put(`${base}/${f.id}/active`, { active: !f.active });
      toast.success(f.active ? 'Field hidden. Values already saved are kept.' : 'Field shown again');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the field');
    }
  };
  const move = async (i, dir) => {
    const list = [...fields];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setFields(list);
    try {
      await superAdminAxios.put(`${base}/order`, { ids: list.map((f) => f.id) });
    } catch (err) {
      toast.error('Could not save the order');
      load();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="flex h-full w-full flex-col bg-white shadow-xl dark:bg-[#0e1726] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Fields of ${folder.name}`}>
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{folder.name}: fields</h3>
            <p className="text-xs text-white-dark">Shown on Add / Edit Customer and Add Product when this product line is chosen.</p>
          </div>
          <button type="button" className="btn btn-sm btn-outline-dark shrink-0" onClick={onClose}>Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {fields === null ? (
            <p className="py-6 text-center text-white-dark">Loading...</p>
          ) : !fields.length ? (
            <p className="py-6 text-center text-white-dark">No fields yet. Add the first one.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {fields.map((f, i) => (
                <li key={f.id} className={`flex items-center gap-2 py-2 ${f.active ? '' : 'opacity-50'}`}>
                  <div className="flex flex-col">
                    <button type="button" className="text-white-dark disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.label} up`}><IconArrowUp size={14} /></button>
                    <button type="button" className="text-white-dark disabled:opacity-30" disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.label} down`}><IconArrowDown size={14} /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{f.label}{f.required && <span className="text-danger"> *</span>}{!f.active && <span className="ml-1 text-xs">(hidden)</span>}</p>
                    <p className="text-xs text-white-dark">{typeLabel(f.type)}{f.type === 'select' ? `: ${f.options.join(', ')}` : ''}</p>
                  </div>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-primary hover:bg-primary/10" onClick={() => setEdit({ id: f.id, label: f.label, type: f.type, options: f.options.join('\n'), required: f.required })} aria-label={`Edit ${f.label}`}><IconPencil size={16} /></button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-white-dark hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => toggle(f)} aria-label={f.active ? `Hide ${f.label}` : `Show ${f.label}`} title={f.active ? 'Hide (saved values are kept)' : 'Show again'}>{f.active ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button>
                </li>
              ))}
            </ul>
          )}

          {edit ? (
            <form className="mt-4 space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700" onSubmit={save}>
              <p className="text-sm font-semibold">{edit.id ? 'Edit field' : 'New field'}</p>
              <label className="block text-sm">Field name
                <input autoFocus maxLength={80} className="form-input mt-1 w-full" placeholder="e.g. Sum Assured" value={edit.label} onChange={(e) => { const v = e.target.value; setEdit((x) => ({ ...x, label: v })); }} />
              </label>
              <label className="block text-sm">Type
                <select className="form-select mt-1 w-full" value={edit.type} onChange={(e) => { const v = e.target.value; setEdit((x) => ({ ...x, type: v })); }}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              {edit.type === 'select' && (
                <label className="block text-sm">Choices (one per line)
                  <textarea rows={4} className="form-textarea mt-1 w-full" value={edit.options} onChange={(e) => { const v = e.target.value; setEdit((x) => ({ ...x, options: v })); }} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="form-checkbox" checked={edit.required} onChange={(e) => { const v = e.target.checked; setEdit((x) => ({ ...x, required: v })); }} />
                Required (must be filled when this product line is chosen)
              </label>
              {edit.id && <p className="text-xs text-white-dark">Changing the name or type does not remove values already saved.</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-outline-dark" onClick={() => setEdit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save field'}</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full gap-1 sm:w-auto" onClick={() => setEdit({ label: '', type: 'text', options: '', required: false })}>
              <IconPlus size={16} /> Add field
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// #07: deleting a shared category — its customers (in every account) move to another category first.
function DeleteFolderModal({ folder, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [target, setTarget] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await superAdminAxios.get(`/api/superadmin/customer-folders/${folder.id}/delete-preview`);
        setPreview(data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not check this folder');
        onClose();
      }
    })();
    // Load once per folder (onClose is a new function on every parent render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.id]);
  const run = async (e) => {
    e.preventDefault();
    if (preview.customer_count && !target) return toast.error('Please choose where to move the customers');
    if (preview.customer_count && !sure) return toast.error('Please tick the box to confirm');
    setBusy(true);
    try {
      const { data } = await superAdminAxios.delete(`/api/superadmin/customer-folders/${folder.id}`, { data: preview.customer_count ? { target_id: Number(target) } : {} });
      toast.success(data.message || 'Folder deleted');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the folder');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#0e1726] sm:p-6" onClick={(e) => e.stopPropagation()} onSubmit={run} role="dialog" aria-label={`Delete ${folder.name}`}>
        <h3 className="mb-3 text-lg font-semibold">Delete &quot;{folder.name}&quot;?</h3>
        {!preview ? (
          <p className="py-4 text-center text-white-dark">Checking...</p>
        ) : preview.customer_count === 0 ? (
          <p className="text-sm">No customers are in this folder. It can be deleted straight away.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="rounded bg-warning-light p-2 text-warning">
              {preview.customer_count} customer(s) across all admins{preview.policies_count ? ` and ${preview.policies_count} product(s)` : ''} are in this folder.
              They will be moved; their profiles, products and history are kept.
            </p>
            <label className="block">Move them to
              <select className="form-select mt-1 w-full" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose a folder</option>
                {preview.targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="form-checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
              Yes, move the customers and delete this folder
            </label>
          </div>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-outline-dark" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={busy || !preview}>{busy ? 'Deleting...' : preview?.customer_count ? 'Move & delete' : 'Delete'}</button>
        </div>
      </form>
    </div>
  );
}

// #06: which admins may add, rename and delete their own categories (each separately).
function CategoryPermissions() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    try {
      const { data } = await superAdminAxios.get('/api/superadmin/category-permissions');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load permissions');
      setRows([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const toggle = async (a, key) => {
    const value = !a[key];
    setRows((rs) => rs.map((r) => (r.admin_id === a.admin_id ? { ...r, [key]: value } : r)));
    try {
      await superAdminAxios.put(`/api/superadmin/category-permissions/${encodeURIComponent(a.admin_id)}`, { [key]: value });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
      load();
    }
  };
  const shown = (rows || []).filter((a) => !search.trim() || `${a.name} ${a.email} ${a.admin_id}`.toLowerCase().includes(search.trim().toLowerCase()));
  const PERMS = [['can_add', 'Add'], ['can_edit', 'Edit'], ['can_delete', 'Delete']];
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold">Category permissions</h3>
      <p className="mb-3 text-sm text-white-dark">Allow an admin to add, rename or delete their own categories. Their categories are seen only by their account. Default categories always stay fixed.</p>
      <div className="relative mb-3 max-w-sm">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark" />
        <input className="form-input w-full pl-9" placeholder="Search admin" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {rows === null ? (
        <p className="py-6 text-center text-white-dark">Loading...</p>
      ) : !shown.length ? (
        <p className="py-6 text-center text-white-dark">No admins found.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {shown.map((a) => (
            <li key={a.admin_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name || a.admin_id}</p>
                <p className="truncate text-xs text-white-dark">{a.email || a.admin_id} · {a.custom_count} own categor{a.custom_count === 1 ? 'y' : 'ies'}</p>
              </div>
              <div className="flex gap-4">
                {PERMS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" className="form-checkbox" checked={!!a[key]} onChange={() => toggle(a, key)} aria-label={`${label} category for ${a.name || a.admin_id}`} />
                    {label}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// #10: the columns every admin and team member sees in the customer list until they choose their own.
function DefaultColumns() {
  const [catalog, setCatalog] = useState(null);
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await superAdminAxios.get('/api/superadmin/customer-columns');
        setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
        setList(Array.isArray(data?.defaults) ? data.defaults : []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load the columns');
        setCatalog([]);
      }
    })();
  }, []);
  const label = (k) => catalog?.find((c) => c.key === k)?.label || k;
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 1 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const save = async () => {
    if (list.length < 2) return toast.error('Choose at least one column besides Name');
    setSaving(true);
    try {
      const { data } = await superAdminAxios.put('/api/superadmin/customer-columns', { columns: list });
      setList(data.defaults);
      toast.success('Default columns saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };
  if (catalog === null) return <p className="mt-8 text-white-dark">Loading columns...</p>;
  const hidden = catalog.filter((c) => !list.includes(c.key));
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold">Customer list: default columns</h3>
      <p className="mb-3 text-sm text-white-dark">What everyone sees until they choose their own columns. Admins can limit what their team may use.</p>
      <ul className="max-w-md space-y-1">
        {list.map((k, i) => (
          <li key={k} className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700">
            <input type="checkbox" className="form-checkbox" checked disabled={k === 'full_name'} onChange={() => setList(list.filter((x) => x !== k))} aria-label={`Default column ${label(k)}`} />
            <span className="min-w-0 flex-1 truncate">{label(k)}</span>
            {k === 'full_name' ? <IconLock size={14} className="text-white-dark" /> : (
              <>
                <button type="button" className="disabled:opacity-30" disabled={i <= 1} onClick={() => move(i, -1)} aria-label={`Move ${label(k)} up`}><IconArrowUp size={14} /></button>
                <button type="button" className="disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(k)} down`}><IconArrowDown size={14} /></button>
              </>
            )}
          </li>
        ))}
        {hidden.map((c) => (
          <li key={c.key} className="flex items-center gap-2 px-2 py-1 text-sm text-white-dark">
            <input type="checkbox" className="form-checkbox" checked={false} onChange={() => setList([...list, c.key])} aria-label={`Default column ${c.label}`} />
            {c.label}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary mt-3" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save default columns'}</button>
    </div>
  );
}

export default function CustomerFoldersPage() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | folder
  const [fieldsFor, setFieldsFor] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await superAdminAxios.get('/api/superadmin/customer-folders');
      setFolders(data);
    } catch {
      toast.error('Could not load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = (f) => setDeleting(f);

  return (
    <div className="p-0 md:p-2">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold sm:text-xl">Customer Folders</h2>
          <p className="hidden text-sm text-white-dark sm:block">
            Product lines shown to every admin: on the Customers page, in Add Customer, Lead → Customer and CSV upload.
          </p>
        </div>
        <button className="btn btn-primary shrink-0 gap-1 px-3 py-1.5 text-sm sm:px-5 sm:py-2" onClick={() => setModal('new')}>
          <IconPlus size={16} /> <span>New<span className="hidden sm:inline"> folder</span></span>
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-white-dark">Loading...</p>
      ) : folders.length === 0 ? (
        <p className="py-10 text-center text-white-dark">No folders yet. Create the first one.</p>
      ) : (
        <>
          {/* Phone: plain one-line rows, no card background */}
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 sm:hidden">
            {folders.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-white-dark">
                    {f.customer_count} customer{Number(f.customer_count) === 1 ? '' : 's'}
                  </p>
                </div>
                <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/10"
                  onClick={() => setFieldsFor(f)} aria-label={`Fields of ${f.name}`}>
                  <IconListDetails size={18} />
                </button>
                {f.is_default ? (
                  <span className="grid h-9 w-9 shrink-0 place-items-center text-white-dark" title="Default category: fixed" aria-label="Fixed"><IconLock size={16} /></span>
                ) : (
                  <>
                    <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/10"
                      onClick={() => setModal(f)} aria-label={`Rename ${f.name}`}>
                      <IconPencil size={18} />
                    </button>
                    <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-danger hover:bg-danger/10"
                      onClick={() => remove(f)} aria-label={`Delete ${f.name}`}>
                      <IconTrash size={18} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {/* Tablet / desktop: cards */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-3">
            {folders.map((f) => (
              <div key={f.id} className="panel flex flex-col justify-between">
                <div>
                  <h3 className="break-words text-lg font-semibold">{f.name}</h3>
                  <p className="mt-1 text-sm text-white-dark">
                    {f.customer_count} customer{Number(f.customer_count) === 1 ? '' : 's'} across all admins
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn btn-sm btn-primary gap-1" onClick={() => setFieldsFor(f)}>
                    <IconListDetails size={14} /> Fields
                  </button>
                  {f.is_default ? (
                    <span className="inline-flex items-center gap-1 text-xs text-white-dark"><IconLock size={14} /> Default · fixed</span>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-outline-primary gap-1" onClick={() => setModal(f)}>
                        <IconPencil size={14} /> Rename
                      </button>
                      <button className="btn btn-sm btn-outline-danger gap-1" onClick={() => remove(f)}>
                        <IconTrash size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {fieldsFor && <FieldsModal folder={fieldsFor} onClose={() => setFieldsFor(null)} />}
      {deleting && <DeleteFolderModal folder={deleting} onClose={() => setDeleting(null)} onDone={load} />}
      <CategoryPermissions />
      <DefaultColumns />
      {modal && (
        <FolderModal initial={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  );
}
