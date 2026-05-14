'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { format, formatDistanceToNow, isFuture, isPast, parseISO, differenceInDays, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button, Select, LoadingOverlay, Alert } from '@mantine/core'; // Assuming you use Mantine based on LeadTable
import {
    IconAlertCircle,
    IconBell,
    IconBolt,
    IconBrandFacebook,
    IconBrandWhatsapp,
    IconCalendarStats,
    IconCash,
    IconChecklist,
    IconCoinRupee,
    IconFileAnalytics,
    IconForms,
    IconLock,
    IconMail,
    IconPhoto,
    IconRobot,
    IconUserPlus,
    IconUsers,
    IconVideo,
    IconWaveSine,
} from '@tabler/icons-react';
import Papa from 'papaparse'; // Import papaparse
import Link from 'next/link';
import ComponentsDashboardAnalytics from '@/components/dashboard/analytics';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconSquareCheck from '@/components/icon/icon-square-check';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconChecks from '@/components/icon/icon-checks';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import OfferPopupBanner from '@/components/OfferPopupBanner';
import OfferStickyWidget from '@/components/OfferStickyWidget';
import { useAuth } from '@/context/AuthContext';

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
    const [fetchError, setFetchError] = useState('');
    const [admin, setAdmin] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const authContext = useAuth();
    const addOnSet = useMemo(() => new Set(authContext?.profile?.add_ons || []), [authContext?.profile?.add_ons]);
    const hasFinancial = addOnSet.has('FINANCIAL_KUNDLI');
    const hasBusiness = addOnSet.has('BUSINESS_KUNDLI');
    const hasRag = addOnSet.has('RAG_DASHBOARD');

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setFetchError('');

                const currentUser = getAuth().currentUser;
                if (!currentUser) {
                    setFetchError('You are not signed in.');
                    setLoading(false);
                    return;
                }

                const token = await currentUser.getIdToken();

                // 1) Admin profile (includes subscription fields)
                const { data: adminRes } = await axios.get(`${API_URL}/api/admin/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!alive) return;

                setAdmin(adminRes || null);

                // Normalize subscription object for the banner
                setSubscription({
                    plan: adminRes?.subscription_plan || 'Basic',
                    status: adminRes?.subscription_status || 'Active',
                    expires_at: adminRes?.expires_at || '',
                });

                // (Optional) Anything else you want to load for the dashboard:
                // const { data: widgets } = await axios.get(`${API_URL}/api/admin/widgets`, { headers: { Authorization: `Bearer ${token}` }});
            } catch (err) {
                console.error(err);
                if (alive) setFetchError('Failed to load your dashboard. Please try again.');
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

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

    const formatCompactCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value || 0);
    };

    const leadsByStatusEntries = useMemo(() => {
        return Object.entries(dashboardData.leadsByStatus || {})
            .map(([label, count]) => ({ label, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count);
    }, [dashboardData.leadsByStatus]);

    const sourceEntries = useMemo(() => {
        const entries = Object.entries(dashboardData.leadsBySource || {})
            .map(([label, value]) => ({ label, value: Number(value) || 0 }))
            .sort((a, b) => b.value - a.value);
        const total = entries.reduce((sum, item) => sum + item.value, 0);

        return entries.map((item) => ({
            ...item,
            percent: total ? Math.round((item.value / total) * 100) : 0,
        }));
    }, [dashboardData.leadsBySource]);

    const sourceDonutSeries = sourceEntries.map((item) => item.value);
    const sourceDonutOptions = {
        labels: sourceEntries.map((item) => item.label),
        chart: { type: 'donut' },
        colors: ['#1D4ED8', '#047857', '#8A6F00', '#C4B5FD', '#0EA5E9', '#E11D48'],
        stroke: { width: 0 },
        legend: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
            pie: {
                donut: {
                    size: '74%',
                    labels: {
                        show: true,
                        name: { show: false },
                        value: { show: false },
                        total: {
                            show: true,
                            label: 'TOTAL',
                            formatter: () => {
                                const total = sourceEntries.reduce((sum, item) => sum + item.value, 0);
                                return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : `${total}`;
                            },
                        },
                    },
                },
            },
        },
    };

    const mobileRecentActivity = useMemo(() => {
        if (!fetchedRawData) return [];

        const items = [];

        (fetchedRawData.customers || []).slice(0, 4).forEach((customer) => {
            if (customer?.created_at) {
                items.push({
                    id: `customer-${customer.id}`,
                    title: `${customer.full_name || 'Customer'} converted`,
                    description: `Policy ${customer.policy_number || 'created'}${customer.premium ? ` | ${formatCompactCurrency(customer.premium)}` : ''}`,
                    sortValue: new Date(customer.created_at).getTime(),
                    iconKey: 'mail',
                    time: formatDateTime(customer.created_at),
                    relativeTime: formatDistanceToNow(new Date(customer.created_at), { addSuffix: true }),
                    tone: 'green',
                });
            }
        });

        (fetchedRawData.appointments || []).slice(0, 4).forEach((appt) => {
            if (appt?.appointment_date) {
                items.push({
                    id: `appointment-${appt.id}`,
                    title: `${appt.appointment_type || 'Appointment'} ${appt.status ? appt.status.toLowerCase() : 'updated'}`,
                    description: appt.status ? `Status: ${appt.status}` : 'Appointment activity',
                    sortValue: new Date(appt.appointment_date).getTime(),
                    iconKey: 'call',
                    time: formatDateTime(appt.appointment_date),
                    relativeTime: formatDistanceToNow(new Date(appt.appointment_date), { addSuffix: true }),
                    tone: appt.status?.toLowerCase() === 'completed' ? 'green' : 'blue',
                });
            }
        });

        (fetchedRawData.leads || []).slice(0, 4).forEach((lead) => {
            if (lead?.created_at) {
                items.push({
                    id: `lead-${lead.id}`,
                    title: `${lead.full_name || 'Lead'} added`,
                    description: `${lead.source || 'Unknown source'} lead`,
                    sortValue: new Date(lead.created_at).getTime(),
                    iconKey: 'appointment',
                    time: formatDateTime(lead.created_at),
                    relativeTime: formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }),
                    tone: 'amber',
                });
            }
        });

        return items.sort((a, b) => b.sortValue - a.sortValue).slice(0, 5);
    }, [fetchedRawData]);

    const followUpCount = useMemo(() => {
        if (!fetchedRawData) return 0;
        const now = new Date();
        return (fetchedRawData.leads || []).filter(
            (lead) =>
                lead.next_follow_up_date &&
                new Date(lead.next_follow_up_date) > now &&
                !['Converted', 'Closed', 'Lost', 'Customer'].includes(lead.lead_status || '')
        ).length;
    }, [fetchedRawData]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const displayName = useMemo(() => {
        const raw = admin?.name || admin?.full_name || admin?.username || getAuth().currentUser?.displayName || getAuth().currentUser?.email?.split('@')[0] || 'User';
        return raw.toUpperCase();
    }, [admin]);

    const userInitials = useMemo(() => {
        const raw = admin?.name || admin?.full_name || admin?.username || getAuth().currentUser?.displayName || '';
        const parts = raw.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return raw.slice(0, 2).toUpperCase() || 'U';
    }, [admin]);

    const userPhotoURL = useMemo(() => admin?.photo_url || admin?.profile_image || getAuth().currentUser?.photoURL || null, [admin]);

    return (
        <div className="min-h-screen bg-[#f5f4fb] px-3 pb-24 pt-3 md:bg-gray-50 md:px-6 md:pb-6 md:pt-6 dark:bg-gray-900 relative">
            {/* <OfferPopupBanner />  */}
            {/* <OfferStickyWidget /> */}
            <LoadingOverlay visible={loading} overlayBlur={2} />
            {/* <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 text-center">Sales & Activity Dashboard</h2> */}
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="lg">
                    {error}
                </Alert>
            )}
            {/* --- KPI Cards (Desktop) --- */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
                {/* Total Leads */}
                <div className="panel bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-700 dark:to-blue-600 p-4 rounded-lg shadow-md text-white flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white">
                            <IconUsersGroup className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-100">{dashboardData.totalLeads}</p>
                            <p className="text-xs opacity-90">Total Leads</p>
                        </div>
                    </div>
                </div>

                {/* Conversions */}
                <div className="panel bg-gradient-to-r from-violet-500 to-violet-400 dark:from-violet-700 dark:to-violet-600 p-4 rounded-lg shadow-md text-white flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white">
                            <IconSquareCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-violet-100">{dashboardData.customerConversions}</p>
                            <p className="text-xs opacity-90">Conversions</p>
                        </div>
                    </div>
                </div>

                {/* Conversion Rate */}
                <div className="panel bg-gradient-to-r from-teal-500 to-teal-400 dark:from-teal-700 dark:to-teal-600 p-4 rounded-lg shadow-md text-white flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white">
                            <IconTrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-teal-100">{dashboardData.leadConversionRate}%</p>
                            <p className="text-xs opacity-90">Conversion Rate</p>
                        </div>
                    </div>
                </div>

                {/* Total Sales Value */}
                <div className="panel bg-gradient-to-r from-indigo-500 to-indigo-400 dark:from-indigo-700 dark:to-indigo-600 p-4 rounded-lg shadow-md text-white flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30 text-white">
                            <IconCoinRupee className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl md:text-2xl font-bold text-indigo-100 truncate">{formatCurrency(dashboardData.totalSalesValue)}</p>
                            <p className="text-xs opacity-90">Total Sales Value</p>
                        </div>
                    </div>
                </div>

                {/* Appointment Success Rate */}
                <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400 p-4 rounded-lg shadow-md text-white flex flex-col justify-center items-start h-[120px]">
                    <h3 className="text-sm font-semibold opacity-90 break-words leading-snug">Appt. Success Rate</h3>
                    <p className="text-2xl md:text-3xl font-bold">{dashboardData.appointmentSuccessRate}%</p>
                    <p className="text-[10px] sm:text-xs opacity-80 leading-tight">(Completed / (Comp+Missed))</p>
                </div>
            </div>
            <div className="space-y-5 md:hidden">
                {/* Greeting Header */}
                <div className="flex items-center justify-between pt-1">
                    <div>
                        <p className="text-[13px] font-medium text-slate-500">{greeting}</p>
                        <p className="text-[1.4rem] font-extrabold leading-tight text-slate-900">{displayName}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Link href="/notifications" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                            <IconBell className="h-5 w-5 text-slate-600" />
                        </Link>
                        {userPhotoURL ? (
                            <img src={userPhotoURL} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f46e5] text-[13px] font-bold text-white">
                                {userInitials}
                            </div>
                        )}
                    </div>
                </div>

                {/* Subscription Banner */}
                {subscription && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00b09b] via-[#20b2c8] to-[#6c63ff] p-4 text-white">
                        <div className="mb-2">
                            <span className="rounded-full border border-white/40 bg-white/20 px-3 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
                                {subscription.plan} Plan - {subscription.status}
                            </span>
                        </div>
                        <h2 className="text-[1.55rem] font-extrabold leading-tight">All Core Features</h2>
                        <p className="mt-1 text-[11px] text-white/75">Leads, CRM, Team, Automation, Health Tools.</p>
                        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -bottom-8 right-8 h-20 w-20 rounded-full bg-white/10" />
                    </div>
                )}

                {/* Stats Grid 2x3 — solid-colour cards */}
                <div className="grid grid-cols-2 gap-2.5">
                    {[
                        { label: 'Leads',       value: dashboardData.totalLeads,                              Icon: IconUsersGroup,  card: 'bg-[#7c3aed]' },
                        { label: 'Conv.',        value: dashboardData.customerConversions,                     Icon: IconSquareCheck, card: 'bg-[#db2777]' },
                        { label: 'Sales',        value: formatCompactCurrency(dashboardData.totalSalesValue),  Icon: IconCoinRupee,   card: 'bg-[#059669]' },
                        { label: 'Rate',         value: `${dashboardData.leadConversionRate}%`,                Icon: IconTrendingUp,  card: 'bg-[#d97706]' },
                        { label: 'Follow Up',    value: followUpCount,                                         Icon: IconBell,        card: 'bg-[#1d4ed8]' },
                        { label: 'Appoinment',   value: dashboardData.appointmentsByStatus.scheduled,         Icon: IconChecklist,   card: 'bg-[#0d9488]' },
                    ].map((stat) => (
                        <div key={stat.label} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${stat.card}`}>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                                <stat.Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-[1.2rem] font-extrabold leading-tight text-white">{stat.value}</p>
                                <p className="text-[11px] font-medium text-white/80">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Leads */}
                <div>
                    <h3 className="mb-3 text-[0.95rem] font-bold text-slate-900">Leads</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { href: '/addlead', label: 'Add Leads', Icon: IconUserPlus, bg: 'bg-blue-50', color: 'text-blue-600' },
                            { href: '/leadtable', label: 'All Leads', Icon: IconUsers, bg: 'bg-indigo-50', color: 'text-indigo-600' },
                            { href: '/facebook-leads', label: 'FB Integration', Icon: IconBrandFacebook, bg: 'bg-blue-50', color: 'text-blue-700' },
                            { href: '/webhook', label: 'Leads Forms', Icon: IconForms, bg: 'bg-purple-50', color: 'text-purple-600' },
                            { href: '/reminders', label: 'Reminder', Icon: IconBell, bg: 'bg-yellow-50', color: 'text-yellow-600' },
                            { href: '/followups', label: 'Follow Ups', Icon: IconChecklist, bg: 'bg-orange-50', color: 'text-orange-500' },
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
                                <div className={`flex h-14 w-full items-center justify-center rounded-xl ${item.bg}`}>
                                    <item.Icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <span className="text-center text-[10px] font-semibold leading-tight text-slate-700">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Customers */}
                <div>
                    <h3 className="mb-3 text-[0.95rem] font-bold text-slate-900">Customers</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { href: '/addcustomer', label: 'Add Customers', Icon: IconUserPlus, bg: 'bg-green-50', color: 'text-green-600' },
                            { href: '/customers', label: 'All Customers', Icon: IconUsersGroup, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                            { href: '/appointments', label: 'Appointment', Icon: IconCalendarStats, bg: 'bg-cyan-50', color: 'text-cyan-600' },
                            { href: '/reminders', label: 'Reminder', Icon: IconBell, bg: 'bg-amber-50', color: 'text-amber-500' },
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
                                <div className={`flex h-14 w-full items-center justify-center rounded-xl ${item.bg}`}>
                                    <item.Icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <span className="text-center text-[10px] font-semibold leading-tight text-slate-700">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Operations / Automation */}
                <div>
                    <h3 className="mb-3 text-[0.95rem] font-bold text-slate-900">Operations / Automation</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { href: '/automation', label: 'WhatsApp', Icon: IconBrandWhatsapp, bg: 'bg-green-50', color: 'text-green-500' },
                            { href: '/emails', label: 'Emails', Icon: IconMail, bg: 'bg-blue-50', color: 'text-blue-600' },
                            { href: '/adduser', label: 'Add Team', Icon: IconUserPlus, bg: 'bg-violet-50', color: 'text-violet-600' },
                            { href: '/view-user', label: 'My Team', Icon: IconUsers, bg: 'bg-slate-100', color: 'text-slate-600' },
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
                                <div className={`flex h-14 w-full items-center justify-center rounded-xl ${item.bg}`}>
                                    <item.Icon className={`h-6 w-6 ${item.color}`} />
                                </div>
                                <span className="text-center text-[10px] font-semibold leading-tight text-slate-700">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Premium Tools — items shown depend on user's add-ons */}
                {(() => {
                    const hasSuperAdvance = hasFinancial && hasBusiness && hasRag;

                    // Base tools always available
                    const baseTools = [
                        { href: '/fincalc',       label: 'Health Calculator',         description: 'Financial health score for clients', Icon: IconWaveSine,    bg: 'bg-blue-50',    color: 'text-blue-600'   },
                        { href: '/fhclog',         label: 'Health Calculator History',  description: '',                                   Icon: IconChecklist,   bg: 'bg-blue-50',    color: 'text-blue-500'   },
                        { href: '/ad-banner',      label: 'Banner Maker',               description: 'Banner Maker With our Name',          Icon: IconPhoto,       bg: 'bg-teal-50',    color: 'text-teal-600'   },
                        { href: '/ad-banner/video',label: 'Video Maker',                description: 'Video Maker with our Name',            Icon: IconVideo,      bg: 'bg-slate-100',  color: 'text-slate-600'  },
                    ];

                    // Super Advance tools — shown only when user has that add-on
                    const superAdvanceTools = [
                        ...(hasFinancial ? [
                            { href: '/financial-kundli', label: 'Financial Kundali',         description: 'Deep financial profiling',  Icon: IconCash,         bg: 'bg-yellow-50',  color: 'text-yellow-600' },
                            { href: '/financehistory',   label: 'Financial Kundali History',  description: '',                          Icon: IconFileAnalytics, bg: 'bg-yellow-50', color: 'text-yellow-500' },
                        ] : []),
                        ...(hasBusiness ? [
                            { href: '/business-kundli',  label: 'Business kundali',           description: 'Business health analysis',  Icon: IconBolt,         bg: 'bg-orange-50',  color: 'text-orange-500' },
                            { href: '/history',          label: 'Business kundali History',   description: '',                          Icon: IconFileAnalytics, bg: 'bg-orange-50', color: 'text-orange-400' },
                        ] : []),
                        ...(hasRag ? [
                            { href: '/agentDashboard',   label: 'RAG System',                 description: 'AI-powered knowledge base', Icon: IconRobot,        bg: 'bg-violet-50',  color: 'text-violet-600' },
                            { href: '/assessment',       label: 'Policy Review',              description: 'AI policy analysis',        Icon: IconFileAnalytics, bg: 'bg-blue-50',   color: 'text-blue-500'   },
                        ] : []),
                    ];

                    // Always-last tools
                    const tailTools = [
                        { href: '/gyani-gpt', label: 'Gyani GPT',         description: 'Talk To Yogendra Malik',       Icon: IconRobot, bg: 'bg-orange-50', color: 'text-orange-500' },
                        { href: '/sagar',     label: 'Advisor Profiler',   description: 'Automate Growth, Scale Faster', Icon: IconBolt, bg: 'bg-blue-50',   color: 'text-blue-500'   },
                    ];

                    const allTools = [...baseTools, ...superAdvanceTools, ...tailTools];

                    return (
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <h3 className="text-[0.95rem] font-bold text-slate-900">Premium Tools</h3>
                                {hasSuperAdvance ? (
                                    <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white">Super Advance</span>
                                ) : (
                                    <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-bold text-white">Advance</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {allTools.map((item) => (
                                    <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-sm">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                                            <item.Icon className={`h-5 w-5 ${item.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold leading-tight text-slate-900">{item.label}</p>
                                            {item.description && <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{item.description}</p>}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Super Advance Tools Locked — only shown when user is missing at least one add-on */}
                {(!hasFinancial || !hasBusiness || !hasRag) && (() => {
                    const lockedTools = [
                        { label: 'Financial Kundali',  description: 'Deep financial profiling',  Icon: IconCash,          bg: 'bg-yellow-50',  color: 'text-yellow-600', hasIt: hasFinancial },
                        { label: 'Business kundali',   description: 'Business health analysis',  Icon: IconBolt,          bg: 'bg-orange-50',  color: 'text-orange-500', hasIt: hasBusiness  },
                        { label: 'RAG System',         description: 'AI-powered knowledge base', Icon: IconRobot,         bg: 'bg-violet-50',  color: 'text-violet-600', hasIt: hasRag       },
                        { label: 'Policy Review',      description: 'AI policy analysis',        Icon: IconFileAnalytics, bg: 'bg-blue-50',    color: 'text-blue-500',   hasIt: false        },
                    ].filter((t) => !t.hasIt);

                    return (
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <h3 className="text-center text-[0.95rem] font-bold text-slate-900">Super Advance Tools Locked</h3>
                            <p className="mt-1 text-center text-[11px] text-slate-500">
                                {lockedTools.map((t) => t.label).join(', ')}
                            </p>
                            <button
                                type="button"
                                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-[13px] font-bold text-white"
                            >
                                Upgrade to Super Advance →
                            </button>
                            <div className="mt-3 grid grid-cols-2 gap-2.5">
                                {lockedTools.map((item) => (
                                    <div key={item.label} className="relative flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 opacity-60">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                                            <item.Icon className={`h-4 w-4 ${item.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold leading-tight text-slate-900">{item.label}</p>
                                            <p className="text-[10px] leading-tight text-slate-500">{item.description}</p>
                                        </div>
                                        <IconLock className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Lead Pipeline */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[0.95rem] font-bold text-slate-900">Lead Pipeline</h3>
                        <Link href="/leadtable" className="text-[12px] font-semibold text-blue-600">Details →</Link>
                    </div>
                    <div className="space-y-3.5 rounded-xl bg-white p-4 shadow-sm">
                        {leadsByStatusEntries.slice(0, 4).map((item, index) => {
                            const barColors = ['bg-orange-400', 'bg-blue-500', 'bg-teal-500', 'bg-pink-400'];
                            const total = leadsByStatusEntries[0]?.count || 1;
                            const width = Math.max((item.count / total) * 100, 10);
                            return (
                                <div key={item.label}>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-[12px] font-medium text-slate-700">{item.label}</span>
                                        <span className="text-[12px] font-bold text-slate-900">{item.count}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100">
                                        <div className={`h-2 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {leadsByStatusEntries.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No lead data available.</p>}
                    </div>
                </div>

                {/* Leads by Source */}
                <div>
                    <h3 className="mb-3 text-[0.95rem] font-bold text-slate-900">Leads by Source</h3>
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                        {sourceEntries.length > 0 ? (
                            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                <div className="flex justify-center">
                                    <div className="w-[120px]">
                                        <ReactApexChart options={sourceDonutOptions} series={sourceDonutSeries} type="donut" height={130} />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    {sourceEntries.slice(0, 4).map((item, index) => (
                                        <div key={item.label} className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${['bg-blue-600', 'bg-slate-500', 'bg-orange-400', 'bg-slate-300'][index % 4]}`} />
                                                <span className="truncate font-medium">{item.label}</span>
                                            </div>
                                            <span className="shrink-0 font-semibold text-slate-600">{item.percent}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">No lead source data available.</p>
                        )}
                    </div>
                </div>

                {/* Appointments */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[0.95rem] font-bold text-slate-900">Appointments</h3>
                        <Link href="/appointments" className="text-[12px] font-semibold text-blue-600">Open calendar →</Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                            <p className="text-[1.8rem] font-bold leading-none text-blue-600">{String(dashboardData.appointmentsByStatus.scheduled).padStart(2, '0')}</p>
                            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Scheduled</p>
                            <p className="mt-1 text-[10px] text-blue-500">Next 7 days</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                            <p className="text-[1.8rem] font-bold leading-none text-emerald-600">{String(dashboardData.appointmentsByStatus.completed).padStart(2, '0')}</p>
                            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Completed</p>
                            <p className="mt-1 text-[10px] text-emerald-500">This month</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                            <p className="text-[1.8rem] font-bold leading-none text-rose-600">{String(dashboardData.appointmentsByStatus.missed).padStart(2, '0')}</p>
                            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Missed</p>
                            <p className="mt-1 text-[10px] text-rose-500">This month</p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[0.95rem] font-bold text-slate-900">Recent Activity</h3>
                        <Link href="/followups" className="text-[12px] font-semibold text-blue-600">View all →</Link>
                    </div>
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                        {mobileRecentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {mobileRecentActivity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                                item.tone === 'green' ? 'bg-emerald-100 text-emerald-600' : item.tone === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                            }`}
                                        >
                                            {item.iconKey === 'mail' ? <IconMail className="h-4 w-4" /> : item.iconKey === 'call' ? <IconBell className="h-4 w-4" /> : <IconCalendarStats className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-bold text-slate-900">{item.title}</p>
                                            <p className="text-[11px] text-slate-500">{item.description}</p>
                                        </div>
                                        <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-400">{item.relativeTime}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-slate-500">No recent activity found.</p>
                        )}
                    </div>
                </div>
            </div>
            {subscription && <SubscriptionBanner subscription={subscription} />}
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
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
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
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
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
            <div className="hidden md:block mt-6 bg-white  dark:bg-gray-800 p-4 rounded-lg shadow-md">
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
