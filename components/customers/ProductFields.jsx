'use client';
// Product-specific fields (#05): each product line (Life Insurance, Health …) adds its own fields to the
// customer / product forms when it is chosen. Values: { [folderId]: { [fieldKey]: value } }.
import { useEffect, useState } from 'react';
import axios from 'axios';
import { authHeaders } from '@/utils/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Loaded once per page visit and shared by every form on it.
let cache = null;
let pending = null;
const loadCatalog = async () => {
  if (cache) return cache;
  if (!pending) {
    pending = (async () => {
      const res = await axios.get(`${API_URL}/api/customer-folders/fields`, { headers: await authHeaders() });
      cache = res.data?.folders || [];
      return cache;
    })().finally(() => { pending = null; });
  }
  return pending;
};

export function useProductFields() {
  const [folders, setFolders] = useState(cache);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    loadCatalog().then((f) => live && setFolders(f), () => live && setError('Could not load the product details fields.'));
    return () => { live = false; };
  }, [version]);
  // Categories added / renamed / deleted on this page → load again.
  useEffect(() => {
    const onChange = () => { cache = null; setVersion((v) => v + 1); };
    window.addEventListener('customer-folders-changed', onChange);
    return () => window.removeEventListener('customer-folders-changed', onChange);
  }, []);
  const byId = Object.fromEntries((folders || []).map((f) => [Number(f.id), f]));
  return { folders, byId, error };
}

// { folderId: { key: value } } for one product (ref 0 = the customer's own product, else the policy id).
export const detailsForRef = (productDetails, ref) => {
  const out = {};
  (productDetails || []).filter((d) => Number(d.policy_ref) === Number(ref)).forEach((d) => { out[d.folder_id] = { ...d.data }; });
  return out;
};

// Required fields that are empty, as "Life Insurance: Sum Assured" (checked before sending; the server checks too).
export const missingRequired = (byId, folderIds, values) => {
  const out = [];
  (folderIds || []).forEach((fid) => {
    const f = byId[Number(fid)];
    (f?.fields || []).forEach((field) => {
      if (field.required && !String(values?.[fid]?.[field.key] ?? '').trim()) out.push(`${f.name}: ${field.label}`);
    });
  });
  return out;
};

const money = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
const showDate = (v) => {
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
// "Label: value" pairs for display (cards, profile).
export const describeDetails = (byId, values) => {
  const out = [];
  Object.entries(values || {}).forEach(([fid, data]) => {
    const fields = byId[Number(fid)]?.fields || [];
    Object.entries(data || {}).forEach(([k, v]) => {
      if (v === null || v === '') return;
      const f = fields.find((x) => x.key === k);
      if (!f) return; // a hidden / removed field: kept in the database, not shown
      out.push([f.label, f.type === 'money' ? money(v) : f.type === 'date' ? showDate(v) : String(v)]);
    });
  });
  return out;
};

// The inputs for the chosen product lines. Plain inputs so they fit both the customer form and the Mantine popups.
export default function ProductFieldsInputs({ folderIds = [], value = {}, onChange, idPrefix = 'pf' }) {
  const { byId, error } = useProductFields();
  const chosen = (folderIds || []).map((id) => byId[Number(id)]).filter((f) => f && f.fields.length);
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!chosen.length) return null;

  const set = (fid, key, v) => onChange({ ...value, [fid]: { ...(value[fid] || {}), [key]: v } });

  return (
    <div className="space-y-4">
      {chosen.map((folder) => (
        <fieldset key={folder.id} className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{folder.name} details</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folder.fields.map((f) => {
              const id = `${idPrefix}-${folder.id}-${f.key}`;
              const v = value?.[folder.id]?.[f.key] ?? '';
              const common = { id, name: id, value: v, onChange: (e) => { const nv = e.currentTarget.value; set(folder.id, f.key, nv); }, required: f.required };
              const wide = f.type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : '';
              return (
                <div key={f.key} className={`min-w-0 ${wide}`}>
                  <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea {...common} rows={2} maxLength={2000} className="form-textarea w-full" />
                  ) : f.type === 'select' || f.type === 'yesno' ? (
                    <select {...common} className="form-select w-full">
                      <option value="">Select</option>
                      {(f.type === 'yesno' ? ['Yes', 'No'] : f.options).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      {...common}
                      type={f.type === 'date' ? 'date' : f.type === 'number' || f.type === 'money' ? 'number' : 'text'}
                      min={f.type === 'number' || f.type === 'money' ? 0 : undefined}
                      step={f.type === 'money' ? '0.01' : f.type === 'number' ? 'any' : undefined}
                      maxLength={f.type === 'text' ? 200 : undefined}
                      inputMode={f.type === 'number' || f.type === 'money' ? 'decimal' : undefined}
                      className="form-input w-full"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

// For tests.
export const _resetProductFieldsCache = () => { cache = null; pending = null; };
