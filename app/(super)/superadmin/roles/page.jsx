'use client';
import { useCallback, useEffect, useState } from 'react';
import superAdminAxios from '@/utils/superAdminAxios';
import toast from 'react-hot-toast';

function RoleModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Role name is required');
    setSaving(true);
    try {
      const body = { name, description, is_active: initial ? !!initial.is_active : true };
      if (initial) await superAdminAxios.put(`/api/superadmin/roles/${initial.id}`, body);
      else await superAdminAxios.post('/api/superadmin/roles', body);
      toast.success(initial ? 'Role updated' : 'Role created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#0e1726] sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit role' : 'New role'}</h3>
        <label className="mb-3 block text-sm">
          Role name
          <input autoFocus maxLength={60} className="form-input mt-1 w-full" placeholder="e.g. Team Leader"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mb-1 block text-sm">
          Description <span className="text-white-dark">(optional)</span>
          <textarea maxLength={255} rows={3} className="form-textarea mt-1 w-full" placeholder="What does this role do?"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {initial && initial.user_count > 0 && name.trim() !== initial.name && (
          <p className="mt-2 rounded bg-warning-light p-2 text-xs text-warning">
            Renaming will also move the {initial.user_count} team member(s) using &quot;{initial.name}&quot; to the new name.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | role

  const load = useCallback(async () => {
    try {
      const { data } = await superAdminAxios.get('/api/superadmin/roles');
      setRoles(data);
    } catch {
      toast.error('Could not load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (r) => {
    try {
      await superAdminAxios.put(`/api/superadmin/roles/${r.id}`, {
        name: r.name, description: r.description, is_active: !r.is_active,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update role');
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the role "${r.name}"?`)) return;
    try {
      await superAdminAxios.delete(`/api/superadmin/roles/${r.id}`);
      toast.success('Role deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete role');
    }
  };

  return (
    <div className="p-0 md:p-2">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Roles</h2>
          <p className="text-sm text-white-dark">
            Roles created here appear in every admin&apos;s &quot;Add Team Member&quot; form.
          </p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setModal('new')}>+ New role</button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-white-dark">Loading...</p>
      ) : roles.length === 0 ? (
        <p className="py-10 text-center text-white-dark">No roles yet. Create the first one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <div key={r.id} className={`panel flex flex-col justify-between ${r.is_active ? '' : 'opacity-60'}`}>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="break-words text-lg font-semibold">{r.name}</h3>
                  <span className={`badge shrink-0 ${r.is_active ? 'bg-success' : 'bg-secondary'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 min-h-[2.5rem] text-sm text-white-dark">{r.description || 'No description'}</p>
                <p className="mt-2 text-xs text-white-dark">{r.user_count} team member{r.user_count === 1 ? '' : 's'}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => setModal(r)}>Edit</button>
                <button className="btn btn-sm btn-outline-warning" onClick={() => toggle(r)}>
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <RoleModal initial={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  );
}
