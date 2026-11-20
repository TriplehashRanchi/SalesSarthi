'use client';
// Customer export (#25, option C): which customers (all / selected / filtered by product line, staff, status),
// Excel or CSV, one row per customer or one row per product/policy, and which columns (including remarks and
// activity). The server decides who may export what and records every export in the history.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button, Checkbox, Loader, Modal, MultiSelect, Radio, Switch, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconDownload, IconHistory } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { csvBlob, downloadBlob, xlsxBlob } from '@/utils/spreadsheet';
import { useCustomerFolders } from './customerFolderApi';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const today = () => new Date().toLocaleDateString('en-CA');

// selectedIds: customers ticked in the list. defaultFolderIds: open on a product line (folder view).
export default function CustomerExportModal({ opened, onClose, selectedIds = [], defaultFolderIds = [] }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const { folders } = useCustomerFolders();
  const [opts, setOpts] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [scope, setScope] = useState('all');
  const [folderIds, setFolderIds] = useState([]);
  const [staffIds, setStaffIds] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [layout, setLayout] = useState('customer');
  const [format, setFormat] = useState('xlsx');
  const [columns, setColumns] = useState([]);
  const [teamCan, setTeamCan] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setError('');
    setLoadError('');
    setOpts(null);
    setScope(selectedIds.length ? 'selected' : defaultFolderIds.length ? 'filtered' : 'all');
    setFolderIds(defaultFolderIds.map(String));
    setStaffIds([]);
    setStatuses([]);
    setLayout('customer');
    setFormat('xlsx');
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customer-data/export/options`, { headers: await authHeaders() });
        setOpts(res.data);
        setColumns(res.data.columns.filter((c) => c.default).map((c) => c.key));
        setTeamCan(!!res.data.team_can_export);
      } catch (err) {
        setLoadError(errorMessage(err, 'Could not load the export options. Please try again.'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const groups = useMemo(() => {
    const out = {};
    (opts?.columns || []).forEach((c) => (out[c.group] = out[c.group] || []).push(c));
    return out;
  }, [opts]);
  const toggle = (key) => setColumns((cs) => (cs.includes(key) ? cs.filter((k) => k !== key) : [...cs, key]));
  const setGroup = (list, on) => setColumns((cs) => (on ? [...new Set([...cs, ...list.map((c) => c.key)])] : cs.filter((k) => !list.some((c) => c.key === k))));

  const saveTeamSetting = async (on) => {
    setTeamCan(on);
    try {
      await axios.put(`${API_URL}/api/customer-data/export/settings`, { team_can_export: on }, { headers: await authHeaders() });
      showNotification({ title: 'Saved', message: on ? 'Team members can now export their own customers.' : 'Team members can no longer export customers.', color: 'green' });
    } catch (err) {
      setTeamCan(!on);
      showNotification({ title: 'Could not save', message: errorMessage(err, 'Could not save the setting. Please try again.'), color: 'red' });
    }
  };

  const run = async () => {
    setError('');
    if (!columns.length) return setError('Choose at least one column to export.');
    if (scope === 'selected' && !selectedIds.length) return setError('No customers are selected. Tick customers in the list first, or choose another option.');
    setBusy(true);
    try {
      // Keep the catalog's order for the file.
      const ordered = opts.columns.map((c) => c.key).filter((k) => columns.includes(k));
      const body = {
        scope,
        ids: scope === 'selected' ? selectedIds : undefined,
        filters: scope === 'filtered' ? { folder_ids: folderIds.map(Number), staff_ids: staffIds.map((s) => (s === 'unassigned' ? s : Number(s))), statuses } : undefined,
        columns: ordered,
        layout,
        format,
      };
      const res = await axios.post(`${API_URL}/api/customer-data/export`, body, { headers: await authHeaders() });
      const { columns: cols, rows, customer_count: n, row_count: rc } = res.data;
      const name = `customers_${layout === 'policy' ? 'by_policy_' : ''}${today()}.${format}`;
      downloadBlob(format === 'csv' ? csvBlob(cols, rows) : xlsxBlob(cols, rows, 'Customers'), name);
      showNotification({ title: 'Export ready', message: `${n} customer(s)${rc !== n ? ` in ${rc} rows` : ''} saved to ${name}.`, color: 'green' });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not prepare the export. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const staffData = [{ value: 'unassigned', label: 'Not assigned' }, ...((opts?.staff || []).map((s) => ({ value: String(s.id), label: s.username })))];

  return (
    <Modal opened={opened} onClose={() => !busy && onClose()} title="Export customers" size="xl" centered fullScreen={isPhone}>
      {loadError ? (
        <Text size="sm" color="red">{loadError}</Text>
      ) : !opts ? (
        <div className="flex justify-center py-6"><Loader size="sm" /></div>
      ) : !opts.can_export ? (
        <Text size="sm">Your admin has not allowed team members to export customers. Please ask your admin if you need a copy.</Text>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Radio.Group label="Customers" value={scope} onChange={setScope} orientation="vertical" spacing={6}>
              <Radio value="all" label={opts.is_admin ? 'All customers' : 'All my customers'} />
              <Radio value="selected" label={`Selected (${selectedIds.length})`} disabled={!selectedIds.length} />
              <Radio value="filtered" label="Filter…" />
            </Radio.Group>
            <Radio.Group label="Layout" value={layout} onChange={setLayout} orientation="vertical" spacing={6}>
              <Radio value="customer" label="One row per customer" />
              <Radio value="policy" label="One row per product / policy" />
            </Radio.Group>
            <Radio.Group label="File" value={format} onChange={setFormat} orientation="vertical" spacing={6}>
              <Radio value="xlsx" label="Excel (.xlsx)" />
              <Radio value="csv" label="CSV" />
            </Radio.Group>
          </div>

          {scope === 'filtered' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MultiSelect label="Product line" placeholder="Any" data={(folders || []).map((f) => ({ value: String(f.id), label: f.name }))} value={folderIds} onChange={setFolderIds} clearable withinPortal />
              {opts.is_admin && <MultiSelect label="Assigned staff" placeholder="Anyone" data={staffData} value={staffIds} onChange={setStaffIds} clearable searchable withinPortal />}
              <MultiSelect label="Status" placeholder="Any" data={opts.statuses || []} value={statuses} onChange={setStatuses} clearable withinPortal />
            </div>
          )}

          <div>
            <Text size="sm" weight={600} mb={4}>Columns ({columns.length})</Text>
            {layout === 'customer' && <Text size="xs" color="dimmed" mb={6}>Customers with several products get one line per product inside the product columns.</Text>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Object.entries(groups).map(([group, list]) => {
                const on = list.filter((c) => columns.includes(c.key)).length;
                return (
                  <div key={group} className="rounded-md border border-gray-200 p-2 dark:border-gray-700">
                    <Checkbox
                      label={<b>{group}</b>}
                      checked={on === list.length}
                      indeterminate={on > 0 && on < list.length}
                      onChange={(e) => setGroup(list, e.currentTarget.checked)}
                      mb={6}
                    />
                    <div className="space-y-1 pl-1">
                      {list.map((c) => (
                        <Checkbox key={c.key} size="xs" label={c.label} checked={columns.includes(c.key)} onChange={() => toggle(c.key)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {opts.is_admin && (
            <Switch
              checked={teamCan}
              onChange={(e) => saveTeamSetting(e.currentTarget.checked)}
              label="Team members can export their own customers"
              description="When off, only you can export. Team members never see other members' customers."
            />
          )}
        </div>
      )}

      {error && <Text size="sm" color="red" mt="sm">{error}</Text>}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {opts?.is_admin ? (
          <Link href="/customer-data-history" className="inline-flex items-center gap-1 text-xs text-blue-600"><IconHistory size={14} /> Export history</Link>
        ) : <span />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="default" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
          {opts?.can_export && <Button leftIcon={<IconDownload size={16} />} onClick={run} loading={busy} className="w-full sm:w-auto">Export</Button>}
        </div>
      </div>
    </Modal>
  );
}
