// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useSelector } from 'react-redux';
// import dynamic from 'next/dynamic'; // Use dynamic import for ApexCharts
// import axios from 'axios';
// import { getAuth } from 'firebase/auth';
// import { format, parseISO, startOfMonth, endOfMonth, subMonths, getMonth, getYear, isValid } from 'date-fns';
// import PerfectScrollbar from 'react-perfect-scrollbar';

// // Local Components/Icons (Ensure paths are correct)
// import Dropdown from '@/components/dropdown';
// import IconCaretsDown from '@/components/icon/icon-carets-down';
// import IconChatDots from '@/components/icon/icon-chat-dots';
// import IconChecks from '@/components/icon/icon-checks';
// // import IconChrome from '@/components/icon/icon-chrome'; // Example: remove if unused
// import IconClock from '@/components/icon/icon-clock';
// // import IconCreditCard from '@/components/icon/icon-credit-card'; // Example: remove if unused
// import IconFile from '@/components/icon/icon-file';
// import IconGlobe from '@/components/icon/icon-globe';
// import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
// import IconLink from '@/components/icon/icon-link';
// import IconMail from '@/components/icon/icon-mail';
// import IconPlus from '@/components/icon/icon-plus';
// // import IconSafari from '@/components/icon/icon-safari'; // Example: remove if unused
// import IconServer from '@/components/icon/icon-server';
// import IconSquareCheck from '@/components/icon/icon-square-check';
// import IconThumbUp from '@/components/icon/icon-thumb-up';
// import IconTrendingUp from '@/components/icon/icon-trending-up';
// import IconUsersGroup from '@/components/icon/icon-users-group';
// import IconFacebook from '../icon/icon-facebook'; // Ensure path is correct
// import IconAlertCircle from '../icon/icon-award'; // Add if using for missed appointments

// import { IRootState } from '@/store'; // Assuming IRootState is correctly defined

// // Dynamically import ApexCharts to prevent SSR issues
// const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// interface ComponentsDashboardAnalyticsProps {
//     leads: any[];
//     customers: any[];
//     appointments: any[];
//     users: any[];
// }

// const ComponentsDashboardAnalytics = () => {
//     const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
//     const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
//     const [isMounted, setIsMounted] = useState(false);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [dashboardStats, setDashboardStats] = useState({
//         leadsPerMonth: { series: [] as { name: string; data: number[] }[], categories: [] as string[] },
//         activityLog: [] as any[], // Define a more specific type if possible
//         leadsBySource: [] as { source: string; count: number; percentage: string }[],
//         totalLeads: 0,
//         customerConversions: 0,
//         leadConversionRate: '0.0',  
//     });

//     const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'; // Ensure this is set in your .env.local

//     // --- Base Chart Options ---
//     // Define base options for reuse, especially styling
//     const baseBarChartOptions: any = {
//         chart: {
//             // height: 360, // Height set in component props
//             type: 'bar',
//             fontFamily: 'Nunito, sans-serif',
//             toolbar: { show: false },
//             redrawOnWindowResize: true, // Ensure responsiveness
//             redrawOnParentResize: true,
//         },
//         dataLabels: { enabled: false },
//         stroke: { width: 2, colors: ['transparent'] },
//         colors: ['#5c1ac3', '#ffbb44'], // Default colors, can be overridden
//         dropShadow: { enabled: true, blur: 3, color: '#515365', opacity: 0.4 },
//         plotOptions: {
//             bar: { horizontal: false, columnWidth: '55%', borderRadius: 8, borderRadiusApplication: 'end' },
//         },
//         legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '14px', itemMargin: { horizontal: 8, vertical: 8 } },
//         grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed', padding: { left: 20, right: 20 } },
//         xaxis: {
//             // categories set dynamically
//             axisBorder: { show: true, color: isDark ? '#3b3f5c' : '#e0e6ed' },
//             labels: {
//                 style: { colors: isDark ? '#e0e6ed' : '#3b3f5c' } // Adjust label color for theme
//             }
//         },
//         yaxis: {
//             tickAmount: 6,
//             opposite: isRtl,
//             labels: {
//                 offsetX: isRtl ? -10 : 0,
//                 style: { colors: isDark ? '#e0e6ed' : '#3b3f5c' } // Adjust label color for theme
//             },
//         },
//         fill: { type: 'gradient', gradient: { shade: isDark ? 'dark' : 'light', type: 'vertical', shadeIntensity: 0.3, inverseColors: false, opacityFrom: 1, opacityTo: 0.8, stops: [0, 100] } },
//         tooltip: { marker: { show: true }, theme: isDark ? 'dark' : 'light' }, // Adjust tooltip theme
//     };

