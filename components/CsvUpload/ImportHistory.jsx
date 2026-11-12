'use client';
// Import History: the signed-in person's own bulk CSV uploads (admin and team member).
//   - search by file name, filter by date range / status / destination folder (all together)
//   - sort (latest first by default), pagination 10 / 25 / 50 / 100
//   - download the original CSV and the error report (kept 30 days), delete them one by one or in bulk
//   - export the complete / filtered history or only the selected rows, as CSV or Excel
//   - "files will be deleted in 3 days" notices
// Deleting files never deletes the history row or any imported lead.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { DataTable } from 'mantine-datatable';
import { ActionIcon, Alert, Badge, Button, Checkbox, Group, Menu, Modal, Pagination, Select, Text, TextInput, Tooltip } from '@mantine/core';
import { DateRangePicker } from '@mantine/dates';
import { showNotification } from '@mantine/notifications';
import {
    IconAlertTriangle,
    IconArrowLeft,
    IconCalendar,
    IconDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconFolder,
    IconHistory,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { exportTable, saveBlob } from '@/utils/exportTable';
import { userMessage } from '@/utils/userMessage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZES = [10, 25, 50, 100];
const STATUS_OPTIONS = ['Completed', 'Partially Completed', 'Failed'];
const STATUS_COLOR = { Completed: 'green', 'Partially Completed': 'orange', Failed: 'red' };

const auth = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
};
const api = {
    list: async (params) => (await axios.get(`${API_URL}/api/lead-imports`, { headers: await auth(), params })).data,
    folders: async () => (await axios.get(`${API_URL}/api/lead-imports/folders`, { headers: await auth() })).data,
    exportRows: async (params) => (await axios.get(`${API_URL}/api/lead-imports/export`, { headers: await auth(), params })).data.rows,
    file: async (id, kind) => (await axios.get(`${API_URL}/api/lead-imports/${id}/files/${kind}`, { headers: await auth(), responseType: 'blob' })),
    deleteFile: async (id, kind) => (await axios.delete(`${API_URL}/api/lead-imports/${id}/files/${kind}`, { headers: await auth() })).data,
    deleteMany: async (ids) => (await axios.post(`${API_URL}/api/lead-imports/files/delete`, { ids }, { headers: await auth() })).data,
    notices: async () => (await axios.get(`${API_URL}/api/lead-imports/notifications`, { headers: await auth(), params: { unread: 1, type: 'import_files_expiring' } })).data,
    markRead: async (ids) => (await axios.post(`${API_URL}/api/lead-imports/notifications/read`, { ids }, { headers: await auth() })).data,
};
const errMsg = userMessage; // plain-language message (never the raw technical error)

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const daysLeft = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const EXPORT_COLUMNS = [
    { key: 'uploaded', label: 'Upload Date & Time' },
    { key: 'file_name', label: 'Original File Name' },
    { key: 'folder', label: 'Destination Folder' },
    { key: 'total_rows', label: 'Total Records' },
    { key: 'imported', label: 'Successfully Imported' },
    { key: 'duplicates', label: 'Duplicate Records' },
    { key: 'skipped', label: 'Skipped Records' },
    { key: 'status', label: 'Import Status' },
];

