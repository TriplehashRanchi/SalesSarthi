'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import { Menu, Button, Drawer, Timeline, Divider, Text, ScrollArea, Badge } from '@mantine/core';
import IconMessage from '../icon/icon-message';
import FollowupForm from '@/components/forms/followupform';
import IconPhoneCall from '../icon/icon-phone-call';
import IconListCheck from '../icon/icon-list-check';
import IconChatDot from '../icon/icon-chat-dot';
import IconPencil from '../icon/icon-pencil';

const LeadTable = () => {
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
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const admin_id = 'ADM001';
    const fetchLeads = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/leads/all/${admin_id}`);
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
        const filteredLeads = leads.filter((item) => {
            return (
                item.full_name.toLowerCase().includes(search.toLowerCase()) || item.email.toLowerCase().includes(search.toLowerCase()) || item.phone_number.toLowerCase().includes(search.toLowerCase())
            );
        });

        const sortedLeads = sortBy(filteredLeads, sortStatus.columnAccessor);
        const finalSortedLeads = sortStatus.direction === 'desc' ? sortedLeads.reverse() : sortedLeads;

        setRecordsData(finalSortedLeads);
        setPage(1);
    }, [search, leads, sortStatus]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(leads.slice(from, to));
    }, [page, pageSize, leads]);

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
            </div>
            <div className="datatables">
                <DataTable
                    highlightOnHover
                    className="table-hover whitespace-nowrap"
                    records={recordsData}
                    columns={[
                        { accessor: 'full_name', title: 'Name', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone_number', title: 'Phone', sortable: true },
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