//     // --- Data Fetching Logic ---
//     const fetchDashboardData = async () => {
//         setLoading(true);
//         setError(null);
//         const auth = getAuth();
//         const user = auth.currentUser;

//         if (!user || !API_URL) {
//             setError(!user ? "User not authenticated." : "API URL not configured.");
//             setLoading(false);
//             return;
//         }

//         try {
//             const idToken = await user.getIdToken();
//             const headers = { Authorization: `Bearer ${idToken}` };

//             // Fetch all data concurrently
//             const [leadsResponse, customersResponse, appointmentsResponse] = await Promise.all([
//                 axios.get(`${API_URL}/api/leads/all`, { headers }).catch(err => { console.error("Leads fetch failed:", err); return { data: [] }; }), // Add basic error handling per call
//                 axios.get(`${API_URL}/api/customers`, { headers }).catch(err => { console.error("Customers fetch failed:", err); return { data: [] }; }),
//                 axios.get(`${API_URL}/api/appointments/`, { headers }).catch(err => { console.error("Appointments fetch failed:", err); return { data: [] }; })
//             ]);

//             const leads = leadsResponse.data || [];
//             const customers = customersResponse.data || [];
//             const appointments = appointmentsResponse.data || [];

//             // --- Process Data ---
//             const now = new Date();

//             // 1. Leads Per Month (Last 12 Months)
//             const monthlyLeadCounts: { [key: string]: number } = {};
//             const monthLabels: string[] = [];
//             for (let i = 11; i >= 0; i--) {
//                 const targetMonthDate = subMonths(now, i);
//                 const monthKey = format(targetMonthDate, 'yyyy-MM');
//                 const monthLabel = format(targetMonthDate, 'MMM');
//                 monthlyLeadCounts[monthKey] = 0;
//                 monthLabels.push(monthLabel);
//             }

//             leads.forEach((lead: any) => {
//                 try {
//                     if (lead.created_at) {
//                         const leadDate = parseISO(lead.created_at);
//                         if (isValid(leadDate)) { // Check if date is valid
//                             const monthKey = format(leadDate, 'yyyy-MM');
//                             if (monthlyLeadCounts.hasOwnProperty(monthKey)) {
//                                 monthlyLeadCounts[monthKey]++;
//                             }
//                         } else {
//                             console.warn("Invalid lead created_at date:", lead.created_at);
//                         }
//                     }
//                 } catch (e) { console.warn("Error parsing lead date:", lead.created_at, e); }
//             });
//             const leadsPerMonthData = Object.values(monthlyLeadCounts);

//             // 2. Activity Log
//             let activityLogItems: any[] = [];
//             // Recent Leads
//             leads.slice(0, 10).forEach((lead: any) => {
//                 try {
//                     const date = lead.created_at ? parseISO(lead.created_at) : null;
//                     if (date && isValid(date)) {
//                         activityLogItems.push({
//                             id: `l-${lead.id}`, type: 'lead_created', date: date,
//                             description: `New Lead: ${lead.full_name || 'N/A'} (${lead.source || 'Unknown'})`,
//                             icon: <IconPlus className="h-4 w-4" />, color: 'bg-secondary text-white shadow-secondary',
//                         });
//                     }
//                 } catch (e) { console.warn("Err processing lead log:", lead.id) }
//             });
//             // Recent Conversions
//             customers.slice(0, 10).forEach((cust: any) => {
//                 try {
//                     const date = cust.created_at ? parseISO(cust.created_at) : null;
//                      if (date && isValid(date)) {
//                         activityLogItems.push({
//                             id: `c-${cust.id}`, type: 'conversion', date: date,
//                             description: `Converted to Customer: ${cust.full_name || 'N/A'}`,
//                             icon: <IconSquareCheck className="h-4 w-4" />, color: 'bg-success text-white shadow-success',
//                         });
//                     }
//                 } catch (e) { console.warn("Err processing customer log:", cust.id) }
//             });
//             // Recent Appointments
//             appointments.slice(0, 10).forEach((appt: any) => {
//                  try {
//                     const date = appt.appointment_date ? parseISO(appt.appointment_date) : null;
//                      if (date && isValid(date)) {
//                         let desc = ''; let icon = <IconClock className="h-4 w-4" />; let color = 'bg-primary text-white';
//                         const status = appt.status?.toLowerCase() || 'unknown';

//                         if (status === 'completed') { desc = `Appt Completed: ${appt.appointment_type || 'General'}`; icon = <IconChecks className="h-4 w-4" />; color = 'bg-success text-white'; }
//                         else if (status === 'missed') { desc = `Appt Missed: ${appt.appointment_type || 'General'}`; icon = <IconAlertCircle className="h-4 w-4" />; color = 'bg-danger text-white'; }
//                         else { desc = `Appt Scheduled: ${appt.appointment_type || 'General'}`; }

