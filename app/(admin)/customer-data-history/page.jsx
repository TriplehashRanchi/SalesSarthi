'use client';
// Import & export history for customers (#24, #25): date, time, who, what and how many.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ActionIcon, Badge, Button, Loader, Tabs, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconArrowLeft, IconDownload, IconFileExport, IconFileImport } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { downloadBlob } from '@/utils/spreadsheet';
import { errorMessage } from '@/components/customers/useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const fmt = (v) => {
  const d = v ? new Date(String(v).replace(' ', 'T')) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};
const STATUS_COLOR = { Completed: 'green', 'Partly imported': 'orange', Failed: 'red' };
const SCOPE = { all: 'All customers', selected: 'Selected customers', filtered: 'Filtered' };

function useList(path) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}${path}`, { headers: await authHeaders() });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the history. Please try again.'));
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return { rows, error, load };
}

function Empty({ rows, error, load, text }) {
  if (error) return <div className="text-sm text-red-600">{error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button></div>;
  if (!rows) return <div className="flex justify-center py-8"><Loader /></div>;
  if (!rows.length) return <Text size="sm" color="dimmed">{text}</Text>;
  return null;
}

function Imports() {
  const { rows, error, load } = useList('/api/customer-data/imports');
  const download = async (r) => {
    try {
      const res = await axios.get(`${API_URL}/api/customer-data/imports/${r.id}/report`, { headers: await authHeaders(), responseType: 'text' });
      downloadBlob(new Blob([res.data], { type: 'text/csv;charset=utf-8' }), `${String(r.file_name).replace(/\.(csv|xlsx)$/i, '')}_not_imported.csv`);
    } catch (err) {
      showNotification({ title: 'Could not download', message: errorMessage(err, 'Could not download the report. Please try again.'), color: 'red' });
    }
  };
  const empty = Empty({ rows, error, load, text: 'No imports yet.' });
  if (empty) return empty;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <Text weight={600} className="min-w-0 break-all">{r.file_name}</Text>
            <Badge size="xs" color={STATUS_COLOR[r.status] || 'gray'} variant="light">{r.status}</Badge>
          </div>
          <Text size="xs" color="dimmed">{fmt(r.created_at)} · by {r.actor_name || (r.actor_type === 'admin' ? 'Admin' : 'Team member')}{r.folder_names ? ` · ${r.folder_names}` : ''}</Text>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
            <span>{r.total_rows} rows</span>
            <span className="text-green-600">{r.imported} added</span>
            {r.added_to_existing > 0 && <span>{r.added_to_existing} added to saved customers</span>}
            {r.created_duplicates > 0 && <span>{r.created_duplicates} saved as new duplicates</span>}
            {r.skipped_duplicates > 0 && <span className="text-orange-600">{r.skipped_duplicates} skipped</span>}
            {r.invalid > 0 && <span className="text-red-600">{r.invalid} with errors</span>}
          </div>
          {r.status === 'Failed' && <Text size="xs" color="red">Nothing from this file was saved.</Text>}
          {r.has_report && <Button mt={6} size="xs" variant="light" compact leftIcon={<IconDownload size={12} />} onClick={() => download(r)}>Rows not imported</Button>}
        </div>
      ))}
    </div>
  );
}

function Exports() {
  const { rows, error, load } = useList('/api/customer-data/exports');
  const empty = Empty({ rows, error, load, text: 'No exports yet.' });
  if (empty) return empty;
  const filterText = (f) => {
    if (!f) return '';
    const parts = [];
    if (f.folder_ids?.length) parts.push(`${f.folder_ids.length} product line(s)`);
    if (f.staff_ids?.length) parts.push(`${f.staff_ids.length} staff`);
    if (f.statuses?.length) parts.push(f.statuses.join(', '));
    return parts.join(' · ');
  };
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <Text weight={600}>{r.customer_count} customer(s){r.row_count !== r.customer_count ? ` · ${r.row_count} rows` : ''}</Text>
            <Badge size="xs" variant="light">{r.format === 'csv' ? 'CSV' : 'Excel'}</Badge>
            <Badge size="xs" color="gray" variant="outline">{r.layout === 'policy' ? 'Per product' : 'Per customer'}</Badge>
          </div>
          <Text size="xs" color="dimmed">{fmt(r.created_at)} · by {r.actor_name || (r.actor_type === 'admin' ? 'Admin' : 'Team member')} · {SCOPE[r.scope] || r.scope}{r.scope === 'filtered' && filterText(r.filters) ? `: ${filterText(r.filters)}` : ''}</Text>
          <Text size="xs" className="mt-1 break-words text-gray-600 dark:text-gray-400">Columns: {(r.columns || []).join(', ')}</Text>
        </div>
      ))}
    </div>
  );
}

export default function CustomerDataHistoryPage() {
  const router = useRouter();
  return (
    <div className="panel max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      <div className="mb-4 flex items-center gap-2">
        <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" className="-ml-1.5 shrink-0" onClick={() => router.back()} aria-label="Back">
          <IconArrowLeft size={22} />
        </ActionIcon>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white-light sm:text-xl">Customer Import & Export History</h2>
          <Text size="xs" color="dimmed">Every customer import and export, with date, time and who did it.</Text>
        </div>
      </div>
      <Tabs defaultValue="imports">
        <Tabs.List>
          <Tabs.Tab value="imports" icon={<IconFileImport size={14} />}>Imports</Tabs.Tab>
          <Tabs.Tab value="exports" icon={<IconFileExport size={14} />}>Exports</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="imports" pt="md"><Imports /></Tabs.Panel>
        <Tabs.Panel value="exports" pt="md"><Exports /></Tabs.Panel>
      </Tabs>
    </div>
  );
}
