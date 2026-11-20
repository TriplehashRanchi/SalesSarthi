'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Avatar, Badge, Button, Loader, Text, UnstyledButton } from '@mantine/core';
import {
  IconBrandWhatsapp, IconCalendarEvent, IconCalendarPlus, IconCash, IconClockHour4, IconHistory, IconListCheck,
  IconPhoneCall, IconPlus, IconRefresh, IconShieldCheck, IconUserCheck,
} from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { callCustomer } from '@/components/common/CustomerQuickActions';
import CustomerStatusBadge from './CustomerStatusBadge';
import { errorMessage } from './useCreateCustomer';
import CallLogModal from './CallLogModal';
import MessageComposer from './MessageComposer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const asDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) || d.getFullYear() < 1900 ? null : d;
};
const fmtDate = (v, withTime = false) => {
  const d = asDate(v);
  return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '';
};
const money = (v) => (v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
// "today", "in 3 days", "5 days ago"
const relDays = (v) => {
  const d = asDate(v);
  if (!d) return '';
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const n = Math.round((day(d) - day(new Date())) / 86400000);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Tile({ icon: Icon, label, value, sub, tone = 'default', action }) {
  const tones = {
    default: 'border-gray-200 dark:border-gray-700',
    warn: 'border-orange-300 bg-orange-50/60 dark:border-orange-700 dark:bg-orange-900/10',
    bad: 'border-red-300 bg-red-50/60 dark:border-red-700 dark:bg-red-900/10',
  };
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon size={14} className="shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 break-words text-sm font-semibold dark:text-white-light">{value}</div>
      {sub && <div className="mt-0.5 break-words text-xs text-gray-500">{sub}</div>}
      {action}
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <UnstyledButton
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm"
      aria-label={label}
    >
      <Icon size={20} className={`shrink-0 ${color}`} />
      <span className="truncate">{label}</span>
    </UnstyledButton>
  );
}

// Top of the customer profile (#16, option C): who they are, products and premium, what is due next, who
// handles them, and the quick actions (Call, WhatsApp, Add Product, Add Appointment).
// reloadKey: change it to load the numbers again (after a product / appointment / assignment change).
// onActivity: after a call is logged from here (so the timeline reloads too).
export default function CustomerOverview({ customer, reloadKey = 0, onAddProduct, onAddAppointment, onChangeStaff, onActivity }) {
  const [data, setData] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/customers/${customer.id}/overview`, { headers: await authHeaders() });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the customer summary. Please try again.'));
    }
  }, [customer.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const initial = (customer.full_name || '?').trim().charAt(0).toUpperCase();
  const p = data?.products;
  const nextFu = data?.next_followup;
  const overdueFu = data?.oldest_overdue_followup;
  const renewal = data?.upcoming_renewal;
  const renewalSoon = renewal && (asDate(renewal.date) - new Date()) / 86400000 <= 30;
  const last = data?.last_interaction;
  const appt = data?.appointments;

  return (
    <div className="mb-5 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:p-4">
      {/* Who */}
      <div className="flex items-start gap-3">
        <Avatar color="blue" variant="light" radius="xl" size="lg" className="shrink-0">{initial}</Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-lg font-semibold leading-tight dark:text-white-light md:text-xl">{customer.full_name || 'No name'}</h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <div className="mt-1 flex flex-col gap-x-4 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:flex-wrap">
            {customer.phone_number ? <a href={`tel:${customer.phone_number}`} className="hover:underline">{customer.phone_number}</a> : <span>No phone number</span>}
            {customer.email ? <a href={`mailto:${customer.email}`} className="break-all hover:underline">{customer.email}</a> : <span className="text-gray-400">No email</span>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
        <QuickAction icon={IconPhoneCall} label="Call" color="text-blue-600" onClick={() => { if (callCustomer(customer)) setLogOpen(true); }} />
        <QuickAction icon={IconBrandWhatsapp} label="WhatsApp" color="text-green-600" onClick={() => setMsgOpen(true)} />
        <QuickAction icon={IconPlus} label="Add Product" color="text-indigo-600" onClick={onAddProduct} />
        <QuickAction icon={IconCalendarPlus} label="Add Appointment" color="text-orange-600" onClick={onAddAppointment} />
      </div>

      {/* Numbers */}
      {error ? (
        <div className="mt-4 text-sm text-red-600">
          {error} <Button variant="subtle" size="xs" compact leftIcon={<IconRefresh size={12} />} onClick={load}>Try again</Button>
        </div>
      ) : !data ? (
        <div className="mt-4 flex justify-center"><Loader size="sm" /></div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            <Tile icon={IconShieldCheck} label="Products" value={plural(p.count, 'product')} sub={p.count ? null : 'Use "Add Product" to add one'} />
            <Tile icon={IconCash} label="Total premium" value={money(p.total_premium)} sub={p.total_coverage !== null ? `Cover ${money(p.total_coverage)}` : null} />
            <Tile
              icon={IconClockHour4}
              label="Next follow-up"
              tone={!nextFu && overdueFu ? 'bad' : 'default'}
              value={nextFu ? fmtDate(nextFu.date, true) : overdueFu ? 'Overdue' : 'None planned'}
              sub={nextFu ? `${nextFu.purpose || ''}${nextFu.purpose ? ' · ' : ''}${relDays(nextFu.date)}` : overdueFu ? `${overdueFu.purpose || 'Follow-up'} was due ${relDays(overdueFu.date)}` : null}
            />
            <Tile
              icon={IconListCheck}
              label="Pending follow-ups"
              tone={data.overdue_followups ? 'bad' : 'default'}
              value={String(data.pending_followups)}
              sub={data.overdue_followups ? `${data.overdue_followups} overdue` : data.pending_followups ? 'None overdue' : null}
            />
            <Tile
              icon={IconRefresh}
              label="Upcoming renewal"
              tone={renewalSoon ? 'warn' : 'default'}
              value={renewal ? fmtDate(renewal.date) : 'None'}
              sub={renewal ? `${renewal.product} · ${relDays(renewal.date)}` : null}
            />
            <Tile
              icon={IconCalendarEvent}
              label="Appointments"
              value={`${appt.total} total`}
              sub={appt.next ? `Next: ${fmtDate(appt.next.date, true)}${appt.next.type ? ` · ${appt.next.type}` : ''}` : appt.upcoming ? `${appt.upcoming} upcoming` : 'None upcoming'}
            />
            <Tile
              icon={IconUserCheck}
              label="Assigned staff"
              value={data.assigned_to ? data.assigned_to.name || 'A team member' : 'Not assigned'}
              action={onChangeStaff && (
                <Button variant="subtle" size="xs" compact className="mt-1 -ml-1" onClick={onChangeStaff}>Change</Button>
              )}
            />
            <Tile
              icon={IconHistory}
              label="Last interaction"
              value={last ? fmtDate(last.date) : 'None yet'}
              sub={last ? `${last.type}${last.label ? ` · ${last.label}` : ''} · ${relDays(last.date)}` : null}
            />
          </div>

          {/* Product-wise summary */}
          {p.items.length > 0 && (
            <div className="mt-3">
              <Text size="xs" color="dimmed" mb={4}>Product-wise summary</Text>
              <div className="flex flex-wrap gap-2">
                {p.items.map((it) => (
                  <Badge key={it.id} variant="light" color="gray" radius="sm" size="lg" className="h-auto max-w-full whitespace-normal py-1 normal-case">
                    <span className="break-words font-semibold">{it.product_name || it.company_name || it.policy_number || 'Product'}</span>
                    {it.premium !== null && <span className="font-normal"> · {money(it.premium)}</span>}
                    {asDate(it.renewal_date) && <span className="font-normal"> · Renews {fmtDate(it.renewal_date)}</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <MessageComposer opened={msgOpen} customer={customer} initialChannel="whatsapp" onClose={() => setMsgOpen(false)} onSent={() => { load(); onActivity?.(); }} />
      <CallLogModal opened={logOpen} customer={customer} onClose={() => setLogOpen(false)} onSaved={() => { load(); onActivity?.(); }} />
    </div>
  );
}