//                         activityLogItems.push({
//                             id: `a-${appt.id}`, type: `appointment_${status}`, date: date, description: desc, icon: icon, color: color,
//                         });
//                     }
//                  } catch (e) { console.warn("Err processing appt log:", appt.id) }
//             });

//             // Sort activity log and limit
//             activityLogItems.sort((a, b) => b.date - a.date);
//             activityLogItems = activityLogItems.slice(0, 15);

//             // 3. Leads by Source
//             const leadsBySourceCounts = leads.reduce((acc: any, lead: any) => {
//                 const source = lead.source || "Unknown";
//                 acc[source] = (acc[source] || 0) + 1;
//                 return acc;
//             }, {});
//             const totalLeads = leads.length;
//             const leadsBySourceProcessed = Object.entries(leadsBySourceCounts).map(([source, count]) => ({
//                 source: source,
//                 count: count as number,
//                 percentage: totalLeads > 0 ? (((count as number) / totalLeads) * 100).toFixed(1) : '0.0',
//             })).sort((a, b) => b.count - a.count);

//             // 4. KPIs
//             const customerConversions = customers.length;
//             const leadConversionRate = totalLeads > 0 ? ((customerConversions / totalLeads) * 100).toFixed(1) : '0.0';

//             // Set State
//             setDashboardStats({
//                 leadsPerMonth: { series: [{ name: 'Leads', data: leadsPerMonthData }], categories: monthLabels },
//                 activityLog: activityLogItems,
//                 leadsBySource: leadsBySourceProcessed,
//                 totalLeads: totalLeads,
//                 customerConversions: customerConversions,
//                 leadConversionRate: leadConversionRate,
//             });

//         } catch (err: any) {
//             console.error("Error fetching dashboard data:", err);
//             setError(err.message || "Failed to load dashboard data.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Helper to format numbers like 31600 to 31.6K
//     const formatStatNumber = (num: number): string => {
//         if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
//         if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
//         return num.toString();
//     };

//     // Fetch data on mount
//     useEffect(() => {
//         setIsMounted(true); // Indicate component is mounted for charts
//         fetchDashboardData();
//     }, []); // Empty dependency array means run once on mount


//     // --- Dynamic Chart Options ---
//     const leadsPerMonthChartOptions = {
//         ...baseBarChartOptions, // Spread base options
//         xaxis: {
//             ...baseBarChartOptions.xaxis,
//             categories: dashboardStats.leadsPerMonth.categories, // Set dynamic categories
//         },
//         colors: ['#4361ee'], // Override default colors if needed for this specific chart
//     };

//     // --- Render ---
//     return (
//         <div>
//             {/* Optional: Add a top-level loading overlay or spinner here */}
//             {loading && <div className="text-center p-10">Loading Dashboard Analytics...</div>}
//             {error && <div className="text-center p-10 text-red-500">Error loading data: {error}</div>}

//             {!loading && !error && (
//                 <div className="pt-5">
//                     {/* Leads Per Month & Activity Log Row */}
//                     <div className="mb-6 grid gap-6 lg:grid-cols-3">
//                         {/* Leads Per Month Chart */}
//                         <div className="panel h-full p-0 lg:col-span-2">
//                             <div className="mb-5 flex items-start justify-between border-b border-white-light p-5 dark:border-[#1b2e4b]">
//                                 <h5 className="text-lg font-semibold dark:text-white-light">Leads Per Month (Last 12 Months)</h5>
//                                 {/* Optional Dropdown */}
//                                 <div className="dropdown">
//                                     <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="hover:text-primary" button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}>
//                                         <ul>
//                                             <li><button type="button" onClick={() => fetchDashboardData()}>Refresh</button></li>
//                                             {/* Add other actions if needed */}
//                                         </ul>
//                                     </Dropdown>
//                                 </div>
//                             </div>
//                             {isMounted && dashboardStats.leadsPerMonth?.series[0]?.data.length > 0 ? (
//                                 <ReactApexChart options={leadsPerMonthChartOptions} series={dashboardStats.leadsPerMonth.series} type="bar" height={360} width="100%" />
//                             ) : (
//                                 <div className="flex h-[360px] items-center justify-center text-gray-500">No lead data available for this period.</div>
//                             )}
//                         </div>

