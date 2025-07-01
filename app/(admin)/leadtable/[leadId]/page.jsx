'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { Avatar, Badge, Timeline, Group, Text, ActionIcon, Paper, Stack, Divider, Title, Button, Center, Loader, Box } from '@mantine/core';
import { 
    IconArrowLeft, IconBrandWhatsapp, IconCalendar, IconMail, IconMessageCircle, IconPhone, IconSend2, 
    IconNote, IconBuildingStore, IconUser, IconCategory, IconLink, IconReceipt2 
} from '@tabler/icons-react';

// Reusable component for displaying each piece of information
const InfoSection = ({ label, children, icon }) => {
    // If the child is null, empty, or 'N/A', don't render the section
    if (!children || children === 'N/A') return null;
    
    return (
        <Box>
            <Group spacing="xs" mb={4}>
                {icon && <Text c="dimmed">{icon}</Text>}
                <Text size="xs" transform="uppercase" c="dimmed" fw={700}>{label}</Text>
            </Group>
            <Text size="sm" pl={icon ? 28 : 0}>{children}</Text>
        </Box>
    );
};

// Helper functions
const formatCurrency = (value) => {
    if (!value || isNaN(value)) return null;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const LeadDetailPage = ({ params }) => {
    const { leadId } = params;
    const router = useRouter();
    const [lead, setLead] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (!leadId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) throw new Error('Authentication required.');
                const token = await user.getIdToken();
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const [leadRes, timelineRes] = await Promise.all([
                    axios.get(`${API_URL}/api/leads/${leadId}`, config),
                    axios.get(`${API_URL}/api/followups/${leadId}`, config)
                ]);

                setLead(leadRes.data);
                setTimeline(timelineRes.data || []);
            } catch (err) {
                setError(err.message || 'Failed to load data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [leadId]);

    const timelineIcons = {
        'Meeting': <IconCalendar size={16} />,
        'Message': <IconMessageCircle size={16} />,
        'WhatsApp': <IconBrandWhatsapp size={16} />,
        'default': <IconNote size={16} />
    };

    if (loading) return <Center h="100vh"><Loader /></Center>;
    if (error) return <Center h="100vh"><Text color="red">{error}</Text></Center>;
    if (!lead) return <Center h="100vh"><Text>Lead not found.</Text></Center>;

    return (
        <div className="dark:bg-gray-800 min-h-screen py-2">
            <div className="max-w-md mx-auto dark:bg-gray-900 overflow-hidden">
                {/* --- HEADER --- */}
                <Paper p="md" shadow="none"  border="0">
                    <Group position="apart" align="center" mb="lg">
                         <ActionIcon variant="subtle" color="gray" onClick={() => router.back()}><IconArrowLeft /></ActionIcon>
                         <Avatar src={lead.avatar_url} radius="xl" size="lg">{lead.full_name?.charAt(0)}</Avatar>
                         <ActionIcon variant="subtle" color="gray"><IconSend2/></ActionIcon>
                    </Group>
                    <Title order={2} align="center">{lead.full_name}</Title>
                    <Text c="dimmed" size="sm" align="center">Lead from {lead.source || 'Manual Entry'}</Text>
                    <Group position="center" mt="xl" spacing="lg">
                        <ActionIcon component="a" href={`tel:${lead.phone_number}`} size="xl" radius="xl" variant="light"><IconPhone /></ActionIcon>
                        <ActionIcon component="a" href={`mailto:${lead.email}`} size="xl" radius="xl" variant="light"><IconMail /></ActionIcon>
                        <ActionIcon component="a" href={`https://wa.me/${lead.phone_number}`} target="_blank" size="xl" radius="xl" variant="light"><IconBrandWhatsapp /></ActionIcon>
                    </Group>
                </Paper>
                
                {/* <Divider  className='my-2'/> */}

                {/* --- MAIN DETAILS SECTION --- */}
                <div className="p-4">
                    <Stack spacing="xl">
                        {lead.next_follow_up_date && (
                             <InfoSection label="Next Follow Up" icon={<IconCalendar size={16} />}>
                                <Group position="apart" align="center">
                                    <Text fw={500}>{formatDate(lead.next_follow_up_date)}</Text>
                                    <Badge color="cyan" variant="light">{new Date(lead.next_follow_up_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Badge>
                                </Group>
                            </InfoSection>
                        )}
                       
                   
                            <Badge color="blue" size="lg" radius="xs">{lead.lead_status}</Badge>
                   
                        
                        {/* Dynamically display all relevant details from the JSON */}
                        <InfoSection label="Contact Email" icon={<IconMail size={16}/>}>{lead.email}</InfoSection>
                        <InfoSection label="Phone Number" icon={<IconPhone size={16}/>}>{lead.phone_number}</InfoSection>
                        <InfoSection label="Budget">{formatCurrency(lead.coverage_amount)}</InfoSection>
                        <InfoSection label="Birthday" icon={<IconUser size={16}/>}>{formatDate(lead.date_of_birth)}</InfoSection>
                        <InfoSection label="Company" icon={<IconBuildingStore size={16}/>}>{lead.company_name}</InfoSection>
                        <InfoSection label="Category" icon={<IconCategory size={16}/>}>{lead.category}</InfoSection>
                        <InfoSection label="Referred By" icon={<IconLink size={16}/>}>{lead.referrer}</InfoSection>
                        <InfoSection label="Insurance Type">{lead.insurance_type}</InfoSection>
                        <InfoSection label="Policy Number" icon={<IconReceipt2 size={16}/>}>{lead.policy_number}</InfoSection>

                        <InfoSection label="Notes" icon={<IconNote size={16}/>}>
                            <Text c="dimmed" sx={{ fontStyle: 'italic' }}>"{lead.notes || 'No notes added.'}"</Text>
                        </InfoSection>
                        
                        <Divider my="sm" label="Activity Timeline" labelPosition="center" />

                        {/* --- TIMELINE SECTION --- */}
                        <div>
                             {timeline.length > 0 ? (
                                <Timeline active={-1} bulletSize={30} lineWidth={2}>
                                    {timeline.map(item => (
                                        <Timeline.Item 
                                            key={item.id} 
                                            bullet={<Center>{timelineIcons[item.purpose] || timelineIcons.default}</Center>}
                                            title={<Text fw={500}>{item.purpose}</Text>}
                                        >
                                            <Text size="xs" c="dimmed">{new Date(item.follow_up_date).toLocaleString('en-GB', {month: 'long', day: 'numeric', hour: 'numeric', minute:'2-digit'})}</Text>
                                            {item.notes && <Text size="sm" mt={4}>{item.notes}</Text>}
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                             ) : <Text c="dimmed" size="sm" align="center">No timeline events to show.</Text>}
                        </div>
                    </Stack>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailPage;