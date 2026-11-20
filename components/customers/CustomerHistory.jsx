'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Loader, Text } from '@mantine/core';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fmt = (v, withTime = false) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const duration = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s || 0}s`);

const METHOD = { single: 'Assigned', bulk: 'Assigned (bulk)', equal: 'Shared equally', conversion: 'From lead conversion', merge: 'After merging duplicates' };

function AssignmentRow({ h }) {
  const from = h.from_name || (h.from_user_id ? 'A team member' : 'Not assigned');
  const to = h.to_name || (h.to_user_id ? 'A team member' : 'Not assigned (admin)');
  const moved = [
    h.followups_moved ? plural(h.followups_moved, 'follow-up') : null,
    h.appointments_moved ? plural(h.appointments_moved, 'appointment') : null,
    h.reminders_moved ? plural(h.reminders_moved, 'reminder') : null,
  ].filter(Boolean);
  return (
    <div className="border-b border-gray-200 py-2 last:border-b-0 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge size="xs" variant="light">{METHOD[h.method] || 'Assigned'}</Badge>
        {h.method === 'merge' ? (
          <span className="break-words">Kept with <b>{to}</b></span>
        ) : h.method === 'conversion' ? (
          <span className="break-words">Assigned to <b>{to}</b></span>
        ) : (
          <span className="break-words">{from} → <b>{to}</b></span>
        )}
      </div>
      <Text size="xs" color="dimmed" mt={2}>
        {fmt(h.created_at, true)}{h.changed_by_name ? ` · by ${h.changed_by_name}` : ''}
        {moved.length ? ` · Moved: ${moved.join(', ')}` : ''}
        {h.followups_merged ? ` · ${plural(h.followups_merged, 'duplicate follow-up')} combined` : ''}
        {h.kept_with_previous?.length ? ` · Some ${h.kept_with_previous.join(' and ')} stayed with the previous staff member` : ''}
      </Text>
      {h.note && <Text size="xs" color="dimmed">{h.note}</Text>}
    </div>
  );
}

function ShowMore({ items, render, initial = 3, empty }) {
  const [all, setAll] = useState(false);
  if (!items.length) return empty ? <Text size="xs" color="dimmed">{empty}</Text> : null;
  const shown = all ? items : items.slice(0, initial);
  return (
    <>
      {shown.map(render)}
      {items.length > initial && (
        <Button variant="subtle" size="xs" compact onClick={() => setAll((v) => !v)} className="mt-1">
          {all ? 'Show less' : `Show all ${items.length}`}
        </Button>
      )}
    </>
  );
}

function LeadHistory({ item }) {
  const l = item.lead || {};
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <Text weight={600} size="sm">Converted from lead {l.full_name ? `"${l.full_name}"` : ''}</Text>
        <Badge size="xs" color="teal" variant="light">{item.created_new ? 'New customer' : 'Added to this customer'}</Badge>
        {item.lead_deleted && <Badge size="xs" color="gray" variant="outline">Lead deleted (copy kept)</Badge>}
      </div>
      <Text size="xs" color="dimmed" mt={2}>
        {fmt(item.linked_at, true)}
        {l.source ? ` · Source: ${l.source}` : ''}
        {l.assigned_to_name ? ` · Lead staff: ${l.assigned_to_name}` : ''}
        {l.created_at ? ` · Lead added ${fmt(l.created_at)}` : ''}
      </Text>
      {item.followups_moved > 0 && (
        <Text size="xs" mt={4}>{plural(item.followups_moved, 'pending follow-up')} moved to this customer.</Text>
      )}

      {l.notes && (
        <div className="mt-3">
          <Text size="xs" weight={600} color="dimmed">Lead remarks</Text>
          <div className="whitespace-pre-wrap break-words text-sm">{l.notes}</div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0">
          <Text size="xs" weight={600} color="dimmed" mb={2}>Calls ({item.calls.length})</Text>
          <ShowMore
            items={item.calls}
            empty="No calls logged."
            render={(c) => (
              <div key={c.id} className="py-1 text-xs">
                <b>{c.outcome}</b> · {duration(c.duration_seconds)} · {fmt(c.called_at, true)}{c.by_name ? ` · ${c.by_name}` : ''}
                {c.notes && <div className="break-words text-gray-600 dark:text-gray-400">{c.notes}</div>}
              </div>
            )}
          />
        </div>
        <div className="min-w-0">
          <Text size="xs" weight={600} color="dimmed" mb={2}>Lead follow-ups ({item.followups.length})</Text>
          <ShowMore
            items={item.followups}
            empty="No other follow-ups on the lead."
            render={(f) => (
              <div key={f.id} className="py-1 text-xs">
                <b>{f.purpose}</b> · {fmt(f.follow_up_date, true)} · {f.status}{f.creator_name ? ` · ${f.creator_name}` : ''}
                {f.notes && <div className="break-words text-gray-600 dark:text-gray-400">{f.notes}</div>}
              </div>
            )}
          />
        </div>
        <div className="min-w-0">
          <Text size="xs" weight={600} color="dimmed" mb={2}>Lead activity ({item.activity.length})</Text>
          <ShowMore
            items={item.activity}
            empty="No activity recorded."
            render={(a) => (
              <div key={a.id} className="break-words py-1 text-xs">
                {a.details || a.activity_type} · {fmt(a.created_at, true)}{a.actor_name ? ` · ${a.actor_name}` : ''}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}

// History on a customer profile: who it was assigned to, and the lead(s) it came from.
// reloadKey: change it to load again (e.g. after a reassignment).
export default function CustomerHistory({ customerId, reloadKey = 0 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/customers/${customerId}/history`, { headers: await authHeaders() });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the history. Please try again.'));
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (error) {
    return (
      <div className="mt-6 text-sm text-red-600">
        {error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button>
      </div>
    );
  }
  if (!data) return <div className="mt-6 flex justify-center"><Loader size="sm" /></div>;
  const { assignments = [], leads = [] } = data;
  if (!assignments.length && !leads.length) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className="text-base font-semibold dark:text-white-light">History</div>
      {leads.map((item) => <LeadHistory key={item.lead_id} item={item} />)}
      {assignments.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <Text weight={600} size="sm" mb={4}>Staff assignment</Text>
          <ShowMore items={assignments} initial={5} render={(h) => <AssignmentRow key={h.id} h={h} />} />
        </div>
      )}
    </div>
  );
}
