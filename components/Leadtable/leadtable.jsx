'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import { Menu, Button, Drawer, Timeline, Divider, Text, ScrollArea, Badge, Checkbox, Select } from '@mantine/core';
import IconMessage from '../icon/icon-message';
import FollowupForm from '@/components/forms/followupform';
import IconPhoneCall from '../icon/icon-phone-call';
import IconListCheck from '../icon/icon-list-check';
import IconChatDot from '../icon/icon-chat-dot';
import IconPencil from '../icon/icon-pencil';
import { getAuth } from 'firebase/auth'; // 🔹 Firebase Auth

const LeadTable = ({userId}) => {
    const [leads, setLeads] = useState([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [recordsData, setRecordsData] = useState(leads);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState({
        columnAccessor: 'full_name',
        direction: 'asc',
    });

    const [showDrawer, setShowDrawer] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [followupHistory, setFollowupHistory] = useState([]);
    const [existingFollowUp, setExistingFollowUp] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [selectedTeamMember, setSelectedTeamMember] = useState(null);

    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchLeads = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                alert('You must be logged in!');
                return;
            }
            const token = await user.getIdToken();
            const response = await axios.get(`${API_URL}/api/leads/all`,{
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            setLeads(response.data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        }
    };

    const fetchFollowupHistory = async (leadId) => {
        try {
            const response = await axios.get(`${API_URL}/api/followups/${leadId}`);
            setFollowupHistory(response.data);

            // Determine the latest next_follow_up_date and followup_status
            const latestFollowup = response.data[0]; // Assuming the API returns sorted data (latest first)
            setLeads((prevLeads) =>
                prevLeads.map((lead) =>
                    lead.id === leadId
                        ? {
                              ...lead,
                              next_follow_up_date: latestFollowup?.follow_up_date || null,
                              followup_status: latestFollowup?.purpose || 'No Follow-up',
                          }
                        : lead,
                ),
            );
        } catch (error) {
            console.error('Error fetching follow-up history:', error);
        }
    };

    const openFollowupDrawer = async (lead) => {
        setSelectedLead(lead);
        await fetchFollowupHistory(lead.id);
        setShowDrawer(true);
    };

    const closeFollowupDrawer = () => {
        setShowDrawer(false);
        setSelectedLead(null);
        setFollowupHistory([]);
        setExistingFollowUp(null);
    };

    const handleEditLead = (lead) => {
        router.push(`/editlead/${lead.id}`);
    };

    const sendWhatsappMessage = (phoneNumber) => {
        // Add country code if not present
        const formattedPhoneNumber = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;

        // Encode the message for WhatsApp
        const message = encodeURIComponent('Hello, this is a message from our platform!');

        // Construct the WhatsApp URL
        const link = `https://wa.me/${formattedPhoneNumber}?text=${message}`;

        // Open WhatsApp Web with the pre-filled message
        window.open(link, '_blank');
    };

    const handleEditFollowup = (followup) => {
        setExistingFollowUp(followup);
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    

    useEffect(() => {
        // Step 1: Filter by userId (if provided)
        let filteredLeads = userId 
            ? leads.filter((item) => item.user_id === userId) 
            : leads;
    
        // Step 2: Apply search filtering
        filteredLeads = filteredLeads.filter((item) =>
            item.full_name.toLowerCase().includes(search.toLowerCase()) ||
            item.email.toLowerCase().includes(search.toLowerCase()) ||
            item.phone_number.toLowerCase().includes(search.toLowerCase())
        );
    
        // Step 3: Sort the results
        const sortedLeads = sortBy(filteredLeads, sortStatus.columnAccessor);
        const finalSortedLeads = sortStatus.direction === 'desc' ? sortedLeads.reverse() : sortedLeads;
    
        // Step 4: Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(finalSortedLeads.slice(from, to));
    
    }, [search, userId, sortStatus, page, pageSize, leads]);
    

    const fetchTeamMembers = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                alert('You must be logged in!');
                return;
            }

            const token = await user.getIdToken();

            const response = await fetch(`${API_URL}/api/admin/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users.');
            }

            const data = await response.json();
            setTeamMembers(data); // Assuming API returns an array of team members
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const toggleLeadSelection = (leadId) => {
        setSelectedLeads((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]));
    };

    const assignLeads = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                alert('You must be logged in!');
                return;
            }

            if (!user_id) {
                alert('Please select a valid user to assign leads.');
                return;
            }

            // Validate leads selection
            if (!selectedLeads || selectedLeads.length === 0) {
                alert('No leads selected for assignment.');
                return;
            }

            // Get Firebase token
            const token = await user.getIdToken();

            // Make API request
            const response = await fetch('http://localhost:5000/api/admin/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: selectedTeamMember, leads: selectedLeads }),
            });

            if (!response.ok) {
                // Handle API errors
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to assign leads.');
            }

            // Success
            const data = await response.json();
            alert('Leads assigned successfully!');
            setSelectedLeads([]);
            setSelectedTeamMember(null);
            console.log('Response:', data);
        } catch (error) {
            console.error('Error assigning leads:', error);
            alert(error.message || 'Something went wrong. Please try again.');
        }
    };

    const formatDateWithTime = (date) => {
        const dt = new Date(date);
        const day = dt.getDate().toString().padStart(2, '0');
        const month = (dt.getMonth() + 1).toString().padStart(2, '0');
        const year = dt.getFullYear();
        const hours = dt.getHours();
        const minutes = dt.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
    };

    const convertLeadToCustomer = async (lead) => {
        try {
            await axios.post(`${API_URL}/api/leads/${lead.id}/convert`);

            // Optionally remove the lead from the table after conversion
            setLeads((prevLeads) => prevLeads.filter((l) => l.id !== lead.id));
        } catch (error) {
            console.error('Error converting lead to customer:', error);
        }
    };

    return (
        <div className="panel mt-6">
            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                <h5 className="text-lg font-semibold dark:text-white-light">Lead Table</h5>
                <div className="ltr:ml-auto rtl:mr-auto">
                    <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-4 mb-4">
                    <Select
                        data={teamMembers.map((tm) => ({ value: tm.id, label: `${tm.username} (${tm.role}) ` }))}
                        value={selectedTeamMember}
                        onChange={setSelectedTeamMember}
                        placeholder="Select Team Member"
                    />
                    <Button onClick={assignLeads} disabled={!selectedTeamMember || selectedLeads.length === 0}>
                        Assign Leads
                    </Button>
                </div>
            </div>
            <div className="datatables">
                <DataTable
                    highlightOnHover
                    className="table-hover whitespace-nowrap"
                    records={recordsData}
                    columns={[
                        {
                            accessor: 'select',
                            title: (
                                <Checkbox
                                    onChange={(e) => {
                                        setSelectedLeads(e.currentTarget.checked ? leads.map((lead) => lead.id) : []);
                                    }}
                                    checked={selectedLeads.length === leads.length && leads.length > 0}
                                    indeterminate={selectedLeads.length > 0 && selectedLeads.length < leads.length}
                                />
                            ),
                            render: (record) => <Checkbox checked={selectedLeads.includes(record.id)} onChange={() => toggleLeadSelection(record.id)} />,
                        },

                        { accessor: 'full_name', title: 'Name', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone_number', title: 'Phone', sortable: true },
                        { accessor: 'assigned_to', title: 'Assigned To', render: ({ user_id }) => {
                            // Find the team member using assigned_to (user_id)
                            const assignedUser = teamMembers.find((user) => user.id === user_id);
                            return <div>{assignedUser ? assignedUser.username : 'Unassigned'}</div>;
                        }, },
                        {
                            accessor: 'followup_status',
                            title: 'Current Follow-up Status',
                            render: ({ followup_status }) => <div>{followup_status || 'No Follow-up'}</div>,
                        },
                        {
                            accessor: 'next_follow_up_date',
                            title: 'Next Follow-up Date',
                            render: ({ next_follow_up_date }) => <div>{next_follow_up_date ? formatDateWithTime(next_follow_up_date) : 'N/A'}</div>,
                        },
                        {
                            accessor: 'followup_actions',
                            title: 'Follow-Up',
                            render: (record) => (
                                <Button variant="transparent" onClick={() => openFollowupDrawer(record)}>
                                    <IconPhoneCall />
                                </Button>
                            ),
                        },
                        {
                            accessor: 'actions',
                            title: 'Actions',
                            render: (record) => (
                                <Menu withinPortal shadow="md" width={200}>
                                    <Menu.Target>
                                        <Button variant="transparent" compact>
                                            <IconListCheck />
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item onClick={() => handleEditLead(record)}>
                                            {' '}
                                            <div className="flex gap-2">
                                                {' '}
                                                <IconPencil /> Edit{' '}
                                            </div>
                                        </Menu.Item>
                                        <Menu.Item onClick={() => sendWhatsappMessage(record.phone_number)}>
                                            <div className="flex gap-2">
                                                <IconChatDot /> Send Whatsapp
                                            </div>
                                        </Menu.Item>
                                        <Menu.Item onClick={() => convertLeadToCustomer(record)}>
                                            <div className="flex gap-2">
                                                <IconListCheck /> Convert to Customer
                                            </div>
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            ),
                        },
                    ]}
                    totalRecords={leads.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={(p) => setPage(p)}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                />
            </div>

            {/* Follow-up Drawer */}
            <Drawer
                opened={showDrawer}
                onClose={closeFollowupDrawer}
                title={`Follow-ups for ${selectedLead?.full_name}`}
                position="right"
                size="lg"
                padding="md"
                styles={{
                    header: {
                        background: '#f5f5f5',
                        padding: '1rem',
                    },
                    body: {
                        padding: '0',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                    },
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <ScrollArea
                        style={{
                            flex: 1,
                            padding: '1rem',
                            overflowY: 'auto',
                            maxHeight: 'calc(100% - 300px)',
                        }}
                    >
                        <Text size="lg" weight={600} mb="md">
                            Follow-up Timeline
                        </Text>
                        <Timeline
                            bulletSize={30}
                            lineWidth={2}
                            styles={{
                                itemBullet: { backgroundColor: '#4caf50', border: '2px solid #e8f5e9' },
                                item: { paddingBottom: '1rem' },
                                line: { background: 'linear-gradient(90deg, #4caf50, #81c784)' },
                            }}
                        >
                            {followupHistory.map((followup, index) => (
                                <Timeline.Item key={index} bullet={<IconMessage size={18} />} title={followup.purpose} onClick={() => handleEditFollowup(followup)}>
                                    <div>
                                        <Text size="sm" color="dimmed">
                                            {new Date(followup.follow_up_date).toLocaleString()}
                                        </Text>
                                        <Badge color={followup.status === 'Pending' ? 'yellow' : 'green'} size="sm" mt="xs">
                                            {followup.status}
                                        </Badge>
                                    </div>
                                    <Text size="sm" mt="xs">
                                        {followup.notes}
                                    </Text>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    </ScrollArea>
                    <Divider my="sm" />
                    <div
                        style={{
                            padding: '1rem',
                            background: '#fafafa',
                            borderTop: '1px solid #e0e0e0',
                            height: '250px',
                            overflowY: 'auto',
                        }}
                    >
                        <FollowupForm leadId={selectedLead?.id} existingFollowUp={existingFollowUp} onFollowupChange={() => fetchFollowupHistory(selectedLead?.id)} />
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default LeadTable;
