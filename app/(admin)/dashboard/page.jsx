'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { format, isFuture, isPast, parseISO, differenceInDays, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button, Select, LoadingOverlay, Alert } from '@mantine/core'; // Assuming you use Mantine based on LeadTable
import { IconAlertCircle, IconCoinRupee } from '@tabler/icons-react';
import Papa from 'papaparse'; // Import papaparse
import { over } from 'lodash';
import ComponentsDashboardAnalytics from '@/components/dashboard/analytics';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconSquareCheck from '@/components/icon/icon-square-check';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconChecks from '@/components/icon/icon-checks';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Dynamically import ApexCharts
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// --- Helper Function for API calls ---
const authenticatedAxios = async (method, url, data = null) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated.');
    }
    const idToken = await user.getIdToken();
    const headers = {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
    };
    return axios({ method, url, headers, data });
};

// --- CSV Export Helper ---
const exportToCsv = (data, filename = 'export.csv') => {
    if (!data || data.length === 0) {
        alert('No data available to export.');
        return;
    }
    try {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up blob URL
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Failed to export data. See console for details.');
    }
};

// --- Main Component ---
const ReportingDashboard = () => {
    // --- State Declarations ---
    const [dashboardData, setDashboardData] = useState({
        // KPIs
        totalLeads: 0,
        activeLeads: 0,
        customerConversions: 0,
        leadConversionRate: 0,
        totalAppointments: 0,
        appointmentSuccessRate: 0,
        missedAppointmentsRate: 0,
        totalSalesValue: 0, // New KPI
        // Chart Data
        leadsBySource: {},
        leadsByStatus: {},
        appointmentsByStatus: { scheduled: 0, completed: 0, missed: 0 },
        // Actionable Lists
        upcomingAppointments: [],
        upcomingRenewals: [],
        upcomingFollowUps: [],
        pastAppointments: [],
        overdueFollowUps: [],
        // Raw Data for Exporting
        allLeads: [], // Store raw leads
        allCustomers: [], // Store raw customers
    });
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedExportUser, setSelectedExportUser] = useState(null); // For user-specific export
    // **** ADD SINGLE STATE FOR FETCHED DATA ****
    const [fetchedRawData, setFetchedRawData] = useState(null); // Initialize as null

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Chart Configurations (Keep existing chart options) ---
    const sourceChartOptions = {
        labels: Object.keys(dashboardData.leadsBySource),
        chart: { type: 'donut' },
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
        legend: { position: 'bottom' },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: { width: 250 },
                    legend: { position: 'bottom' },
                },
            },
        ],
    };

    const appointmentChartOptions = {
        chart: { type: 'bar', height: 350 },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: ['Scheduled', 'Completed', 'Missed'] },
        yaxis: { title: { text: 'Count' } },
        fill: { opacity: 1 },
        tooltip: { y: { formatter: (val) => `${val} appointments` } },
        colors: ['#008FFB', '#00E396', '#FF4560'],
    };
    const appointmentChartSeries = [
        {
            name: 'Appointments',
            data: [dashboardData.appointmentsByStatus.scheduled, dashboardData.appointmentsByStatus.completed, dashboardData.appointmentsByStatus.missed],
        },
    ];

    const leadStatusChartOptions = {
        chart: { type: 'bar', height: 350 },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        dataLabels: { enabled: false },
        xaxis: { categories: Object.keys(dashboardData.leadsByStatus) },
        colors: ['#3498db', '#f1c40f', '#e74c3c', '#9b59b6', '#2ecc71', '#1abc9c'],
        tooltip: { y: { formatter: (val) => `${val} leads` } },
    };
    const leadStatusChartSeries = [
        {
            name: 'Lead Count',
            data: Object.values(dashboardData.leadsByStatus),
        },
    ];

    // --- Data Fetching and Processing ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all data concurrently
                const [leadsResponse, customersResponse, appointmentsResponse, usersResponse] = await Promise.all([
                    authenticatedAxios('get', `${API_URL}/api/leads/all`),
                    authenticatedAxios('get', `${API_URL}/api/customers`),
                    authenticatedAxios('get', `${API_URL}/api/appointments/`),
                    authenticatedAxios('get', `${API_URL}/api/admin/users`), // Fetch team members
                ]);

                const leads = leadsResponse.data || [];
                const customers = customersResponse.data || [];
                const appointments = appointmentsResponse.data || [];
                const users = usersResponse.data || []; // Team members

                setFetchedRawData({ leads, customers, appointments, users });

                setTeamMembers(users); // Store team members for dropdown
                console.log(appointments);

                // --- Process Leads (Keep existing logic) ---
                const totalLeads = leads.length;
                const leadsBySource = leads.reduce((acc, lead) => {
                    const source = lead.source || 'Unknown';
                    acc[source] = (acc[source] || 0) + 1;
                    return acc;
                }, {});
                const leadsByStatus = leads.reduce((acc, lead) => {
                    const status = lead.lead_status || 'Unknown';
                    // Exclude 'Customer' status from this chart if desired
                    if (status?.toLowerCase() !== 'customer') {
                        acc[status] = (acc[status] || 0) + 1;
                    }
                    return acc;
                }, {});

                const now = startOfDay(new Date());
                // const upcomingFollowUps = leads.filter(lead =>
                //     lead.next_follow_up_date &&
                //     isFuture(parseISO(lead.next_follow_up_date)) &&
                //     differenceInDays(parseISO(lead.next_follow_up_date), now) <= 7 &&
                //     !['Converted', 'Closed', 'Lost', 'Customer'].includes(lead.lead_status || '') // Ensure status check is robust
                // ).sort((a, b) => new Date(a.next_follow_up_date) - new Date(b.next_follow_up_date));

                // const overdueFollowUps = leads.filter(lead =>
                //     lead.next_follow_up_date &&
                //     isPast(parseISO(lead.next_follow_up_date)) &&
                //     !['Converted', 'Closed', 'Lost', 'Customer'].includes(lead.lead_status || '')
                // ).sort((a, b) => new Date(a.next_follow_up_date) - new Date(b.next_follow_up_date));
                // console.log('upcomingFollowUps', overdueFollowUps);

                // --- Process Customers (Add Sales Value) ---
                const customerConversions = customers.length;
                const activeLeads = totalLeads - customerConversions; // Assuming conversion removes from active leads
                const leadConversionRate = totalLeads ? ((customerConversions / totalLeads) * 100).toFixed(1) : 0;

                // Calculate Total Sales Value (Sum of 'premium')
                const totalSalesValue = customers.reduce((sum, customer) => {
                    const premium = parseFloat(customer.premium); // Convert to number
                    return sum + (isNaN(premium) ? 0 : premium); // Add if it's a valid number
                }, 0);

                const upcomingRenewals = customers
                    .filter((customer) => customer.renewal_date && isFuture(parseISO(customer.renewal_date)) && differenceInDays(parseISO(customer.renewal_date), now) <= 30)
                    .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date));

                // --- Process Appointments (Keep existing logic) ---
                const totalAppointments = appointments.length;
                const scheduledAppointments = appointments.filter((a) => a.status?.toLowerCase() === 'scheduled').length;
                const completedAppointments = appointments.filter((a) => a.status?.toLowerCase() === 'completed').length;
                const missedAppointments = appointments.filter((a) => a.status?.toLowerCase() === 'missed').length;

                const relevantAppointments = completedAppointments + missedAppointments;
                const appointmentSuccessRate = relevantAppointments ? ((completedAppointments / relevantAppointments) * 100).toFixed(1) : 0;
                const missedAppointmentsRate = totalAppointments ? ((missedAppointments / totalAppointments) * 100).toFixed(1) : 0;

                const upcomingAppointments = appointments
                    .filter((a) => a.appointment_date && a.status?.toLowerCase() === 'scheduled' && isFuture(parseISO(a.appointment_date)) && differenceInDays(parseISO(a.appointment_date), now) <= 7)
                    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

                // NEW: Filter for Past/Missed Appointments (e.g., last 30 days)
                const thirtyDaysAgo = startOfDay(new Date(now.setDate(now.getDate() - 30))); // Calculate 30 days back
                const pastAppointments = appointments
                    .filter((a) => {
                        try {
                            const apptDate = parseISO(a.appointment_date);
                            const statusLower = a.status?.toLowerCase();
                            return (
                                a.appointment_date &&
                                (statusLower === 'completed' || statusLower === 'scheduled' || statusLower === 'cancelled') && // Focus on these statuses
                                isPast(apptDate) && // Ensure it's in the past
                                differenceInDays(startOfDay(new Date()), startOfDay(apptDate)) <= 30
                            ); // Within the last 30 days
                        } catch (e) {
                            console.warn(`Invalid date for appointment ${a.id}: ${a.appointment_date}`);
                            return false;
                        }
                    })
                    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)); // Sort recent first

                // --- Update State ---
                setDashboardData({
                    totalLeads,
                    activeLeads,
                    customerConversions,
                    leadConversionRate,
                    totalAppointments,
                    appointmentSuccessRate,
                    missedAppointmentsRate,
                    totalSalesValue, // Add new KPI
                    leadsBySource,
                    leadsByStatus,
                    appointmentsByStatus: { scheduled: scheduledAppointments, completed: completedAppointments, missed: missedAppointments },
                    upcomingAppointments,
                    upcomingRenewals,
                    // upcomingFollowUps,
                    // overdueFollowUps,
                    pastAppointments,
                    allLeads: leads, // Store raw data
                    allCustomers: customers, // Store raw data
                });
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err.message || 'Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Run once on mount

    // --- Export Handlers ---
    const handleExportLeadsByDate = (period) => {
        const now = new Date();
        let interval;
        let filename = 'leads_export.csv';

        if (period === 'week') {
            interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }; // Assuming Monday start
            filename = `leads_this_week_${format(now, 'yyyy-MM-dd')}.csv`;
        } else if (period === 'month') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
            filename = `leads_this_month_${format(now, 'yyyy-MM')}.csv`;
        } else {
            alert('Invalid period specified for export.');
            return;
        }

        const filteredLeads = dashboardData.allLeads.filter((lead) => {
            try {
                // Ensure created_at exists and is valid before parsing
                return lead.created_at && isWithinInterval(parseISO(lead.created_at), interval);
            } catch (e) {
                console.warn(`Could not parse date for lead ID ${lead.id}: ${lead.created_at}`, e);
                return false; // Exclude leads with invalid dates
            }
        });

        if (filteredLeads.length === 0) {
            alert(`No leads found for ${period === 'week' ? 'this week' : 'this month'}.`);
            return;
        }

        // Optional: Select/rename columns for export
        const exportData = filteredLeads.map((lead) => ({
            ID: lead.id,
            Name: lead.full_name,
            Email: lead.email,
            Phone: lead.phone_number,
            Status: lead.lead_status,
            Source: lead.source,
            AssignedToUserID: lead.user_id, // Keep user_id if needed
            CreatedAt: lead.created_at ? format(parseISO(lead.created_at), 'yyyy-MM-dd HH:mm:ss') : '', // Format date
            // Add other relevant fields
        }));

        exportToCsv(exportData, filename);
    };

    const handleExportConversionsByUser = () => {
        if (!selectedExportUser) {
            alert('Please select a team member to export their conversions.');
            return;
        }

        const userIdToExport = parseInt(selectedExportUser, 10); // Ensure it's a number if IDs are numbers
        const filteredCustomers = dashboardData.allCustomers.filter((customer) => customer.user_id === userIdToExport);

        if (filteredCustomers.length === 0) {
            alert(`No conversions found for the selected team member.`);
            return;
        }

        const selectedUserName = teamMembers.find((tm) => tm.id === userIdToExport)?.username || `user_${userIdToExport}`;
        const filename = `conversions_${selectedUserName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;

        // Optional: Select/rename columns for export
        const exportData = filteredCustomers.map((cust) => ({
            CustomerID: cust.id,
            Name: cust.full_name,
            Email: cust.email,
            Phone: cust.phone_number,
            PolicyNumber: cust.policy_number,
            Premium: cust.premium,
            RenewalDate: cust.renewal_date ? formatDate(cust.renewal_date) : '',
            AssignedToUserID: cust.user_id,
            ConvertedAt: cust.created_at ? format(parseISO(cust.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
            // Add other relevant fields
        }));

        exportToCsv(exportData, filename);
    };

    // --- Render Logic ---
    // Helper to format date strings safely
    const formatDate = (dateString) => {
        try {
            return dateString ? format(parseISO(dateString), 'MMM dd, yyyy') : 'N/A';
        } catch {
            return 'Invalid Date';
        }
    };
    const formatDateTime = (dateString) => {
        try {
            return dateString ? format(parseISO(dateString), 'MMM dd, yyyy hh:mm a') : 'N/A';
        } catch {
            return 'Invalid Date/Time';
        }
    };
    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value || 0);
        // Adjust 'en-IN' and 'INR' based on your locale/currency
    };

    return (
        <div className="p-2 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">
            <LoadingOverlay visible={loading} overlayBlur={2} />

            {/* <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 text-center">Sales & Activity Dashboard</h2> */}

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="lg">
                    {error}
                </Alert>
            )}

            {/* --- KPI Cards --- */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
                {/* Leads */}
                <div className="panel bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-700 dark:to-blue-600 p-4 rounded-lg shadow-md text-white">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-primary dark:text-white-light">
                            <IconUsersGroup className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-blue-100 dark:text-white-light">{dashboardData.totalLeads}</p>
                            <h5 className="text-xs  text-white">Total Leads</h5>
                        </div>
                    </div>
                </div>
                {/* Conversions */}
                <div className="panel bg-gradient-to-r from-violet-500 to-violet-400 dark:from-violet-700 dark:to-violet-600 p-4 rounded-lg shadow-md text-white">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30  text-white dark:bg-success dark:text-white-light">
                            <IconSquareCheck className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-green-100 dark:text-white-light">{dashboardData.customerConversions}</p>
                            <h5 className="text-xs text-white">Conversions</h5>
                        </div>
                    </div>
                </div>
                {/* Conversion Rate */}
                <div className="panel bg-gradient-to-r from-teal-500 to-teal-400 dark:from-teal-700 dark:to-teal-600 p-4 rounded-lg shadow-md text-white">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-warning dark:text-white-light">
                            <IconTrendingUp className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-teal-100 dark:text-white-light">{dashboardData.leadConversionRate}%</p>
                            <h5 className="text-xs text-white">Conversion Rate</h5>
                        </div>
                    </div>
                </div>
                {/* NEW: Total Sales Value */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 dark:from-indigo-700 dark:to-indigo-600 p-4 rounded-lg shadow-md text-white">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-warning dark:text-white-light">
                            <IconCoinRupee className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-indigo-100 dark:text-white-light">{formatCurrency(dashboardData.totalSalesValue)}</p>
                            <h5 className="text-xs text-white">Total Sales Value</h5>
                        </div>
                    </div>
                </div>
                {/* Appointment Success Rate */}
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 p-4 rounded-lg shadow-md text-white">
                    <h3 className="text-md font-semibold opacity-90">Appt. Success Rate</h3>
                    <p className="text-3xl font-bold">{dashboardData.appointmentSuccessRate}%</p>
                    <p className="text-xs opacity-80">(Completed / (Comp+Missed))</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 md:hidden">
                {/* Leads */}
                <div className="bg-gradient-to-r px-2 from-blue-500 to-blue-400 rounded-lg shadow text-white flex items-center gap-1 min-h-[50px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md">
                        <IconUsersGroup className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold">
                            {dashboardData.totalLeads} <span className="text-[11px] opacity-90">Leads</span>
                        </p>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-violet-500 to-violet-400 dark:from-violet-700 dark:to-violet-600 rounded-lg shadow text-white flex items-center gap-1 min-h-[50px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md">
                        <IconChecks className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold">
                            {dashboardData.customerConversions} <span className="text-[11px] opacity-90">Conversions</span>
                        </p>
                    </div>
                </div>
                <div className="bg-gradient-to-r px-2 from-lime-500 to-lime-400 rounded-lg shadow text-white flex items-center gap-1 min-h-[50px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md">
                        <IconCoinRupee className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold">
                            {formatCurrency(dashboardData.totalSalesValue)} <span className="text-[11px] opacity-90">Sales </span>
                        </p>
                    </div>
                </div>
                <div className="bg-gradient-to-r px-2 from-fuchsia-500 to-fuchsia-400 rounded-lg shadow text-white flex items-center gap-1 min-h-[50px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md">
                        <IconUsersGroup className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold">
                            {dashboardData.leadConversionRate}% <span className="text-[11px] opacity-90">ROC</span>
                        </p>
                    </div>
                </div>

                {/* Repeat for other KPIs with same pattern */}
                {/* Conversions, Conversion Rate, Total Sales Value, Appointment Success Rate */}
            </div>

            {/* **** RENDER CHILD ONLY WHEN DATA IS FETCHED **** */}
            {!loading && !error && fetchedRawData && (
                <div className="hidden md:block mb-6">
                    <ComponentsDashboardAnalytics
                        // **** PASS RAW DATA ARRAYS AS PROPS ****
                        leads={fetchedRawData.leads}
                        customers={fetchedRawData.customers}
                        appointments={fetchedRawData.appointments}
                        users={fetchedRawData.users}
                    />
                </div>
            )}

            {/* --- Charts Row --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                {/* Lead Status Pipeline */}
                <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-4">Lead Pipeline Status</h3>
                    {Object.keys(dashboardData.leadsByStatus).length > 0 ? (
                        <ReactApexChart options={leadStatusChartOptions} series={leadStatusChartSeries} type="bar" height={300} />
                    ) : (
                        <p className="text-gray-500  dark:text-gray-200 text-center py-10">No lead status data available.</p>
                    )}
                </div>
                {/* Leads by Source */}
                <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-4">Leads by Source</h3>
                    {dashboardData.leadsBySource && Object.keys(dashboardData.leadsBySource).length > 0 ? (
                        <ReactApexChart options={sourceChartOptions} series={Object.values(dashboardData.leadsBySource)} type="donut" height={300} />
                    ) : (
                        <p className="text-gray-500 text-center py-10">No lead source data available.</p>
                    )}
                </div>
                {/* Appointments Analysis */}
                <div className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-4">Appointments Overview</h3>
                    {dashboardData.totalAppointments > 0 ? (
                        <ReactApexChart options={appointmentChartOptions} series={appointmentChartSeries} type="bar" height={300} />
                    ) : (
                        <p className="text-gray-500  dark:text-gray-200 text-center py-10">No appointment data available.</p>
                    )}
                    <p className="text-xs text-center text-gray-500 mt-2">Missed Rate: {dashboardData.missedAppointmentsRate}% (of total)</p>
                </div>
            </div>

            {/* --- Actionable Task Lists --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                {/* Upcoming Appointments */}
                <div className="bg-white  dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-3 border-b pb-2">Upcoming Appointments (Next 7 Days)</h3>
                    {dashboardData.upcomingAppointments.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.upcomingAppointments.map((appt) => (
                                <li key={appt.id} className="text-sm  dark:text-gray-200 text-gray-600 border-l-4 border-blue-500 pl-2 py-1">
                                    <span className="font-medium">{formatDateTime(appt.appointment_date)}</span> - {appt.appointment_type || 'General'}
                                    {/* Maybe add link/info about related Lead/Customer if ID is available */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500  dark:text-gray-300 text-sm">No upcoming appointments.</p>
                    )}
                </div>

                <div className="bg-white  dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-3 border-b pb-2">Recent Past Appointments (Last 30 Days)</h3>
                    {dashboardData.pastAppointments.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.pastAppointments.map((appt) => (
                                <li
                                    key={appt.id}
                                    className={`text-sm text-gray-600  dark:text-gray-200 border-l-4 pl-2 py-1 ${appt.status?.toLowerCase() === 'completed' ? 'border-green-500' : 'border-red-500'}`}
                                >
                                    <span className="font-medium">{formatDateTime(appt.appointment_date)}</span> - {appt.appointment_type || 'General'}
                                    <span className={`ml-2 text-xs font-semibold ${appt.status?.toLowerCase() === 'completed' ? 'text-green-700' : 'text-red-700'}`}>({appt.status})</span>
                                    {/* Optional: Add Lead/Customer info if available */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500  dark:text-gray-300 text-sm">No completed/missed appointments in the last 30 days.</p>
                    )}
                </div>

                {/* Upcoming Renewals */}
                <div className="bg-white  dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700  dark:text-gray-200 mb-3 border-b pb-2">Upcoming Renewals (Next 30 Days)</h3>
                    {dashboardData.upcomingRenewals.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.upcomingRenewals.map((cust) => (
                                <li key={cust.id} className="text-sm text-gray-600  dark:text-gray-200 border-l-4 border-yellow-500 pl-2 py-1">
                                    <span className="font-medium">{cust.full_name || 'N/A'}</span> - Due: {formatDate(cust.renewal_date)}
                                    <p className="text-xs text-gray-500">
                                        Policy: {cust.policy_number || 'N/A'} / Premium: {formatCurrency(cust.premium)}
                                    </p>
                                    {/* Link to customer page? */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500  dark:text-gray-200 text-sm">No upcoming renewals.</p>
                    )}
                </div>
            </div>

            {/* --- Data Export Section --- */}
            <div className="mt-6 bg-white  dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2">Data Export (CSV)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Export Leads by Date */}
                    <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium text-gray-600  dark:text-gray-300">Export Leads Created:</p>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="xs" onClick={() => handleExportLeadsByDate('week')}>
                                This Week
                            </Button>
                            <Button variant="outline" size="xs" onClick={() => handleExportLeadsByDate('month')}>
                                This Month
                            </Button>
                        </div>
                    </div>

                    {/* Export Conversions by User */}
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-gray-600  dark:text-gray-200">Export Conversions By User:</p>
                        <Select
                            placeholder="Select Team Member"
                            data={teamMembers.map((tm) => ({ value: String(tm.id), label: tm.username }))} // Ensure value is string for Select
                            value={selectedExportUser}
                            onChange={setSelectedExportUser}
                            searchable
                            clearable
                            size="xs"
                        />
                    </div>
                    <div>
                        <Button
                            size="xs"
                            className="dark:bg-cyan-200 dark:text-black"
                            onClick={handleExportConversionsByUser}
                            disabled={!selectedExportUser || dashboardData.allCustomers.length === 0}
                        >
                            Export Conversions
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportingDashboard;
