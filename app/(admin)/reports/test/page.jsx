// app/reports/export/page.jsx

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { format, parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subDays, isFuture } from 'date-fns';
import Papa from 'papaparse';
import { LoadingOverlay, Alert, Card, Title, Select, Button, Group, Stack, Text, Container, SimpleGrid } from '@mantine/core';
import { DateRangePicker } from '@mantine/dates'; // Ensure @mantine/dates is installed
import { IconAlertCircle, IconDownload, IconReportAnalytics, IconUsers, IconCalendar, IconFilter } from '@tabler/icons-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// --- Helper Function for API calls ---
const authenticatedAxios = async (method, url, data = null) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) { throw new Error("User not authenticated."); }
    const idToken = await user.getIdToken();
    const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
    return axios({ method, url, headers, data });
};

// --- CSV Export Helper ---
const exportToCsv = (data, filename = 'export.csv') => {
    if (!data || data.length === 0) {
        alert("No data available for the selected report criteria.");
        return false; // Indicate failure
    }
    try {
        // Filter out complex objects/arrays if Papa struggles, select only primitive types
        const cleanData = data.map(row => {
            const newRow = {};
            for (const key in row) {
                if (typeof row[key] !== 'object' || row[key] === null || row[key] instanceof Date) { // Allow Dates
                     newRow[key] = row[key];
                } else {
                     newRow[key] = JSON.stringify(row[key]).substring(0, 100); // Truncate stringified objects
                }
            }
            return newRow;
        });

        const csv = Papa.unparse(cleanData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true; // Indicate success
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        alert("Failed to export data. See console for details.");
        return false; // Indicate failure
    }
};

// --- Format Date Helpers ---
const formatDateForExport = (dateString) => {
    if (!dateString) return '';
    try { const date = parseISO(dateString); return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : ''; } catch { return ''; }
};
const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    try { const date = parseISO(dateString); return isValid(date) ? format(date, 'yyyy-MM-dd') : ''; } catch { return ''; }
};
const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};


