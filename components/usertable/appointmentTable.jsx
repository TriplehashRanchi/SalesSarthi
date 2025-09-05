// src/components/AppointmentTable.jsx
'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { Menu, Button, Badge, Text, Tabs, LoadingOverlay, Alert } from '@mantine/core';
import { IconPencil, IconAlertCircle, IconCalendarDue, IconCalendarCheck, IconCalendarCancel } from '@tabler/icons-react';
import AppointmentEditDrawer from './AppointmentEditDrawer';
import { getAuth } from 'firebase/auth';
import { isFuture, isPast, parseISO, format, isValid } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZES = [10, 20, 30, 50, 100];

const AppointmentTable = () => {
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
            case 'scheduled': return <Badge color="blue">Scheduled</Badge>;
            case 'completed': return <Badge color="green">Completed</Badge>;
            case 'missed': return <Badge color="red">Missed</Badge>;
            case 'cancelled': return <Badge color="gray">Cancelled</Badge>;
            default: return <Badge color="orange">{status || 'Unknown'}</Badge>;
        }
    };

    // --- Columns Definition ---
    const commonColumns = [
        { accessor: 'appointment_date', title: 'Date & Time', render: (r) => <Text size="sm">{formatDate(r.appointment_date)}</Text>, sortable: true, width: 200 },
        { accessor: 'appointment_type', title: 'Type', sortable: true, width: 150 },
        { accessor: 'status', title: 'Status', render: (r) => getStatusBadge(r.status), sortable: true, width: 120 },
        { accessor: 'notes', title: 'Notes', render: (r) => <Text truncate>{r.notes || '-'}</Text>, width: 'auto' },
        { accessor: 'actions', title: 'Actions', textAlign: 'right', width: 100, render: (r) => (
            <Menu withinPortal shadow="md" width={200} position="bottom-end">
                <Menu.Target><Button variant="light" size="xs" compact><IconPencil size={16} /></Button></Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item onClick={() => handleManageAppointment(r)} icon={<IconPencil size={14} />}>Manage Appointment</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        )},
    ];

    // --- Card Component for Mobile View ---
    const AppointmentCard = ({ appointment }) => (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between">
                <Text weight={600} size="md" className="dark:text-white">{appointment.appointment_type}</Text>
                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                    <Menu.Target><Button variant="light" size="xs" compact><IconPencil size={16} /></Button></Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => handleManageAppointment(appointment)} icon={<IconPencil size={14} />}>Manage Appointment</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <Text color="dimmed" size="xs">Date & Time</Text>
                    <Text size="sm" className="dark:text-gray-200">{formatDate(appointment.appointment_date)}</Text>
                </div>
                <div>
                    <Text color="dimmed" size="xs">Status</Text>
                    <div>{getStatusBadge(appointment.status)}</div>
                </div>
            </div>
            {appointment.notes && (
                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                    <Text color="dimmed" size="xs">Notes</Text>
                    <Text size="sm" truncate className="dark:text-gray-200">{appointment.notes}</Text>
                </div>
            )}
        </div>
    );

    return (
        <div className="panel relative mt-6">
            <h5 className="mb-4 text-lg font-semibold">My Appointments</h5>
            <LoadingOverlay visible={loading} overlayBlur={2} />
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onTabChange={handleTabChange}>
                <Tabs.List grow>
                    <Tabs.Tab value="upcoming" icon={<IconCalendarDue size="1rem" />}>Upcoming ({upcomingAppointments.length})</Tabs.Tab>
                    <Tabs.Tab value="completed" icon={<IconCalendarCheck size="1rem" />}>Completed ({completedAppointments.length})</Tabs.Tab>
                    <Tabs.Tab value="past_missed" icon={<IconCalendarCancel size="1rem" />}>Past/Missed ({pastMissedAppointments.length})</Tabs.Tab>
                </Tabs.List>

                {/* --- Upcoming Appointments Panel --- */}
                <Tabs.Panel value="upcoming" pt="xs">
                    <div className="md:hidden space-y-4">
                        {upcomingAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                        {upcomingAppointments.length === 0 && !loading && <Text align="center" p="md">No upcoming appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover className="table-hover whitespace-nowrap" records={paginatedUpcoming} columns={commonColumns} totalRecords={upcomingAppointments.length} recordsPerPage={upcomingPageSize} page={upcomingPage} onPageChange={setUpcomingPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setUpcomingPageSize, setUpcomingPage)} sortStatus={upcomingSortStatus} onSortStatusChange={setUpcomingSortStatus} minHeight={200} noRecordsText="No upcoming appointments found" fetching={loading} />
                    </div>
                </Tabs.Panel>

                {/* --- Completed Appointments Panel --- */}
                <Tabs.Panel value="completed" pt="xs">
                    <div className="md:hidden space-y-4">
                        {completedAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                         {completedAppointments.length === 0 && !loading && <Text align="center" p="md">No completed appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover className="table-hover whitespace-nowrap" records={paginatedCompleted} columns={commonColumns} totalRecords={completedAppointments.length} recordsPerPage={completedPageSize} page={completedPage} onPageChange={setCompletedPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setCompletedPageSize, setCompletedPage)} sortStatus={completedSortStatus} onSortStatusChange={setCompletedSortStatus} minHeight={200} noRecordsText="No completed appointments found" fetching={loading} />
                    </div>
                </Tabs.Panel>

                {/* --- Past & Missed Appointments Panel --- */}
                <Tabs.Panel value="past_missed" pt="xs">
                    <div className="md:hidden space-y-4">
                        {pastMissedAppointments.map(appt => <AppointmentCard key={appt.id || appt.appointment_date} appointment={appt} />)}
                         {pastMissedAppointments.length === 0 && !loading && <Text align="center" p="md">No past or missed appointments</Text>}
                    </div>
                    <div className="hidden md:block">
                        <DataTable highlightOnHover className="table-hover whitespace-nowrap" records={paginatedPastMissed} columns={commonColumns} totalRecords={pastMissedAppointments.length} recordsPerPage={pastMissedPageSize} page={pastMissedPage} onPageChange={setPastMissedPage} recordsPerPageOptions={PAGE_SIZES} onRecordsPerPageChange={handlePageSizeChange(setPastMissedPageSize, setPastMissedPage)} sortStatus={pastMissedSortStatus} onSortStatusChange={setPastMissedSortStatus} minHeight={200} noRecordsText="No past due or missed appointments found" fetching={loading} />
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