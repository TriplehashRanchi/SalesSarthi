'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ActionIcon, Avatar, Button, Loader, Card, Grid, Text, Title, Badge, Menu, TextInput, Select, Modal, Group, NumberInput, Tooltip } from '@mantine/core';
import { DateRangePicker } from '@mantine/dates';
import { DataTable } from 'mantine-datatable';
import superAdminAxios from '@/utils/superAdminAxios';
import sortBy from 'lodash/sortBy';
import CreateAdminModal from '@/components/forms/CreateAdminForm';
import { IconAlertTriangle, IconCalendar, IconCircleCheck, IconCircleX, IconDotsVertical, IconEdit, IconEye, IconPackage, IconPlus, IconSearch, IconUsers, IconX } from '@tabler/icons-react';
import AdminDetailDrawer from '@/components/admin/AdminDetailDrawer';
import Swal from 'sweetalert2';
import ExportCsvModal from '@/components/common/ExportCsvButton';
import { Switch } from "@mantine/core";


const AdminTable = () => {
    const [admins, setAdmins] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 🔍 filters
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all'); // all | active | expiring | expired (by expiry date, like the badges)
    const [plan, setPlan] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [fromDate, toDate] = dateRange;
    const [dateField, setDateField] = useState('created_at'); // created_at or expires_at

    const [recordsData, setRecordsData] = useState([]);
    const [filteredTotal, setFilteredTotal] = useState(0);
    const [sortStatus, setSortStatus] = useState({ columnAccessor: 'name', direction: 'asc' });
    const [openModal, setOpenModal] = useState(false);
    const [viewAdmin, setViewAdmin] = useState(null); // admin shown in the details drawer

    // ✏️ Edit Modal States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        subscription_plan: '',
        amount: '',
        currency: 'INR',
    });

    // 👥 Team member limit modal
    const [limitAdmin, setLimitAdmin] = useState(null);
    const [limitValue, setLimitValue] = useState('');
    const [savingLimit, setSavingLimit] = useState(false);

    const openLimitModal = (admin) => {
        setLimitAdmin(admin);
        setLimitValue(admin.max_team_members ?? '');
    };

    const handleLimitSave = async () => {
        setSavingLimit(true);
        try {
            const res = await superAdminAxios.put(`/api/superadmin/admins/${limitAdmin.admin_id}/team-limit`, {
                max_team_members: limitValue === '' || limitValue == null ? null : limitValue,
            });
            Swal.fire('✅ Updated!', res.data.message, 'success');
            setLimitAdmin(null);
            fetchAdmins();
        } catch (err) {
            Swal.fire('❌ Error', err.response?.data?.message || 'Update failed', 'error');
        } finally {
            setSavingLimit(false);
        }
    };

    const [loading, setLoading] = useState(true);
    const fetchAdmins = async () => {
        try {
            const response = await superAdminAxios.get('/api/superadmin/admins');
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    // Expiry-based status, same rule as the Active / Expired badges in the table.
    const statusKey = (a) => {
        if (!a.expires_at) return 'active';
        const left = (new Date(a.expires_at).getTime() - Date.now()) / 86400000;
        if (left < 0) return 'expired';
        return left <= 7 ? 'expiring' : 'active';
    };
    const counts = useMemo(() => {
        const c = { all: admins.length, active: 0, expiring: 0, expired: 0 };
        admins.forEach((a) => {
            const k = statusKey(a);
            c[k] += 1;
            if (k === 'expiring') c.active += 1;
        });
        return c;
    }, [admins]);
    const hasFilters = !!search || !!plan || status !== 'all' || !!fromDate || !!toDate;
    const clearFilters = () => {
        setSearch('');
        setPlan(null);
        setStatus('all');
        setDateRange([null, null]);
    };

    useEffect(() => {
        let filtered = admins;

        // 🔍 text search
        if (search) {
            filtered = filtered.filter(
                (item) =>
                    item.name?.toLowerCase().includes(search.toLowerCase()) || item.email?.toLowerCase().includes(search.toLowerCase()) || item.phone?.toLowerCase().includes(search.toLowerCase()),
            );
        }

        // 🎯 status filter
        if (status !== 'all') {
            filtered = filtered.filter((item) => statusKey(item) === status || (status === 'active' && statusKey(item) === 'expiring'));
        }

        // 🎯 plan filter
        if (plan) {
            filtered = filtered.filter((item) => (item.subscription_plan || 'Basic') === plan);
        }

        // 📅 date range filter
        if (fromDate || toDate) {
            filtered = filtered.filter((item) => {
                const dateValue = new Date(item[dateField]);
                if (fromDate && dateValue < new Date(fromDate)) return false;
                if (toDate && dateValue > new Date(new Date(toDate).setHours(23, 59, 59, 999))) return false;
                return true;
            });
        }

        // 🔢 sort + pagination
        const sorted = sortBy(filtered, sortStatus.columnAccessor);
        const paginated = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setFilteredTotal(paginated.length);
        setRecordsData(paginated.slice(from, to));
    }, [admins, search, status, plan, fromDate, toDate, dateField, sortStatus, page, pageSize]);

    // "10 Nov 2025" in the table; full date + time on hover.
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // 🧾 Handle Edit
    const handleEditClick = (admin) => {
        setSelectedAdmin(admin);
        setEditForm({
            name: admin.name || '',
            email: admin.email || '',
            subscription_plan: admin.subscription_plan || 'Basic',
            amount: '',
            currency: 'INR',
        });
        setEditModalOpen(true);
    };

    const handleEditSave = async () => {
        try {
            const res = await superAdminAxios.put(`/api/superadmin/admins/${selectedAdmin.admin_id}/plan`, editForm);
            Swal.fire('✅ Updated!', res.data.message, 'success');
            setEditModalOpen(false);
            fetchAdmins();
        } catch (err) {
            console.error('Failed to update admin:', err);
            Swal.fire('❌ Error', err.response?.data?.message || 'Update failed', 'error');
        }
    };
    const handleToggleAccess = async (admin) => {
        const newStatus = admin.subscription_status === 'Active' ? 'Cancelled' : 'Active';

        try {
            const res = await superAdminAxios.put(`/api/superadmin/access/${admin.admin_id}`, { status: newStatus });

            Swal.fire({
                icon: 'success',
                title: `Access updated to ${newStatus}`,
                timer: 1200,
                showConfirmButton: false,
            });

            fetchAdmins();
        } catch (err) {
            console.error('Error updating access:', err);
            Swal.fire('❌ Error', 'Could not update access', 'error');
        }
    };

    /* ───────── table cells (shared by desktop table and phone cards) ───────── */
    const AVATAR_COLORS = ['violet', 'blue', 'orange', 'teal', 'pink', 'green'];
    const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();

    const isActive = (a) => !!a.expires_at && new Date(a.expires_at).getTime() >= Date.now();
    const daysLeft = (a) => (a.expires_at ? Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 86400000) : null);

    const statusBadge = (a) => {
        if (!a.expires_at) return <Badge size="sm" variant="light" color="gray">No expiry</Badge>;
        return isActive(a) ? (
            <Badge size="sm" variant="light" color="green">Active</Badge>
        ) : (
            <Badge size="sm" variant="light" color="red">Expired</Badge>
        );
    };

    const usageText = (a) => {
        const full = a.max_team_members !== null && a.max_team_members !== undefined && a.user_count >= a.max_team_members;
        return (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Tooltip label="Team members / limit" withinPortal>
                    <span className={`inline-flex items-center gap-1 ${full ? 'font-medium text-red-600' : ''}`}>
                        <IconUsers size={14} className="text-gray-400" />
                        {a.user_count ?? 0}/{a.max_team_members ?? '∞'}
                    </span>
                </Tooltip>
                <Tooltip label="Leads" withinPortal>
                    <span className="inline-flex items-center gap-1">
                        <IconPackage size={14} className="text-gray-400" />
                        {a.lead_count ?? 0}
                    </span>
                </Tooltip>
            </div>
        );
    };

    const validityCell = (a) => {
        const left = daysLeft(a);
        return (
            <div className="leading-tight">
                <Tooltip label={formatDateTime(a.expires_at) || 'No expiry'} withinPortal>
                    <div className="text-sm">{formatDate(a.expires_at)}</div>
                </Tooltip>
                <div className={`text-xs ${left !== null && left >= 0 && left <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                    {left === null ? '' : left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : `${-left} day${left === -1 ? '' : 's'} ago`}
                </div>
            </div>
        );
    };

    const accessSwitch = (admin) => (
        <div onClick={(e) => e.stopPropagation()}>
            <Switch
                checked={admin.subscription_status === 'Active'}
                onChange={() => handleToggleAccess(admin)}
                size="sm"
                color="green"
                aria-label={`Access for ${admin.name}`}
            />
        </div>
    );

    const actionsMenu = (admin) => (
        <div onClick={(e) => e.stopPropagation()}>
        <Menu withinPortal shadow="md" width={190} position="bottom-end">
            <Menu.Target>
                <ActionIcon variant="subtle" aria-label={`Actions for ${admin.name}`}>
                    <IconDotsVertical size={18} />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item icon={<IconEye size={15} />} onClick={() => setViewAdmin(admin)}>View details</Menu.Item>
                <Menu.Divider />
                <Menu.Item icon={<IconEdit size={15} />} onClick={() => handleEditClick(admin)}>Edit plan</Menu.Item>
                <Menu.Item icon={<IconUsers size={15} />} onClick={() => openLimitModal(admin)}>Team limit</Menu.Item>
                <Menu.Item icon={<IconPackage size={15} />} component={Link} href={`/superadmin/admins/${admin.admin_id}`}>Manage add-ons</Menu.Item>
            </Menu.Dropdown>
        </Menu>
        </div>
    );

    const columns = [
        {
            accessor: 'name',
            title: 'Admin',
            sortable: true,
            render: (a) => {
                const initial = initialOf(a.name);
                return (
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar radius="xl" variant="light" color={AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length]}>{initial}</Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium">{a.name || '—'}</div>
                            <div className="truncate text-xs text-gray-500">{a.email}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessor: 'subscription_plan',
            title: 'Plan',
            sortable: true,
            render: (a) => (
                <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-medium">{a.subscription_plan || 'Basic'}</span>
                    {statusBadge(a)}
                </div>
            ),
        },
        { accessor: 'stats', title: 'Usage', render: usageText },
        { accessor: 'expires_at', title: 'Expires', sortable: true, render: validityCell },
        { accessor: 'access_toggle', title: 'Access', textAlignment: 'center', render: accessSwitch },
        { accessor: 'action', title: '', textAlignment: 'right', render: actionsMenu },
    ];

    return (
        <div className="panel mt-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-tight dark:text-white-light sm:text-xl">Admins</h2>
                    <p className="text-sm text-gray-500">{counts.all} on the platform</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <ExportCsvModal
                        allAdmins={admins}
                        label={<span className="hidden sm:inline">Export</span>}
                        buttonProps={{ variant: 'light', color: 'violet', radius: 'xl', className: 'px-3 sm:px-4' }}
                    />
                    <Button color="violet" radius="xl" leftIcon={<IconPlus size={16} />} onClick={() => setOpenModal(true)}>
                        <span className="sm:hidden">New</span>
                        <span className="hidden sm:inline">New admin</span>
                    </Button>
                </div>
            </div>

            {/* Quick status tiles: click to filter */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                {[
                    { key: 'all', label: 'All admins', icon: IconUsers, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
                    { key: 'active', label: 'Active', icon: IconCircleCheck, tone: 'text-green-600 bg-green-50 dark:bg-green-500/10' },
                    { key: 'expiring', label: 'Expiring in 7 days', icon: IconAlertTriangle, tone: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' },
                    { key: 'expired', label: 'Expired', icon: IconCircleX, tone: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
                ].map(({ key, label, icon: Icon, tone }) => {
                    const on = status === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setStatus(on && key !== 'all' ? 'all' : key);
                                setPage(1);
                            }}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                on ? 'border-violet-500 ring-1 ring-violet-500' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                            } bg-white dark:bg-gray-900`}
                        >
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                                <Icon size={18} />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-lg font-semibold leading-tight">{counts[key]}</span>
                                <span className="block truncate text-xs text-gray-500">{label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filters: one line on desktop */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <TextInput
                    icon={<IconSearch size={16} />}
                    placeholder="Search name, email or phone"
                    radius="xl"
                    className="md:max-w-xs md:flex-1"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value);
                        setPage(1);
                    }}
                />
                <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                    <Select
                        placeholder="All plans"
                        data={['Basic', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']}
                        value={plan}
                        onChange={(v) => {
                            setPlan(v);
                            setPage(1);
                        }}
                        clearable
                        radius="xl"
                        className="md:w-40"
                    />
                    <Select
                        aria-label="Date type"
                        data={[
                            { value: 'created_at', label: 'Joined' },
                            { value: 'expires_at', label: 'Expiry' },
                        ]}
                        value={dateField}
                        onChange={(v) => setDateField(v || 'created_at')}
                        radius="xl"
                        icon={<IconCalendar size={16} />}
                        className="md:w-36"
                    />
                    <DateRangePicker
                        placeholder="Any date"
                        value={dateRange}
                        onChange={(v) => {
                            setDateRange(v);
                            setPage(1);
                        }}
                        radius="xl"
                        clearable
                        inputFormat="DD MMM YY"
                        amountOfMonths={2}
                        className="col-span-2 md:col-span-1 md:w-64"
                    />
                </div>
                {hasFilters && (
                    <Button variant="subtle" color="gray" radius="xl" leftIcon={<IconX size={14} />} onClick={clearFilters} className="self-start md:self-auto">
                        Clear
                    </Button>
                )}
                <span className="text-sm text-gray-500 md:ml-auto">
                    {filteredTotal} {filteredTotal === 1 ? 'result' : 'results'}
                </span>
            </div>

            {/* Loading / nothing to show: one clean block instead of an empty table */}
            {(loading || filteredTotal === 0) && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-14 text-center dark:border-gray-700">
                    {loading ? (
                        <Loader size="sm" color="violet" />
                    ) : (
                        <>
                            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10">
                                {hasFilters ? <IconSearch size={22} /> : <IconUsers size={22} />}
                            </span>
                            <p className="font-medium">{hasFilters ? 'No admins match these filters' : 'No admins yet'}</p>
                            <p className="mt-1 text-sm text-gray-500">
                                {hasFilters ? 'Try a different search, plan or date range.' : 'Create the first admin to get started.'}
                            </p>
                            {hasFilters ? (
                                <Button mt="md" variant="light" color="violet" radius="xl" leftIcon={<IconX size={14} />} onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            ) : (
                                <Button mt="md" color="violet" radius="xl" leftIcon={<IconPlus size={16} />} onClick={() => setOpenModal(true)}>
                                    New admin
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Desktop / tablet table */}
            <div className={`${loading || filteredTotal === 0 ? '!hidden' : ''} hidden overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-900 md:block`}>
                <DataTable
                    highlightOnHover
                    verticalSpacing="md"
                    horizontalSpacing="md"
                    className="whitespace-nowrap [&_th]:!text-xs [&_th]:!font-semibold [&_th]:!uppercase [&_th]:!tracking-wide [&_th]:!text-gray-500"
                    columns={columns}
                    records={recordsData}
                    idAccessor="admin_id"
                    onRowClick={(a) => setViewAdmin(a)}
                    rowStyle={() => ({ cursor: 'pointer' })}
                    totalRecords={filteredTotal}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPage={pageSize}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    recordsPerPageOptions={[10, 20, 50, 100]}
                    paginationColor="violet"
                />
            </div>

            {/* Phone: one card per admin */}
            <div className="space-y-3 md:hidden">
                {recordsData.map((a) => {
                    const initial = initialOf(a.name);
                    return (
                        <div key={a.admin_id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-start gap-3">
                                <Avatar radius="xl" variant="light" color={AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length]}>{initial}</Avatar>
                                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setViewAdmin(a)}>
                                    <div className="truncate font-medium">{a.name || '—'}</div>
                                    <div className="truncate text-xs text-gray-500">{a.email}</div>
                                </div>
                                {actionsMenu(a)}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{a.subscription_plan || 'Basic'}</span>
                                    {statusBadge(a)}
                                </div>
                                {usageText(a)}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                {validityCell(a)}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    Access {accessSwitch(a)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredTotal > pageSize && (
                    <div className="flex items-center justify-between pt-1 text-sm">
                        <Button variant="default" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                        <span className="text-gray-500">Page {page} of {Math.ceil(filteredTotal / pageSize)}</span>
                        <Button variant="default" size="xs" disabled={page >= Math.ceil(filteredTotal / pageSize)} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                )}
            </div>

            {/* Full details of one admin. Edit / Team limit close it first so their modal is on top. */}
            <AdminDetailDrawer
                admin={viewAdmin}
                onClose={() => setViewAdmin(null)}
                onEditPlan={(a) => {
                    setViewAdmin(null);
                    handleEditClick(a);
                }}
                onTeamLimit={(a) => {
                    setViewAdmin(null);
                    openLimitModal(a);
                }}
            />

            {/* Create Admin Modal */}
            <CreateAdminModal isOpen={openModal} closeModal={() => setOpenModal(false)} onSuccess={fetchAdmins} />

            <Modal opened={!!limitAdmin} onClose={() => setLimitAdmin(null)} title="Team Member Limit" centered>
                <div className="space-y-4">
                    <Text size="sm" color="dimmed">
                        How many team members can <b>{limitAdmin?.name}</b> add? Currently using {limitAdmin?.user_count ?? 0}. Leave empty for no limit.
                    </Text>
                    <NumberInput label="Max team members" min={0} placeholder="No limit" value={limitValue} onChange={setLimitValue} />
                    {limitValue !== '' && limitAdmin && Number(limitValue) < limitAdmin.user_count && (
                        <Text size="xs" color="orange">
                            Already above this limit. Existing members stay, but no new ones can be added.
                        </Text>
                    )}
                    <Group position="right">
                        <Button variant="default" onClick={() => setLimitAdmin(null)} disabled={savingLimit}>Cancel</Button>
                        <Button color="blue" onClick={handleLimitSave} loading={savingLimit}>Save</Button>
                    </Group>
                </div>
            </Modal>

            <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Admin Details" centered>
                <div className="space-y-4">
                    <TextInput label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.currentTarget.value })} />
                    <TextInput label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.currentTarget.value })} />
                    <Select
                        label="Subscription Plan"
                        data={['Basic', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Premium']}
                        value={editForm.subscription_plan}
                        onChange={(value) => setEditForm({ ...editForm, subscription_plan: value })}
                    />
                    <TextInput label="Amount (₹)" type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.currentTarget.value })} />
                    <Group justify="flex-end">
                        <Button color="blue" onClick={handleEditSave}>
                            Save Changes
                        </Button>
                    </Group>
                </div>
            </Modal>
        </div>
    );
};

export default AdminTable;