//                         {/* Activity Log */}
//                         <div className="panel h-full">
//                             <div className="-mx-5 mb-5 flex items-start justify-between border-b border-white-light p-5 pt-0 dark:border-[#1b2e4b]">
//                                 <h5 className="text-lg font-semibold dark:text-white-light">Recent Activity</h5>
//                                 {/* Optional Dropdown */}
//                                 <div className="dropdown">
//                                     <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="hover:text-primary" button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}>
//                                         <ul>
//                                             <li><button type="button">View All (Not Implemented)</button></li>
//                                         </ul>
//                                     </Dropdown>
//                                 </div>
//                             </div>
//                             <PerfectScrollbar className="perfect-scrollbar relative h-[360px] ltr:-mr-3 ltr:pr-3 rtl:-ml-3 rtl:pl-3">
//                                 <div className="space-y-7">
//                                     {dashboardStats.activityLog.length > 0 ? (
//                                         dashboardStats.activityLog.map((item, index) => (
//                                             <div className="flex" key={item.id || index}>
//                                                 <div className={`relative z-10 shrink-0 ${index < dashboardStats.activityLog.length - 1 ? 'before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30' : ''} ltr:mr-2 rtl:ml-2`}>
//                                                     <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.color || 'bg-gray-500 text-white'}`}>
//                                                         {item.icon}
//                                                     </div>
//                                                 </div>
//                                                 <div>
//                                                     <h5 className="font-semibold dark:text-white-light">{item.description}</h5>
//                                                     <p className="text-xs text-white-dark">{format(item.date, 'dd MMM, yyyy HH:mm')}</p>
//                                                 </div>
//                                             </div>
//                                         ))
//                                     ) : (
//                                         <div className="text-center text-gray-500 py-10">No recent activity found.</div>
//                                     )}
//                                 </div>
//                             </PerfectScrollbar>
//                         </div>
//                     </div>

//                     {/* Leads by Source & Small KPIs Row */}
//                     <div className="mb-6 grid gap-6 sm:grid-cols-3 xl:grid-cols-5">
//                         {/* Leads by Source */}
//                         <div className="panel h-full sm:col-span-3 xl:col-span-2">
//                             <div className="mb-5 flex items-start justify-between">
//                                 <h5 className="text-lg font-semibold dark:text-white-light">Leads by Source</h5>
//                             </div>
//                             <div className="flex flex-col space-y-5">
//                                 {dashboardStats.leadsBySource.length > 0 ? (
//                                     dashboardStats.leadsBySource.map((item) => {
//                                         let IconComponent = IconGlobe; // Default
//                                         let iconColorClass = 'bg-warning/10 text-warning dark:bg-warning dark:text-white-light';
//                                         let gradientClass = 'from-[#fe5f75] to-[#fc9842]';

//                                         if (item.source.toLowerCase().includes('facebook') || item.source.toLowerCase().includes('fb')) {
//                                             IconComponent = IconFacebook; iconColorClass = 'bg-primary/10 text-primary dark:bg-primary dark:text-white-light'; gradientClass = 'from-[#009ffd] to-[#2a2a72]';
//                                         } else if (item.source.toLowerCase().includes('organic') || item.source.toLowerCase().includes('manual')) {
//                                             IconComponent = IconThumbUp; iconColorClass = 'bg-success/10 text-success dark:bg-success dark:text-white-light'; gradientClass = 'from-[#00ab55] to-[#007b55]'; // Adjusted Organic color
//                                         } // Add more 'else if' for other specific sources (e.g., 'google', 'referral')

//                                         return (
//                                             <div className="flex items-center" key={item.source}>
//                                                 <div className="h-9 w-9 shrink-0">
//                                                     <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColorClass}`}>
//                                                         <IconComponent className="h-5 w-5" />
//                                                     </div>
//                                                 </div>
//                                                 <div className="w-full flex-initial px-3">
//                                                     <div className="w-summary-info mb-1 flex justify-between font-semibold text-white-dark">
//                                                         <h6 className="capitalize">{item.source} ({item.count})</h6>
//                                                         <p className="text-xs ltr:ml-auto rtl:mr-auto">{item.percentage}%</p>
//                                                     </div>
//                                                     <div>
//                                                         <div className="h-5 w-full overflow-hidden rounded-full bg-dark-light p-1 shadow-3xl dark:bg-dark-light/10 dark:shadow-none">
//                                                             <div className={`relative h-full w-full rounded-full bg-gradient-to-r ${gradientClass} before:absolute before:inset-y-0 before:m-auto before:h-2 before:w-2 before:rounded-full before:bg-white ltr:before:right-0.5 rtl:before:left-0.5`} style={{ width: `${item.percentage}%` }} ></div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         );
//                                     })
//                                 ) : (
//                                     <div className="text-center text-gray-500 py-10">No lead source data available.</div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Small KPI Panel 1: Total Leads */}
//                         <div className="panel h-full p-0">
//                             <div className="flex p-5">
//                                 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary dark:text-white-light">
//                                     <IconUsersGroup className="h-5 w-5" />
//                                 </div>
//                                 <div className="font-semibold ltr:ml-3 rtl:mr-3">
//                                     <p className="text-xl dark:text-white-light">{formatStatNumber(dashboardStats.totalLeads)}</p>
//                                     <h5 className="text-xs text-[#506690]">Total Leads</h5>
//                                 </div>
//                             </div>
//                             {/* Removed chart placeholder */}
//                         </div>

