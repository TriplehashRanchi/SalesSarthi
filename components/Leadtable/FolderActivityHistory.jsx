'use client';
// Folder Activity History: every folder action of the signed-in person (admin or team member), permanent and read only.
//   - search by folder name and by lead name, filter by activity type and date range (all together), latest first
//   - pagination 10 / 25 / 50 / 100, select rows with checkboxes
//   - export the complete / filtered history or only the selected rows, as CSV or Excel
// Opening it with ?folder=<name> pre-fills the folder search (used by "View activity" on a folder tab).
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { DataTable } from 'mantine-datatable';
import { ActionIcon, Badge, Button, Checkbox, Menu, Pagination, Select, Text, TextInput } from '@mantine/core';
import { DateRangePicker } from '@mantine/dates';
import { showNotification } from '@mantine/notifications';
import {
    IconArrowLeft,
    IconArrowRight,
    IconArrowsExchange,
    IconCalendar,
    IconDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconFolder,
    IconFolderPlus,
    IconLock,
    IconPencil,
    IconSearch,
    IconStack2,
    IconTimeline,
    IconTrash,
    IconUser,
    IconUserPlus,
    IconX,
} from '@tabler/icons-react';
import { exportTable } from '@/utils/exportTable';
import { userMessage } from '@/utils/userMessage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZES = [10, 25, 50, 100];

// Activity types and how they look.
export const ACTIVITY = {
    folder_created: { label: 'Folder Created', color: 'green', icon: IconFolderPlus },
    folder_renamed: { label: 'Folder Renamed', color: 'blue', icon: IconPencil },
    lead_added: { label: 'Lead Added', color: 'teal', icon: IconUserPlus },
    lead_moved: { label: 'Lead Moved', color: 'cyan', icon: IconArrowsExchange },
    bulk_moved: { label: 'Bulk Movement', color: 'orange', icon: IconStack2 },
    folder_deleted: { label: 'Folder Deleted', color: 'red', icon: IconTrash },
};
// Static class names (Tailwind only keeps classes it can see written out in full).
const DOT = {
    green: 'ring-green-300 text-green-600',
    blue: 'ring-blue-300 text-blue-600',
    teal: 'ring-teal-300 text-teal-600',
    cyan: 'ring-cyan-300 text-cyan-600',
    orange: 'ring-orange-300 text-orange-600',
    red: 'ring-red-300 text-red-600',
    gray: 'ring-gray-300 text-gray-600',
};
const SOURCE_LABEL = { manual: 'Add Lead form', csv_import: 'CSV import', move: 'Move', bulk_move: 'Bulk move', folder_delete: 'Folder delete', lead_edit: 'Edit Lead form' };

const auth = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
};
const api = {
    list: async (params) => (await axios.get(`${API_URL}/api/lead-folder-activity`, { headers: await auth(), params })).data,
    exportRows: async (params) => (await axios.get(`${API_URL}/api/lead-folder-activity/export`, { headers: await auth(), params })).data.rows,
};
const errMsg = userMessage; // plain-language message (never the raw technical error)
const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

// "Kanyadaan → Delhi", "Old → New", etc.
export const changeText = (r) => {
    if (r.activity_type === 'folder_renamed') return `${r.old_name} → ${r.new_name}`;
    if (r.activity_type === 'lead_moved') return `${r.from_folder_name || 'No folder'} → ${r.to_folder_name}`;
    if (r.activity_type === 'bulk_moved') return `${r.lead_count} leads${r.from_folder_name ? ` · ${r.from_folder_name}` : ''} → ${r.to_folder_name}`;
    if (r.activity_type === 'folder_deleted') return r.to_folder_name ? `${r.lead_count} leads moved → ${r.to_folder_name}` : 'Empty folder';
    if (r.activity_type === 'lead_added') return `→ ${r.to_folder_name || r.folder_name}`;
    return '';
};

