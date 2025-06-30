'use client';

import { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, LoadingOverlay, Alert, Title, Modal, Group, Button, Select, Grid, Text, Stack, Avatar, ScrollArea, Badge, Blockquote } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconCalendarEvent, IconClock, IconCircleCheck, IconListCheck, IconPencil } from '@tabler/icons-react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

import FollowupForm from '@/components/forms/followupform'; // Adjust path if needed
import { useAuth } from '@/context/AuthContext';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        let pending = 0, completed = 0, dueToday = 0;
        const upcoming = [];
        events.forEach(event => {
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
                <Text size="xs" color="dimmed" tt="uppercase" fw={700}>{title}</Text>
                {icon}
            </Group>
            <Text fz={32} fw={700} mt="md">{value}</Text>
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
    const [selectedLeadForNewFollowup, setSelectedLeadForNewFollowup] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const { stats, upcoming } = useFollowupData(events);

    console.log(selectedEvent)

    const {user} = useAuth();

// This is the new fetchData function
const fetchData = async () => {
    try {
        setLoading(true);
        setError(null);
        const config = await getAuthHeader();

        // --- THIS IS THE ROLE-BASED LOGIC ---
        // Determine which API endpoint to call for leads based on the user's role.
        const leadsEndpoint = user.role === 'admin' 
            ? `${API_URL}/api/leads/all` 
            : `${API_URL}/api/users/leads`;

        // Fetch both follow-ups and the correct list of leads in parallel
        const [followupsResponse, leadsResponse] = await Promise.all([
            axios.get(`${API_URL}/api/followups/view/calendar`, config),
            axios.get(leadsEndpoint, config) // Use the dynamically determined endpoint
        ]);

        setEvents(followupsResponse.data);
        
        const formattedLeads = leadsResponse.data
            .filter(lead => lead.lead_status !== 'Customer')
            .map(lead => ({ value: lead.id.toString(), label: lead.full_name }));
        setAllLeads(formattedLeads);

    } catch (err) {
        console.error("Failed to fetch page data:", err);
        setError(err.response?.data?.message || "Could not load data.");
    } finally {
        setLoading(false);
    }
};

    useEffect(() => { fetchData(); }, []);

    const handleEventClick = (clickInfo) => {
        const eventData = {
            id: clickInfo.event.id,
            ...clickInfo.event.extendedProps,
            title: clickInfo.event.title,
            follow_up_date: clickInfo.event.startStr
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
                <Button leftIcon={<IconPlus size={16} />} onClick={handleAddNewClick}>
                    Add Follow-up
                </Button>
            </Group>

            <Grid gutter="xl" mb="xl">
                <Grid.Col md={6} lg={3}><StatCard title="Due Today" value={stats.dueToday} icon={<IconCalendarEvent size={24} />} /></Grid.Col>
                <Grid.Col md={6} lg={3}><StatCard title="Pending" value={stats.pending} icon={<IconClock size={24} />} /></Grid.Col>
                <Grid.Col md={6} lg={3}><StatCard title="Completed" value={stats.completed} icon={<IconCircleCheck size={24} />} /></Grid.Col>
                <Grid.Col md={6} lg={3}><StatCard title="Total" value={stats.total} icon={<IconListCheck size={24} />} /></Grid.Col>
            </Grid>
            
            <Grid gutter="xl">
                <Grid.Col lg={8}>
                    <Paper shadow="md" radius="md" p="md" style={{ position: 'relative', height: '100%' }}>
                        <LoadingOverlay visible={loading} overlayBlur={2} />
                        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red">{error}</Alert>}
                        {!loading && !error && (
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,listWeek'
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
                            />
                        )}
                    </Paper>
                </Grid.Col>

                <Grid.Col lg={4}>
                    <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
                        <Title order={4} mb="md">Upcoming Follow-ups</Title>
                        <ScrollArea style={{ height: 'calc(70vh - 60px)' }}>
                            <Stack spacing="sm">
                                {upcoming.length > 0 ? upcoming.map(event => (
                                    <Paper key={event.id} withBorder p="xs" radius="sm">
                                        <Group noWrap>
                                            <Avatar color={event.backgroundColor} radius="xl" size="md">
                                                <IconClock size={18} />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Text size="sm" weight={500} lineClamp={1}>{event.title}</Text>
                                                <Text color="dimmed" size="xs">{new Date(event.start).toLocaleString()}</Text>
                                                <Text color="dimmed" size="xs">by <strong>{event.creatorName}</strong></Text>
                                            </Box>
                                        </Group>
                                    </Paper>
                                )) : (
                                    <Text color="dimmed" size="sm" align="center" mt="lg">No upcoming follow-ups.</Text>
                                )}
                            </Stack>
                        </ScrollArea>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Modal
                opened={modalOpen}
                onClose={handleModalClose}
                title={selectedEvent ? (isEditing ? "Edit Follow-up" : "Follow-up Details") : "Create New Follow-up"}
                centered
                size="md"
            >
                {selectedEvent ? (
                    isEditing ? (
                        <FollowupForm
                            leadId={selectedEvent.leadId}
                            existingFollowUp={selectedEvent}
                            onFollowupChange={handleFormSuccess}
                            onCancel={() => setIsEditing(false)}
                        />
                    ) : (
                        <Stack spacing="md">
                            <Text size="lg" weight={700}>{selectedEvent.title}</Text>
                            <Group>
                                <Badge color={selectedEvent.status === 'Completed' ? 'green' : 'orange'}>
                                    {selectedEvent.status}
                                </Badge>
                                <Text color="dimmed">{new Date(selectedEvent.follow_up_date).toLocaleString()}</Text>
                            </Group>
                            {selectedEvent.notes && (
                                <Blockquote withBorder p="sm" radius="md">
                                    <Text size="sm">{selectedEvent.notes}</Text>
                                </Blockquote>
                            )}
                            <Text size="sm">Created by: <strong>{selectedEvent.creatorName}</strong></Text>
                            <Group position="right" mt="md">
                                <Button variant="default" onClick={handleModalClose}>Close</Button>
                                <Button leftIcon={<IconPencil size={16} />} onClick={() => setIsEditing(true)}>
                                    Edit
                                </Button>
                            </Group>
                        </Stack>
                    )
                ) : (
                    <Box>
                        <Select
                            label="Select a Lead"
                            placeholder="Choose which lead this follow-up is for"
                            data={allLeads}
                            value={selectedLeadForNewFollowup}
                            onChange={setSelectedLeadForNewFollowup}
                            searchable
                            required
                            mb="md"
                        />
                        {selectedLeadForNewFollowup && (
                            <FollowupForm
                                leadId={selectedLeadForNewFollowup}
                                existingFollowUp={{ follow_up_date: selectedDate }}
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