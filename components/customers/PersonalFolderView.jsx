'use client';
// #12 A personal folder: customers added by hand and/or brought in by rules. A customer can be in many folders —
// it is always the same profile, never a copy. Taking a customer out never deletes them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ActionIcon, Badge, Button, Checkbox, Loader, Modal, MultiSelect, NumberInput, Tabs, Text, TextInput,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFilter, IconPencil, IconPlus, IconSearch, IconTrash, IconUserMinus, IconUserPlus } from '@tabler/icons-react';
import { notifyFoldersChanged } from './customerFolderApi';
import {
  addRule, addToPersonalFolder, deleteRule, describeRule, fetchKeptOut, fetchPersonalFolder, fetchRuleOptions, letBackIn,
  previewRule, removeFromPersonalFolder, searchCandidates, updateRule,
} from './personalFolderApi';

const errText = (err, fallback) => err?.response?.data?.message || fallback;

/* ───────── Add customers (search + tick) ───────── */
export function AddCustomersModal({ opened, folder, onClose, onAdded }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!opened) return undefined;
    const n = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchCandidates(folder.id, q);
        if (n === seq.current) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (n === seq.current) showNotification({ color: 'red', title: 'Could not search', message: errText(err, 'Could not search customers. Please try again.') });
      } finally {
        if (n === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, opened, folder.id]);

  useEffect(() => {
    if (opened) { setQ(''); setPicked(new Set()); }
  }, [opened]);

  const toggle = (id) => setPicked((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const add = async () => {
    setSaving(true);
    try {
      const r = await addToPersonalFolder(folder.id, [...picked]);
      showNotification({ color: 'green', title: 'Added', message: `${r.added} customer${r.added === 1 ? '' : 's'} added to "${folder.name}".` });
      notifyFoldersChanged();
      onAdded();
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not add', message: errText(err, 'Could not add the customers. Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Text weight={600}>Add customers to “{folder.name}”</Text>} size="md" centered>
      <TextInput icon={<IconSearch size={16} />} placeholder="Search by name, phone or email" value={q} onChange={(e) => setQ(e.currentTarget.value)} autoFocus aria-label="Search customers" />
      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6"><Loader size="sm" /></div>
        ) : !rows.length ? (
          <Text size="sm" color="dimmed" align="center" py="md">No customers found.</Text>
        ) : rows.map((r) => (
          <label key={r.id} className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-gray-700 ${r.in_folder ? 'opacity-60' : ''}`}>
            <Checkbox checked={r.in_folder || picked.has(r.id)} disabled={r.in_folder} onChange={() => toggle(r.id)} aria-label={`Pick ${r.full_name}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.full_name || `Customer #${r.id}`}</div>
              <div className="truncate text-xs text-gray-500">{[r.phone_number, r.email].filter(Boolean).join(' · ')}</div>
            </div>
            {r.in_folder && <Badge size="xs" variant="light">Already in</Badge>}
          </label>
        ))}
      </div>
      <Text size="xs" color="dimmed" mt="xs">Showing up to 50 results. Search to find more.</Text>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button leftIcon={<IconUserPlus size={16} />} onClick={add} disabled={!picked.size} loading={saving}>
          Add {picked.size || ''} {picked.size === 1 ? 'customer' : 'customers'}
        </Button>
      </div>
    </Modal>
  );
}

/* ───────── Rule editor with live preview ───────── */
const EMPTY = { category_ids: [], staff_ids: [], statuses: [], sources: [], renewal_within_days: '', product_text: '' };
const toForm = (c = {}) => ({
  category_ids: (c.category_ids || []).map(String),
  staff_ids: (c.staff_ids || []).map(String),
  statuses: c.statuses || [],
  sources: c.sources || [],
  renewal_within_days: c.renewal_within_days || '',
  product_text: c.product_text || '',
});
export const toCriteria = (f) => {
  const c = {};
  if (f.category_ids.length) c.category_ids = f.category_ids.map(Number);
  if (f.staff_ids.length) c.staff_ids = f.staff_ids.map((s) => (s === 'unassigned' ? s : Number(s)));
  if (f.statuses.length) c.statuses = f.statuses;
  if (f.sources.length) c.sources = f.sources;
  if (f.renewal_within_days !== '' && f.renewal_within_days !== undefined && f.renewal_within_days !== null) c.renewal_within_days = Number(f.renewal_within_days);
  if (f.product_text.trim()) c.product_text = f.product_text.trim();
  return c;
};