//                         {/* Small KPI Panel 2: Conversions */}
//                         <div className="panel h-full p-0">
//                             <div className="flex p-5">
//                                 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success dark:bg-success dark:text-white-light">
//                                     <IconSquareCheck className="h-5 w-5" />
//                                 </div>
//                                 <div className="font-semibold ltr:ml-3 rtl:mr-3">
//                                     <p className="text-xl dark:text-white-light">{formatStatNumber(dashboardStats.customerConversions)}</p>
//                                     <h5 className="text-xs text-[#506690]">Conversions</h5>
//                                 </div>
//                             </div>
//                             {/* Removed chart placeholder */}
//                         </div>

//                         {/* Small KPI Panel 3: Conversion Rate */}
//                         <div className="panel h-full p-0">
//                             <div className="flex p-5">
//                                 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning dark:bg-warning dark:text-white-light">
//                                     <IconTrendingUp className="h-5 w-5" />
//                                 </div>
//                                 <div className="font-semibold ltr:ml-3 rtl:mr-3">
//                                     <p className="text-xl dark:text-white-light">{dashboardStats.leadConversionRate}%</p>
//                                     <h5 className="text-xs text-[#506690]">Conversion Rate</h5>
//                                 </div>
//                             </div>
//                             {/* Removed chart placeholder */}
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default ComponentsDashboardAnalytics;

'use client';

