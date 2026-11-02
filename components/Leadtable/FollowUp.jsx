'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, LoadingOverlay, Alert, Title, Modal, Group, Button, Select, Grid, Text, Stack, Avatar, Badge, Blockquote, SegmentedControl } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconCalendarEvent, IconClock, IconCircleCheck, IconListCheck, IconPencil, IconCalendar, IconList } from '@tabler/icons-react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

import FollowupForm from '@/components/forms/followupform'; // Adjust path if needed
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// The follow-up view the user last picked is remembered per user, so the page reopens the same way.
// Keeps the Calendar/List switch and the Add button exactly the same height.
const HEADER_CONTROL_HEIGHT = 42;
const VIEWS = ['dayGridMonth', 'timeGridWeek', 'listWeek'];
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
            upcoming: upcoming.slice(0, 5),
        };
    }, [events]);
};

function StatCard({ title, value, icon }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group position="apart">
                <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                    {title}
                </Text>
                {icon}
            </Group>
            <Text fz={32} fw={700} mt="md">
                {value}
            </Text>
        </Paper>
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
    const userId = user?.uid;

    // Load the saved choice once we know who the user is.
    useEffect(() => {
        if (!userId) return;
        const saved = readSavedView(userId);
        setCurrentView(saved);
        calendarRef.current?.getApi().changeView(saved);
    }, [userId]);

    const rememberView = (view) => {
        setCurrentView(view);
        if (userId) window.localStorage.setItem(viewKey(userId), view);
    };

    // Calendar / List toggle above the calendar
    const handleViewToggle = (mode) => {
        const next = mode === 'list' ? 'listWeek' : currentView === 'listWeek' ? DEFAULT_VIEW : currentView;
        calendarRef.current?.getApi().changeView(next);
        rememberView(next);
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

    const handleEventClick = (clickInfo) => {
        const eventData = {
            id: clickInfo.event.id,
            ...clickInfo.event.extendedProps,
            title: clickInfo.event.title,
            follow_up_date: clickInfo.event.startStr,
        };
        setSelectedEvent(eventData);
        setIsEditing(false);
        setModalOpen(true);
    };

    const handleDateClick = (arg) => {
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
        <Box p="lg">
            <Group position="apart" mb="xl">
                <Title order={2}>Follow-ups Dashboard</Title>
                <Group spacing="sm" align="center" grow={narrow} sx={narrow ? { width: '100%' } : undefined}>
                    <SegmentedControl
                        color="blue"
                        radius="md"
                        styles={{
                            root: { height: HEADER_CONTROL_HEIGHT, padding: 3 },
                            label: { height: HEADER_CONTROL_HEIGHT - 6, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                        }}
                        value={currentView === 'listWeek' ? 'list' : 'calendar'}
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
                    <Button radius="md" style={{ height: HEADER_CONTROL_HEIGHT }} leftIcon={<IconPlus size={16} />} onClick={handleAddNewClick}>
                        Add Follow-up
                    </Button>
                </Group>
            </Group>

            <Grid gutter="xl" mb="xl">
                <Grid.Col md={6} lg={3}>
                    <StatCard title="Due Today" value={stats.dueToday} icon={<IconCalendarEvent size={24} />} />
                </Grid.Col>
                <Grid.Col md={6} lg={3}>
                    <StatCard title="Pending" value={stats.pending} icon={<IconClock size={24} />} />
                </Grid.Col>
                <Grid.Col md={6} lg={3}>
                    <StatCard title="Completed" value={stats.completed} icon={<IconCircleCheck size={24} />} />
                </Grid.Col>
                <Grid.Col md={6} lg={3}>
                    <StatCard title="Total" value={stats.total} icon={<IconListCheck size={24} />} />
                </Grid.Col>
            </Grid>

            <Grid gutter="xl">
                <Grid.Col lg={8}>
                    <Paper
                        shadow="md"
                        radius="md"
                        p="md"
                        style={{ position: 'relative', height: '100%' }}
                        // Everything clickable in the calendar shows a pointer: days (add), events (open), toolbar buttons.
                        sx={{
                            '& .fc-daygrid-day, & .fc-timegrid-col, & .fc-timegrid-slot, & .fc-event, & .fc-list-event, & .fc-button, & .fc-daygrid-more-link': {
                                cursor: 'pointer',
                            },
                        }}
                    >
                        <LoadingOverlay visible={loading} overlayBlur={2} />
                        {error && (
                            <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red">
                                {error}
                            </Alert>
                        )}
                        {!loading && !error && (
                            <>
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                                initialView={readSavedView(userId)}
                                datesSet={(info) => rememberView(info.view.type)}
                                headerToolbar={{
                                    left: 'prev,next',
                                    center: 'title',
                                    right: narrow ? '' : 'dayGridMonth,timeGridWeek',
                                }}
                                events={events}
                                eventClick={handleEventClick}
                                dateClick={handleDateClick}
                                height="70vh"
                                eventDidMount={(info) => {
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
                                                titleEl.style.fontSize = '0.8rem'; // Smaller font size for mobile
                                            } else {
                                                titleEl.style.fontSize = '1.75rem'; // Default font size for larger screens
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
                            </>
                        )}
                    </Paper>
                </Grid.Col>

                <Grid.Col lg={4}>
                    <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
                        <Title order={4} mb="md">
                            Upcoming Follow-ups
                        </Title>
                        <div style={{ height: 'calc(70vh - 60px)', overflowY: 'auto' }}>
                            <Stack spacing="sm">
                                {upcoming.length > 0 ? (
                                    upcoming.map((event) => (
                                        <Paper key={event.id} withBorder p="xs" radius="sm">
                                            <Group noWrap>
                                                <Avatar color={event.backgroundColor} radius="xl" size="md">
                                                    <IconClock size={18} />
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Text size="sm" weight={500} lineClamp={1}>
                                                        {event.title}
                                                    </Text>
                                                    <Text color="dimmed" size="xs">
                                                        {new Date(event.start).toLocaleString()}
                                                    </Text>
                                                    <Text color="dimmed" size="xs">
                                                        by <strong>{event.creatorName}</strong>
                                                    </Text>
                                                </Box>
                                            </Group>
                                        </Paper>
                                    ))
                                ) : (
                                    <Text color="dimmed" size="sm" align="center" mt="lg">
                                        No upcoming follow-ups.
                                    </Text>
                                )}
                            </Stack>
                        </div>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Modal opened={modalOpen} onClose={handleModalClose} title={selectedEvent ? (isEditing ? 'Edit Follow-up' : 'Follow-up Details') : 'Create New Follow-up'} centered size="md">
                {selectedEvent ? (
                    isEditing ? (
                        <FollowupForm leadId={selectedEvent.leadId} customerId={selectedEvent.customerId} existingFollowUp={selectedEvent} onFollowupChange={handleFormSuccess} onCancel={() => setIsEditing(false)} />
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
                        <SegmentedControl
                            fullWidth
                            mb="md"
                            value={targetType}
                            onChange={(v) => {
                                setTargetType(v);
                                setSelectedLeadForNewFollowup(null);
                            }}
                            data={[
                                { label: 'Lead', value: 'lead' },
                                { label: 'Customer', value: 'customer' },
                            ]}
                        />
                        <Select
                            label={targetType === 'customer' ? 'Select a Customer' : 'Select a Lead'}
                            placeholder={targetType === 'customer' ? 'Choose which customer this follow-up is for' : 'Choose which lead this follow-up is for'}
                            data={targetType === 'customer' ? allCustomers : allLeads}
                            value={selectedLeadForNewFollowup}
                            onChange={setSelectedLeadForNewFollowup}
                            searchable
                            required
                            mb="md"
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
            />
                        )}
                    </Box>
                )}
            </Modal>
        </Box>
    );
}
