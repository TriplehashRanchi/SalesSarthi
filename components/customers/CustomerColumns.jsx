'use client';
// Customer list columns (#10, option C): the Super Admin sets the default columns, each admin decides which
// columns their team members may use, and everyone arranges their own view (show / hide, order, reset).
// Used by the admin list (components/Leadtable/customerTable.jsx) and the team member's list.
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ActionIcon, Badge, Button, Checkbox, Loader, Modal, Tabs, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconLock } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import CustomerQuickActions from '@/components/common/CustomerQuickActions';
import CustomerStatusBadge from './CustomerStatusBadge';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Shown until the person's settings load (same as the server's built-in default).
export const FALLBACK_VIEW = ['full_name', 'email', 'status', 'products', 'assigned_to', 'next_appointment', 'quick_actions'];

const asDate = (v) => {
  if (!v) return null;
  const d = new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v);
  return isNaN(d.getTime()) || d.getFullYear() < 1900 ? null : d;
};
const day = (v) => {
  const d = asDate(v);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
};
const dash = <Text color="dimmed" size="sm">—</Text>;
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Sum of the premiums of all the customer's products (own product + policy records).
export const totalPremium = (c) => {
  const vals = (c.products || []).map((p) => Number(p.premium)).filter((n) => Number.isFinite(n) && n > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
};
// The earliest renewal date from today on, across the customer's products.
export const nextRenewal = (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = (c.products || []).map((p) => asDate(p.renewal_date)).filter((d) => d && d >= today).sort((a, b) => a - b);
  return dates[0] || null;
};

// DataTable columns for the chosen keys. ctx: { productRows, folderName, getNextAppointment, onAppointment }.
export function buildCustomerColumns(keys, ctx) {
  const defs = {
    full_name: {
      accessor: 'full_name',
      title: 'Name',
      sortable: true,
      render: (r) => (
        <div className="min-w-0 max-w-[180px]">
          <div className="truncate font-medium" title={r.full_name || ''}>{r.full_name || 'N/A'}</div>
          <div className="text-xs text-gray-500">{r.phone_number}</div>
        </div>
      ),
    },
    email: { accessor: 'email', title: 'Email', sortable: true, render: (r) => (r.email ? <div className="max-w-[190px] truncate" title={r.email}>{r.email}</div> : dash) },
    status: { accessor: 'status', title: 'Status', sortable: true, render: (r) => <CustomerStatusBadge status={r.status} /> },
    products: ctx.productRows?.column,
    product_lines: {
      accessor: 'product_lines',
      title: 'Product Lines',
      render: (r) => {
        const names = (r.folder_ids || []).map((id) => ctx.folderName?.[id]).filter(Boolean);
        return names.length ? <div className="max-w-[180px] truncate" title={names.join(', ')}>{names.join(', ')}</div> : dash;
      },
    },
    total_premium: { accessor: 'total_premium', title: 'Total Premium', render: (r) => { const t = totalPremium(r); return t === null ? dash : money(t); } },
    next_renewal: {
      accessor: 'next_renewal',
      title: 'Next Renewal',
      render: (r) => {
        const d = nextRenewal(r);
        if (!d) return dash;
        const soon = (d - new Date()) / 86400000 <= 30;
        return <Badge color={soon ? 'orange' : 'gray'} variant="light">{day(d)}</Badge>;
      },
    },
    assigned_to: {
      accessor: 'assigned_to_name',
      title: 'Assigned to',
      sortable: true,
      render: (r) => (r.assigned_to_name ? <Text size="sm">{r.assigned_to_name}</Text> : <Text size="sm" color="dimmed">Not assigned</Text>),
    },
    next_appointment: {
      accessor: 'next_appointment',
      title: 'Next Appointment',
      render: (r) => {
        const next = ctx.getNextAppointment?.(r.appointments);
        return next ? (
          <Badge color="blue" variant="light" title={next.appointment_type || ''}>
            {new Date(next.appointment_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Badge>
        ) : dash;
      },
    },
    date_of_birth: { accessor: 'date_of_birth', title: 'Date of Birth', sortable: true, render: (r) => day(r.date_of_birth) || dash },
    anniversary: { accessor: 'anniversary', title: 'Anniversary', sortable: true, render: (r) => day(r.anniversary) || dash },
    source: { accessor: 'source', title: 'Source', sortable: true, render: (r) => (r.source ? <div className="max-w-[140px] truncate" title={r.source}>{r.source}</div> : dash) },
    created_at: { accessor: 'created_at', title: 'Added On', sortable: true, render: (r) => day(r.created_at) || dash },
    quick_actions: { accessor: 'quick_actions', title: 'Quick Actions', render: (r) => <CustomerQuickActions customer={r} onAppointment={ctx.onAppointment} size="md" plain /> },
  };
  return (keys || FALLBACK_VIEW).map((k) => defs[k]).filter(Boolean);
}

// The person's column settings (loads once; save / reset update it).
export function useCustomerColumns() {
  const [config, setConfig] = useState(null);
  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/customers/columns`, { headers: await authHeaders() });
      setConfig(res.data);
    } catch (err) {
      // The list still works with the built-in columns.
      console.warn('Could not load column settings:', err.response?.data?.message || err.message);
      setConfig(null);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { config, setConfig, view: config?.view || FALLBACK_VIEW, reload: load };
}

// Show / hide and order a list of keys from a catalog. Name stays first and visible.
function ColumnList({ catalog, value, onChange }) {
  const chosen = value.filter((k) => catalog.some((c) => c.key === k));
  const rest = catalog.filter((c) => !chosen.includes(c.key));
  const label = (k) => catalog.find((c) => c.key === k)?.label || k;
  const move = (i, dir) => {
    const list = [...chosen];
    const j = i + dir;
    if (j < 1 || j >= list.length) return; // Name stays first
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
  };
  return (
    <div className="space-y-1">
      {chosen.map((k, i) => {
        const locked = catalog.find((c) => c.key === k)?.locked;
        return (
          <div key={k} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 dark:border-gray-700">
            <Checkbox checked disabled={locked} onChange={() => onChange(chosen.filter((x) => x !== k))} aria-label={`Show ${label(k)}`} />
            <Text size="sm" className="min-w-0 flex-1 truncate">{label(k)}</Text>
            {locked ? <IconLock size={14} className="text-gray-400" aria-label="Always shown" /> : (
              <>
                <ActionIcon size="sm" variant="subtle" disabled={i <= 1} onClick={() => move(i, -1)} aria-label={`Move ${label(k)} up`}><IconArrowUp size={14} /></ActionIcon>
                <ActionIcon size="sm" variant="subtle" disabled={i === chosen.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(k)} down`}><IconArrowDown size={14} /></ActionIcon>
              </>
            )}
          </div>
        );
      })}
      {rest.length > 0 && <Text size="xs" color="dimmed" pt={6}>Hidden</Text>}
      {rest.map((c) => (
        <div key={c.key} className="flex items-center gap-2 rounded-md px-2 py-1">
          <Checkbox checked={false} onChange={() => onChange([...chosen, c.key])} aria-label={`Show ${c.label}`} />
          <Text size="sm" color="dimmed">{c.label}</Text>
        </div>
      ))}
    </div>
  );
}