import React, { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
// Removed API fetching imports: axios, getAuth
import { format, parseISO, startOfMonth, endOfMonth, subMonths, getMonth, getYear, isValid } from 'date-fns';
import PerfectScrollbar from 'react-perfect-scrollbar';

// Local Components/Icons (Ensure paths are correct)
import Dropdown from '@/components/dropdown';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconChatDots from '@/components/icon/icon-chat-dots';
import IconChecks from '@/components/icon/icon-checks';
import IconClock from '@/components/icon/icon-clock';
import IconFile from '@/components/icon/icon-file';
import IconGlobe from '@/components/icon/icon-globe';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconLink from '@/components/icon/icon-link';
import IconMail from '@/components/icon/icon-mail';
import IconPlus from '@/components/icon/icon-plus';
import IconServer from '@/components/icon/icon-server';
import IconSquareCheck from '@/components/icon/icon-square-check';
import IconThumbUp from '@/components/icon/icon-thumb-up';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconFacebook from '../icon/icon-facebook'; // Ensure path is correct
import IconAlertCircle from '../icon/icon-award'; // Using for missed appointments

import { IRootState } from '@/store';

// Dynamically import ApexCharts
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Define prop types more explicitly if possible
interface Lead {
    id: string | number;
    created_at?: string; // Make optional as it might be missing/invalid
    full_name?: string;
    source?: string;
    // Add other relevant lead properties
}

interface Customer {
    id: string | number;
    created_at?: string;
    full_name?: string;
    // Add other relevant customer properties
}

interface Appointment {
    id: string | number;
    appointment_date?: string;
    status?: string;
    appointment_type?: string;
    // Add other relevant appointment properties
}

// Define props for the component
interface ComponentsDashboardAnalyticsProps {
    leads: Lead[];
    customers: Customer[];
    appointments: Appointment[];
    // users prop is removed as it wasn't used in the processing logic shown
}

const ComponentsDashboardAnalytics = ({ leads = [], customers = [], appointments = [] }: ComponentsDashboardAnalyticsProps) => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    // Removed loading and error state related to fetching data internally
    const [dashboardStats, setDashboardStats] = useState({
        leadsPerMonth: { series: [] as { name: string; data: number[] }[], categories: [] as string[] },
        activityLog: [] as any[], // Keep 'any' or define a specific ActivityLogItem interface
        leadsBySource: [] as { source: string; count: number; percentage: string }[],
        totalLeads: 0,
        customerConversions: 0,
        leadConversionRate: '0.0',
    });

    // --- Base Chart Options (Remains the same) ---
    const baseBarChartOptions: any = useMemo(() => ({ // Wrap in useMemo for performance
        chart: {
            type: 'bar',
            fontFamily: 'Nunito, sans-serif',
            toolbar: { show: false },
            redrawOnWindowResize: true,
            redrawOnParentResize: true,
        },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['transparent'] },
        colors: ['#5c1ac3', '#ffbb44'],
        dropShadow: { enabled: true, blur: 3, color: '#515365', opacity: 0.4 },
        plotOptions: {
            bar: { horizontal: false, columnWidth: '55%', borderRadius: 8, borderRadiusApplication: 'end' },
        },
        legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '14px', itemMargin: { horizontal: 8, vertical: 8 } },
        grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed', padding: { left: 20, right: 20 } },
        xaxis: {
            axisBorder: { show: true, color: isDark ? '#3b3f5c' : '#e0e6ed' },
            labels: {
                style: { colors: isDark ? '#e0e6ed' : '#3b3f5c' }
            }
        },
        yaxis: {
            tickAmount: 6,
            opposite: isRtl,
            labels: {
                offsetX: isRtl ? -10 : 0,
                style: { colors: isDark ? '#e0e6ed' : '#3b3f5c' }
            },
        },
        fill: { type: 'gradient', gradient: { shade: isDark ? 'dark' : 'light', type: 'vertical', shadeIntensity: 0.3, inverseColors: false, opacityFrom: 1, opacityTo: 0.8, stops: [0, 100] } },
        tooltip: { marker: { show: true }, theme: isDark ? 'dark' : 'light' },
    }), [isDark, isRtl]); // Depend on theme settings

    // --- Data Processing Logic ---
    // This useEffect now processes the props when they change
    useEffect(() => {
        // Ensure props are arrays before processing
        const safeLeads = Array.isArray(leads) ? leads : [];
        const safeCustomers = Array.isArray(customers) ? customers : [];
        const safeAppointments = Array.isArray(appointments) ? appointments : [];

        // --- Process Data (Moved from fetchDashboardData) ---
        const now = new Date();

        // 1. Leads Per Month (Last 12 Months)
        const monthlyLeadCounts: { [key: string]: number } = {};
        const monthLabels: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const targetMonthDate = subMonths(now, i);
            const monthKey = format(targetMonthDate, 'yyyy-MM');
            const monthLabel = format(targetMonthDate, 'MMM');
            monthlyLeadCounts[monthKey] = 0;
            monthLabels.push(monthLabel);
        }

        safeLeads.forEach((lead) => {
            try {
                if (lead.created_at) {
                    const leadDate = parseISO(lead.created_at);
                    if (isValid(leadDate)) {
                        const monthKey = format(leadDate, 'yyyy-MM');
                        if (monthlyLeadCounts.hasOwnProperty(monthKey)) {
                            monthlyLeadCounts[monthKey]++;
                        }
                    } else {
                        // console.warn("Invalid lead created_at date:", lead.created_at);
                    }
                }
            } catch (e) { /* console.warn("Error parsing lead date:", lead.created_at, e); */ }
        });
        const leadsPerMonthData = Object.values(monthlyLeadCounts);

        // 2. Activity Log
        let activityLogItems: any[] = [];
        // Recent Leads (use safeLeads)
        safeLeads.slice(0, 10).forEach((lead) => {
             try {
                    const date = lead.created_at ? parseISO(lead.created_at) : null;
                    if (date && isValid(date)) {
                        activityLogItems.push({
                            id: `l-${lead.id}`, type: 'lead_created', date: date,
                            description: `New Lead: ${lead.full_name || 'N/A'} (${lead.source || 'Unknown'})`,
                            icon: <IconPlus className="h-4 w-4" />, color: 'bg-secondary text-white shadow-secondary',
                        });
                    }
                } catch (e) { /* console.warn("Err processing lead log:", lead.id) */ }
        });
        // Recent Conversions (use safeCustomers)
        safeCustomers.slice(0, 10).forEach((cust) => {
            try {
                    const date = cust.created_at ? parseISO(cust.created_at) : null;
                     if (date && isValid(date)) {
                        activityLogItems.push({
                            id: `c-${cust.id}`, type: 'conversion', date: date,
                            description: `Converted: ${cust.full_name || 'N/A'}`, // Simpler desc
                            icon: <IconSquareCheck className="h-4 w-4" />, color: 'bg-success text-white shadow-success',
                        });
                    }
                } catch (e) { /* console.warn("Err processing customer log:", cust.id) */ }
        });
        // Recent Appointments (use safeAppointments)
        safeAppointments.slice(0, 10).forEach((appt) => {
             try {
                    const date = appt.appointment_date ? parseISO(appt.appointment_date) : null;
                     if (date && isValid(date)) {
                        let desc = ''; let icon = <IconClock className="h-4 w-4" />; let color = 'bg-primary text-white';
                        const status = appt.status?.toLowerCase() || 'unknown';

                        if (status === 'completed') { desc = `Appt Completed: ${appt.appointment_type || 'General'}`; icon = <IconChecks className="h-4 w-4" />; color = 'bg-success text-white'; }
                        else if (status === 'missed') { desc = `Appt Missed: ${appt.appointment_type || 'General'}`; icon = <IconAlertCircle className="h-4 w-4" />; color = 'bg-danger text-white'; }
                        else if (status === 'scheduled') { desc = `Appt Scheduled: ${appt.appointment_type || 'General'}`; }
                        else { desc = `Appt (${status}): ${appt.appointment_type || 'General'}`; } // Handle other statuses

                        activityLogItems.push({
                            id: `a-${appt.id}`, type: `appointment_${status}`, date: date, description: desc, icon: icon, color: color,
                        });
                    }
                 } catch (e) { /* console.warn("Err processing appt log:", appt.id) */ }
        });

        // Sort activity log and limit
        activityLogItems.sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure date comparison works
        activityLogItems = activityLogItems.slice(0, 15); // Limit to 15 items

        // 3. Leads by Source (use safeLeads)
        const leadsBySourceCounts = safeLeads.reduce((acc: any, lead) => {
            const source = lead.source || "Unknown";
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});
        const totalLeadsCount = safeLeads.length;
        const leadsBySourceProcessed = Object.entries(leadsBySourceCounts).map(([source, count]) => ({
            source: source,
            count: count as number,
            percentage: totalLeadsCount > 0 ? (((count as number) / totalLeadsCount) * 100).toFixed(1) : '0.0',
        })).sort((a, b) => b.count - a.count);

        // 4. KPIs (use safeLeads, safeCustomers)
        const customerConversionsCount = safeCustomers.length;
        const leadConversionRateCalc = totalLeadsCount > 0 ? ((customerConversionsCount / totalLeadsCount) * 100).toFixed(1) : '0.0';

        // Set State with processed data
        setDashboardStats({
            leadsPerMonth: { series: [{ name: 'Leads', data: leadsPerMonthData }], categories: monthLabels },
            activityLog: activityLogItems,
            leadsBySource: leadsBySourceProcessed,
            totalLeads: totalLeadsCount,
            customerConversions: customerConversionsCount,
            leadConversionRate: leadConversionRateCalc,
        });

    }, [leads, customers, appointments]); // Dependency array includes the props

    // Helper to format numbers (Remains the same)
    const formatStatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    // Set isMounted for chart rendering
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // --- Dynamic Chart Options ---
    const leadsPerMonthChartOptions = useMemo(() => ({ // Wrap in useMemo
        ...baseBarChartOptions,
        xaxis: {
            ...baseBarChartOptions.xaxis,
            categories: dashboardStats.leadsPerMonth.categories, // Use processed categories
        },
        colors: ['#4361ee'],
    }), [baseBarChartOptions, dashboardStats.leadsPerMonth.categories]); // Depend on base options and categories

    // --- Render ---
    // No more top-level loading/error check needed here, parent handles it.
    return (
        <div className="pt-5">
            {/* Leads Per Month & Activity Log Row */}
            <div className="mb-6 grid gap-6 lg:grid-cols-3">
                {/* Leads Per Month Chart */}
                <div className="panel h-full p-0 lg:col-span-2">
                    <div className="mb-5 flex items-start justify-between border-b border-white-light p-5 dark:border-[#1b2e4b]">
                        <h5 className="text-lg font-semibold dark:text-white-light">Leads Per Month (Last 12 Months)</h5>
                        {/* Optional: Refresh could trigger parent's fetch */}
                        {/* <div className="dropdown">...</div> */}
                    </div>
                    {isMounted && dashboardStats.leadsPerMonth?.series[0]?.data.length > 0 ? (
                        <ReactApexChart options={leadsPerMonthChartOptions} series={dashboardStats.leadsPerMonth.series} type="bar" height={360} width="100%" />
                    ) : (
                        <div className="flex h-[360px] items-center justify-center text-gray-500">No lead data available for this period.</div>
                    )}
                </div>

                {/* Activity Log */}
                <div className="panel h-full">
                     <div className="-mx-5 mb-5 flex items-start justify-between border-b border-white-light p-5 pt-0 dark:border-[#1b2e4b]">
                        <h5 className="text-lg font-semibold dark:text-white-light">Recent Activity</h5>
                         {/* <div className="dropdown">...</div> */}
                    </div>
                    <PerfectScrollbar className="perfect-scrollbar relative h-[360px] ltr:-mr-3 ltr:pr-3 rtl:-ml-3 rtl:pl-3">
                        <div className="space-y-7">
                             {dashboardStats.activityLog.length > 0 ? (
                                dashboardStats.activityLog.map((item, index) => (
                                    <div className="flex" key={item.id || index}>
                                        <div className={`relative z-10 shrink-0 ${index < dashboardStats.activityLog.length - 1 ? 'before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30' : ''} ltr:mr-2 rtl:ml-2`}>
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.color || 'bg-gray-500 text-white'}`}>
                                                {item.icon}
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-semibold dark:text-white-light">{item.description}</h5>
                                             {/* Check if item.date is valid before formatting */}
                                            <p className="text-xs text-white-dark">
                                                {item.date && isValid(item.date) ? format(item.date, 'dd MMM, yyyy HH:mm') : 'Invalid Date'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 py-10">No recent activity found.</div>
                            )}
                        </div>
                    </PerfectScrollbar>
                </div>
            </div>

            {/* Leads by Source & Small KPIs Row */}
            <div className="mb-6 grid gap-6 sm:grid-cols-3 xl:grid-cols-5">
                 {/* Leads by Source */}
                 <div className="panel h-full sm:col-span-3 xl:col-span-2">
                    <div className="mb-5 flex items-start justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">Leads by Source</h5>
                    </div>
                    <div className="flex flex-col space-y-5">
                        {dashboardStats.leadsBySource.length > 0 ? (
                            dashboardStats.leadsBySource.map((item) => {
                                let IconComponent = IconGlobe; // Default
                                let iconColorClass = 'bg-warning/10 text-warning dark:bg-warning dark:text-white-light';
                                let gradientClass = 'from-[#fe5f75] to-[#fc9842]';

                                // Consistent lowercase check
                                const sourceLower = item.source?.toLowerCase() || '';

                                if (sourceLower.includes('facebook') || sourceLower.includes('fb')) {
                                    IconComponent = IconFacebook; iconColorClass = 'bg-primary/10 text-primary dark:bg-primary dark:text-white-light'; gradientClass = 'from-[#009ffd] to-[#2a2a72]';
                                } else if (sourceLower.includes('organic') || sourceLower.includes('manual') || sourceLower.includes('referral')) {
                                    IconComponent = IconThumbUp; iconColorClass = 'bg-success/10 text-success dark:bg-success dark:text-white-light'; gradientClass = 'from-[#00ab55] to-[#007b55]';
                                } else if (sourceLower.includes('website') || sourceLower.includes('web')) {
                                     IconComponent = IconGlobe; iconColorClass = 'bg-info/10 text-info dark:bg-info dark:text-white-light'; gradientClass = 'from-[#2196f3] to-[#17c9f7]';
                                } // Add more specific source checks if needed

                                return (
                                    <div className="flex items-center" key={item.source}>
                                        <div className="h-9 w-9 shrink-0">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColorClass}`}>
                                                <IconComponent className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="w-full flex-initial px-3">
                                            <div className="w-summary-info mb-1 flex justify-between font-semibold text-white-dark">
                                                <h6 className="capitalize">{item.source || 'Unknown'} ({item.count})</h6>
                                                <p className="text-xs ltr:ml-auto rtl:mr-auto">{item.percentage}%</p>
                                            </div>
                                            <div>
                                                <div className="h-5 w-full overflow-hidden rounded-full bg-dark-light p-1 shadow-3xl dark:bg-dark-light/10 dark:shadow-none">
                                                    <div className={`relative h-full w-full rounded-full bg-gradient-to-r ${gradientClass} before:absolute before:inset-y-0 before:m-auto before:h-2 before:w-2 before:rounded-full before:bg-white ltr:before:right-0.5 rtl:before:left-0.5`} style={{ width: `${item.percentage}%` }} ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                             <div className="text-center text-gray-500 py-10">No lead source data available.</div>
                        )}
                    </div>
                </div>

                {/* Small KPI Panels (Data now comes from dashboardStats) */}
                <div className="panel h-full p-0">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary dark:text-white-light">
                            <IconUsersGroup className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-xl dark:text-white-light">{formatStatNumber(dashboardStats.totalLeads)}</p>
                            <h5 className="text-xs text-[#506690]">Total Leads</h5>
                        </div>
                    </div>
                </div>
                <div className="panel h-full p-0">
                   <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success dark:bg-success dark:text-white-light">
                            <IconSquareCheck className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-xl dark:text-white-light">{formatStatNumber(dashboardStats.customerConversions)}</p>
                            <h5 className="text-xs text-[#506690]">Conversions</h5>
                        </div>
                    </div>
                </div>
                <div className="panel h-full p-0">
                    <div className="flex p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning dark:bg-warning dark:text-white-light">
                            <IconTrendingUp className="h-5 w-5" />
                        </div>
                        <div className="font-semibold ltr:ml-3 rtl:mr-3">
                            <p className="text-xl dark:text-white-light">{dashboardStats.leadConversionRate}%</p>
                            <h5 className="text-xs text-[#506690]">Conversion Rate</h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentsDashboardAnalytics;