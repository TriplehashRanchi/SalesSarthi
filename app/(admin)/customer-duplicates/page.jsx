'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ActionIcon, Badge, Button, Checkbox, Loader, Modal, Radio, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconArrowLeft, IconExternalLink, IconGitMerge } from '@tabler/icons-react';
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

  return (
    <div className="panel !p-3 sm:!p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Text weight={600}>{group.length} records look like the same person</Text>
        <Button size="sm" leftIcon={<IconGitMerge size={16} />} disabled={!toMerge.length} onClick={() => setConfirming(true)} className="max-sm:w-full">
          Review &amp; merge ({toMerge.length})
        </Button>
      </div>

      <div className="space-y-2">
        {group.map((r) => {
          const isMain = r.id === mainId;
          return (
            <div key={r.id} className={`rounded-lg border p-3 ${isMain ? 'border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Radio checked={isMain} onChange={() => pickMain(r.id)} label="Main profile" />
                <Checkbox checked={!isMain && selected.includes(r.id)} disabled={isMain} onChange={() => toggle(r.id)} label="Merge into main" />
                <a href={`/view-customer/${r.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600">
                  Open <IconExternalLink size={14} />
                </a>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Text weight={500} className="break-words">{r.full_name || 'No name'}</Text>
                <CustomerStatusBadge status={r.status} size="xs" />
              </div>
              <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                {r.phone_number && <div>{r.phone_number}</div>}
                {r.email && <div className="break-all">{r.email}</div>}
                {(r.product_name || r.policy_number) && <div>Product: {[r.product_name, r.policy_number].filter(Boolean).join(' · ')}</div>}
                {r.folders?.length > 0 && <div>Product lines: {r.folders.join(', ')}</div>}
                {r.assigned_to_name && <div>Assigned to: {r.assigned_to_name}</div>}
                <div>Added: {fmtDate(r.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal opened={confirming} onClose={() => !saving && setConfirming(false)} title="Merge these customers?" centered fullScreen={isPhone}>
        <Text size="sm" mb="sm">
          {toMerge.length} record(s) will be merged into <b>{main?.full_name}</b>.
        </Text>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Every policy, appointment, follow-up, reminder, product line and report moves to the main profile.</li>
          <li>Each record&apos;s product is kept as its own policy record.</li>
          <li>Empty details on the main profile are filled in. Details that differ are kept in notes; nothing is overwritten.</li>
          <li>The main profile keeps its assigned staff member.</li>
          <li>A full copy of every merged record is saved in the merge history.</li>
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
          <Text size="xs" color="dimmed">Customers with the same phone number or email. Review each group and merge only if it is the same person.</Text>
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
          <Text size="sm" color="dimmed">{groups.length} group(s) to review</Text>
          {groups.map((g) => (
            <DuplicateGroup key={g.map((r) => r.id).join('-')} group={g} onMerged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
