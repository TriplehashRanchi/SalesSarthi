// src/components/AppointmentTable.jsx
'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { Menu, Button, Badge, Text, Tabs, LoadingOverlay, Alert, ActionIcon, Avatar } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconPencil, IconAlertCircle, IconCalendarDue, IconCalendarCheck, IconCalendarCancel } from '@tabler/icons-react';
import AppointmentEditDrawer from './AppointmentEditDrawer';
import { getAuth } from 'firebase/auth';
import { isFuture, isPast, parseISO, format, isValid } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZES = [10, 20, 30, 50, 100];

const AppointmentTable = () => {
    const router = useRouter();
    const [allAppointments, setAllAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');

    // State for each tab's table
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [upcomingPageSize, setUpcomingPageSize] = useState(PAGE_SIZES[0]);
    const [upcomingSortStatus, setUpcomingSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'asc' });

    const [completedPage, setCompletedPage] = useState(1);
    const [completedPageSize, setCompletedPageSize] = useState(PAGE_SIZES[0]);
    const [completedSortStatus, setCompletedSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'desc' });

    const [pastMissedPage, setPastMissedPage] = useState(1);
    const [pastMissedPageSize, setPastMissedPageSize] = useState(PAGE_SIZES[0]);
    const [pastMissedSortStatus, setPastMissedSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'desc' });

    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    // --- Data Fetching (Using the specific user endpoint) ---
    const fetchAppointments = async () => {
        setLoading(true);
        setError(null);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();
            // Using the specific endpoint for the logged-in user
            const response = await axios.get(`${API_URL}/api/appointments/user`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllAppointments(response.data || []);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load appointments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    // --- Data Filtering and Sorting ---
    const filterAndSortData = (data, filterFn, sortStatus) => {
        if (!Array.isArray(data)) return [];
        const filtered = data.filter(filterFn);
        if (sortStatus?.columnAccessor) {
            const sorted = sortBy(filtered, sortStatus.columnAccessor);
            return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
        }
        return filtered;
    };

    const upcomingAppointments = useMemo(() =>
        filterAndSortData(allAppointments, appt => appt?.appointment_date && appt.status?.toLowerCase() === 'scheduled' && isFuture(parseISO(appt.appointment_date)), upcomingSortStatus),
        [allAppointments, upcomingSortStatus]
    );

    const completedAppointments = useMemo(() =>
        filterAndSortData(allAppointments, appt => appt?.status?.toLowerCase() === 'completed', completedSortStatus),
        [allAppointments, completedSortStatus]
    );

    const pastMissedAppointments = useMemo(() =>
        filterAndSortData(allAppointments, appt => appt?.appointment_date && appt.status?.toLowerCase() !== 'completed' && isPast(parseISO(appt.appointment_date)), pastMissedSortStatus),
        [allAppointments, pastMissedSortStatus]
    );

    // --- Data Pagination for Desktop Table ---
    const paginateData = (data, page, pageSize) => {
        if (!Array.isArray(data)) return [];
        const from = (page - 1) * pageSize;
        return data.slice(from, from + pageSize);
    };

    const paginatedUpcoming = useMemo(() => paginateData(upcomingAppointments, upcomingPage, upcomingPageSize), [upcomingAppointments, upcomingPage, upcomingPageSize]);
    const paginatedCompleted = useMemo(() => paginateData(completedAppointments, completedPage, completedPageSize), [completedAppointments, completedPage, completedPageSize]);
    const paginatedPastMissed = useMemo(() => paginateData(pastMissedAppointments, pastMissedPage, pastMissedPageSize), [pastMissedAppointments, pastMissedPage, pastMissedPageSize]);

    // --- Event Handlers ---
    const handleManageAppointment = (appointment) => {
        setSelectedAppointment(appointment);
        setOpenDrawer(true);
    };

    const refreshAppointments = () => {
        fetchAppointments();
        setOpenDrawer(false);
    };

    const handleTabChange = (newTab) => setActiveTab(newTab);
    const handlePageSizeChange = (setter, pageSetter) => (newPageSize) => {
        setter(newPageSize);
        pageSetter(1);
    };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        try {
            const parsedDate = parseISO(dateString);
            return isValid(parsedDate) ? format(parsedDate, 'MMM dd, yyyy hh:mm a') : 'Invalid Date';
        } catch { return 'Invalid Date Format'; }
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled': return <Badge color="blue" variant="light">Scheduled</Badge>;
            case 'completed': return <Badge color="green" variant="light">Completed</Badge>;
            case 'missed': return <Badge color="red" variant="light">Missed</Badge>;
            case 'cancelled': return <Badge color="gray" variant="light">Cancelled</Badge>;
            default: return <Badge color="orange" variant="light">{status || 'Unknown'}</Badge>;
        }
    };

    // --- Columns Definition ---
    const commonColumns = [
        { accessor: 'appointment_date', title: 'Date & Time', render: (r) => <Text size="sm">{formatDate(r.appointment_date)}</Text>, sortable: true, width: 200 },
        { accessor: 'appointment_type', title: 'Type', sortable: true, width: 150, render: (r) => <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{r.appointment_type || '-'}</span> },
        { accessor: 'status', title: 'Status', render: (r) => getStatusBadge(r.status), sortable: true, width: 120 },
        { accessor: 'notes', title: 'Notes', render: (r) => <Text truncate>{r.notes || '-'}</Text>, width: 'auto' },
        { accessor: 'actions', title: 'Actions', textAlign: 'right', width: 100, render: (r) => (
            <Menu withinPortal shadow="md" width={200} position="bottom-end">
                <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label="Manage appointment"><IconPencil size={18} /></ActionIcon></Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item onClick={() => handleManageAppointment(r)} icon={<IconPencil size={14} />}>Manage Appointment</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        )},
    ];

    // --- Row for Mobile View ---
    const AppointmentCard = ({ appointment }) => {
        const when = formatDate(appointment.appointment_date);
        const name = appointment.full_name || appointment.appointment_type || 'Appointment';
        return (
            <div className="flex items-start gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700">
                <Avatar color="blue" variant="light" radius="xl" size="lg">{name.trim().charAt(0).toUpperCase()}</Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <Text weight={500} lineClamp={1} className="dark:text-white">{name}</Text>
                        {getStatusBadge(appointment.status)}
                    </div>
                    <Text size="xs" color="dimmed">{appointment.full_name && appointment.appointment_type ? `${when} · ${appointment.appointment_type}` : when}</Text>
                    {appointment.notes && <Text size="sm" lineClamp={2} mt={4} className="text-gray-600 dark:text-gray-300">{appointment.notes}</Text>}
                </div>
                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label="Manage appointment"><IconPencil size={18} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => handleManageAppointment(appointment)} icon={<IconPencil size={14} />}>Manage Appointment</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </div>
        );
    };

    return (
        <div className="panel relative mt-0 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent md:mt-6">
            <div className="mb-4 flex items-center gap-2">
                <ActionIcon className="md:hidden" variant="subtle" color="dark" onClick={() => router.back()} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold leading-tight sm:text-2xl">My Appointments</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{upcomingAppointments.length} upcoming · {allAppointments.length} total</p>
                </div>
            </div>
            <LoadingOverlay visible={loading} overlayBlur={2} />
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onTabChange={handleTabChange} variant="pills" radius="xl" color="blue">
                <div className="pb-1">
                    <Tabs.List
                        sx={{
                            flexWrap: 'nowrap',
                            gap: 6,
                            // On phones the three tabs share the row equally: no icons, tighter text, no sideways scroll.
                            '@media (max-width: 640px)': { '& .mantine-Tabs-tab': { flex: 1 }, '& .mantine-Tabs-tabIcon': { display: 'none' }, '& .mantine-Tabs-tabLabel': { fontSize: 13 } },
                        }}
                    >
                        {[
                            { value: 'upcoming', label: 'Upcoming', icon: <IconCalendarDue size="1rem" />, count: upcomingAppointments.length },
                            { value: 'completed', label: 'Completed', icon: <IconCalendarCheck size="1rem" />, count: completedAppointments.length },
                            { value: 'past_missed', label: 'Past / Missed', icon: <IconCalendarCancel size="1rem" />, count: pastMissedAppointments.length },
                        ].map((t) => (
                            <Tabs.Tab
                                key={t.value}
                                value={t.value}
                                icon={t.icon}
                                sx={{ whiteSpace: 'nowrap', padding: '8px 16px', '@media (max-width: 640px)': { padding: '8px 6px', minWidth: 0 } }}
                                rightSection={t.count > 0 ? (
                                    <Badge size="xs" variant="filled" sx={{ backgroundColor: activeTab === t.value ? 'rgba(255,255,255,0.3)' : '#ede9fe', color: activeTab === t.value ? 'inherit' : '#6d28d9' }}>{t.count}</Badge>
                                ) : null}
                            >
                                {t.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </div>

                {/* --- Upcoming Appointments Panel --- */}
                <Tabs.Panel value="upcoming" pt="md">
                    <div className="md:hidden">
                        {upcomingAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                        {upcomingAppointments.length === 0 && !loading && <Text align="center" color="dimmed" py={40}>No upcoming appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover verticalSpacing="sm" className="table-hover whitespace-nowrap" records={paginatedUpcoming} columns={commonColumns} totalRecords={upcomingAppointments.length} recordsPerPage={upcomingPageSize} page={upcomingPage} onPageChange={setUpcomingPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setUpcomingPageSize, setUpcomingPage)} sortStatus={upcomingSortStatus} onSortStatusChange={setUpcomingSortStatus} minHeight={120} paginationColor="blue" noRecordsText="No upcoming appointments found" fetching={loading} />
                    </div>
                </Tabs.Panel>

                {/* --- Completed Appointments Panel --- */}
                <Tabs.Panel value="completed" pt="md">
                    <div className="md:hidden">
                        {completedAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                         {completedAppointments.length === 0 && !loading && <Text align="center" color="dimmed" py={40}>No completed appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover verticalSpacing="sm" className="table-hover whitespace-nowrap" records={paginatedCompleted} columns={commonColumns} totalRecords={completedAppointments.length} recordsPerPage={completedPageSize} page={completedPage} onPageChange={setCompletedPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setCompletedPageSize, setCompletedPage)} sortStatus={completedSortStatus} onSortStatusChange={setCompletedSortStatus} minHeight={120} paginationColor="blue" noRecordsText="No completed appointments found" fetching={loading} />
                    </div>
                </Tabs.Panel>

                {/* --- Past & Missed Appointments Panel --- */}
                <Tabs.Panel value="past_missed" pt="md">
                    <div className="md:hidden">
                        {pastMissedAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                         {pastMissedAppointments.length === 0 && !loading && <Text align="center" color="dimmed" py={40}>No past or missed appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover verticalSpacing="sm" className="table-hover whitespace-nowrap" records={paginatedPastMissed} columns={commonColumns} totalRecords={pastMissedAppointments.length} recordsPerPage={pastMissedPageSize} page={pastMissedPage} onPageChange={setPastMissedPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setPastMissedPageSize, setPastMissedPage)} sortStatus={pastMissedSortStatus} onSortStatusChange={setPastMissedSortStatus} minHeight={120} paginationColor="blue" noRecordsText="No past due or missed appointments found" fetching={loading} />
                    </div>
                </Tabs.Panel>
            </Tabs>

            <AppointmentEditDrawer
                appointment={selectedAppointment}
                opened={openDrawer}
                onClose={() => setOpenDrawer(false)}
                onUpdate={refreshAppointments}
            />
        </div>
    );
};

export default AppointmentTable;