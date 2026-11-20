'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ActionIcon, Badge, Button, Modal, NumberInput, Text, TextInput, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';
import ProductLineSelect from './ProductLineSelect';
import ProductFieldsInputs, { describeDetails, detailsForRef, missingRequired, useProductFields } from './ProductFields';
import { useCustomerFolders } from './customerFolderApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) || d.getFullYear() < 1900 ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) || d.getFullYear() < 1900 ? '' : d.toLocaleDateString('en-CA');
};
const money = (v) => (v === null || v === undefined || v === '' ? '' : `₹${Number(v).toLocaleString('en-IN')}`);

const SOURCE_LABEL = { merge: 'From merged record', csv: 'From CSV upload', lead: 'From lead', add_product: 'Added product' };

const EMPTY = { folder_ids: [], company_name: '', product_name: '', policy_number: '', premium: '', coverage_amount: '', renewal_date: '', notes: '' };

// Add / edit one policy record. Nothing on the customer's own saved details changes.
// details: this product's saved product-specific values ({ folderId: { key: value } }).
function PolicyModal({ customerId, policy, details = {}, onClose, onSaved }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const editing = policy && policy !== 'new';
  const { byId: productLines } = useProductFields();
  const [form, setForm] = useState(() =>
    editing
      ? {
          folder_ids: policy.folder_ids || [],
          company_name: policy.company_name || '',
          product_name: policy.product_name || '',
          policy_number: policy.policy_number || '',
          premium: policy.premium ?? '',
          coverage_amount: policy.coverage_amount ?? '',
          renewal_date: toDateInput(policy.renewal_date),
          notes: policy.notes || '',
          product_fields: details,
        }
      : { ...EMPTY, product_fields: {} },
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Read the value now: React clears the event before the state update runs.
  const set = (k) => (v) => {
    const value = v && typeof v === 'object' && 'currentTarget' in v ? v.currentTarget.value : v;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim() && !form.company_name.trim() && !form.policy_number.trim()) {
      setError('Please enter the product name, company or policy number.');
      return;
    }
    const missing = missingRequired(productLines, form.folder_ids, form.product_fields);
    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body = { ...form, premium: form.premium ?? '', coverage_amount: form.coverage_amount ?? '' };
      const url = `${API_URL}/api/customers/${customerId}/policies${editing ? `/${policy.id}` : ''}`;
      const { data } = await axios[editing ? 'put' : 'post'](url, body, { headers: await authHeaders() });
      showNotification({ title: editing ? 'Product updated' : 'Product added', message: editing ? 'The changes were saved.' : 'The product was added to this customer.', color: 'green' });
      onSaved(data.policies || [], data.product_details);
    } catch (err) {
      setError(errorMessage(err, 'Could not save the product. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={() => !saving && onClose()} title={editing ? 'Edit product' : 'Add product'} centered size="lg" fullScreen={isPhone}>
      <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProductLineSelect label="Product line" value={form.folder_ids} onChange={set('folder_ids')} className="sm:col-span-2" />
        <div className="min-w-0 empty:hidden sm:col-span-2">
          <ProductFieldsInputs folderIds={form.folder_ids} value={form.product_fields} onChange={(next) => setForm((f) => ({ ...f, product_fields: next }))} idPrefix={`pol-${editing ? policy.id : 'new'}`} />
        </div>
        <TextInput label="Product name" value={form.product_name} onChange={set('product_name')} maxLength={100} />
        <TextInput label="Company" value={form.company_name} onChange={set('company_name')} maxLength={100} />
        <TextInput label="Policy number" value={form.policy_number} onChange={set('policy_number')} maxLength={50} />
        <TextInput label="Renewal date" type="date" value={form.renewal_date} onChange={set('renewal_date')} />
        <NumberInput label="Premium (₹)" value={form.premium === '' ? undefined : Number(form.premium)} onChange={(v) => set('premium')(v ?? '')} min={0} precision={2} hideControls />
        <NumberInput label="Coverage (₹)" value={form.coverage_amount === '' ? undefined : Number(form.coverage_amount)} onChange={(v) => set('coverage_amount')(v ?? '')} min={0} precision={2} hideControls />
        <Textarea label="Notes" value={form.notes} onChange={set('notes')} autosize minRows={2} className="sm:col-span-2" />
        {error && <Text size="sm" color="red" className="sm:col-span-2">{error}</Text>}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">{editing ? 'Save changes' : 'Add product'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Products & policies on a customer profile: the one saved on the customer itself, plus every separate
// policy record (added here, from a lead, a CSV, or a merged duplicate).
// editable: shows "+ Add Product" and edit/remove on policy records. editPath: where the customer's own product is edited.
// addSignal: change it (e.g. a counter) to open "Add product" from outside (the profile's quick actions).
// onChanged(policies): after a product is added, edited or removed.
export default function CustomerPolicies({ customer, editable = false, editPath, addSignal = 0, onChanged }) {
  const { folders } = useCustomerFolders();
  const [policies, setPolicies] = useState(customer.policies || []);
  const [productDetails, setProductDetails] = useState(customer.product_details || []);
  const { byId: productLines } = useProductFields();
  const [modal, setModal] = useState(null); // null | 'new' | policy

  useEffect(() => {
    if (addSignal && editable) setModal('new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  const update = (list, details) => {
    setPolicies(list);
    if (Array.isArray(details)) setProductDetails(details);
    onChanged?.(list);
  };
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const isPhone = useMediaQuery('(max-width: 639px)');

  const folderName = Object.fromEntries([...(folders || []), ...(customer.folders || [])].map((f) => [f.id, f.name]));
  const primary = ['company_name', 'product_name', 'policy_number', 'premium', 'coverage_amount', 'renewal_date'].some((f) => customer[f])
    ? [{ ...customer, id: 'main', notes: null, source: null, folder_ids: [], created_at: null }]
    : [];
  const items = [...primary, ...policies];
  const merges = customer.merge_history || [];

  const remove = async () => {
    setBusy(true);
    try {
      const { data } = await axios.delete(`${API_URL}/api/customers/${customer.id}/policies/${removing.id}`, { headers: await authHeaders() });
      update(data.policies || [], data.product_details);
      setRemoving(null);
      showNotification({ title: 'Product removed', message: 'The product was removed from this customer.', color: 'green' });
    } catch (err) {
      showNotification({ title: 'Could not remove', message: errorMessage(err, 'Could not remove the product. Please try again.'), color: 'red' });
    } finally {
      setBusy(false);
    }
  };

  if (!editable && !items.length && !merges.length) return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="text-base font-semibold dark:text-white-light">
          Products &amp; Policies {items.length > 0 && <span className="text-sm font-normal text-gray-500">({items.length})</span>}
        </div>
        {editable && (
          <Button size="xs" variant="light" leftIcon={<IconPlus size={14} />} onClick={() => setModal('new')}>
            Add Product
          </Button>
        )}
      </div>

      {!items.length && editable && <Text size="sm" color="dimmed">No products yet. Use &quot;Add Product&quot; to add one.</Text>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((p) => {
          const lines = (p.folder_ids || []).map((id) => folderName[id]).filter(Boolean);
          const facts = [
            ['Company', p.company_name],
            ['Policy no.', p.policy_number],
            ['Premium', money(p.premium)],
            ['Coverage', money(p.coverage_amount)],
            ['Renewal', fmtDate(p.renewal_date)],
          ].filter(([, v]) => v);
          const isMain = p.id === 'main';
          return (
            <div key={p.id} className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Text weight={600} className="min-w-0 break-words">{p.product_name || 'Product'}</Text>
                  {isMain && <Badge size="xs" color="blue" variant="outline">Main</Badge>}
                  {lines.map((l) => (
                    <Badge key={l} size="xs" variant="light">{l}</Badge>
                  ))}
                  {p.source && SOURCE_LABEL[p.source] && <Badge size="xs" color="gray" variant="outline">{SOURCE_LABEL[p.source]}</Badge>}
                </div>
                {editable && !isMain && (
                  <div className="flex shrink-0 gap-1">
                    <ActionIcon variant="subtle" color="blue" onClick={() => setModal(p)} aria-label="Edit product"><IconPencil size={16} /></ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => setRemoving(p)} aria-label="Remove product"><IconTrash size={16} /></ActionIcon>
                  </div>
                )}
                {editable && isMain && editPath && (
                  <ActionIcon component="a" href={editPath} variant="subtle" color="blue" aria-label="Edit main product" className="shrink-0"><IconPencil size={16} /></ActionIcon>
                )}
              </div>
              {facts.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {facts.map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <span className="text-xs text-gray-500">{k}: </span>
                      <span className="break-words">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const extra = describeDetails(productLines, detailsForRef(productDetails, isMain ? 0 : p.id));
                return extra.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-sm dark:border-gray-800">
                    {extra.map(([k, v]) => (
                      <div key={k} className="min-w-0"><span className="text-xs text-gray-500">{k}: </span><span className="break-words">{v}</span></div>
                    ))}
                  </div>
                );
              })()}
              {p.notes && <div className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-400">{p.notes}</div>}
              {!isMain && p.created_at && <div className="mt-2 text-xs text-gray-400">Added {fmtDate(p.created_at)}</div>}
            </div>
          );
        })}
      </div>

      {merges.length > 0 && (
        <Text size="xs" color="dimmed" mt="sm">
          {merges.length} duplicate record(s) were merged into this profile. A full copy of each is kept in the merge history.
        </Text>
      )}

      {modal && (
        <PolicyModal
          key={modal === 'new' ? 'new' : modal.id}
          customerId={customer.id}
          policy={modal}
          details={modal === 'new' ? {} : detailsForRef(productDetails, modal.id)}
          onClose={() => setModal(null)}
          onSaved={(list, details) => {
            update(list, details);
            setModal(null);
          }}
        />
      )}

      <Modal opened={!!removing} onClose={() => !busy && setRemoving(null)} title="Remove this product?" centered fullScreen={isPhone}>
        <Text size="sm" mb="md">
          <b>{removing?.product_name || removing?.policy_number || 'This product'}</b> will be removed from this customer. The customer and their other products stay as they are.
        </Text>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={() => setRemoving(null)} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
          <Button color="red" loading={busy} onClick={remove} className="w-full sm:w-auto">Remove</Button>
        </div>
      </Modal>
    </div>
  );
}