// backHref: the Leads page to go back to.
const ImportHistory = ({ backHref }) => {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortStatus, setSortStatus] = useState({ columnAccessor: 'created_at', direction: 'desc' });
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [range, setRange] = useState([null, null]);
    const [status, setStatus] = useState(null);
    const [folder, setFolder] = useState(null);
    const [folderOptions, setFolderOptions] = useState([]);
    const [selected, setSelected] = useState([]); // import ids
    const [confirm, setConfirm] = useState(null); // { title, body, action }
    const [working, setWorking] = useState(false);
    const [notices, setNotices] = useState([]);
    const [tick, setTick] = useState(0);

    // debounce file-name search
    useEffect(() => {
        const t = setTimeout(() => setQ(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const filters = useMemo(() => {
        const [from, to] = range;
        const end = to ? new Date(to) : null;
        if (end) end.setHours(23, 59, 59, 999);
        const start = from ? new Date(from) : null;
        if (start) start.setHours(0, 0, 0, 0);
        return {
            ...(q ? { q } : {}),
            ...(start ? { from: start.toISOString() } : {}),
            ...(end ? { to: end.toISOString() } : {}),
            ...(status ? { status } : {}),
            ...(folder ? { folder } : {}),
            sort: sortStatus.columnAccessor,
            dir: sortStatus.direction,
        };
    }, [q, range, status, folder, sortStatus]);
    const filterKey = JSON.stringify(filters);
    const hasFilters = !!(q || range[0] || range[1] || status || folder);

    // new filters -> page 1 (selection is kept across pages on purpose, so the user can export a mix)
    useEffect(() => setPage(1), [filterKey, pageSize]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        api.list({ ...filters, page, page_size: pageSize })
            .then((d) => {
                if (!alive) return;
                setRows(d.rows);
                setTotal(d.total);
            })
            .catch((err) => alive && showNotification({ title: 'Error', message: errMsg(err, 'Failed to load Import History'), color: 'red' }))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [filterKey, page, pageSize, tick]);

    useEffect(() => {
        api.folders().then(setFolderOptions).catch(() => {});
        api.notices().then(setNotices).catch(() => {});
    }, [tick]);

    const reload = () => setTick((t) => t + 1);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(total, page * pageSize);

    /* ───── actions ───── */
    const download = async (row, kind) => {
        try {
            const res = await api.file(row.id, kind);
            const fallback = kind === 'error' ? `${row.file_name.replace(/\.csv$/i, '')}_error_report.csv` : row.file_name;
            const where = await saveBlob(res.data, fallback);
            if (where === 'documents') showNotification({ title: 'Saved', message: `${fallback} saved to Documents.`, color: 'green' });
        } catch (err) {
            // blob error bodies need reading
            let message = 'Download failed';
            try {
                message = JSON.parse(await err.response.data.text()).message || message;
            } catch {}
            showNotification({ title: 'Download failed', message, color: 'red' });
            reload();
        }
    };

    const askDeleteFile = (row, kind) =>
        setConfirm({
            title: kind === 'original' ? 'Delete original CSV?' : 'Delete error report?',
            body: `“${row.file_name}” — the stored ${kind === 'original' ? 'original CSV file' : 'error report'} will be deleted permanently. The upload summary and your imported leads stay.`,
            action: async () => {
                await api.deleteFile(row.id, kind);
                showNotification({ title: 'Deleted', message: 'File deleted.', color: 'green' });
            },
        });

    const askDeleteSelected = () => {
        const withFiles = selected.length;
        setConfirm({
            title: `Delete files of ${withFiles} upload${withFiles === 1 ? '' : 's'}?`,
            body: `The stored original CSV files and error reports of the ${withFiles} selected upload${withFiles === 1 ? '' : 's'} will be deleted permanently. Import History summaries and your imported leads stay unchanged.`,
            action: async () => {
                const { deleted } = await api.deleteMany(selected);
                showNotification({ title: 'Deleted', message: `${deleted} file${deleted === 1 ? '' : 's'} deleted.`, color: 'green' });
                setSelected([]);
            },
        });
    };

    const runConfirm = async () => {
        setWorking(true);
        try {
            await confirm.action();
            setConfirm(null);
            reload();
        } catch (err) {
            showNotification({ title: 'Error', message: errMsg(err, 'Something went wrong'), color: 'red' });
        } finally {
            setWorking(false);
        }
    };

    // which: 'all' (complete history with the current search/filters) | 'selected'
    const doExport = async (which, format) => {
        try {
            const params = which === 'selected' ? { ids: selected.join(','), sort: filters.sort, dir: filters.dir } : filters;
            const data = await api.exportRows(params);
            if (!data.length) return showNotification({ title: 'Nothing to export', message: 'No records match.', color: 'yellow' });
            const out = data.map((r) => ({
                ...r,
                uploaded: fmtDateTime(r.created_at),
                folder: r.folder_name ? `${r.folder_name}${r.folder_exists ? '' : ' (deleted)'}` : '—',
            }));
            const where = await exportTable({ rows: out, columns: EXPORT_COLUMNS, fileBase: `import-history-${new Date().toISOString().slice(0, 10)}`, format, sheetName: 'Import History' });
            if (where === 'documents') showNotification({ title: 'Saved', message: 'Report saved to Documents.', color: 'green' });
        } catch (err) {
            showNotification({ title: 'Export failed', message: errMsg(err, 'Export failed'), color: 'red' });
        }
    };

    const dismissNotices = async () => {
        await api.markRead(notices.map((n) => n.id)).catch(() => {});
        setNotices([]);
    };

    /* ───── selection ───── */
    const pageIds = rows.map((r) => r.id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const someOnPage = pageIds.some((id) => selected.includes(id));
    const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const togglePage = (checked) => setSelected((prev) => (checked ? [...new Set([...prev, ...pageIds])] : prev.filter((id) => !pageIds.includes(id))));

    /* ───── small pieces ───── */
    const folderCell = (r) =>
        r.folder_name ? (
            <span className="inline-flex min-w-0 items-center gap-1">
                <IconFolder size={14} className="flex-shrink-0 text-blue-500" />
                <span className="truncate">{r.folder_name}</span>
                {!r.folder_exists && <Badge size="xs" color="gray" variant="light">deleted</Badge>}
            </span>
        ) : (
            '—'
        );

    const filesCell = (r) => {
        if (!r.has_original && !r.has_error) return <Text size="xs" color="dimmed">Files deleted</Text>;
        const left = daysLeft(r.files_expire_at);
        return (
            <div className="flex flex-wrap items-center gap-1">
                {r.has_original && (
                    <Menu withinPortal shadow="md" position="bottom-end">
                        <Menu.Target>
                            <Button size="xs" compact variant="light" color="blue" leftIcon={<IconFileText size={13} />}>CSV</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item icon={<IconDownload size={14} />} onClick={() => download(r, 'original')}>Download original CSV</Menu.Item>
                            <Menu.Item color="red" icon={<IconTrash size={14} />} onClick={() => askDeleteFile(r, 'original')}>Delete original CSV</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
                {r.has_error && (
                    <Menu withinPortal shadow="md" position="bottom-end">
                        <Menu.Target>
                            <Button size="xs" compact variant="light" color="red" leftIcon={<IconAlertTriangle size={13} />}>Errors</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item icon={<IconDownload size={14} />} onClick={() => download(r, 'error')}>Download error report</Menu.Item>
                            <Menu.Item color="red" icon={<IconTrash size={14} />} onClick={() => askDeleteFile(r, 'error')}>Delete error report</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
                <Tooltip label={`Files are deleted automatically on ${fmtDate(r.files_expire_at)}`} withinPortal>
                    <Text size="xs" color={left <= 3 ? 'red' : 'dimmed'} className="w-full whitespace-nowrap">{left <= 0 ? 'today' : `${left}d left`}</Text>
                </Tooltip>
            </div>
        );
    };

    const statusBadge = (r) => (
        <Tooltip label={r.error_message || ''} disabled={!r.error_message} withinPortal>
            <Badge color={STATUS_COLOR[r.status] || 'gray'} variant="light" size="sm">{r.status}</Badge>
        </Tooltip>
    );

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

    return (
        <div className="panel mt-0 p-3 md:mt-6 md:!p-5 max-md:!border-0 max-md:!bg-transparent max-md:!shadow-none">
            {/* header */}
            <div className="mb-4 flex items-center gap-2">
                <ActionIcon variant="subtle" color="dark" onClick={() => (backHref ? router.push(backHref) : router.back())} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
                        <IconHistory size={22} className="text-blue-600" /> Import History
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your CSV uploads</p>
                </div>
            </div>

            {/* 3-day deletion notices */}
            {notices.length > 0 && (
                <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Files will be deleted soon" mb="md" withCloseButton onClose={dismissNotices}>
                    {notices.slice(0, 5).map((n) => (
                        <Text key={n.id} size="sm">• {n.message}</Text>
                    ))}
                    {notices.length > 5 && <Text size="sm">…and {notices.length - 5} more.</Text>}
                </Alert>
            )}

            {/* filters */}
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <TextInput
                    size="sm"
                    radius="xl"
                    icon={<IconSearch size={15} />}
                    placeholder="Search file name"
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    rightSection={search ? <ActionIcon size="xs" onClick={() => setSearch('')} aria-label="Clear search"><IconX size={12} /></ActionIcon> : null}
                />
                <DateRangePicker size="sm" radius="xl" icon={<IconCalendar size={15} />} placeholder="Upload date range" value={range} onChange={setRange} clearable inputFormat="DD MMM YYYY" />
                <Select size="sm" radius="xl" placeholder="All statuses" data={STATUS_OPTIONS} value={status} onChange={setStatus} clearable />
                <Select size="sm" radius="xl" placeholder="All folders" data={folderOptions} value={folder} onChange={setFolder} clearable searchable icon={<IconFolder size={15} />} nothingFound="No folders" />
                <Button
                    size="sm"
                    radius="xl"
                    variant="subtle"
                    color="gray"
                    disabled={!hasFilters}
                    onClick={() => {
                        setSearch('');
                        setRange([null, null]);
                        setStatus(null);
                        setFolder(null);
                    }}
                >
                    Reset
                </Button>
            </div>

            {/* toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Text size="sm" color="dimmed">
                    {total} upload{total === 1 ? '' : 's'}
                    {selected.length > 0 && <> · <b className="text-gray-700 dark:text-gray-200">{selected.length} selected</b></>}
                </Text>
                {selected.length > 0 && (
                    <Button size="xs" radius="xl" variant="subtle" color="gray" onClick={() => setSelected([])}>Clear selection</Button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <Button size="xs" radius="xl" color="red" variant="light" leftIcon={<IconTrash size={15} />} disabled={!selected.length} onClick={askDeleteSelected}>
                        Delete files
                    </Button>
                    {exportMenu}
                </div>
            </div>

            {/* desktop table */}
            <div className="hidden lg:block [&_th]:!whitespace-nowrap [&_th]:!px-2 [&_td]:!px-2">
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
                    noRecordsText={hasFilters ? 'No uploads match these filters' : 'No CSV uploads yet'}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    totalRecords={total}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    paginationText={({ from: a, to: b, totalRecords }) => `Page ${page} of ${pages} · ${a}–${b} of ${totalRecords} uploads`}
                    columns={[
                        {
                            accessor: 'select',
                            width: 36,
                            title: <Checkbox size="xs" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={(e) => togglePage(e.currentTarget.checked)} aria-label="Select page" />,
                            render: (r) => <Checkbox size="xs" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.file_name}`} />,
                        },
                        { accessor: 'created_at', title: 'Uploaded', sortable: true, width: 125, render: (r) => { const [d, ...t] = fmtDateTime(r.created_at).split(', '); return <div className="leading-tight"><div className="whitespace-nowrap">{d}</div><div className="whitespace-nowrap text-xs text-gray-500">{t.join(', ')}</div></div>; } },
                        { accessor: 'file_name', title: 'File name', sortable: true, ellipsis: true, width: 170, render: (r) => <span title={r.file_name} className="font-medium">{r.file_name}</span> },
                        { accessor: 'folder_name', title: 'Folder', sortable: true, ellipsis: true, width: 120, render: folderCell },
                        { accessor: 'total_rows', title: 'Total', sortable: true, textAlignment: 'right', width: 78 },
                        { accessor: 'imported', title: 'Imported', sortable: true, textAlignment: 'right', width: 100, render: (r) => <span className="font-semibold text-green-600">{r.imported}</span> },
                        { accessor: 'duplicates', title: 'Duplicates', textAlignment: 'right', width: 100, render: (r) => r.duplicates || 0 },
                        { accessor: 'skipped', title: 'Skipped', textAlignment: 'right', width: 84, render: (r) => <span className={r.skipped ? 'text-red-600' : ''}>{r.skipped}</span> },
                        { accessor: 'status', title: 'Status', sortable: true, width: 150, render: statusBadge },
                        { accessor: 'files', title: 'Files', width: 150, render: filesCell },
                    ]}
                />
            </div>

            {/* phone: cards */}
            <div className="lg:hidden">
                {selected.length === 0 && rows.length > 0 && (
                    <Checkbox size="xs" mb="xs" label="Select this page" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={(e) => togglePage(e.currentTarget.checked)} />
                )}
                <div className="flex flex-col gap-2">
                    {rows.map((r) => (
                        <div key={r.id} className={`rounded-xl border p-3 ${selected.includes(r.id) ? 'border-blue-400 bg-blue-50/60 dark:bg-gray-800' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
                            <div className="flex items-start gap-2">
                                <Checkbox size="xs" mt={2} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.file_name}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold">{r.file_name}</div>
                                    <div className="text-xs text-gray-500">{fmtDateTime(r.created_at)}</div>
                                </div>
                                {statusBadge(r)}
                            </div>
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">{folderCell(r)}</div>
                            <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                                {[
                                    ['Total', r.total_rows, ''],
                                    ['Imported', r.imported, 'text-green-600'],
                                    ['Duplicates', r.duplicates || 0, ''],
                                    ['Skipped', r.skipped, r.skipped ? 'text-red-600' : ''],
                                ].map(([label, value, cls]) => (
                                    <div key={label} className="rounded-lg bg-gray-50 py-1.5 dark:bg-gray-800">
                                        <div className={`text-sm font-bold ${cls}`}>{value}</div>
                                        <div className="text-[10px] text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2">{filesCell(r)}</div>
                        </div>
                    ))}
                    {!loading && rows.length === 0 && (
                        <Text align="center" color="dimmed" py={40}>{hasFilters ? 'No uploads match these filters' : 'No CSV uploads yet'}</Text>
                    )}
                </div>
                {total > 0 && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                        <Text size="xs" color="dimmed">Page {page} of {pages} · {from}–{to} of {total}</Text>
                        <Pagination size="sm" page={page} onChange={setPage} total={pages} siblings={0} />
                        <Select size="xs" className="w-32" data={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }))} value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} />
                    </div>
                )}
            </div>

            {/* confirm */}
            <Modal opened={!!confirm} onClose={() => !working && setConfirm(null)} title={<Text weight={700} size="lg">{confirm?.title}</Text>} centered radius="lg" size="sm">
                <Text size="sm">{confirm?.body}</Text>
                <Group position="right" mt="lg">
                    <Button variant="default" radius="xl" onClick={() => setConfirm(null)} disabled={working}>Cancel</Button>
                    <Button color="red" radius="xl" onClick={runConfirm} loading={working}>Delete</Button>
                </Group>
            </Modal>
        </div>
    );
};

export default ImportHistory;
