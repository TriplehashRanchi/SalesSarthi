'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Loader, Text } from '@mantine/core';
import {
  IconCalendarEvent, IconGitMerge, IconListCheck, IconPhone, IconPhoneCheck, IconPhoneOff, IconPhonePause, IconShieldCheck, IconUserCheck,
  IconUserPlus, IconArrowsTransferDown, IconBrandWhatsapp, IconMail, IconMessage, IconMessageX,
} from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';
import CallLogModal from './CallLogModal';
import MessageComposer from './MessageComposer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fmt = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

const FILTERS = [
  { value: null, label: 'All' },
  { value: 'call', label: 'Calls' },
  { value: 'message', label: 'Messages' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'followup', label: 'Follow-ups' },
  { value: 'product', label: 'Products' },
  { value: 'assignment', label: 'Staff' },
];

const CALL_ICON = { Connected: [IconPhoneCheck, 'bg-green-100 text-green-600 dark:bg-green-900/30'], 'Not Connected': [IconPhoneOff, 'bg-red-100 text-red-600 dark:bg-red-900/30'], Busy: [IconPhonePause, 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'] };
const TYPE_ICON = {
  appointment: [IconCalendarEvent, 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'],
  followup: [IconListCheck, 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'],
  product: [IconShieldCheck, 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'],
  assignment: [IconUserCheck, 'bg-gray-100 text-gray-600 dark:bg-gray-800'],
  lead: [IconArrowsTransferDown, 'bg-teal-100 text-teal-600 dark:bg-teal-900/30'],
  merge: [IconGitMerge, 'bg-gray-100 text-gray-600 dark:bg-gray-800'],
  customer: [IconUserPlus, 'bg-gray-100 text-gray-600 dark:bg-gray-800'],
  call: [IconPhone, 'bg-gray-100 text-gray-600 dark:bg-gray-800'],
  message: [IconMessage, 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'],
};
const MESSAGE_ICON = { whatsapp: [IconBrandWhatsapp, 'bg-green-100 text-green-600 dark:bg-green-900/30'], sms: [IconMessage, 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'], email: [IconMail, 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'] };

// The customer's activity timeline: calls (with status and remarks), appointments, follow-ups, products,
// staff changes, lead conversion and merges — newest first. reloadKey: change it to load again.
export default function CustomerTimeline({ customer, reloadKey = 0, onCallSaved }) {
  const [type, setType] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  const fetchPage = useCallback(async (before = null) => {
    const params = { limit: 30, ...(type ? { type } : {}), ...(before ? { before } : {}) };
    const res = await axios.get(`${API_URL}/api/customers/${customer.id}/timeline`, { headers: await authHeaders(), params });
    return res.data;
  }, [customer.id, type]);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await fetchPage());
    } catch (err) {
      setError(errorMessage(err, 'Could not load the activity. Please try again.'));
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const loadMore = async () => {
    const last = data?.items?.at(-1);
    if (!last) return;
    setMore(true);
    try {
      const next = await fetchPage(last.at);
      setData((d) => ({ ...next, items: [...d.items, ...next.items.filter((it) => !d.items.some((x) => x.id === it.id))], counts: d.counts }));
    } catch (err) {
      setError(errorMessage(err, 'Could not load more. Please try again.'));
    } finally {
      setMore(false);
    }
  };

  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="text-base font-semibold dark:text-white-light">Activity</div>
        <div className="flex gap-2">
          <Button size="xs" variant="light" leftIcon={<IconMessage size={14} />} onClick={() => setMsgOpen(true)}>Send message</Button>
          <Button size="xs" variant="light" leftIcon={<IconPhone size={14} />} onClick={() => setLogOpen(true)}>Log a call</Button>
        </div>
      </div>

      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const n = f.value ? counts[f.value] || 0 : total;
          const on = type === f.value;
          return (
            <button
              key={f.label}
              type="button"
              aria-pressed={on}
              onClick={() => { setType(f.value); setData(null); }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
            >
              {f.label}{data ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button></div>
      ) : !data ? (
        <div className="flex justify-center py-4"><Loader size="sm" /></div>
      ) : !data.items.length ? (
        <Text size="sm" color="dimmed">{type === 'call' ? 'No calls logged yet. Use "Call" or "Log a call".' : type === 'message' ? 'No messages yet. Use "Send message".' : 'Nothing here yet.'}</Text>
      ) : (
        <ol className="relative">
          {data.items.map((it, i) => {
            const [Icon, tone] = (it.type === 'call' && CALL_ICON[it.status]) || (it.type === 'message' && it.status === 'failed' && [IconMessageX, 'bg-red-100 text-red-600 dark:bg-red-900/30']) || (it.type === 'message' && MESSAGE_ICON[it.channel]) || TYPE_ICON[it.type] || TYPE_ICON.customer;
            return (
              <li key={it.id} className="relative flex gap-3 pb-4">
                {i < data.items.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-gray-200 dark:bg-gray-700" aria-hidden />}
                <span className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={16} /></span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="break-words text-sm font-medium dark:text-white-light">{it.title}</div>
                  {it.detail && <div className="whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-400">{it.detail}</div>}
                  <div className="text-xs text-gray-500">{fmt(it.at)}{it.by ? ` · ${it.by}` : ''}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {data?.has_more && (
        <Button variant="subtle" size="xs" onClick={loadMore} loading={more}>Load more</Button>
      )}

      <MessageComposer opened={msgOpen} customer={customer} onClose={() => setMsgOpen(false)} onSent={() => { load(); onCallSaved?.(); }} />
      <CallLogModal opened={logOpen} customer={customer} onClose={() => setLogOpen(false)} onSaved={() => { load(); onCallSaved?.(); }} />
    </div>
  );
}
