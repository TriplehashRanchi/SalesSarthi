'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, LoadingOverlay, Alert, Title, Modal, Group, Button, Select, Grid, Text, Stack, Avatar, Badge, Blockquote, SegmentedControl, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconCalendarEvent, IconClock, IconCircleCheck, IconListCheck, IconPencil, IconCalendar, IconList } from '@tabler/icons-react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

import FollowupListView, { relativeLabel } from './FollowupListView';
import FollowupForm from '@/components/forms/followupform'; // Adjust path if needed
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// The follow-up view the user last picked is remembered per user, so the page reopens the same way.
// Keeps the Calendar/List switch and the Add button exactly the same height.
const HEADER_CONTROL_HEIGHT = 42;
const VIEWS = ['dayGridMonth', 'timeGridWeek'];
const modeKey = (userId) => `followups_mode_${userId}`;
const DEFAULT_VIEW = 'dayGridMonth';
const viewKey = (userId) => `followups_default_view_${userId}`;
const readSavedView = (userId) => {
    if (typeof window === 'undefined' || !userId) return DEFAULT_VIEW;
    const saved = window.localStorage.getItem(viewKey(userId));
    return VIEWS.includes(saved) ? saved : DEFAULT_VIEW;
};

// --- Helper Functions (Fully Expanded) ---

const getAuthHeader = async () => {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('User not authenticated.');
    const token = await auth.currentUser.getIdToken(true);
    return { headers: { Authorization: `Bearer ${token}` } };
};

const useFollowupData = (events) => {
    return useMemo(() => {
        if (!events || events.length === 0) {
            return {
                stats: { total: 0, pending: 0, completed: 0, dueToday: 0 },
                upcoming: [],
            };
        }
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));
        let pending = 0,
            completed = 0,
            dueToday = 0;
        const upcoming = [];
        events.forEach((event) => {
            const eventStart = new Date(event.start);
            const status = event.extendedProps.status;
            if (status === 'Completed') {
                completed++;
            } else {
                pending++;
                if (eventStart >= new Date()) {
                    // Make sure to pass all needed props for the upcoming list
                    upcoming.push({
                        id: event.id,
                        title: event.title,
                        start: event.start,
                        backgroundColor: event.backgroundColor,
                        creatorName: event.extendedProps.creatorName,
                        status: status,
                        raw: event,
                    });
                }
            }
            if (eventStart >= todayStart && eventStart <= todayEnd) {
                dueToday++;
            }
        });
        upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));
        return {
            stats: { total: events.length, pending, completed, dueToday },
            upcoming: upcoming.slice(0, 8),
        };
    }, [events]);
};

const STAT_TINTS = {
    orange: { card: 'bg-orange-50 border-orange-300', icon: 'text-orange-500', value: 'text-orange-600' },
    green: { card: 'bg-green-50 border-green-300', icon: 'text-green-600', value: 'text-green-700' },
    blue: { card: 'bg-blue-50 border-blue-300', icon: 'text-blue-600', value: 'text-blue-700' },
};