export function RuleEditor({ opened, folder, rule, options, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extraSources, setExtraSources] = useState([]);
  const seq = useRef(0);

  useEffect(() => {
    if (opened) { setForm(rule ? toForm(rule.criteria) : EMPTY); setPreview(null); setExtraSources(rule?.criteria?.sources || []); }
  }, [opened, rule]);

  const criteria = useMemo(() => toCriteria(form), [form]);
  const empty = !Object.keys(criteria).length;

  useEffect(() => {
    if (!opened || empty) { setPreview(null); return undefined; }
    const n = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await previewRule(criteria);
        if (n === seq.current) setPreview(r);
      } catch (err) {
        if (n === seq.current) setPreview({ error: errText(err, 'Could not check the rule. Please try again.') });
      } finally {
        if (n === seq.current) setChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [criteria, opened, empty]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const sourceData = [...new Set([...(options?.sources || []), ...extraSources])];

  const save = async () => {
    setSaving(true);
    try {
      if (rule) await updateRule(folder.id, rule.id, criteria);
      else await addRule(folder.id, criteria);
      showNotification({ color: 'green', title: 'Rule saved', message: 'Matching customers now show in this folder automatically.' });
      notifyFoldersChanged();
      onSaved();
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not save', message: errText(err, 'Could not save the rule. Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Text weight={600}>{rule ? 'Edit rule' : 'New rule'} — {folder.name}</Text>} size="lg" centered>
      <Text size="sm" color="dimmed" mb="sm">
        A customer comes in when they match <b>all</b> the conditions you fill. Leave a condition empty to ignore it.
      </Text>
      <div className="grid gap-3 sm:grid-cols-2">
        <MultiSelect label="Product category" placeholder="Any" data={(options?.categories || []).map((c) => ({ value: String(c.id), label: c.name }))} value={form.category_ids} onChange={set('category_ids')} withinPortal searchable clearable />
        <MultiSelect label="Status" placeholder="Any" data={options?.statuses || []} value={form.statuses} onChange={set('statuses')} withinPortal clearable />
        {options?.staff && (
          <MultiSelect
            label="Assigned to"
            placeholder="Anyone"
            data={[{ value: 'unassigned', label: 'Not assigned (you)' }, ...options.staff.map((s) => ({ value: String(s.id), label: s.username || `Staff #${s.id}` }))]}
            value={form.staff_ids}
            onChange={set('staff_ids')}
            withinPortal
            searchable
            clearable
          />
        )}
        <MultiSelect
          label="Source"
          placeholder="Any"
          data={sourceData}
          value={form.sources}
          onChange={set('sources')}
          searchable
          creatable
          getCreateLabel={(q) => `+ Use "${q}"`}
          onCreate={(q) => { setExtraSources((s) => [...s, q]); return q; }}
          withinPortal
          clearable
        />
        <NumberInput label="Renewal within (days)" placeholder="e.g. 30" min={1} max={366} value={form.renewal_within_days === '' ? undefined : Number(form.renewal_within_days)} onChange={(v) => set('renewal_within_days')(v === undefined || v === null ? '' : v)} />
        <TextInput label="Product name contains" placeholder="e.g. Term plan" maxLength={60} value={form.product_text} onChange={(e) => set('product_text')(e.currentTarget.value)} />
      </div>

      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-600" data-testid="rule-preview">
        {empty ? (
          <Text size="sm" color="dimmed">Choose at least one condition to see who would come in.</Text>
        ) : checking ? (
          <div className="flex items-center gap-2"><Loader size="xs" /><Text size="sm">Checking…</Text></div>
        ) : preview?.error ? (
          <Text size="sm" color="red">{preview.error}</Text>
        ) : preview ? (
          <>
            <Text size="sm" weight={600}>{preview.count} customer{preview.count === 1 ? '' : 's'} match right now</Text>
            {!!preview.sample?.length && <Text size="xs" color="dimmed">e.g. {preview.sample.join(', ')}{preview.count > preview.sample.length ? '…' : ''}</Text>}
            <Text size="xs" color="dimmed" mt={4}>New customers who match later will show up automatically.</Text>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={empty || !!preview?.error} loading={saving}>Save rule</Button>
      </div>
    </Modal>
  );
}

/* ───────── The folder screen ───────── */
export default function PersonalFolderView({ folder, isAdmin, folderSelect }) {
  const router = useRouter();
  const [data, setData] = useState({ customers: [], rules: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | rule
  const [options, setOptions] = useState(null);
  const [keptOut, setKeptOut] = useState([]);

  const load = useCallback(async () => {
    try {
      const [d, k] = await Promise.all([fetchPersonalFolder(folder.id), fetchKeptOut(folder.id).catch(() => [])]);
      setData({ customers: d.customers || [], rules: d.rules || [] });
      setKeptOut(Array.isArray(k) ? k : []);
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not load', message: errText(err, 'Could not load the folder. Please try again.') });
    } finally {
      setLoading(false);
    }
  }, [folder.id]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    fetchRuleOptions().then(setOptions).catch(() => setOptions({ categories: [], statuses: [], sources: [] }));
  }, []);

  const changed = () => { load(); notifyFoldersChanged(); };
  const openCustomer = (id) => router.push(isAdmin ? `/view-customer/${id}` : `/usereditcustomer/${id}`);

  const takeOut = async (row) => {
    const msg = row.by_rule
      ? `Take ${row.full_name} out of "${folder.name}"? A rule brings them in, so they will be kept out from now on (you can let them back in). The customer is not deleted.`
      : `Take ${row.full_name} out of "${folder.name}"? The customer is not deleted.`;
    if (!window.confirm(msg)) return;
    try {
      await removeFromPersonalFolder(folder.id, row.id);
      showNotification({ color: 'green', title: 'Taken out', message: `${row.full_name} is no longer in "${folder.name}".` });
      changed();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not take out', message: errText(err, 'Could not remove the customer. Please try again.') });
    }
  };
  const allowBack = async (row) => {
    try {
      await letBackIn(folder.id, row.id);
      showNotification({ color: 'green', title: 'Done', message: `${row.full_name} follows the rules again.` });
      changed();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not change', message: errText(err, 'Could not change. Please try again.') });
    }
  };
  const removeRule = async (rule) => {
    if (!window.confirm('Delete this rule? Customers it brought in will leave the folder (customers you added by hand stay).')) return;
    try {
      await deleteRule(folder.id, rule.id);
      showNotification({ color: 'green', title: 'Rule deleted', message: 'The rule was deleted.' });
      changed();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not delete', message: errText(err, 'Could not delete the rule. Please try again.') });
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter((r) => [r.full_name, r.phone_number, r.email].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data.customers, search]);

  const count = data.customers.length;

  return (
    <div className="panel mt-0 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-2 min-w-0">
          <h5 className="truncate text-xl font-semibold leading-tight dark:text-white-light">{folder.name}</h5>
          <div className="text-sm text-gray-500">{count} {count === 1 ? 'Customer' : 'Customers'} · My folder</div>
        </div>
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {folderSelect}
          <Button variant="light" leftIcon={<IconFilter size={16} />} onClick={() => setEditing('new')}>Add rule</Button>
          <Button leftIcon={<IconUserPlus size={16} />} onClick={() => setAdding(true)}>Add customers</Button>
        </div>
      </div>

      <Tabs value={tab} onTabChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="customers">Customers ({count})</Tabs.Tab>
          <Tabs.Tab value="rules">Rules ({data.rules.length})</Tabs.Tab>
          <Tabs.Tab value="kept">Kept out ({keptOut.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="customers" pt="sm">
          <TextInput icon={<IconSearch size={16} />} placeholder="Search in this folder" radius="xl" className="mb-2 max-w-sm" value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
          {loading ? (
            <div className="flex justify-center py-8"><Loader size="sm" /></div>
          ) : !visible.length ? (
            <Text size="sm" color="dimmed" align="center" py="xl">
              {count ? 'No match for your search' : 'This folder is empty. Add customers by hand or add a rule to fill it automatically.'}
            </Text>
          ) : (
            <div>
              {visible.map((row) => (
                <div key={row.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-200 py-2.5 last:border-b-0 dark:border-gray-700" onClick={() => openCustomer(row.id)} data-testid={`pf-row-${row.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium">{row.full_name || `Customer #${row.id}`}</span>
                      {row.manual && <Badge size="xs" color="blue" variant="light">Added by you</Badge>}
                      {row.by_rule && <Badge size="xs" color="teal" variant="light">By rule</Badge>}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {[row.phone_number, row.email, row.status, isAdmin && row.assigned_to_name ? `Staff: ${row.assigned_to_name}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <ActionIcon variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); takeOut(row); }} aria-label={`Take ${row.full_name} out`} title="Take out of folder">
                    <IconUserMinus size={18} />
                  </ActionIcon>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="rules" pt="sm">
          <Text size="sm" color="dimmed" mb="sm">A customer is in this folder if they match <b>any</b> rule, or you added them by hand.</Text>
          {!data.rules.length ? (
            <Text size="sm" color="dimmed" align="center" py="md">No rules yet.</Text>
          ) : data.rules.map((r, n) => (
            <div key={r.id} className="mb-2 flex items-start gap-2 rounded-md border border-gray-200 p-2.5 dark:border-gray-700">
              <Badge size="sm" variant="outline" className="mt-0.5 shrink-0">Rule {n + 1}</Badge>
              <Text size="sm" className="min-w-0 flex-1 break-words">{describeRule(r.criteria, options || {})}</Text>
              <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => setEditing(r)} aria-label={`Edit rule ${n + 1}`}><IconPencil size={16} /></ActionIcon>
              <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeRule(r)} aria-label={`Delete rule ${n + 1}`}><IconTrash size={16} /></ActionIcon>
            </div>
          ))}
          <Button mt="xs" variant="light" leftIcon={<IconPlus size={16} />} onClick={() => setEditing('new')}>Add rule</Button>
        </Tabs.Panel>

        <Tabs.Panel value="kept" pt="sm">
          <Text size="sm" color="dimmed" mb="sm">Customers you took out although a rule matches them. They stay out until you let them back in.</Text>
          {!keptOut.length ? (
            <Text size="sm" color="dimmed" align="center" py="md">Nobody is kept out.</Text>
          ) : keptOut.map((row) => (
            <div key={row.id} className="flex items-center gap-3 border-b border-gray-200 py-2 last:border-0 dark:border-gray-700">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{row.full_name}</div>
                <div className="text-xs text-gray-500">{row.phone_number}</div>
              </div>
              <Button size="xs" variant="light" onClick={() => allowBack(row)}>Let back in</Button>
            </div>
          ))}
        </Tabs.Panel>
      </Tabs>

      <AddCustomersModal opened={adding} folder={folder} onClose={() => setAdding(false)} onAdded={load} />
      <RuleEditor opened={!!editing} folder={folder} rule={editing && editing !== 'new' ? editing : null} options={options} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}
