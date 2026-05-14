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
    IconBrandWhatsapp,
    IconCalendarStats,
    IconCash,
    IconChartBar,
    IconChecklist,
    IconCoinRupee,
    IconFileAnalytics,
    IconForms,
    IconMail,
    IconPercentage,
    IconPhoto,
    IconRobot,
    IconTargetArrow,
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
    const [expandedShortcutGroups, setExpandedShortcutGroups] = useState({});
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

    const shortcutItems = useMemo(() => {
        const items = [
            { href: '/dashboard', label: 'Dashboard', description: 'Overview and KPIs', icon: IconChartBar, tone: 'blue' },
            { href: '/addlead', label: 'Add Leads', description: 'Create new leads', icon: IconUserPlus, tone: 'sky' },
            { href: '/leadtable', label: 'All Leads', description: 'Track every lead', icon: IconUsers, tone: 'indigo' },
            { href: '/facebook-leads', label: 'Leads Source', description: 'Facebook leads', icon: IconTargetArrow, tone: 'violet' },
            { href: '/webhook', label: 'Lead Form', description: 'Form submissions', icon: IconForms, tone: 'purple' },
            { href: '/customers', label: 'Customers', description: 'Manage customers', icon: IconUsersGroup, tone: 'green' },
            { href: '/fincalc', label: 'Health Calculator', description: 'Financial health calc', icon: IconWaveSine, tone: 'amber' },
            { href: '/fhclog', label: 'Health History', description: 'Review previous runs', icon: IconChecklist, tone: 'yellow' },
            { href: '/appointments', label: 'Appointments', description: 'Meeting schedule', icon: IconCalendarStats, tone: 'cyan' },
            { href: '/followups', label: 'Follow Ups', description: 'Pipeline follow-up', icon: IconChecklist, tone: 'orange' },
            { href: '/reminders', label: 'Reminders', description: 'Pending reminders', icon: IconBell, tone: 'rose' },
            { href: '/adduser', label: 'Team Creation', description: 'Create new users', icon: IconUserPlus, tone: 'emerald' },
            { href: '/view-user', label: 'My Team', description: 'Roster and access', icon: IconUsers, tone: 'stone' },
            { href: '/automation', label: 'WhatsApp', description: 'Automation flows', icon: IconBrandWhatsapp, tone: 'lime' },
            { href: '/emails', label: 'Email', description: 'Campaign automation', icon: IconMail, tone: 'pink' },
            { href: '/ad-banner', label: 'Image Banner', description: 'Static creatives', icon: IconPhoto, tone: 'teal' },
            { href: '/ad-banner/video', label: 'Video Banner', description: 'Motion creatives', icon: IconVideo, tone: 'blue' },
        ];

        if (hasFinancial) {
            items.splice(
                8,
                0,
                { href: '/financial-kundli', label: 'Financial Kundli', description: 'Premium insights', icon: IconCash, tone: 'yellow' },
                { href: '/financehistory', label: 'Financial History', description: 'Previous reports', icon: IconFileAnalytics, tone: 'amber' },
            );
        }

        if (hasBusiness) {
            items.splice(
                10,
                0,
                { href: '/business-kundli', label: 'Business Kundli', description: 'Business report', icon: IconBolt, tone: 'orange' },
                { href: '/history', label: 'Business History', description: 'Previous records', icon: IconFileAnalytics, tone: 'red' },
            );
        }

        if (hasRag) {
            items.splice(
                12,
                0,
                { href: '/agentDashboard', label: 'Agent Dashboard', description: 'RAG operations', icon: IconRobot, tone: 'fuchsia' },
                { href: '/assessment', label: 'Assessment', description: 'Agent scoring', icon: IconChecklist, tone: 'violet' },
            );
        }

        return items;
    }, [hasBusiness, hasFinancial, hasRag]);

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

    const progressTones = ['bg-blue-600', 'bg-green-600', 'bg-amber-600', 'bg-violet-600', 'bg-cyan-600'];
    const shortcutToneClasses = {
        blue: 'from-blue-50 to-white text-blue-700 ring-blue-100',
        sky: 'from-sky-50 to-white text-sky-700 ring-sky-100',
        indigo: 'from-indigo-50 to-white text-indigo-700 ring-indigo-100',
        violet: 'from-violet-50 to-white text-violet-700 ring-violet-100',
        purple: 'from-purple-50 to-white text-purple-700 ring-purple-100',
        green: 'from-green-50 to-white text-green-700 ring-green-100',
        amber: 'from-amber-50 to-white text-amber-700 ring-amber-100',
        yellow: 'from-yellow-50 to-white text-yellow-700 ring-yellow-100',
        cyan: 'from-cyan-50 to-white text-cyan-700 ring-cyan-100',
        orange: 'from-orange-50 to-white text-orange-700 ring-orange-100',
        rose: 'from-rose-50 to-white text-rose-700 ring-rose-100',
        emerald: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
        stone: 'from-stone-50 to-white text-stone-700 ring-stone-100',
        lime: 'from-lime-50 to-white text-lime-700 ring-lime-100',
        pink: 'from-pink-50 to-white text-pink-700 ring-pink-100',
        teal: 'from-teal-50 to-white text-teal-700 ring-teal-100',
        red: 'from-red-50 to-white text-red-700 ring-red-100',
        fuchsia: 'from-fuchsia-50 to-white text-fuchsia-700 ring-fuchsia-100',
    };

    const shortcutGroups = useMemo(() => {
        const groups = [
            {
                key: 'leads',
                title: 'Leads',
                items: shortcutItems.filter((item) => ['/addlead', '/leadtable', '/facebook-leads', '/webhook'].includes(item.href)),
            },
            {
                key: 'customers',
                title: 'Customers & Team',
                items: shortcutItems.filter((item) => ['/customers', '/adduser', '/view-user', '/reminders'].includes(item.href)),
            },
            {
                key: 'operations',
                title: 'Operations',
                items: shortcutItems.filter((item) => ['/appointments', '/followups', '/automation', '/emails'].includes(item.href)),
            },
            {
                key: 'tools',
                title: 'Reports & Tools',
                items: shortcutItems.filter((item) =>
                    ['/fincalc', '/fhclog', '/financial-kundli', '/financehistory', '/business-kundli', '/history', '/agentDashboard', '/assessment', '/ad-banner', '/ad-banner/video'].includes(
                        item.href,
                    ),
                ),
            },
        ];

        return groups.filter((group) => group.items.length > 0);
    }, [shortcutItems]);

    const toggleShortcutGroup = (groupKey) => {
        setExpandedShortcutGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

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
            <div className="space-y-6 md:hidden">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="min-h-[102px] rounded-[14px] border border-white/80 bg-white px-5 py-6 shadow-[0_16px_40px_rgba(79,70,229,0.06)]">
                            <div className="text-[#1558d6]">
                                <IconUsersGroup className="h-8 w-8" />
                            </div>
                            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#8894b7]">Leads</p>
                            <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-[#253763]">{dashboardData.totalLeads}</p>
                        </div>

                        <div className="min-h-[102px] rounded-[14px] border border-white/80 bg-white px-5 py-6 shadow-[0_16px_40px_rgba(79,70,229,0.06)]">
                            <div className="text-[#0b7a42]">
                                <IconSquareCheck className="h-8 w-8" />
                            </div>
                            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#8894b7]">Conv.</p>
                            <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-[#253763]">{dashboardData.customerConversions}</p>
                        </div>

                        <div className="min-h-[102px] rounded-[14px] border border-white/80 bg-white px-5 py-6 shadow-[0_16px_40px_rgba(79,70,229,0.06)]">
                            <div className="text-[#8a6b00]">
                                <IconCoinRupee className="h-8 w-8" />
                            </div>
                            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.18em] text-[#8894b7]">Sales</p>
                            <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-[#253763]">{formatCompactCurrency(dashboardData.totalSalesValue)}</p>
                        </div>
                        <div className="min-h-[102px] rounded-[14px] border border-[#d9e6ff] bg-[#0159fd] px-5 py-6 shadow-[0_16px_40px_rgba(79,70,229,0.06)]">
                            <div className="text-[#ffffff]">
                                <IconPercentage className="h-8 w-8" />
                            </div>
                            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffffff]">Conversion Rate</p>
                            <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-[#ffffff]">{dashboardData.leadConversionRate}%</p>
                        </div>
                    </div>
                </div>

                <section>
                    <div className="mb-3 flex items-center justify-between"></div>
                    <div className="space-y-10">
                        {shortcutGroups.map((group) => {
                            const isExpanded = !!expandedShortcutGroups[group.key];
                            const visibleItems = isExpanded ? group.items : group.items.slice(0, 4);

                            return (
                                <div key={group.key}>
                                    <h3 className="mb-3 text-[1.05rem] font-bold tracking-tight text-slate-900">{group.title}</h3>
                                    <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                                        {visibleItems.map((item) => {
                                            const ShortcutIcon = item.icon;
                                            return (
                                                <Link key={item.href} href={item.href} className="flex flex-col items-center text-center">
                                                    <div className={`flex h-[58px] w-full items-center justify-center rounded-[10px]  bg-white/80 ${shortcutToneClasses[item.tone]}`}>
                                                        <ShortcutIcon className="h-5 w-5" />
                                                    </div>
                                                    <p className="mt-2 text-[11px] font-semibold leading-3.5 text-slate-900">{item.label}</p>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                    {group.items.length > 4 && (
                                        <div className="mt-3 grid grid-cols-[1fr_88px] gap-3">
                                            <div className="flex min-h-[52px] items-center rounded-[12px] bg-slate-50 px-4 text-sm font-medium text-slate-700">
                                                {isExpanded ? `Showing all ${group.items.length}` : `${group.items.length - 4} more in ${group.title}`}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleShortcutGroup(group.key)}
                                                className="flex min-h-[52px] items-center justify-center rounded-[12px] bg-slate-50 px-3 text-sm font-bold text-violet-700 ring-1 ring-slate-200"
                                            >
                                                {isExpanded ? 'Less' : 'More'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-[12px] bg-[#efeffa] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-[1.35rem] font-bold tracking-tight text-slate-900">Lead Pipeline</h2>
                        <Link href="/leadtable" className="text-xs font-semibold text-blue-600">
                            View Details
                        </Link>
                    </div>
                    <div className="space-y-4 rounded-[20px]  backdrop-blur-sm">
                        {leadsByStatusEntries.slice(0, 4).map((item, index) => {
                            const total = leadsByStatusEntries[0]?.count || 1;
                            const width = Math.max((item.count / total) * 100, 12);
                            return (
                                <div key={item.label}>
                                    <div className="mb-1 flex items-center justify-between text-[13px]">
                                        <span className="font-medium text-slate-700">{item.label}</span>
                                        <span className="text-slate-500">{item.count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-indigo-100">
                                        <div className={`h-1.5 rounded-full ${progressTones[index % progressTones.length]}`} style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {leadsByStatusEntries.length === 0 && <p className="text-sm text-slate-500">No lead status data available.</p>}
                    </div>
                </section>

                <section>
                    <h2 className="mb-3 text-[1.35rem] font-bold tracking-tight text-slate-900">Leads by Source</h2>
                    <div className="rounded-[12px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                        {sourceEntries.length > 0 ? (
                            <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                                <div className="flex justify-center">
                                    <div className="w-[132px]">
                                        <ReactApexChart options={sourceDonutOptions} series={sourceDonutSeries} type="donut" height={150} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {sourceEntries.slice(0, 3).map((item, index) => (
                                        <div key={item.label} className="flex items-center justify-between gap-3 text-[13px] text-slate-700">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${['bg-blue-600', 'bg-emerald-700', 'bg-yellow-700'][index % 3]}`} />
                                                <span className="truncate font-medium">{item.label}</span>
                                            </div>
                                            <span className="shrink-0 font-semibold text-slate-500">{item.percent}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="py-10 text-center text-sm text-slate-500">No lead source data available.</p>
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="mb-3 text-[1.35rem] font-bold tracking-tight text-slate-900">Appointments</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[12px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Scheduled</p>
                            <p className="mt-2 text-[1.7rem] font-bold text-slate-900">{dashboardData.appointmentsByStatus.scheduled}</p>
                            <p className="mt-2 text-[11px] text-blue-600">Next 7 days</p>
                        </div>
                        <div className="rounded-[12px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Completed</p>
                            <p className="mt-2 text-[1.7rem] font-bold text-slate-900">{dashboardData.appointmentsByStatus.completed}</p>
                            <p className="mt-2 text-[11px] text-emerald-600">This month</p>
                        </div>
                        <div className="col-span-2 rounded-[12px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Missed</p>
                                    <p className="mt-2 text-[1.7rem] font-bold text-slate-900">{dashboardData.appointmentsByStatus.missed}</p>
                                </div>
                                <Link href="/appointments" className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                                    Open Calendar
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[1.35rem] font-bold tracking-tight text-slate-900">Recent Activity</h2>
                        <Link href="/followups" className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                            View All
                        </Link>
                    </div>
                    <div className="rounded-[24px]  ">
                        {mobileRecentActivity.length > 0 ? (
                            <div className="space-y-1">
                                {mobileRecentActivity.map((item, index) => (
                                    <div key={item.id} className="relative flex gap-4 pb-7 last:pb-0">
                                        <div className="relative flex w-12 shrink-0 justify-center">
                                            {index < mobileRecentActivity.length - 1 && <div className="absolute top-12 h-[calc(100%-12px)] w-px bg-slate-200" />}
                                            <div
                                                className={`relative z-10 mt-0.5 flex h-11 w-11 items-center justify-center rounded-full ${item.tone === 'green' ? 'bg-emerald-100 text-emerald-700' : item.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                                            >
                                                {item.iconKey === 'mail' ? (
                                                    <IconMail className="h-5 w-5" />
                                                ) : item.iconKey === 'call' ? (
                                                    <IconBell className="h-5 w-5" />
                                                ) : (
                                                    <IconCalendarStats className="h-5 w-5" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-bold text-slate-900">{item.title}</p>
                                            <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{item.description}</p>
                                            <p className="mt-1 text-[11px] text-slate-400">{item.relativeTime}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">No recent activity found.</div>
                        )}
                    </div>
                </section>
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