function StatCard({ title, value, icon, color = 'blue', hint }) {
    const t = STAT_TINTS[color] || STAT_TINTS.blue;
    return (
        <div className={`flex items-center gap-4 rounded-2xl border p-5 max-md:gap-3 max-md:p-3 ${t.card}`}>
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm max-md:h-9 max-md:w-9 ${t.icon}`}>{icon}</div>
            <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</div>
                <div className={`text-3xl font-bold leading-tight max-md:text-2xl ${t.value}`}>{value}</div>
                {hint && <div className="truncate text-xs text-gray-500 max-md:hidden">{hint}</div>}
            </div>
        </div>
    );
}

// --- Main Component ---
export default function FollowupsCalendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [allLeads, setAllLeads] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [targetType, setTargetType] = useState('lead'); // who a new follow-up is for: 'lead' | 'customer'
    const [selectedLeadForNewFollowup, setSelectedLeadForNewFollowup] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(() => new Date().toLocaleDateString('en-CA')); // phones: the day shown under the calendar

    const { stats, upcoming } = useFollowupData(events);

    console.log(selectedEvent);

    const { user } = useAuth();

    // Phones get a simpler calendar toolbar and a full-width header; follows rotation and window resizes.
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const update = () => setNarrow(window.innerWidth < 640);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const calendarRef = useRef(null);
    const [currentView, setCurrentView] = useState(DEFAULT_VIEW);
    const [mode, setMode] = useState('calendar'); // 'calendar' | 'list'
    const userId = user?.uid;

    // Load the saved choice once we know who the user is.
    useEffect(() => {
        if (!userId) return;
        const saved = readSavedView(userId);
        setCurrentView(saved);
        calendarRef.current?.getApi().changeView(saved);
        try {
            const m = window.localStorage.getItem(modeKey(userId));
            if (m === 'list' || m === 'calendar') setMode(m);
        } catch {}
    }, [userId]);

    const rememberView = (view) => {
        setCurrentView(view);
        if (userId) window.localStorage.setItem(viewKey(userId), view);
    };

    // Calendar / List toggle above the calendar
    const handleViewToggle = (next) => {
        setMode(next);
        try {
            if (userId) window.localStorage.setItem(modeKey(userId), next);
        } catch {}
    };

    // This is the new fetchData function
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const config = await getAuthHeader();

            // --- THIS IS THE ROLE-BASED LOGIC ---
            // Determine which API endpoint to call for leads based on the user's role.
            const leadsEndpoint = user.role === 'admin' ? `${API_URL}/api/leads/all` : `${API_URL}/api/users/leads`;

            // Fetch both follow-ups and the correct list of leads in parallel
            const customersEndpoint = user.role === 'admin' ? `${API_URL}/api/customers` : `${API_URL}/api/customers/user`;

            const [followupsResponse, leadsResponse, customersResponse] = await Promise.all([
                axios.get(`${API_URL}/api/followups/view/calendar`, config),
                axios.get(leadsEndpoint, config), // Use the dynamically determined endpoint
                axios.get(customersEndpoint, config).catch((err) => {
                    // Customers are optional here; don't break the whole page if they fail to load.
                    console.error('Failed to fetch customers:', err);
                    return { data: [] };
                }),
            ]);

            setAllCustomers((customersResponse.data || []).map((c) => ({ value: c.id.toString(), label: c.phone_number ? `${c.full_name} (${c.phone_number})` : c.full_name })));

            setEvents(followupsResponse.data);

            const formattedLeads = leadsResponse.data.filter((lead) => lead.lead_status !== 'Customer').map((lead) => ({ value: lead.id.toString(), label: lead.full_name }));
            setAllLeads(formattedLeads);
        } catch (err) {
            console.error('Failed to fetch page data:', err);
            setError(err.response?.data?.message || 'Could not load data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEventDetails = (eventData) => {
        setSelectedEvent(eventData);
        setIsEditing(false);
        setModalOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        openEventDetails({
            id: clickInfo.event.id,
            ...clickInfo.event.extendedProps,
            title: clickInfo.event.title,
            follow_up_date: clickInfo.event.startStr,
        });
    };

    // Follow-ups on the day picked in the phone calendar.
    const dayEvents = useMemo(
        () => events.filter((e) => new Date(e.start).toLocaleDateString('en-CA') === selectedDay).sort((a, b) => new Date(a.start) - new Date(b.start)),
        [events, selectedDay]
    );

    const handleDateClick = (arg) => {
        // On a phone's month view, tapping a day shows its follow-ups below the calendar instead of opening the form.
        if (narrow && arg.view.type === 'dayGridMonth') {
            setSelectedDay(arg.dateStr.slice(0, 10));
            return;
        }
        setSelectedDate(arg.dateStr);
        setSelectedEvent(null);
        setIsEditing(false);
        setModalOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedDate(new Date().toISOString());
        setSelectedEvent(null);
        setIsEditing(false);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedEvent(null);
        setSelectedDate(null);
        setSelectedLeadForNewFollowup(null);
        setTargetType('lead');
        setIsEditing(false);
    };

    const handleFormSuccess = () => {
        handleModalClose();
        fetchData();
    };

    return (
        <Box p="lg" className="max-md:!px-1 max-md:!py-2">
            <Group position="apart" mb="xl" className="max-md:!mb-4">
                <Title order={2} className="max-md:!text-xl">Follow-ups Dashboard</Title>
                {narrow && (
                    <Button color="blue" radius="xl" size="xs" leftIcon={<IconPlus size={14} />} onClick={handleAddNewClick}>
                        Add
                    </Button>
                )}
                <Group spacing="sm" align="center" sx={narrow ? { width: '100%' } : undefined}>
                    <SegmentedControl
                        color="blue"
                        radius="xl"
                        fullWidth={narrow}
                        sx={narrow ? { width: '100%' } : undefined}
                        styles={{
                            root: { height: narrow ? 38 : HEADER_CONTROL_HEIGHT, padding: 3 },
                            label: { height: (narrow ? 38 : HEADER_CONTROL_HEIGHT) - 6, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                        }}
                        value={mode}
                        onChange={handleViewToggle}
                        data={[
                            {
                                value: 'calendar',
                                label: (
                                    <Group spacing={6} position="center" noWrap>
                                        <IconCalendar size={16} />
                                        <span>Calendar</span>
                                    </Group>
                                ),
                            },
                            {
                                value: 'list',
                                label: (
                                    <Group spacing={6} position="center" noWrap>
                                        <IconList size={16} />
                                        <span>List</span>
                                    </Group>
                                ),
                            },
                        ]}
                    />
                    {!narrow && (
                        <Button color="blue" radius="xl" style={{ height: HEADER_CONTROL_HEIGHT }} leftIcon={<IconPlus size={16} />} onClick={handleAddNewClick}>
                            Add Follow-up
                        </Button>
                    )}
                </Group>
            </Group>

            <Grid gutter={narrow ? 'xs' : 'xl'} mb={narrow ? 'md' : 'xl'}>
                <Grid.Col span={6} md={6} lg={3}>
                    <StatCard hint="follow-ups for today" title="Due Today" value={stats.dueToday} icon={<IconCalendarEvent size={narrow ? 18 : 24} />} color="blue" />
                </Grid.Col>
                <Grid.Col span={6} md={6} lg={3}>
                    <StatCard hint="waiting to be done" title="Pending" value={stats.pending} icon={<IconClock size={narrow ? 18 : 24} />} color="orange" />
                </Grid.Col>
                <Grid.Col span={6} md={6} lg={3}>
                    <StatCard hint="done so far" title="Completed" value={stats.completed} icon={<IconCircleCheck size={narrow ? 18 : 24} />} color="green" />
                </Grid.Col>
                <Grid.Col span={6} md={6} lg={3}>
                    <StatCard hint="all follow-ups" title="Total" value={stats.total} icon={<IconListCheck size={narrow ? 18 : 24} />} color="blue" />
                </Grid.Col>
            </Grid>

            {mode === 'list' && !loading && !error && (
                <Paper withBorder={!narrow} radius="lg" p={narrow ? 0 : 'md'} style={narrow ? { background: 'transparent', border: 0 } : undefined}>
                    <FollowupListView events={events} onOpen={(e) => openEventDetails({ id: e.id, ...e.extendedProps, title: e.title, follow_up_date: e.start })} />
                </Paper>
            )}
            {mode === 'list' && loading && <LoadingOverlay visible overlayBlur={2} />}
            {mode === 'list' && error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red">{error}</Alert>
            )}

            <Grid gutter={narrow ? 0 : 'xl'} style={mode === 'list' ? { display: 'none' } : undefined}>
                <Grid.Col lg={8}>
                    <Paper
                        shadow={narrow ? undefined : 'sm'}
                        radius="lg"
                        p={narrow ? 0 : 'md'}
                        style={{ position: 'relative', height: '100%', ...(narrow ? { background: 'transparent' } : {}) }}
                        // Everything clickable in the calendar shows a pointer: days (add), events (open), toolbar buttons.
                        sx={{
                            '& .fc-daygrid-day, & .fc-timegrid-col, & .fc-timegrid-slot, & .fc-event, & .fc-list-event, & .fc-button, & .fc-daygrid-more-link': {
                                cursor: 'pointer',
                            },
                            // Calendar look, all sizes: soft grid, blue buttons, today highlighted, tidy event pills.
                            '& .fc .fc-toolbar-title': { fontWeight: 700 },
                            // Toolbar: round arrows, a soft "Today", and Month/Week as one switch.
                            '& .fc .fc-toolbar-chunk': { display: 'flex', alignItems: 'center', gap: 8 },
                            '& .fc .fc-button-group': { gap: 6 },
                            '& .fc .fc-button-primary': { background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 999, textTransform: 'none', fontWeight: 600, boxShadow: 'none !important', padding: '6px 14px', transition: 'all .15s' },
                            '& .fc .fc-button-group > .fc-button': { marginLeft: '0 !important', borderRadius: 999, width: 36, height: 36, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
                            '& .fc .fc-button-primary:hover': { background: '#f5f3ff', borderColor: '#c4b5fd', color: '#6d28d9' },
                            '& .fc .fc-today-button': { background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' },
                            '& .fc .fc-today-button:disabled': { opacity: 0.6, background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' },
                            ...(!narrow
                                ? {
                                      '& .fc .fc-header-toolbar .fc-toolbar-chunk:last-child': { background: '#f3f4f6', padding: 3, borderRadius: 999, gap: 0 },
                                      '& .fc .fc-button-group > .fc-dayGridMonth-button, & .fc .fc-button-group > .fc-timeGridWeek-button': { background: 'transparent', border: 'none', color: '#4b5563', width: 'auto', height: 32, padding: '0 16px', margin: 0 },
                                      '& .fc .fc-button-group > .fc-dayGridMonth-button:hover, & .fc .fc-button-group > .fc-timeGridWeek-button:hover': { background: '#e5e7eb', color: '#111827' },
                                      '& .fc .fc-button-group > .fc-dayGridMonth-button.fc-button-active, & .fc .fc-button-group > .fc-timeGridWeek-button.fc-button-active': { background: '#7c3aed !important', color: '#fff !important' },
                                  }
                                : {}),
                            '& .fc-theme-standard td, & .fc-theme-standard th, & .fc-theme-standard .fc-scrollgrid': { borderColor: '#eceef3' },
                            '& .fc .fc-col-header-cell': { background: 'transparent', padding: '6px 0' },
                            '& .fc .fc-col-header-cell-cushion': { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, textDecoration: 'none' },
                            '& .fc .fc-daygrid-day-number': { fontSize: 13, fontWeight: 500, padding: '6px 8px', textDecoration: 'none' },
                            '& .fc .fc-day-today': { background: '#f5f3ff !important' },
                            '& .fc .fc-day-today .fc-daygrid-day-number': { color: '#6d28d9', fontWeight: 700 },
                            '& .fc .fc-daygrid-day:hover': { background: '#faf9ff' },
                            '& .fc .fc-daygrid-event': { borderRadius: 6, padding: '1px 4px', fontSize: 12, fontWeight: 500 },
                            // Phone calendar: a clean grid, one coloured dot per follow-up, today and the picked day highlighted.
                            ...(narrow
                                ? {
                                      '& .fc-theme-standard td, & .fc-theme-standard th, & .fc-theme-standard .fc-scrollgrid': { borderColor: '#eceef3' },
                                      '& .fc .fc-col-header-cell-cushion': { fontSize: 12, fontWeight: 600, color: '#6b7280', padding: '6px 0', textDecoration: 'none' },
                                      '& .fc .fc-daygrid-day-frame': { minHeight: 54 },
                                      '& .fc .fc-daygrid-day-top': { justifyContent: 'center' },
                                      '& .fc .fc-daygrid-day-number': { fontSize: 13, padding: '4px 0', textDecoration: 'none' },
                                      '& .fc .fc-daygrid-day-events': { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, minHeight: 0, margin: 0 },
                                      '& .fc .fc-daygrid-event-harness': { display: 'inline-block' },
                                      '& .fc .fc-daygrid-dot-event': { padding: 0, minHeight: 0 },
                                      '& .fc .fc-daygrid-dot-event .fc-event-title, & .fc .fc-daygrid-dot-event .fc-event-time': { display: 'none' },
                                      '& .fc .fc-daygrid-event-dot': { margin: 0, borderWidth: 4 },
                                      '& .fc .fc-day-today': { background: '#f5f3ff !important' },
                                      '& .fc .fc-selected-day': { background: '#ede9fe !important' },
                                      '& .fc .fc-toolbar': { marginBottom: 8 },
                                      '& .fc .fc-button': { fontSize: 13 },
                                  }
                                : {}),
                        }}
                    >
                        <LoadingOverlay visible={loading} overlayBlur={2} />
                        {error && (
                            <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red">
                                {error}
                            </Alert>
                        )}
                        {!loading && !error && mode === 'calendar' && (
                            <>
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView={readSavedView(userId)}
                                datesSet={(info) => rememberView(info.view.type)}
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: narrow ? '' : 'dayGridMonth,timeGridWeek',
                                }}
                                buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
                                events={events}
                                eventClick={handleEventClick}
                                dateClick={handleDateClick}
                                height={narrow ? 'auto' : '70vh'}
                                dayHeaderFormat={narrow ? { weekday: 'narrow' } : undefined}
                                eventDisplay={narrow ? 'list-item' : 'auto'}
                                dayMaxEvents={narrow ? false : undefined}
                                dayCellClassNames={(arg) => (narrow && arg.date.toLocaleDateString('en-CA') === selectedDay ? ['fc-selected-day'] : [])}
                                eventDidMount={(info) => {
                                    if (narrow) {
                                        const dot = info.el.querySelector('.fc-daygrid-event-dot');
                                        if (dot && info.event.backgroundColor) dot.style.borderColor = info.event.backgroundColor;
                                    }
                                    const creatorName = info.event.extendedProps.creatorName;
                                    if (creatorName) {
                                        const creatorEl = document.createElement('div');
                                        creatorEl.style.fontSize = '0.75rem';
                                        creatorEl.style.opacity = '0.8';
                                        creatorEl.style.paddingLeft = '2px';
                                        creatorEl.style.fontWeight = '400';
                                        creatorEl.innerHTML = `by <strong>${creatorName}</strong>`;
                                        const titleContainer = info.el.querySelector('.fc-event-title-container');
                                        if (titleContainer) {
                                            titleContainer.appendChild(creatorEl);
                                        }
                                    }
                                }}
                                                                viewDidMount={() => {
                                    // This function runs every time the view changes (e.g., month, week, list)
                                    // We'll use it to adjust the font size based on the window width
                                    const adjustTitleFontSize = () => {
                                        const titleEl = document.querySelector('.fc-toolbar-title');
                                        if (titleEl) {
                                            if (window.innerWidth < 640) { // Same breakpoint as your toolbar buttons
                                                titleEl.style.fontSize = '1rem'; // Smaller font size for mobile
                                            } else {
                                                titleEl.style.fontSize = '1.25rem'; // Default font size for larger screens
                                            }
                                        }
                                    };

                                    // Adjust on initial mount
                                    adjustTitleFontSize();

                                    // Also adjust if the window is resized
                                    window.addEventListener('resize', adjustTitleFontSize);

                                    // Cleanup the event listener when the component unmounts
                                    return () => {
                                        window.removeEventListener('resize', adjustTitleFontSize);
                                    };
                                }}
                        
                            />
                            {narrow && currentView === 'dayGridMonth' && (
                                <div className="mt-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">{new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                                            <div className="text-xs text-gray-500">{dayEvents.length} {dayEvents.length === 1 ? 'follow-up' : 'follow-ups'}</div>
                                        </div>
                                        <Button
                                            size="xs"
                                            radius="xl"
                                            variant="light"
                                            color="blue"
                                            leftIcon={<IconPlus size={14} />}
                                            onClick={() => {
                                                setSelectedDate(`${selectedDay}T09:00:00`);
                                                setSelectedEvent(null);
                                                setIsEditing(false);
                                                setModalOpen(true);
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {dayEvents.length === 0 ? (
                                        <Text color="dimmed" size="sm" py="md">Nothing planned for this day.</Text>
                                    ) : (
                                        dayEvents.map((e) => (
                                            <div
                                                key={e.id}
                                                className="flex cursor-pointer items-center gap-3 border-b border-gray-200 py-3 last:border-b-0"
                                                onClick={() => openEventDetails({ id: e.id, ...e.extendedProps, title: e.title, follow_up_date: e.start })}
                                            >
                                                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: e.backgroundColor || '#7c3aed' }} />
                                                <div className="min-w-0 flex-1">
                                                    <Text weight={500} size="sm" lineClamp={1}>{e.title}</Text>
                                                    <Text size="xs" color="dimmed">
                                                        {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {e.extendedProps?.creatorName ? ` · by ${e.extendedProps.creatorName}` : ''}
                                                    </Text>
                                                </div>
                                                <Badge size="xs" color={e.extendedProps?.status === 'Completed' ? 'green' : 'orange'}>{e.extendedProps?.status}</Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            </>
                        )}
                    </Paper>
                </Grid.Col>

                <Grid.Col lg={4}>
                    <Paper withBorder={!narrow} p={narrow ? 0 : 'md'} radius="lg" style={{ height: '100%', ...(narrow ? { background: 'transparent', marginTop: 20 } : {}) }}>
                        <div className="mb-3 flex items-center justify-between">
                            <Title order={4}>Upcoming Follow-ups</Title>
                            {upcoming.length > 0 && <Badge color="blue" variant="light">{upcoming.length}</Badge>}
                        </div>
                        <div style={narrow ? undefined : { height: 'calc(70vh - 60px)', overflowY: 'auto' }}>
                            {upcoming.length > 0 ? (
                                upcoming.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-lg border-b border-gray-100 px-2 py-3 transition last:border-b-0 hover:bg-blue-50/60 dark:border-gray-700 dark:hover:bg-gray-700"
                                        onClick={() => {
                                            const e = events.find((x) => String(x.id) === String(event.id));
                                            if (e) openEventDetails({ id: e.id, ...e.extendedProps, title: e.title, follow_up_date: e.start });
                                        }}
                                    >
                                        <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: event.backgroundColor || '#7c3aed' }} />
                                        <div className="min-w-0 flex-1">
                                            <Text size="sm" weight={600} lineClamp={1}>{event.title}</Text>
                                            <Text color="dimmed" size="xs">
                                                {new Date(event.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {event.creatorName && <Text color="dimmed" size="xs">by {event.creatorName}</Text>}
                                        </div>
                                        <Badge size="xs" variant="light" color="blue" className="flex-shrink-0">{relativeLabel({ start: event.start, extendedProps: { status: event.status } })}</Badge>
                                    </div>
                                ))
                            ) : (
                                <Stack align="center" spacing={6} mt={40}>
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl dark:bg-gray-700">🗓️</div>
                                    <Text weight={600} size="sm">Nothing coming up</Text>
                                    <Text color="dimmed" size="xs" align="center">New follow-ups will appear here.</Text>
                                </Stack>
                            )}
                        </div>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Modal opened={modalOpen} onClose={handleModalClose} title={<Text weight={700} size="lg">{selectedEvent ? (isEditing ? 'Edit Follow-up' : 'Follow-up Details') : 'New Follow-up'}</Text>} centered={!narrow || (!!selectedEvent && !isEditing)} fullScreen={narrow && (isEditing || !selectedEvent)} radius="lg" size="md">
                {selectedEvent ? (
                    isEditing ? (
                        <FollowupForm leadId={selectedEvent.leadId} customerId={selectedEvent.customerId} existingFollowUp={selectedEvent} onFollowupChange={handleFormSuccess} onCancel={() => setIsEditing(false)} hideTitle />
                    ) : (
                        <Stack spacing="md">
                            <Text size="lg" weight={700}>
                                {selectedEvent.title}
                            </Text>
                            <Group>
                                <Badge color={selectedEvent.status === 'Completed' ? 'green' : 'orange'}>{selectedEvent.status}</Badge>
                                <Text color="dimmed">{new Date(selectedEvent.follow_up_date).toLocaleString()}</Text>
                            </Group>
                            {selectedEvent.notes && (
                                <Blockquote withBorder p="sm" radius="md">
                                    <Text size="sm">{selectedEvent.notes}</Text>
                                </Blockquote>
                            )}
                            <Text size="sm">
                                Created by: <strong>{selectedEvent.creatorName}</strong>
                            </Text>
                            <Group position="right" mt="md">
                                <Button variant="default" onClick={handleModalClose}>
                                    Close
                                </Button>
                                <Button leftIcon={<IconPencil size={16} />} onClick={() => setIsEditing(true)}>
                                    Edit
                                </Button>
                            </Group>
                        </Stack>
                    )
                ) : (
                    <Box>
                        <div className="mb-5 flex rounded-full bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup" aria-label="Follow-up is for">
                            {[
                                { label: 'Lead', value: 'lead' },
                                { label: 'Customer', value: 'customer' },
                            ].map((o) => {
                                const active = targetType === o.value;
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => {
                                            setTargetType(o.value);
                                            setSelectedLeadForNewFollowup(null);
                                        }}
                                        className={`h-8 flex-1 rounded-full text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'}`}
                                    >
                                        {o.label}
                                    </button>
                                );
                            })}
                        </div>
                        <Select
                            label={targetType === 'customer' ? 'Select a Customer' : 'Select a Lead'}
                            placeholder={targetType === 'customer' ? 'Choose which customer this follow-up is for' : 'Choose which lead this follow-up is for'}
                            data={targetType === 'customer' ? allCustomers : allLeads}
                            value={selectedLeadForNewFollowup}
                            onChange={setSelectedLeadForNewFollowup}
                            searchable
                            required
                            mb="lg"
                            nothingFound={targetType === 'customer' ? 'No customers found' : 'No leads found'}
                        />
                        {selectedLeadForNewFollowup && (
                            <FollowupForm
                key={`${targetType}-${selectedLeadForNewFollowup}`}
                leadId={targetType === 'lead' ? selectedLeadForNewFollowup : undefined}
                customerId={targetType === 'customer' ? selectedLeadForNewFollowup : undefined}
                existingFollowUp={null} // Pass null because we are NOT editing
                initialDate={selectedDate} // Pass the selected date via the new prop
                onFollowupChange={handleFormSuccess}
                onCancel={handleModalClose}
                hideTitle
            />
                        )}
                    </Box>
                )}
            </Modal>
        </Box>
    );
}
