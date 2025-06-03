// src/app/user-dashboard/page.tsx (or wherever you place this component)
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { format, isFuture, isPast, parseISO, differenceInDays, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button, LoadingOverlay, Alert } from '@mantine/core'; // Assuming Mantine is used
import { IconAlertCircle, IconCoinRupee } from '@tabler/icons-react';
import Papa from 'papaparse';
import ComponentsDashboardAnalytics from '@/components/dashboard/analytics'; // Reuse if applicable
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconSquareCheck from '@/components/icon/icon-square-check';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconCalendar from '@/components/icon/icon-calendar'; // Example icon if needed

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Dynamically import ApexCharts
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// --- Helper Function for API calls (Remains the same) ---
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

// --- CSV Export Helper (Remains the same) ---
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

// --- Main User Dashboard Component ---
const UserDashboard = () => {
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
        totalSalesValue: 0,
        // Chart Data
        leadsBySource: {},
        leadsByStatus: {},
        appointmentsByStatus: { scheduled: 0, completed: 0, missed: 0 },
        // Actionable Lists
        upcomingAppointments: [],
        upcomingRenewals: [],
        // upcomingFollowUps: [], // Keep if relevant for user view
        // overdueFollowUps: [],   // Keep if relevant for user view
        pastAppointments: [],
        // Raw Data for Exporting (Specific to User)
        myLeads: [],
        myCustomers: [],
    });
    // **** ADD SINGLE STATE FOR FETCHED DATA (User Specific) ****
    const [fetchedRawData, setFetchedRawData] = useState(null); // Initialize as null

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Chart Configurations (Identical to Admin Dashboard) ---
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

    // --- Data Fetching and Processing (User Specific) ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                setError('User not authenticated.');
                setLoading(false);
                return;
            }

            try {
                // Fetch user-specific data concurrently
                const [leadsResponse, customersResponse, appointmentsResponse] = await Promise.all([
                    authenticatedAxios('get', `${API_URL}/api/users/leads`),       // USER specific leads
                    authenticatedAxios('get', `${API_URL}/api/customers/user`),    // USER specific customers
                    authenticatedAxios('get', `${API_URL}/api/appointments/user`), // USER specific appointments
                ]);

                const leads = leadsResponse.data || [];
                const customers = customersResponse.data || [];
                const appointments = appointmentsResponse.data || [];

                // Store raw fetched data specific to this user
                setFetchedRawData({ leads, customers, appointments });


                // --- Process Leads (Same logic, but on user's leads) ---
                const totalLeads = leads.length;
                const leadsBySource = leads.reduce((acc, lead) => {
                    const source = lead.source || 'Unknown';
                    acc[source] = (acc[source] || 0) + 1;
                    return acc;
                }, {});
                const leadsByStatus = leads.reduce((acc, lead) => {
                    const status = lead.lead_status || 'Unknown';
                    if (status?.toLowerCase() !== 'customer') { // Exclude converted leads if needed
                       acc[status] = (acc[status] || 0) + 1;
                    }
                    return acc;
                }, {});

                const now = startOfDay(new Date());
                // Filter upcoming/overdue follow-ups (if needed for user view)
                // const upcomingFollowUps = leads.filter(...);
                // const overdueFollowUps = leads.filter(...);


                // --- Process Customers (Same logic, but on user's customers) ---
                const customerConversions = customers.length;
                 // Active leads calculation might need adjustment based on how 'customer' status is handled in leads endpoint
                 const activeLeads = leads.filter(l => l.lead_status?.toLowerCase() !== 'customer' && l.lead_status?.toLowerCase() !== 'converted' /* Add other inactive statuses */ ).length;
                const leadConversionRate = totalLeads ? ((customerConversions / totalLeads) * 100).toFixed(1) : 0;

                const totalSalesValue = customers.reduce((sum, customer) => {
                    const premium = parseFloat(customer.premium);
                    return sum + (isNaN(premium) ? 0 : premium);
                }, 0);

                const upcomingRenewals = customers
                    .filter((customer) => customer.renewal_date && isFuture(parseISO(customer.renewal_date)) && differenceInDays(parseISO(customer.renewal_date), now) <= 30)
                    .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date));


                // --- Process Appointments (Same logic, but on user's appointments) ---
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

                // Filter for Past/Missed Appointments (last 30 days)
                const thirtyDaysAgo = startOfDay(new Date(now.setDate(now.getDate() - 30)));
                const pastAppointments = appointments
                    .filter((a) => {
                        try {
                            const apptDate = parseISO(a.appointment_date);
                            const statusLower = a.status?.toLowerCase();
                            return (
                                a.appointment_date &&
                                (statusLower === 'completed' || statusLower === 'missed' || statusLower === 'cancelled') && // Focus on these outcomes
                                isPast(apptDate) &&
                                differenceInDays(startOfDay(new Date()), startOfDay(apptDate)) <= 30
                            );
                        } catch (e) {
                            console.warn(`Invalid date for appointment ${a.id}: ${a.appointment_date}`);
                            return false;
                        }
                    })
                    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

                // --- Update State ---
                setDashboardData({
                    totalLeads,
                    activeLeads,
                    customerConversions,
                    leadConversionRate,
                    totalAppointments,
                    appointmentSuccessRate,
                    missedAppointmentsRate,
                    totalSalesValue,
                    leadsBySource,
                    leadsByStatus,
                    appointmentsByStatus: { scheduled: scheduledAppointments, completed: completedAppointments, missed: missedAppointments },
                    upcomingAppointments,
                    upcomingRenewals,
                    // upcomingFollowUps, // Add if calculated
                    // overdueFollowUps,   // Add if calculated
                    pastAppointments,
                    myLeads: leads,       // Store user's raw leads
                    myCustomers: customers, // Store user's raw customers
                });
            } catch (err) {
                console.error('Error fetching user dashboard data:', err);
                setError(err.message || 'Failed to load your dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Run once on mount

    // --- Export Handler (User Specific) ---
    const handleExportMyLeadsByDate = (period) => {
        const now = new Date();
        let interval;
        let filename = 'my_leads_export.csv';

        if (period === 'week') {
            interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            filename = `my_leads_this_week_${format(now, 'yyyy-MM-dd')}.csv`;
        } else if (period === 'month') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
            filename = `my_leads_this_month_${format(now, 'yyyy-MM')}.csv`;
        } else {
            alert('Invalid period specified for export.');
            return;
        }

        // Use the user-specific leads stored in state
        const filteredLeads = dashboardData.myLeads.filter((lead) => {
            try {
                return lead.created_at && isWithinInterval(parseISO(lead.created_at), interval);
            } catch (e) {
                console.warn(`Could not parse date for lead ID ${lead.id}: ${lead.created_at}`, e);
                return false;
            }
        });

        if (filteredLeads.length === 0) {
            alert(`No leads assigned to you found for ${period === 'week' ? 'this week' : 'this month'}.`);
            return;
        }

        // Prepare data for export (adjust fields as needed)
        const exportData = filteredLeads.map((lead) => ({
            ID: lead.id,
            Name: lead.full_name,
            Email: lead.email,
            Phone: lead.phone_number,
            Status: lead.lead_status,
            Source: lead.source,
            // user_id is implicit (it's the current user)
            CreatedAt: lead.created_at ? format(parseISO(lead.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
            // Add other relevant fields
        }));

        exportToCsv(exportData, filename);
    };

    // --- Render Logic ---
    const formatDate = (dateString) => {
        try {
            return dateString ? format(parseISO(dateString), 'MMM dd, yyyy') : 'N/A';
        } catch { return 'Invalid Date'; }
    };
    const formatDateTime = (dateString) => {
        try {
            return dateString ? format(parseISO(dateString), 'MMM dd, yyyy hh:mm a') : 'N/A';
        } catch { return 'Invalid Date/Time'; }
    };
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value || 0);
    };

    return (
        <div className="p-4 panel md:p-6 bg-gray-50 min-h-screen relative">
            <LoadingOverlay visible={loading} overlayBlur={2} />

            <h2 className="text-2xl md:text-3xl font-semibold dark:text-gray-200 text-gray-800 mb-6 text-center">My Dashboard</h2>

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="lg">
                    {error}
                </Alert>
            )}

            {/* --- KPI Cards (User Context) --- */}
            <div className="grid panel grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
                {/* My Leads */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-4 rounded-lg shadow-md text-white">
                     <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-primary dark:text-white-light">
                            <IconUsersGroup className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-blue-100 dark:text-white-light">{dashboardData.totalLeads}</p>
                            <h5 className="text-xs  text-white">My Total Leads</h5>
                        </div>
                    </div>
                </div>
                 {/* My Conversions */}
                <div className="bg-gradient-to-r from-green-500 to-green-400 p-4 rounded-lg shadow-md text-white">
                     <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30  text-white dark:bg-success dark:text-white-light">
                            <IconSquareCheck className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-green-100 dark:text-white-light">{dashboardData.customerConversions}</p>
                            <h5 className="text-xs text-white">My Conversions</h5>
                        </div>
                    </div>
                </div>
                {/* My Conversion Rate */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-400 p-4 rounded-lg shadow-md text-white">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-warning dark:text-white-light">
                            <IconTrendingUp className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-teal-100 dark:text-white-light">{dashboardData.leadConversionRate}%</p>
                            <h5 className="text-xs text-white">My Conversion Rate</h5>
                        </div>
                    </div>
                </div>
                {/* My Total Sales Value */}
                 <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 p-4 rounded-lg shadow-md text-white">
                     <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-warning dark:text-white-light">
                            <IconCoinRupee className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-indigo-100 dark:text-white-light">{formatCurrency(dashboardData.totalSalesValue)}</p>
                            <h5 className="text-xs text-white">My Sales Value</h5>
                        </div>
                    </div>
                </div>
                {/* My Appointment Success Rate */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-400 p-4 rounded-lg shadow-md text-white">
                    {/* Using IconCalendar as an example */}
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white dark:bg-secondary dark:text-white-light">
                           <IconCalendar className="h-5 w-5"/>
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-2xl text-purple-100 dark:text-white-light">{dashboardData.appointmentSuccessRate}%</p>
                            <h5 className="text-xs text-white">My Appt. Success</h5>
                             <p className="text-xs opacity-80">(Completed / (Comp+Missed))</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Optional Analytics Component (Pass User Data) --- */}
             {/* Pass only user-specific data if this component is used */}
             {!loading && !error && fetchedRawData && (
                <div className="mb-6">
                    {/* Ensure ComponentsDashboardAnalytics can handle data without 'users' array or adjust props */}
                    <ComponentsDashboardAnalytics
                        leads={fetchedRawData.leads}
                        customers={fetchedRawData.customers}
                        appointments={fetchedRawData.appointments}
                        // users={[]} // Pass empty array or remove prop if not needed by component
                    />
                </div>
            )}


            {/* --- Charts Row (User Context) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                 {/* My Lead Status Pipeline */}
                <div className="p-4 shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">My Lead Pipeline</h3>
                    {Object.keys(dashboardData.leadsByStatus).length > 0 ? (
                        <ReactApexChart options={leadStatusChartOptions} series={leadStatusChartSeries} type="bar" height={300} />
                    ) : (
                        <p className="text-gray-500 text-center py-10">No lead status data available for you.</p>
                    )}
                </div>
                {/* My Leads by Source */}
                <div className="p-4  shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">My Leads by Source</h3>
                    {dashboardData.leadsBySource && Object.keys(dashboardData.leadsBySource).length > 0 ? (
                        <ReactApexChart options={sourceChartOptions} series={Object.values(dashboardData.leadsBySource)} type="donut" height={300} />
                    ) : (
                        <p className="text-gray-500 text-center py-10">No lead source data available for you.</p>
                    )}
                </div>
                {/* My Appointments Analysis */}
                <div className="p-4  shadow-md rounded-lg lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">My Appointments</h3>
                    {dashboardData.totalAppointments > 0 ? (
                        <ReactApexChart options={appointmentChartOptions} series={appointmentChartSeries} type="bar" height={300} />
                    ) : (
                        <p className="text-gray-500 text-center py-10">No appointment data available for you.</p>
                    )}
                    <p className="text-xs text-center text-gray-500 mt-2">Missed Rate: {dashboardData.missedAppointmentsRate}% (of your total)</p>
                </div>
            </div>

             {/* --- Actionable Task Lists (User Context) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                {/* My Upcoming Appointments */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">My Upcoming Appointments (Next 7 Days)</h3>
                    {dashboardData.upcomingAppointments.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.upcomingAppointments.map((appt) => (
                                <li key={appt.id} className="text-sm text-gray-600 border-l-4 border-blue-500 pl-2 py-1">
                                    <span className="font-medium">{formatDateTime(appt.appointment_date)}</span> - {appt.appointment_type || 'General'}
                                    {/* Add Link to Lead/Customer if possible */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No upcoming appointments scheduled for you.</p>
                    )}
                </div>

                 {/* My Recent Past Appointments */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">My Recent Past Appointments (Last 30 Days)</h3>
                     {dashboardData.pastAppointments.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.pastAppointments.map((appt) => (
                                <li key={appt.id} className={`text-sm text-gray-600 border-l-4 pl-2 py-1 ${appt.status?.toLowerCase() === 'completed' ? 'border-green-500' : appt.status?.toLowerCase() === 'missed' ? 'border-red-500' : 'border-gray-400'}`}>
                                    <span className="font-medium">{formatDateTime(appt.appointment_date)}</span> - {appt.appointment_type || 'General'}
                                    <span className={`ml-2 text-xs font-semibold ${appt.status?.toLowerCase() === 'completed' ? 'text-green-700' : appt.status?.toLowerCase() === 'missed' ? 'text-red-700' : 'text-gray-600'}`}>({appt.status})</span>
                                    {/* Optional: Add Lead/Customer info if available */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No relevant past appointments found for you in the last 30 days.</p>
                    )}
                </div>

                {/* My Upcoming Renewals */}
                <div className=" p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">My Upcoming Renewals (Next 30 Days)</h3>
                    {dashboardData.upcomingRenewals.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {dashboardData.upcomingRenewals.map((cust) => (
                                <li key={cust.id} className="text-sm text-gray-600 border-l-4 border-yellow-500 pl-2 py-1">
                                    <span className="font-medium">{cust.full_name || 'N/A'}</span> - Due: {formatDate(cust.renewal_date)}
                                    <p className="text-xs text-gray-500">
                                        Policy: {cust.policy_number || 'N/A'} / Premium: {formatCurrency(cust.premium)}
                                    </p>
                                     {/* Add Link to Customer details */}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No upcoming renewals assigned to you.</p>
                    )}
                </div>

                {/* Add Upcoming/Overdue Follow-ups sections here if implemented */}

            </div>

             {/* --- Data Export Section (User Specific) --- */}
            <div className="mt-6 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Export My Data (CSV)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    {/* Export My Leads by Date */}
                    <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium text-gray-600">Export My Leads Created:</p>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="xs" onClick={() => handleExportMyLeadsByDate('week')} disabled={dashboardData.myLeads.length === 0}>
                                This Week
                            </Button>
                            <Button variant="outline" size="xs" onClick={() => handleExportMyLeadsByDate('month')} disabled={dashboardData.myLeads.length === 0}>
                                This Month
                            </Button>
                        </div>
                    </div>

                     {/* Add Export My Customers/Appointments if needed */}
                     {/* Example:
                     <div className="flex flex-col space-y-2">
                         <p className="text-sm font-medium text-gray-600">Export My Customers:</p>
                         <Button size="xs" onClick={handleExportMyCustomers} disabled={dashboardData.myCustomers.length === 0}>
                             Export All My Customers
                         </Button>
                     </div>
                     */}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;