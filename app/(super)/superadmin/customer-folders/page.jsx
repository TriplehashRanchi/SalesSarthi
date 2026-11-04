'use client';
import { useCallback, useEffect, useState } from 'react';
import superAdminAxios from '@/utils/superAdminAxios';
import toast from 'react-hot-toast';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';

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

export default function CustomerFoldersPage() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | folder

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

  const remove = async (f) => {
    const msg = f.customer_count > 0
      ? `Delete "${f.name}"? Its ${f.customer_count} customer(s) will be taken out of this folder, but the customers will NOT be deleted.`
      : `Delete "${f.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await superAdminAxios.delete(`/api/superadmin/customer-folders/${f.id}`);
      toast.success('Folder deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete folder');
    }
  };

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
                  onClick={() => setModal(f)} aria-label={`Rename ${f.name}`}>
                  <IconPencil size={18} />
                </button>
                <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-danger hover:bg-danger/10"
                  onClick={() => remove(f)} aria-label={`Delete ${f.name}`}>
                  <IconTrash size={18} />
                </button>
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
                  <button className="btn btn-sm btn-outline-primary gap-1" onClick={() => setModal(f)}>
                    <IconPencil size={14} /> Rename
                  </button>
                  <button className="btn btn-sm btn-outline-danger gap-1" onClick={() => remove(f)}>
                    <IconTrash size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <FolderModal initial={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  );
}