// --- Main Report Export Page Component ---
const ReportsExportPage = () => {
    // Raw Data State
    const [rawData, setRawData] = useState({
        leads: [], customers: [], appointments: [], users: []
    });

    // Filter State
    const [selectedUser, setSelectedUser] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]); // [Date | null, Date | null]

    // Loading & Error State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatingReportType, setGeneratingReportType] = useState(null); // Track which report is generating

    // --- Fetch All Data on Mount ---
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use Promise.allSettled to handle individual fetch failures gracefully
                const results = await Promise.allSettled([
                    authenticatedAxios('get', `${API_URL}/api/leads/all`),
                    authenticatedAxios('get', `${API_URL}/api/customers`),
                    authenticatedAxios('get', `${API_URL}/api/appointments/`),
                    authenticatedAxios('get', `${API_URL}/api/admin/users`),
                ]);

                const leadsData = results[0].status === 'fulfilled' ? results[0].value.data || [] : [];
                const customersData = results[1].status === 'fulfilled' ? results[1].value.data || [] : [];
                const appointmentsData = results[2].status === 'fulfilled' ? results[2].value.data || [] : [];
                const usersData = results[3].status === 'fulfilled' ? results[3].value.data || [] : [];

                 // Check if any crucial fetch failed
                if (results.some(r => r.status === 'rejected')) {
                     console.error("Some data fetching failed:", results.filter(r => r.status === 'rejected'));
                     // Set a partial error, or handle as needed
                     setError("Could not load all data. Some reports might be incomplete.");
                 }

                setRawData({
                    leads: leadsData,
                    customers: customersData,
                    appointments: appointmentsData,
                    users: usersData
                });

            } catch (err) { // Catch errors from Promise.allSettled itself or auth errors
                setError(err.message || "Failed to load necessary data.");
                console.error("Data fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // --- Memoized Lookup Maps ---
    const userMap = useMemo(() => {
        return rawData.users.reduce((map, user) => {
            map[user.id] = user.username || `User ${user.id}`;
            return map;
        }, {});
    }, [rawData.users]);

    const customerMap = useMemo(() => {
        return rawData.customers.reduce((map, cust) => {
            map[cust.id] = cust.full_name || `Customer ${cust.id}`;
            return map;
        }, {});
     }, [rawData.customers]);

    // --- Report Generation Function ---
    const handleGenerateReport = useCallback(async (reportType) => {
        setGeneratingReportType(reportType); // Show loading state for this specific button

        // Define date range based on type or selection
        const now = new Date();
        let [startDate, endDate] = dateRange;
        let filterInterval = null;
        let requiresDate = reportType.includes('_period');
        let requiresUser = reportType.includes('_user');

        if (reportType.includes('_week')) {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (reportType.includes('_month')) {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        if (requiresDate && (!startDate || !endDate)) {
            alert('Please select a date range for this report.');
            setGeneratingReportType(null);
            return;
        }
        if (requiresUser && !selectedUser) {
            alert('Please select a user for this report.');
            setGeneratingReportType(null);
            return;
        }

        if (startDate && endDate) {
            filterInterval = { start: startOfDay(startDate), end: endOfDay(endDate) };
        }
        const selectedUserId = selectedUser ? parseInt(selectedUser, 10) : null;

        // --- Generate Data ---
        try {
            let reportData = [];
            let baseFilename = reportType;
            let dataGenerated = false;

            // Helper to check date within interval
            const isDateInInterval = (dateStr, interval) => {
                 if (!interval || !dateStr) return !interval; // If no interval needed, return true
                 try {
                    const date = parseISO(dateStr);
                    return isValid(date) && isWithinInterval(date, interval);
                 } catch { return false; }
            };

            switch (reportType) {
                // --- Lead Reports ---
                case 'leads_created_week':
                case 'leads_created_month':
                case 'leads_created_period':
                    reportData = rawData.leads
                        .filter(lead => isDateInInterval(lead.created_at, filterInterval))
                        .map(lead => ({
                            'Lead ID': lead.id,
                            'Created At': formatDateForExport(lead.created_at),
                            'Name': lead.full_name ?? '',
                            'Email': lead.email ?? '',
                            'Phone': lead.phone_number ?? '',
                            'Status': lead.lead_status ?? 'N/A',
                            'Source': lead.source ?? 'Unknown',
                            'Assigned To': userMap[lead.user_id] ?? 'Unassigned',
                            'Next Follow Up': formatDateOnly(lead.next_follow_up_date),
                            'Notes': lead.notes ?? '',
                        }));
                    dataGenerated = true;
                    break;

                case 'leads_by_source_period':
                     const sourceCounts = rawData.leads
                         .filter(lead => isDateInInterval(lead.created_at, filterInterval))
                         .reduce((acc, lead) => {
                             const source = lead.source || 'Unknown';
                             acc[source] = (acc[source] || 0) + 1;
                             return acc;
                         }, {});
                     reportData = Object.entries(sourceCounts).map(([source, count]) => ({
                         'Source': source,
                         'Lead Count': count,
                     })).sort((a, b) => b['Lead Count'] - a['Lead Count']);
                    dataGenerated = true;
                    break;

                 // --- Conversion/Sales Reports ---
                 case 'conversions_week':
                 case 'conversions_month':
                 case 'conversions_period':
                     reportData = rawData.customers
                         .filter(cust => isDateInInterval(cust.created_at, filterInterval))
                         .map(cust => ({
                             'Customer ID': cust.id,
                             'Converted At': formatDateForExport(cust.created_at),
                             'Name': cust.full_name ?? '',
                             'Email': cust.email ?? '',
                             'Phone': cust.phone_number ?? '',
                             'Assigned To': userMap[cust.user_id] ?? 'Unassigned',
                             'Source': cust.source ?? 'Unknown',
                             'Policy Number': cust.policy_number ?? '',
                             'Premium': formatCurrency(cust.premium),
                             'Renewal Date': formatDateOnly(cust.renewal_date),
                         }));
                     dataGenerated = true;
                     break;

                 case 'conversions_by_user_period':
                 case 'conversions_by_user_all': // Add specific type if needed
                     reportData = rawData.customers
                         .filter(cust => cust.user_id === selectedUserId && (reportType === 'conversions_by_user_all' || isDateInInterval(cust.created_at, filterInterval)))
                         .map(cust => ({ /* ... same fields as above ... */ }));
                     baseFilename = `conversions_${userMap[selectedUser] ?? selectedUser}`;
                     dataGenerated = true;
                     break;

                case 'sales_value_by_user_period':
                     const userSales = rawData.customers
                         .filter(cust => cust.user_id === selectedUserId && isDateInInterval(cust.created_at, filterInterval))
                         .reduce((sum, cust) => sum + (parseFloat(cust.premium) || 0), 0);
                     reportData = [{
                         'User': userMap[selectedUser] ?? `User ID ${selectedUser}`,
                         'Total Premium Value': formatCurrency(userSales),
                         'Period Start': filterInterval ? formatDateOnly(filterInterval.start.toISOString()) : 'N/A',
                         'Period End': filterInterval ? formatDateOnly(filterInterval.end.toISOString()) : 'N/A',
                     }];
                     baseFilename = `sales_value_${userMap[selectedUser] ?? selectedUser}`;
                     dataGenerated = true;
                     break;

                // --- Appointment Reports ---
                case 'appointments_week':
                case 'appointments_month':
                case 'appointments_period':
                     reportData = rawData.appointments
                         .filter(appt => isDateInInterval(appt.appointment_date, filterInterval))
                         .map(appt => ({
                             'Appointment ID': appt.id,
                             'Date': formatDateForExport(appt.appointment_date),
                             'Type': appt.appointment_type ?? 'N/A',
                             'Status': appt.status ?? 'N/A',
                             'Assigned To': userMap[appt.user_id] ?? 'Unassigned',
                             'Customer Name': customerMap[appt.customer_id] ?? `ID ${appt.customer_id ?? 'N/A'}`,
                             'Notes': appt.notes ?? '',
                         }));
                     dataGenerated = true;
                     break;

                // --- User Performance ---
                case 'user_performance_summary_period':
                     const userLeads = rawData.leads.filter(l => l.user_id === selectedUserId && isDateInInterval(l.created_at, filterInterval)).length;
                     const userConversions = rawData.customers.filter(c => c.user_id === selectedUserId && isDateInInterval(c.created_at, filterInterval));
                     const userSalesValue = userConversions.reduce((sum, cust) => sum + (parseFloat(cust.premium) || 0), 0);
                     const userAppointments = rawData.appointments.filter(a => a.user_id === selectedUserId && isDateInInterval(a.appointment_date, filterInterval)).length;

                     reportData = [{
                        'User': userMap[selectedUser] ?? `User ID ${selectedUser}`,
                        'Leads Assigned/Created in Period': userLeads,
                        'Conversions in Period': userConversions.length,
                        'Sales Value in Period': formatCurrency(userSalesValue),
                        'Appointments in Period': userAppointments,
                        'Period Start': filterInterval ? formatDateOnly(filterInterval.start.toISOString()) : 'N/A',
                        'Period End': filterInterval ? formatDateOnly(filterInterval.end.toISOString()) : 'N/A',
                     }];
                     baseFilename = `user_summary_${userMap[selectedUser] ?? selectedUser}`;
                     dataGenerated = true;
                     break;


                 default:
                     alert(`Report type "${reportType}" is not implemented yet.`);
             }

            // --- Export ---
            if (dataGenerated && reportData.length > 0) {
                let dateSuffix = '';
                 if (filterInterval) dateSuffix = `_${format(filterInterval.start, 'yyyyMMdd')}_to_${format(filterInterval.end, 'yyyyMMdd')}`;
                 else if (reportType.includes('_week')) dateSuffix = `_week_${format(now, 'yyyyMMdd')}`;
                 else if (reportType.includes('_month')) dateSuffix = `_month_${format(now, 'yyyyMM')}`;

                const finalFilename = `${baseFilename}${dateSuffix}.csv`;
                exportToCsv(reportData, finalFilename);
            } else if (dataGenerated && reportData.length === 0) {
                 alert("No data found for the selected report criteria.");
            }

        } catch (e) {
            console.error("Report generation failed:", e);
            alert(`Failed to generate report: ${e.message}`);
        } finally {
            setGeneratingReportType(null); // Clear loading state for this button
        }

    }, [dateRange, selectedUser, rawData, userMap, customerMap]); // Dependencies for the callback

    // Options for User Select dropdown
    const userSelectOptions = useMemo(() => (
        rawData.users.map(user => ({ value: String(user.id), label: user.username }))
    ), [rawData.users]);


    return (
        <Container size="xl" className="p-6">
            <Title order={2} align="center" mb="xl">Generate & Export Reports</Title>

            <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

            {error && !loading && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error Loading Data!" color="red" withCloseButton onClose={() => setError(null)} mb="lg">
                    {error} Please try refreshing the page. Reporting functionality may be limited.
                </Alert>
            )}

            {/* --- Filters Section --- */}
            {!loading && (
                <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl" className='overflow-visible'>
                     <Group align="flex-start"> {/* Use Group for horizontal layout */}
                         <IconFilter size="1.5rem" className="text-gray-500" />
                         <Title order={4} mb="sm">Filters</Title>
                     </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <DateRangePicker
                            label="Select Date Range (for reports marked 'Period')"
                            placeholder="Pick dates range"
                            className='h-128 z-10'
                            value={dateRange}
                            onChange={setDateRange}
                            icon={<IconCalendar size="1rem" />}
                            clearable
                            maxDate={new Date()}
                        />
                        <Select
                            label="Select User (for reports marked 'by User')"
                            placeholder="Pick a team member..."
                            data={userSelectOptions}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            clearable
                            searchable
                            nothingFoundMessage="No users found"
                            icon={<IconUsers size="1rem" />}
                        />
                    </SimpleGrid>
                </Card>
            )}

            {/* --- Report Categories --- */}
            {!loading && !error && (
                <SimpleGrid cols={{ base: 1, md: 2, lg: 3}} spacing="xl">

                    {/* Lead Reports Card */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="md">Lead Reports</Title>
                        <Stack gap="sm">
                             <Button variant="outline" size="sm" loading={generatingReportType === 'leads_created_week'} onClick={() => handleGenerateReport('leads_created_week')} leftSection={<IconDownload size="1rem" />}>Leads Created (This Week)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'leads_created_month'} onClick={() => handleGenerateReport('leads_created_month')} leftSection={<IconDownload size="1rem" />}>Leads Created (This Month)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'leads_created_period'} onClick={() => handleGenerateReport('leads_created_period')} leftSection={<IconDownload size="1rem" />} disabled={!dateRange[0] || !dateRange[1]}>Leads Created (Selected Period)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'leads_by_source_period'} onClick={() => handleGenerateReport('leads_by_source_period')} leftSection={<IconDownload size="1rem" />} disabled={!dateRange[0] || !dateRange[1]}>Leads by Source (Selected Period)</Button>
                        </Stack>
                    </Card>

                    {/* Conversion/Sales Reports Card */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="md">Conversion & Sales Reports</Title>
                        <Stack gap="sm">
                             <Button variant="outline" size="sm" loading={generatingReportType === 'conversions_week'} onClick={() => handleGenerateReport('conversions_week')} leftSection={<IconDownload size="1rem" />}>Conversions (This Week)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'conversions_month'} onClick={() => handleGenerateReport('conversions_month')} leftSection={<IconDownload size="1rem" />}>Conversions (This Month)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'conversions_period'} onClick={() => handleGenerateReport('conversions_period')} leftSection={<IconDownload size="1rem" />} disabled={!dateRange[0] || !dateRange[1]}>Conversions (Selected Period)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'conversions_by_user_all'} onClick={() => handleGenerateReport('conversions_by_user_all')} leftSection={<IconDownload size="1rem" />} disabled={!selectedUser}>Conversions by User (All Time)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'conversions_by_user_period'} onClick={() => handleGenerateReport('conversions_by_user_period')} leftSection={<IconDownload size="1rem" />} disabled={!selectedUser || !dateRange[0] || !dateRange[1]}>Conversions by User (Selected Period)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'sales_value_by_user_period'} onClick={() => handleGenerateReport('sales_value_by_user_period')} leftSection={<IconDownload size="1rem" />} disabled={!selectedUser || !dateRange[0] || !dateRange[1]}>Total Sales by User (Selected Period)</Button>
                        </Stack>
                    </Card>

                    {/* Appointment Reports Card */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                         <Title order={4} mb="md">Appointment Reports</Title>
                         <Stack gap="sm">
                             <Button variant="outline" size="sm" loading={generatingReportType === 'appointments_week'} onClick={() => handleGenerateReport('appointments_week')} leftSection={<IconDownload size="1rem" />}>Appointments (This Week)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'appointments_month'} onClick={() => handleGenerateReport('appointments_month')} leftSection={<IconDownload size="1rem" />}>Appointments (This Month)</Button>
                             <Button variant="outline" size="sm" loading={generatingReportType === 'appointments_period'} onClick={() => handleGenerateReport('appointments_period')} leftSection={<IconDownload size="1rem" />} disabled={!dateRange[0] || !dateRange[1]}>Appointments (Selected Period)</Button>
                             {/* Add Appointments by User/Status here if needed */}
                         </Stack>
                    </Card>

                    {/* User Performance Card */}
                     <Card shadow="sm" padding="lg" radius="md" withBorder>
                         <Title order={4} mb="md">User Performance</Title>
                         <Stack gap="sm">
                             <Button variant="outline" size="sm" loading={generatingReportType === 'user_performance_summary_period'} onClick={() => handleGenerateReport('user_performance_summary_period')} leftSection={<IconDownload size="1rem" />} disabled={!selectedUser || !dateRange[0] || !dateRange[1]}>User Summary (Selected Period)</Button>
                             {/* Add other user-specific reports */}
                         </Stack>
                     </Card>

                </SimpleGrid>
            )}
        </Container>
    );
};

export default ReportsExportPage;