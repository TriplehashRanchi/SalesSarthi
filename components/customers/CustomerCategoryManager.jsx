'use client';
// Manage product categories (#06) and delete one safely (#07).
// #06: the four defaults are fixed; shared ones come from the Super Admin; an admin may add / rename / delete
//      their OWN categories only if the Super Admin allowed it (each permission separately).
// #07: deleting a category with customers asks where each customer goes (one category for all, or per
//      customer) and deletes only after confirmation. Customers, products and history are kept.
import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Badge, Button, Checkbox, Loader, Modal, Select, Text, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconLock, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { errorMessage } from './useCreateCustomer';
import {
  addCategory, categoryDeletePreview, deleteCategory, fetchCategoryDeletions, fetchCategoryPermissions, notifyFoldersChanged, renameCategory, useCustomerFolders,
} from './customerFolderApi';

const SAME = '__bulk__';
const REMOVE = 'remove';
const fmt = (v) => {
  const d = v ? new Date(String(v).replace(' ', 'T')) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

function DeleteCategory({ category, onClose, onDone }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [bulk, setBulk] = useState(null);
  const [moves, setMoves] = useState({});
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setPreview(await categoryDeletePreview(category.id));
      } catch (err) {
        setError(errorMessage(err, 'Could not check this category. Please try again.'));
      }
    })();
  }, [category.id]);

  const customers = preview?.customers || [];
  const targetData = (preview?.targets || []).map((t) => ({ value: String(t.id), label: t.name }));
  const needsBulk = customers.some((c) => !moves[c.id] || moves[c.id] === SAME);
  const missing = preview && preview.customer_count > 0 && needsBulk && !bulk;

  const run = async () => {
    setError('');
    if (missing) return setError('Please choose the category to move the customers to.');
    if (preview.customer_count > 0 && !sure) return setError('Please tick the box to confirm.');
    setBusy(true);
    try {
      const body = { target_id: bulk ? Number(bulk) : undefined, moves: Object.fromEntries(Object.entries(moves).filter(([, v]) => v && v !== SAME).map(([k, v]) => [k, v === REMOVE ? REMOVE : Number(v)])) };
      const out = await deleteCategory(category.id, body);
      showNotification({
        title: 'Category deleted',
        message: out.customer_count ? `"${category.name}" was deleted. ${out.customer_count} customer(s) were moved; their profiles, products and history are kept.` : `"${category.name}" was deleted.`,
        color: 'green',
        autoClose: 7000,
      });
      notifyFoldersChanged();
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the category. Nothing was changed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened onClose={() => !busy && onClose()} title={`Delete "${category.name}"?`} centered size="lg" fullScreen={isPhone}>
      {!preview && !error ? (
        <div className="flex justify-center py-6"><Loader size="sm" /></div>
      ) : preview ? (
        <div className="space-y-4">
          {preview.customer_count === 0 ? (
            <Text size="sm">No customers are in this category. It can be deleted straight away.</Text>
          ) : (
            <>
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                <b>{preview.customer_count}</b> customer(s){preview.policies_count ? ` and ${preview.policies_count} product(s)` : ''} are in this category.
                Choose where they go. Their profiles, products, responses and history are kept; only the category changes.
              </div>
              <Select
                label="Move all customers to"
                placeholder="Choose a category"
                data={targetData}
                value={bulk}
                onChange={(v) => { setBulk(v); setError(''); }}
                withinPortal
                required={needsBulk}
              />
              {customers.length > 0 && (
                <div>
                  <Text size="sm" weight={600} mb={4}>Or choose for each customer</Text>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
                    {customers.map((c) => (
                      <div key={c.id} className="grid grid-cols-1 items-center gap-1 border-b border-gray-100 py-1.5 last:border-b-0 dark:border-gray-800 sm:grid-cols-2 sm:gap-3">
                        <div className="min-w-0 text-sm">
                          <div className="truncate font-medium">{c.full_name || 'No name'}</div>
                          <div className="truncate text-xs text-gray-500">{c.phone_number}{c.other_categories.length ? ` · also in ${c.other_categories.map((o) => o.name).join(', ')}` : ''}</div>
                        </div>
                        <Select
                          size="xs"
                          aria-label={`Category for ${c.full_name}`}
                          data={[
                            { value: SAME, label: bulk ? `Same as above (${targetData.find((t) => t.value === bulk)?.label})` : 'Same as above' },
                            ...targetData,
                            ...(c.other_categories.length ? [{ value: REMOVE, label: 'Just take out of this category' }] : []),
                          ]}
                          value={moves[c.id] || SAME}
                          onChange={(v) => setMoves((m) => ({ ...m, [c.id]: v }))}
                          withinPortal
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Checkbox checked={sure} onChange={(e) => { const v = e.currentTarget.checked; setSure(v); }} label={`Yes, move the customers and delete "${category.name}"`} />
            </>
          )}
        </div>
      ) : null}
      {error && <Text size="sm" color="red" mt="sm">{error}</Text>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="default" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
        {preview && <Button color="red" onClick={run} loading={busy} className="w-full sm:w-auto">{preview.customer_count ? 'Move & delete' : 'Delete'}</Button>}
      </div>
    </Modal>
  );
}

export default function CustomerCategoryManager({ opened, onClose }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const { folders, reload } = useCustomerFolders();
  const [perms, setPerms] = useState(null);
  const [permError, setPermError] = useState('');
  const [edit, setEdit] = useState(null); // null | { id?, name }
  const [removing, setRemoving] = useState(null);
  const [deletions, setDeletions] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadExtras = useCallback(async () => {
    try {
      setPerms(await fetchCategoryPermissions());
    } catch (err) {
      setPermError(errorMessage(err, 'Could not load your permissions. Please try again.'));
    }
    try {
      setDeletions(await fetchCategoryDeletions());
    } catch (_) {
      setDeletions([]);
    }
  }, []);
  useEffect(() => {
    if (opened) {
      setEdit(null);
      setError('');
      reload();
      loadExtras();
    }
  }, [opened, reload, loadExtras]);

  const save = async (e) => {
    e.preventDefault();
    const name = String(edit.name || '').trim();
    if (!name) return setError('Please enter the category name.');
    setBusy(true);
    setError('');
    try {
      if (edit.id) await renameCategory(edit.id, name);
      else await addCategory(name);
      showNotification({ title: edit.id ? 'Category renamed' : 'Category added', message: edit.id ? `Now called "${name}".` : `"${name}" is ready. Only your account sees it.`, color: 'green' });
      setEdit(null);
      notifyFoldersChanged();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the category. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const defaults = folders.filter((f) => f.is_default);
  const shared = folders.filter((f) => !f.is_default && !f.is_custom);
  const mine = folders.filter((f) => f.is_custom);
  const p = perms || { can_add: false, can_edit: false, can_delete: false };
  const Row = ({ f, locked }) => (
    <div className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-b-0 dark:border-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Text size="sm" weight={500} className="min-w-0 break-words">{f.name}</Text>
          {locked && <IconLock size={12} className="shrink-0 text-gray-400" aria-label="Fixed" />}
        </div>
        <Text size="xs" color="dimmed">{f.customer_count} customer{Number(f.customer_count) === 1 ? '' : 's'}</Text>
      </div>
      {f.is_custom && p.can_edit && <ActionIcon variant="subtle" color="blue" onClick={() => { setError(''); setEdit({ id: f.id, name: f.name }); }} aria-label={`Rename ${f.name}`}><IconPencil size={16} /></ActionIcon>}
      {f.is_custom && p.can_delete && <ActionIcon variant="subtle" color="red" onClick={() => setRemoving(f)} aria-label={`Delete ${f.name}`}><IconTrash size={16} /></ActionIcon>}
    </div>
  );

  return (
    <Modal opened={opened} onClose={() => !busy && onClose()} title="Product categories" centered size="lg" fullScreen={isPhone}>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center gap-2"><Text size="sm" weight={600}>Default</Text><Badge size="xs" color="gray" variant="outline">Fixed</Badge></div>
          {defaults.map((f) => <Row key={f.id} f={f} locked />)}
        </div>
        {shared.length > 0 && (
          <div>
            <Text size="sm" weight={600} mb={4}>Shared</Text>
            {shared.map((f) => <Row key={f.id} f={f} locked />)}
          </div>
        )}
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Text size="sm" weight={600}>Your categories</Text><Badge size="xs" variant="light">Only your account sees these</Badge></div>
            {p.can_add && !edit && <Button size="xs" variant="light" leftIcon={<IconPlus size={14} />} onClick={() => { setError(''); setEdit({ name: '' }); }}>Add category</Button>}
          </div>
          {mine.length ? mine.map((f) => <Row key={f.id} f={f} />) : <Text size="xs" color="dimmed">None yet.</Text>}
          {edit && (
            <form onSubmit={save} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <TextInput label={edit.id ? 'New name' : 'Category name'} value={edit.name} onChange={(e) => { const v = e.currentTarget.value; setEdit((x) => ({ ...x, name: v })); }} maxLength={60} placeholder="e.g. NRI Clients" className="flex-1" data-autofocus />
              <div className="flex gap-2">
                <Button variant="default" onClick={() => setEdit(null)} disabled={busy} className="flex-1 sm:flex-none">Cancel</Button>
                <Button type="submit" loading={busy} className="flex-1 sm:flex-none">Save</Button>
              </div>
            </form>
          )}
        </div>
        {perms && !p.can_add && !p.can_edit && !p.can_delete && (
          <Text size="xs" color="dimmed">You can use these categories. To add, rename or delete your own categories, ask the Super Admin for permission.</Text>
        )}
        {permError && <Text size="xs" color="red">{permError}</Text>}
        {error && <Text size="sm" color="red">{error}</Text>}
        {deletions?.length > 0 && (
          <div>
            <Text size="sm" weight={600} mb={4}>Deleted categories</Text>
            {deletions.slice(0, 10).map((d) => (
              <Text key={d.id} size="xs" color="dimmed">
                &quot;{d.folder_name}&quot; · {fmt(d.created_at)} · {d.customer_count} customer(s){d.bulk_target_name ? ` moved to ${d.bulk_target_name}` : ''}
              </Text>
            ))}
          </div>
        )}
      </div>
      {removing && (
        <DeleteCategory
          category={removing}
          onClose={() => setRemoving(null)}
          onDone={() => { setRemoving(null); loadExtras(); }}
        />
      )}
    </Modal>
  );
}
