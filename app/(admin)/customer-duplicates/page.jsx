'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ActionIcon, Badge, Button, Checkbox, CloseButton, Loader, Modal, Radio, Text, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconArrowLeft, IconExternalLink, IconGitMerge, IconSearch } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from '@/components/customers/useCreateCustomer';
import CustomerStatusBadge from '@/components/customers/CustomerStatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// One group of records that share a phone or email. The admin picks the main profile and which records
// to merge into it; nothing changes until they confirm.
function DuplicateGroup({ group, onMerged }) {
  const [mainId, setMainId] = useState(group[0].id);
  const [selected, setSelected] = useState(group.slice(1).map((r) => r.id));
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPhone = useMediaQuery('(max-width: 639px)');

  const toMerge = selected.filter((id) => id !== mainId);
  const main = group.find((r) => r.id === mainId);

  const pickMain = (id) => {
    setMainId(id);
    // The old main becomes a record to merge; the new main can't be merged into itself.
    setSelected((prev) => [...new Set([...prev.filter((x) => x !== id), mainId])]);
  };
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const merge = async () => {
    setSaving(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/customers/merge`, { main_id: mainId, merge_ids: toMerge }, { headers: await authHeaders() });
      const s = data.summary || {};
      showNotification({
        title: 'Customers merged',
        message: `${s.merged} record(s) merged into ${main.full_name}. Moved: ${s.policies} policies, ${s.appointments} appointments, ${s.followups} follow-ups.`,
        color: 'green',
      });
      setConfirming(false);
      onMerged();
    } catch (err) {
      showNotification({ title: 'Could not merge', message: errorMessage(err, 'Could not merge these customers. Nothing was changed. Please try again.'), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  // What the records in this group share, e.g. "Same phone: 98765 43210".
  const shared = [
    group.some((r) => r.matched_on?.includes('phone')) && `Same phone: ${group.find((r) => r.matched_on?.includes('phone')).phone_number}`,
    group.some((r) => r.matched_on?.includes('email')) && `Same email: ${group.find((r) => r.matched_on?.includes('email')).email}`,
  ].filter(Boolean);

  return (
    <div className="panel !p-3 sm:!p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text weight={600}>{group.length} records may be the same person</Text>
          <div className="mt-1 flex flex-wrap gap-1">
            {shared.map((x) => (
              <Badge key={x} size="sm" color="orange" variant="light" className="max-w-full normal-case" styles={{ inner: { overflow: 'hidden', textOverflow: 'ellipsis' } }}>{x}</Badge>
            ))}
          </div>
        </div>
        <Button size="sm" leftIcon={<IconGitMerge size={16} />} disabled={!toMerge.length} onClick={() => setConfirming(true)} className="max-sm:w-full">
          {toMerge.length ? `Merge ${toMerge.length} into ${main?.full_name || 'kept record'}` : 'Tick a record to merge'}
        </Button>
      </div>

      <div className="space-y-2">
        {group.map((r) => {
          const isMain = r.id === mainId;
          const merging = !isMain && selected.includes(r.id);
          return (
            <div key={r.id} className={`rounded-lg border p-3 ${isMain ? 'border-green-500 bg-green-50/60 dark:border-green-600 dark:bg-green-900/10' : merging ? 'border-blue-300 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Text weight={600} className="min-w-0 break-words">{r.full_name || 'No name'}</Text>
                <CustomerStatusBadge status={r.status} size="xs" />
                {r.is_newest && <Badge size="xs" color="violet" variant="filled">Newest</Badge>}
                {isMain ? (
                  <Badge size="xs" color="green" variant="light">Will be kept</Badge>
                ) : merging ? (
                  <Badge size="xs" color="blue" variant="light">Will be merged</Badge>
                ) : (
                  <Badge size="xs" color="gray" variant="light">Left as it is</Badge>
                )}
                <a href={`/view-customer/${r.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600">
                  Open <IconExternalLink size={14} />
                </a>
              </div>
              <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                {r.phone_number && <div>{r.phone_number}</div>}
                {r.email && <div className="break-all">{r.email}</div>}
                {(r.product_name || r.policy_number) && <div>Product: {[r.product_name, r.policy_number].filter(Boolean).join(' · ')}</div>}
                {r.folders?.length > 0 && <div>Product lines: {r.folders.join(', ')}</div>}
                {r.assigned_to_name && <div>Assigned to: {r.assigned_to_name}</div>}
                <div>Added: {fmtDate(r.created_at)}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                <Radio checked={isMain} onChange={() => pickMain(r.id)} label="Keep this one" />
                {!isMain && <Checkbox checked={merging} onChange={() => toggle(r.id)} label="Same person, merge it" />}
              </div>
            </div>
          );
        })}
      </div>

      <Modal opened={confirming} onClose={() => !saving && setConfirming(false)} title="Merge these records?" centered fullScreen={isPhone}>
        <Text size="sm" mb="sm">
          {toMerge.length} record(s) will become part of <b>{main?.full_name}</b>, and they will no longer show as separate customers.
        </Text>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Nothing is lost: all policies, appointments, follow-ups and product lines move to <b>{main?.full_name}</b>.</li>
          <li>Details that differ are kept in notes; nothing is overwritten.</li>
          <li>{main?.full_name} stays with the same staff member.</li>
        </ul>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={() => setConfirming(false)} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button color="blue" loading={saving} onClick={merge} className="w-full sm:w-auto">
            Merge
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function CustomerDuplicatesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  // A group is shown when any of its records matches the search (name, phone, email, product, staff).
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !groups) return groups || [];
    const digits = q.replace(/\D/g, '');
    return groups.filter((g) => g.some((r) => {
      const text = [r.full_name, r.email, r.product_name, r.policy_number, r.assigned_to_name, ...(r.folders || [])].filter(Boolean).join(' ').toLowerCase();
      if (text.includes(q)) return true;
      return digits.length >= 3 && String(r.phone_number || '').replace(/\D/g, '').includes(digits);
    }));
  }, [groups, query]);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await axios.get(`${API_URL}/api/customers/duplicates`, { headers: await authHeaders() });
      setGroups(data.groups || []);
    } catch (err) {
      setGroups([]);
      setError(errorMessage(err, 'Could not load duplicate customers. Please try again.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" className="-ml-1.5 shrink-0" onClick={() => router.push('/customers')} aria-label="Back">
          <IconArrowLeft size={22} />
        </ActionIcon>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-white-light sm:text-xl">Duplicate Customers</h2>
          <Text size="xs" color="dimmed">Customers saved more than once with the same phone number or email.</Text>
        </div>
      </div>

      {groups === null ? (
        <div className="flex justify-center py-10"><Loader /></div>
      ) : error ? (
        <div className="panel text-center text-sm text-red-600">{error}</div>
      ) : groups.length === 0 ? (
        <div className="panel py-10 text-center">
          <Badge color="green" variant="light" size="lg" mb="sm">All clear</Badge>
          <Text size="sm" color="dimmed">No duplicate customers found.</Text>
        </div>
      ) : (
        <div className="space-y-4">
          <ol className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {['Choose the record to keep', 'Tick the records that are the same person', 'Click Merge'].map((step, i) => (
              <li key={step} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{i + 1}</span>
                <span className="text-gray-700 dark:text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <TextInput
              className="w-full sm:max-w-sm"
              placeholder="Search by name, phone, email or product"
              icon={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              rightSection={query ? <CloseButton size="sm" onClick={() => setQuery('')} aria-label="Clear search" /> : null}
              aria-label="Search duplicate customers"
            />
            <Text size="sm" color="dimmed">
              {query.trim() ? `${shown.length} of ${groups.length} group(s)` : `${groups.length} group(s) to review`}
            </Text>
          </div>
          {shown.length === 0 ? (
            <div className="panel py-8 text-center">
              <Text size="sm" color="dimmed">No duplicate customers match &quot;{query.trim()}&quot;.</Text>
              <Button variant="subtle" size="xs" mt="xs" onClick={() => setQuery('')}>Clear search</Button>
            </div>
          ) : (
            shown.map((g) => <DuplicateGroup key={g.map((r) => r.id).join('-')} group={g} onMerged={load} />)
          )}
        </div>
      )}
    </div>
  );
}