// "Columns" screen. config: from useCustomerColumns. onSaved(config).
export function CustomerColumnsModal({ opened, onClose, config, onSaved }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [view, setView] = useState([]);
  const [team, setTeam] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('mine');

  useEffect(() => {
    if (opened && config) {
      setView(config.view);
      setTeam(config.team_allowed || []);
      setError('');
      setTab('mine');
    }
  }, [opened, config]);

  const call = async (fn, done) => {
    setBusy(true);
    setError('');
    try {
      const out = await fn(await authHeaders());
      onSaved?.(out);
      showNotification({ title: 'Saved', message: done, color: 'green' });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const saveMine = () => call(async (headers) => (await axios.put(`${API_URL}/api/customers/columns/view`, { columns: view }, { headers })).data, 'Your columns were saved.');
  const reset = () => call(async (headers) => (await axios.delete(`${API_URL}/api/customers/columns/view`, { headers })).data, 'Your columns are back to the default.');
  const saveTeam = () => call(async (headers) => {
    const res = await axios.put(`${API_URL}/api/customers/columns/team`, { columns: team }, { headers });
    return { ...config, team_allowed: res.data.team_allowed };
  }, 'Team access was saved.');

  return (
    <Modal opened={opened} onClose={() => !busy && onClose()} title="Columns" centered fullScreen={isPhone}>
      {!config ? (
        <div className="flex justify-center py-6"><Loader size="sm" /></div>
      ) : (
        <Tabs value={tab} onTabChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="mine">My view</Tabs.Tab>
            {config.is_admin && <Tabs.Tab value="team">Team access</Tabs.Tab>}
          </Tabs.List>
          <Tabs.Panel value="mine" pt="sm">
            <Text size="xs" color="dimmed" mb="xs">
              Choose the columns you see and their order. {config.customised ? <Badge size="xs" variant="light">Your own view</Badge> : <Badge size="xs" color="gray" variant="light">Default</Badge>}
            </Text>
            <ColumnList catalog={config.catalog} value={view} onChange={setView} />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="subtle" color="gray" onClick={reset} disabled={busy || !config.customised} className="w-full sm:w-auto">Reset to default</Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="default" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={saveMine} loading={busy} className="w-full sm:w-auto">Save</Button>
              </div>
            </div>
          </Tabs.Panel>
          {config.is_admin && (
            <Tabs.Panel value="team" pt="sm">
              <Text size="xs" color="dimmed" mb="xs">Columns your team members are allowed to use in their customer list. They arrange their own view from these.</Text>
              <div className="space-y-1">
                {config.team_catalog.map((c) => (
                  <Checkbox
                    key={c.key}
                    label={c.label}
                    checked={c.locked || team.includes(c.key)}
                    disabled={c.locked}
                    onChange={(e) => { const on = e.currentTarget.checked; setTeam((t) => (on ? [...t, c.key] : t.filter((k) => k !== c.key))); }}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="default" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={saveTeam} loading={busy} className="w-full sm:w-auto">Save team access</Button>
              </div>
            </Tabs.Panel>
          )}
        </Tabs>
      )}
      {error && <Text size="sm" color="red" mt="sm">{error}</Text>}
    </Modal>
  );
}
