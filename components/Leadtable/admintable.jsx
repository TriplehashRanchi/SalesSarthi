'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import { Card, Badge, Grid, Text, Button, Menu, Title } from '@mantine/core';
import IconUsers from '../icon/icon-users';
import IconUserPlus from '../icon/icon-user-plus';
import IconChartSquare from '../icon/icon-chart-square';
import IconListCheck from '../icon/icon-list-check';
import IconPencil from '../icon/icon-pencil';
// import { IconUsers, IconUserPlus, IconChartBar, IconListCheck, IconPencil } from '@tabler/icons-react';
import sortBy from 'lodash/sortBy';
import IconUsersGroup from '../icon/icon-users-group';
import IconLock from '../icon/icon-lock';
import { Modal } from '@mantine/core';
import CreateUserModal from '@/components/forms/createUser'; 

const AdminTable = () => {
    const [admins, setAdmins] = useState([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [recordsData, setRecordsData] = useState([]);
    const [search, setSearch] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const [sortStatus, setSortStatus] = useState({
        columnAccessor: 'name',
        direction: 'asc',
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchAdmins = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/all`);
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    useEffect(() => {
        let filteredAdmins = admins.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.email.toLowerCase().includes(search.toLowerCase()) ||
            item.phone.toLowerCase().includes(search.toLowerCase())
        );

        const sortedAdmins = sortBy(filteredAdmins, sortStatus.columnAccessor);
        const finalSortedAdmins = sortStatus.direction === 'desc' ? sortedAdmins.reverse() : sortedAdmins;

        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(finalSortedAdmins.slice(from, to));
    }, [search, sortStatus, page, pageSize, admins]);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // ** Aggregated Stats **
    const totalUsers = admins.reduce((sum, admin) => sum + (admin.user_count || 0), 0);
    const totalLeads = admins.reduce((sum, admin) => sum + (admin.lead_count || 0), 0);
    const activeSubscriptions = admins.filter((admin) => admin.subscription_status === 'Active').length;

    return (
        <div className="panel mt-6">
            {/* 🏆 Top Stats */}
            <Grid gutter="lg" className="mb-6">
                <Grid.Col span={3}>
                    <Card shadow="sm" padding="lg">
                        <IconUsers size={28} />
                        <Text size="xl" weight={600}>{admins.length}</Text>
                        <Text size="sm" color="dimmed">Total Admins</Text>
                    </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                    <Card shadow="sm" padding="lg">
                        <IconUserPlus size={28} />
                        <Text size="xl" weight={600}>{totalUsers}</Text>
                        <Text size="sm" color="dimmed">Total Users</Text>
                    </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                    <Card shadow="sm" padding="lg">
                        <IconChartSquare size={28} />
                        <Text size="xl" weight={600}>{totalLeads}</Text>
                        <Text size="sm" color="dimmed">Total Leads</Text>
                    </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                    <Card shadow="sm" padding="lg">
                        <IconUsersGroup/>
                        <Badge color="green" size="lg">{activeSubscriptions}</Badge>
                        <Text size="sm" color="dimmed">Active Subscriptions</Text>
                    </Card>
                </Grid.Col>
            </Grid>

            {/* 🔍 Search Bar */}
            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                <Title order={5}>Admin Table</Title>
                <div className="ltr:ml-auto rtl:mr-auto">
                    <input
                        type="text"
                        className="form-input w-auto"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button color="blue" className='btn shadow-none bg-cyan-100' onClick={() => setOpenModal(true)}>+ Create User</button>
            </div>

           
                <CreateUserModal isOpen={openModal} closeModal={() => setOpenModal(false)} />
           

            {/* 📊 Admin Table */}
            <div className="datatables">
                <DataTable
                    highlightOnHover
                    className="table-hover whitespace-nowrap"
                    records={recordsData}
                    columns={[
                        { accessor: 'name', title: 'Name', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone', title: 'Phone', sortable: true },
                        {
                            accessor: 'subscription_plan',
                            title: 'Subscription Plan',
                            render: ({ subscription_plan }) => <div>{subscription_plan || 'Basic'}</div>,
                        },
                        {
                            accessor: 'subscription_status',
                            title: 'Subscription Status',
                            render: ({ subscription_status }) => (
                                <Badge color={subscription_status === 'Active' ? 'green' : subscription_status === 'Expired' ? 'red' : 'yellow'} size="sm">
                                    {subscription_status}
                                </Badge>
                            ),
                        },
                        {
                            accessor: 'created_at',
                            title: 'Created At',
                            render: ({ created_at }) => <div>{formatDate(created_at)}</div>,
                        },
                        {
                            accessor: 'expires_at',
                            title: 'Expires At',
                            render: ({ expires_at }) => <div>{formatDate(expires_at)}</div>,
                        },
                        {
                            accessor: 'user_count',
                            title: 'Users',
                            render: ({ user_count }) => <Badge color="blue">{user_count}</Badge>,
                        },
                        {
                            accessor: 'lead_count',
                            title: 'Leads',
                            render: ({ lead_count }) => <Badge color="purple">{lead_count}</Badge>,
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
                                        <Menu.Item onClick={() => console.log('Edit:', record)}>
                                            <div className="flex gap-2">
                                                <IconPencil /> Edit
                                            </div>
                                        </Menu.Item>
                                        <Menu.Item onClick={() => console.log('Edit:', record)}>
                                            <div className="flex gap-2">
                                                <IconLock /> Restrict User 
                                            </div>
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            ),
                        },
                    ]}
                    totalRecords={admins.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={(p) => setPage(p)}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                />
            </div>
        </div>
    );
};

export default AdminTable;
