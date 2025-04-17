// src/components/AppointmentTable.jsx (or appropriate path)
'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { Menu, Button, Badge, Text, Tabs, LoadingOverlay, Alert } from '@mantine/core';
import { IconPencil, IconAlertCircle, IconCalendarDue, IconCalendarCheck, IconCalendarCancel } from '@tabler/icons-react';
import AppointmentEditDrawer from './AppointmentEditDrawer'; // Ensure this path is correct
import { getAuth } from 'firebase/auth';
import { isFuture, isPast, parseISO, format, isValid } from 'date-fns'; // Added isValid

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_SIZES = [10, 20, 30, 50, 100];

const AppointmentTable = () => {
    const [allAppointments, setAllAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Use null for initial error state
    const [activeTab, setActiveTab] = useState('upcoming');

    // State for each tab's table
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [upcomingPageSize, setUpcomingPageSize] = useState(PAGE_SIZES[0]);
    const [upcomingSortStatus, setUpcomingSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'asc' });

    const [completedPage, setCompletedPage] = useState(1);
    const [completedPageSize, setCompletedPageSize] = useState(PAGE_SIZES[0]);
    const [completedSortStatus, setCompletedSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'desc' }); // Default sort desc

    const [pastMissedPage, setPastMissedPage] = useState(1);
    const [pastMissedPageSize, setPastMissedPageSize] = useState(PAGE_SIZES[0]);
    const [pastMissedSortStatus, setPastMissedSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'desc' }); // Default sort desc

    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    // --- Data Fetching ---
    const fetchAppointments = async () => {
        setLoading(true);
        setError(null);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated.');
            }
            const token = await user.getIdToken();
            // Determine Admin or User view if necessary and adjust endpoint
            const response = await axios.get(`${API_URL}/api/appointments/`, { // Using admin endpoint as example
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            setAllAppointments(response.data || []);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(err.message || 'Failed to load appointments.');
            setAllAppointments([]); // Clear data on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []); // Fetch on mount

    // --- Data Filtering and Sorting for Tabs ---
    const filterAndSortData = (data, filterFn, sortStatus) => {
        if (!Array.isArray(data)) return []; // Ensure data is an array
        const filtered = data.filter(filterFn);
        // Ensure sortStatus and columnAccessor exist before sorting
        if (sortStatus && sortStatus.columnAccessor) {
            const sorted = sortBy(filtered, sortStatus.columnAccessor);
            return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
        }
        return filtered; // Return filtered if no valid sort status
    };


    const upcomingAppointments = useMemo(() =>
        filterAndSortData(
            allAppointments,
            (appt) => {
                try {
                    // Ensure appointment_date exists and is valid before parsing
                    return appt && appt.appointment_date && appt.status?.toLowerCase() === 'scheduled' && isFuture(parseISO(appt.appointment_date));
                } catch { return false; }
            },
            upcomingSortStatus
        ), [allAppointments, upcomingSortStatus]);

    const completedAppointments = useMemo(() =>
        filterAndSortData(
            allAppointments,
            (appt) => appt?.status?.toLowerCase() === 'completed', // Safer access
            completedSortStatus
        ), [allAppointments, completedSortStatus]);

    const pastMissedAppointments = useMemo(() =>
        filterAndSortData(
            allAppointments,
            (appt) => {
                try {
                    const statusLower = appt?.status?.toLowerCase();
                    // Ensure appointment_date exists and is valid
                    return appt && appt.appointment_date && statusLower !== 'completed' && isPast(parseISO(appt.appointment_date));
                } catch { return false; }
            },
            pastMissedSortStatus
        ), [allAppointments, pastMissedSortStatus]);


    // --- Data Pagination for Tabs ---
    const paginateData = (data, page, pageSize) => {
        if (!Array.isArray(data)) return []; // Ensure data is an array
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        return data.slice(from, to);
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
        fetchAppointments(); // Refetch all data
        setOpenDrawer(false);
    };

    // Reset page to 1 when switching tabs or changing page size
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        // Reset pages - optional but often good UX
        setUpcomingPage(1);
        setCompletedPage(1);
        setPastMissedPage(1);
    };

    const handlePageSizeChange = (setter, pageSetter) => (newPageSize) => {
        setter(newPageSize);
        pageSetter(1); // Reset page when size changes
    };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return 'No Date';
        try {
            const parsedDate = parseISO(dateString);
            // Check if the parsed date is valid before formatting
            return isValid(parsedDate) ? format(parsedDate, 'MMM dd, yyyy hh:mm a') : 'Invalid Date';
        } catch {
            return 'Invalid Date Format';
        }
    };

    const getStatusBadge = (status) => {
         const statusLower = status?.toLowerCase(); // Use optional chaining
         switch (statusLower) {
            case 'scheduled': return <Badge color="blue">Scheduled</Badge>;
            case 'completed': return <Badge color="green">Completed</Badge>;
            case 'missed': return <Badge color="red">Missed</Badge>;
            case 'cancelled': return <Badge color="gray">Cancelled</Badge>;
            default: return <Badge color="orange">{status || 'Unknown'}</Badge>;
         }
    };

    // --- Columns Definition (Reusable) ---
    const commonColumns = [ // Types removed
        {
            accessor: 'appointment_date',
            title: 'Date & Time',
            render: (record) => (
                <Text size="sm">{formatDate(record.appointment_date)}</Text>
            ),
            sortable: true,
            width: 200,
        },
        { accessor: 'appointment_type', title: 'Type', sortable: true, width: 150 },
        { accessor: 'full_name', title: 'Customer/Lead', sortable: true, render: (record) => record.full_name || 'N/A', width: 200 }, // Handle missing name
        {
            accessor: 'status',
            title: 'Status',
            render: (record) => getStatusBadge(record.status),
            sortable: true,
             width: 120,
        },
        { accessor: 'notes', title: 'Notes', render: (record) => <Text truncate>{record.notes || '-'}</Text>, width: 'auto' }, // Adjust width as needed
        {
            accessor: 'actions',
            title: 'Actions',
            textAlign: 'right',
             width: 100,
            render: (record) => (
                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                        <Button variant="light" size="xs" compact>
                            <IconPencil size={16} />
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => handleManageAppointment(record)} icon={<IconPencil size={14} />}>
                            Manage Appointment
                        </Menu.Item>
                         {/* Add more actions here */}
                    </Menu.Dropdown>
                </Menu>
            ),
        },
    ];


    return (
        <div className="panel mt-6 relative"> {/* Added relative for LoadingOverlay */}
            <LoadingOverlay visible={loading} overlayBlur={2} />
             {error && (
                 <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                     {error}
                 </Alert>
            )}

            <Tabs value={activeTab} onTabChange={handleTabChange}>
                <Tabs.List grow> {/* Added grow to distribute space */}
                    <Tabs.Tab value="upcoming" icon={<IconCalendarDue size="1rem" />}>
                        Upcoming ({upcomingAppointments.length})
                    </Tabs.Tab>
                    <Tabs.Tab value="completed" icon={<IconCalendarCheck size="1rem" />}>
                        Completed ({completedAppointments.length})
                    </Tabs.Tab>
                    <Tabs.Tab value="past_missed" icon={<IconCalendarCancel size="1rem" />}>
                        Past/Missed ({pastMissedAppointments.length})
                    </Tabs.Tab>
                </Tabs.List>

                {/* Upcoming Appointments Tab */}
                <Tabs.Panel value="upcoming" pt="xs">
                     <div className="datatables">
                        <DataTable
                            highlightOnHover
                            className="table-hover whitespace-nowrap"
                            records={paginatedUpcoming}
                            columns={commonColumns}
                            totalRecords={upcomingAppointments.length}
                            recordsPerPage={upcomingPageSize}
                            page={upcomingPage}
                            onPageChange={setUpcomingPage}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={handlePageSizeChange(setUpcomingPageSize, setUpcomingPage)}
                            sortStatus={upcomingSortStatus}
                            onSortStatusChange={setUpcomingSortStatus}
                            minHeight={200} // Prevent collapse
                            noRecordsText="No upcoming appointments found"
                            fetching={loading && activeTab === 'upcoming'} // Show fetching state per tab
                        />
                    </div>
                </Tabs.Panel>

                {/* Completed Appointments Tab */}
                <Tabs.Panel value="completed" pt="xs">
                    <div className="datatables">
                        <DataTable
                            highlightOnHover
                            className="table-hover whitespace-nowrap"
                            records={paginatedCompleted}
                            columns={commonColumns}
                            totalRecords={completedAppointments.length}
                            recordsPerPage={completedPageSize}
                            page={completedPage}
                            onPageChange={setCompletedPage}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={handlePageSizeChange(setCompletedPageSize, setCompletedPage)}
                            sortStatus={completedSortStatus}
                            onSortStatusChange={setCompletedSortStatus}
                            minHeight={200}
                            noRecordsText="No completed appointments found"
                             fetching={loading && activeTab === 'completed'}
                        />
                    </div>
                </Tabs.Panel>

                {/* Past & Missed Appointments Tab */}
                <Tabs.Panel value="past_missed" pt="xs">
                    <div className="datatables">
                        <DataTable
                            highlightOnHover
                            className="table-hover whitespace-nowrap"
                            records={paginatedPastMissed}
                            columns={commonColumns}
                            totalRecords={pastMissedAppointments.length}
                            recordsPerPage={pastMissedPageSize}
                            page={pastMissedPage}
                            onPageChange={setPastMissedPage}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={handlePageSizeChange(setPastMissedPageSize, setPastMissedPage)}
                            sortStatus={pastMissedSortStatus}
                            onSortStatusChange={setPastMissedSortStatus}
                            minHeight={200}
                            noRecordsText="No past due or missed appointments found"
                             fetching={loading && activeTab === 'past_missed'}
                        />
                    </div>
                </Tabs.Panel>
            </Tabs>

            {/* Edit Drawer - remains the same */}
            <AppointmentEditDrawer
                appointment={selectedAppointment}
                opened={openDrawer}
                onClose={() => setOpenDrawer(false)}
                onUpdate={refreshAppointments} // Refetches all data
            />
        </div>
    );
};

export default AppointmentTable;