const EXPORT_COLUMNS = [
    { key: 'when', label: 'Date & Time' },
    { key: 'type', label: 'Activity Type' },
    { key: 'folder_name', label: 'Folder Name' },
    { key: 'lead_name', label: 'Lead Name' },
    { key: 'change', label: 'Change' },
    { key: 'details', label: 'Action Details' },
    { key: 'source', label: 'Done From' },
    { key: 'actor_name', label: 'Done By' },
];

const FolderActivityHistory = ({ backHref }) => {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [dir, setDir] = useState('desc');
    const [folderText, setFolderText] = useState('');
    const [leadText, setLeadText] = useState('');
    const [folderQ, setFolderQ] = useState('');
    const [leadQ, setLeadQ] = useState('');
    const [type, setType] = useState(null);
    const [range, setRange] = useState([null, null]);
    const [selected, setSelected] = useState([]);

    // ?folder=<name> from a folder tab's "View activity"
    useEffect(() => {
        const f = new URLSearchParams(window.location.search).get('folder');
        if (f) {
            setFolderText(f);
            setFolderQ(f);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            setFolderQ(folderText.trim());
            setLeadQ(leadText.trim());
        }, 300);
        return () => clearTimeout(t);
    }, [folderText, leadText]);

    const filters = useMemo(() => {
        const [a, b] = range;
        const start = a ? new Date(a) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = b ? new Date(b) : null;
        if (end) end.setHours(23, 59, 59, 999);
        return {
            ...(folderQ ? { folder: folderQ } : {}),
            ...(leadQ ? { lead: leadQ } : {}),
            ...(type ? { type } : {}),
            ...(start ? { from: start.toISOString() } : {}),
            ...(end ? { to: end.toISOString() } : {}),
            dir,
        };
    }, [folderQ, leadQ, type, range, dir]);
    const key = JSON.stringify(filters);
    const hasFilters = !!(folderQ || leadQ || type || range[0] || range[1]);

    useEffect(() => setPage(1), [key, pageSize]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        api.list({ ...filters, page, page_size: pageSize })
            .then((d) => {
                if (!alive) return;
                setRows(d.rows);
                setTotal(d.total);
            })
            .catch((err) => alive && showNotification({ title: 'Error', message: errMsg(err, 'Failed to load activity'), color: 'red' }))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [key, page, pageSize]);

    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(total, page * pageSize);

    const pageIds = rows.map((r) => r.id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const someOnPage = pageIds.some((id) => selected.includes(id));
    const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const togglePage = (checked) => setSelected((p) => (checked ? [...new Set([...p, ...pageIds])] : p.filter((id) => !pageIds.includes(id))));

    const doExport = async (which, format) => {
        try {
            const params = which === 'selected' ? { ids: selected.join(','), dir } : filters;
            const data = await api.exportRows(params);
            if (!data.length) return showNotification({ title: 'Nothing to export', message: 'No activity matches.', color: 'yellow' });
            const out = data.map((r) => ({
                ...r,
                when: fmtDateTime(r.created_at),
                type: ACTIVITY[r.activity_type]?.label || r.activity_type,
                change: changeText(r),
                source: SOURCE_LABEL[r.source] || r.source || '',
            }));
            await exportTable({ rows: out, columns: EXPORT_COLUMNS, fileBase: `folder-activity-${new Date().toISOString().slice(0, 10)}`, format, sheetName: 'Folder Activity' });
        } catch (err) {
            showNotification({ title: 'Export failed', message: errMsg(err, 'Export failed'), color: 'red' });
        }
    };

    const typeBadge = (r) => {
        const a = ACTIVITY[r.activity_type] || { label: r.activity_type, color: 'gray', icon: IconTimeline };
        const Icon = a.icon;
        return (
            <Badge color={a.color} variant="light" size="sm" leftSection={<Icon size={12} className="-mb-0.5" />}>
                {a.label}
            </Badge>
        );
    };
    const changeCell = (r) => {
        const t = changeText(r);
        if (!t) return <Text size="xs" color="dimmed">—</Text>;
        return <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">{t.split('→').map((part, i, arr) => (
            <span key={i} className="inline-flex items-center gap-1">
                <span className="truncate">{part.trim()}</span>
                {i < arr.length - 1 && <IconArrowRight size={12} className="flex-shrink-0 text-gray-400" />}
            </span>
        ))}</span>;
    };

    const exportMenu = (
        <Menu withinPortal shadow="md" position="bottom-end" width={240}>
            <Menu.Target>
                <Button size="xs" radius="xl" variant="default" leftIcon={<IconDownload size={15} />}>Export</Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>{hasFilters ? 'All matching the filters' : 'Complete history'}</Menu.Label>
                <Menu.Item icon={<IconFileText size={14} />} onClick={() => doExport('all', 'csv')}>CSV</Menu.Item>
                <Menu.Item icon={<IconFileSpreadsheet size={14} />} onClick={() => doExport('all', 'xlsx')}>Excel (.xlsx)</Menu.Item>
                <Menu.Divider />
                <Menu.Label>Selected ({selected.length})</Menu.Label>
                <Menu.Item icon={<IconFileText size={14} />} disabled={!selected.length} onClick={() => doExport('selected', 'csv')}>CSV</Menu.Item>
                <Menu.Item icon={<IconFileSpreadsheet size={14} />} disabled={!selected.length} onClick={() => doExport('selected', 'xlsx')}>Excel (.xlsx)</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );

    const clearBtn = (value, clear, label) => (value ? <ActionIcon size="xs" onClick={clear} aria-label={label}><IconX size={12} /></ActionIcon> : null);

    return (
        <div className="panel mt-0 p-3 md:mt-6 md:!p-5 max-md:!border-0 max-md:!bg-transparent max-md:!shadow-none">
            {/* header */}
            <div className="mb-4 flex items-center gap-2">
                <ActionIcon variant="subtle" color="dark" onClick={() => (backHref ? router.push(backHref) : router.back())} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
                        <IconTimeline size={22} className="text-blue-600" /> Folder Activity
                    </h1>
                    <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <IconLock size={13} /> Private to you · cannot be edited
                    </p>
                </div>
            </div>

            {/* filters */}
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                <TextInput size="sm" radius="xl" icon={<IconFolder size={15} />} placeholder="Folder name" value={folderText} onChange={(e) => setFolderText(e.currentTarget.value)} rightSection={clearBtn(folderText, () => setFolderText(''), 'Clear folder search')} />
                <TextInput size="sm" radius="xl" icon={<IconSearch size={15} />} placeholder="Lead name" value={leadText} onChange={(e) => setLeadText(e.currentTarget.value)} rightSection={clearBtn(leadText, () => setLeadText(''), 'Clear lead search')} />
                <Select
                    size="sm"
                    radius="xl"
                    placeholder="All activity types"
                    data={Object.entries(ACTIVITY).map(([value, a]) => ({ value, label: a.label }))}
                    value={type}
                    onChange={setType}
                    clearable
                />
                <DateRangePicker size="sm" radius="xl" icon={<IconCalendar size={15} />} placeholder="Date range" value={range} onChange={setRange} clearable inputFormat="DD MMM YYYY" />
                <Button
                    size="sm"
                    radius="xl"
                    variant="subtle"
                    color="gray"
                    disabled={!hasFilters}
                    onClick={() => {
                        setFolderText('');
                        setLeadText('');
                        setType(null);
                        setRange([null, null]);
                    }}
                >
                    Reset
                </Button>
            </div>

            {/* toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Text size="sm" color="dimmed">
                    {total} activit{total === 1 ? 'y' : 'ies'}
                    {selected.length > 0 && <> · <b className="text-gray-700 dark:text-gray-200">{selected.length} selected</b></>}
                </Text>
                {selected.length > 0 && <Button size="xs" radius="xl" variant="subtle" color="gray" onClick={() => setSelected([])}>Clear selection</Button>}
                <div className="ml-auto flex items-center gap-2">
                    <Select
                        size="xs"
                        radius="xl"
                        className="w-36"
                        data={[{ value: 'desc', label: 'Latest first' }, { value: 'asc', label: 'Oldest first' }]}
                        value={dir}
                        onChange={(v) => setDir(v || 'desc')}
                        aria-label="Order"
                    />
                    {exportMenu}
                </div>
            </div>

            {/* desktop */}
            <div className="hidden md:block">
                <DataTable
                    withBorder
                    borderRadius="md"
                    highlightOnHover
                    verticalSpacing="sm"
                    fontSize="sm"
                    minHeight={220}
                    fetching={loading}
                    records={rows}
                    idAccessor="id"
                    noRecordsText={hasFilters ? 'No activity matches these filters' : 'No folder activity yet'}
                    totalRecords={total}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    paginationText={({ from: a, to: b, totalRecords }) => `Page ${page} of ${pages} · ${a}–${b} of ${totalRecords}`}
                    columns={[
                        {
                            accessor: 'select',
                            width: 40,
                            title: <Checkbox size="xs" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={(e) => togglePage(e.currentTarget.checked)} aria-label="Select page" />,
                            render: (r) => <Checkbox size="xs" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label="Select activity" />,
                        },
                        { accessor: 'created_at', title: 'Date & time', width: 185, render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.created_at)}</span> },
                        { accessor: 'activity_type', title: 'Activity', width: 160, render: typeBadge },
                        { accessor: 'folder_name', title: 'Folder', ellipsis: true, render: (r) => <span className="font-medium" title={r.folder_name}>{r.folder_name || '—'}</span> },
                        { accessor: 'lead_name', title: 'Lead', ellipsis: true, render: (r) => r.lead_name || (r.lead_count ? <Text size="xs" color="dimmed">{r.lead_count} leads</Text> : <Text size="xs" color="dimmed">—</Text>) },
                        { accessor: 'change', title: 'Change', render: changeCell },
                        { accessor: 'actor_name', title: 'By', width: 150, ellipsis: true, render: (r) => <span title={SOURCE_LABEL[r.source] ? `via ${SOURCE_LABEL[r.source]}` : ''}>{r.actor_name || '—'}</span> },
                    ]}
                />
            </div>

            {/* phone */}
            <div className="md:hidden">
                {rows.length > 0 && (
                    <Checkbox size="xs" mb="xs" label="Select this page" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={(e) => togglePage(e.currentTarget.checked)} />
                )}
                <div className="relative ml-2 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                    {rows.map((r) => {
                        const a = ACTIVITY[r.activity_type] || { color: 'gray', icon: IconTimeline };
                        const Icon = a.icon;
                        return (
                            <div key={r.id} className="relative mb-3">
                                <span className={`absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 dark:bg-gray-900 ${DOT[a.color] || DOT.gray}`}>
                                    <Icon size={12} />
                                </span>
                                <div className={`rounded-xl border p-3 ${selected.includes(r.id) ? 'border-blue-400 bg-blue-50/60 dark:bg-gray-800' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
                                    <div className="flex items-start gap-2">
                                        <Checkbox size="xs" mt={2} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label="Select activity" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">{typeBadge(r)}</div>
                                            <div className="mt-1 text-sm">
                                                <span className="font-semibold">{r.folder_name || '—'}</span>
                                                {r.lead_name && <span className="text-gray-600 dark:text-gray-300"> · {r.lead_name}</span>}
                                            </div>
                                            <div className="mt-0.5">{changeCell(r)}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
                                                <span>{fmtDateTime(r.created_at)}</span>
                                                {r.actor_name && <span className="inline-flex items-center gap-0.5"><IconUser size={11} />{r.actor_name}</span>}
                                                {SOURCE_LABEL[r.source] && <span>via {SOURCE_LABEL[r.source]}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {!loading && rows.length === 0 && <Text align="center" color="dimmed" py={40}>{hasFilters ? 'No activity matches these filters' : 'No folder activity yet'}</Text>}
                {total > 0 && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                        <Text size="xs" color="dimmed">Page {page} of {pages} · {from}–{to} of {total}</Text>
                        <Pagination size="sm" page={page} onChange={setPage} total={pages} siblings={0} />
                        <Select size="xs" className="w-32" data={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }))} value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FolderActivityHistory;
