'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Grid, Text, Title, Badge, Menu } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
// import { IconUsers, IconUserPlus, IconChartSquare, IconUsersGroup, IconPencil,  } from '@tabler/icons-react';
import superAdminAxios from '@/utils/superAdminAxios';
import sortBy from 'lodash/sortBy';
import IconPencil from '../icon/icon-pencil';
import IconLock from '../icon/icon-lock';
import IconUsers from '../icon/icon-users';
import IconUserPlus from '../icon/icon-user-plus';
import IconChartSquare from '../icon/icon-chart-square';
import IconUsersGroup from '../icon/icon-users-group';
import CreateAdminModal from '@/components/forms/CreateAdminForm';

const AdminTable = () => {
  const [admins, setAdmins] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [recordsData, setRecordsData] = useState([]);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'name', direction: 'asc' });
  const [openModal, setOpenModal] = useState(false);

  const fetchAdmins = async () => {
    try {
      const response = await superAdminAxios.get('/api/superadmin/admins');
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    const filtered = admins.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = sortBy(filtered, sortStatus.columnAccessor);
    const paginated = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecordsData(paginated.slice(from, to));
  }, [admins, search, sortStatus, page, pageSize]);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Plan', 'Status', 'Users', 'Leads', 'Expiry Date'],
      ...admins.map(a => [
        a.name, a.email, a.phone,
        a.subscription_plan || 'Basic',
        a.subscription_status,
        a.user_count,
        a.lead_count,
        a.expires_at ? formatDate(a.expires_at) : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'admins.csv';
    link.click();
  };

  const totalUsers = admins.reduce((acc, a) => acc + (a.user_count || 0), 0);
  const totalLeads = admins.reduce((acc, a) => acc + (a.lead_count || 0), 0);
  const activeSubs = admins.filter(a => a.subscription_status === 'Active').length;

  const columns = [
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'email', title: 'Email', sortable: true },
    { accessor: 'phone', title: 'Phone', sortable: true },
    {
      accessor: 'subscription_plan',
      title: 'Plan',
      render: ({ subscription_plan }) => <div>{subscription_plan || 'Basic'}</div>
    },
    {
      accessor: 'subscription_status',
      title: 'Status',
      render: ({ subscription_status }) => {
        const color = subscription_status === 'Active' ? 'green' : subscription_status === 'Expired' ? 'red' : 'yellow';
        return <Badge color={color}>{subscription_status}</Badge>;
      }
    },
    {
      accessor: 'stats',
      title: 'Stats',
      render: ({ user_count, lead_count }) => (
        <div className="flex flex-col gap-1 text-xs">
          <Badge size="xs" color="blue">Users: {user_count}</Badge>
          <Badge size="xs" color="purple">Leads: {lead_count}</Badge>
        </div>
      )
    },
    {
      accessor: 'lifecycle',
      title: 'Lifecycle',
      render: ({ created_at, expires_at }) => (
        <div className="text-xs">
          <div><strong>Created:</strong> {formatDate(created_at)}</div>
          <div><strong>Expires:</strong> {formatDate(expires_at)}</div>
        </div>
      )
    },
    {
      accessor: 'actions',
      title: '',
      render: (record) => (
        <Menu shadow="md" withinPortal>
          <Menu.Target>
            <Button variant="light" size="xs">Actions</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => console.log('Edit:', record)}>
              <IconPencil size={14} /> Edit
            </Menu.Item>
            <Menu.Item color="red" onClick={() => console.log('Restrict:', record)}>
              <IconLock size={14} /> Restrict
            </Menu.Item>
            <Menu.Item onClick={() => window.location.href = `/superadmin/admins/${record.admin_id}`}>
          <IconUsersGroup size={14} /> View Details
        </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )
    }
  ];

  return (
    <div className="panel mt-6 space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title order={3}>Customer Management</Title>
          <Text size="sm" color="dimmed">Monitor, search, and analyze all your platform admins</Text>
        </div>
         
        <div className="flex gap-3">
          <Button onClick={() => setOpenModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
    + Create Admin
  </Button>
          <Button variant="outline" onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      {/* Metrics */}
      <Grid gutter="lg">
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" radius="md" padding="lg" className="flex items-center gap-3">
            <IconUsers size={26} className="text-blue-600" />
            <div>
              <Text size="xl" weight={600}>{admins.length}</Text>
              <Text size="xs" color="dimmed">Total Admins</Text>
            </div>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" radius="md" padding="lg" className="flex items-center gap-3">
            <IconUserPlus size={26} className="text-green-600" />
            <div>
              <Text size="xl" weight={600}>{totalUsers}</Text>
              <Text size="xs" color="dimmed">Total Users</Text>
            </div>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" radius="md" padding="lg" className="flex items-center gap-3">
            <IconChartSquare size={26} className="text-fuchsia-600" />
            <div>
              <Text size="xl" weight={600}>{totalLeads}</Text>
              <Text size="xs" color="dimmed">Total Leads</Text>
            </div>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" radius="md" padding="lg" className="flex items-center gap-3">
            <IconUsersGroup size={26} className="text-cyan-600" />
            <div>
              <Text size="xl" weight={600}>{activeSubs}</Text>
              <Text size="xs" color="dimmed">Active Subscriptions</Text>
            </div>
          </Card>
        </Grid.Col>
      </Grid>

      {/* DataTable */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm">
        <DataTable
          highlightOnHover
          withBorder
          columns={columns}
          records={recordsData}
          totalRecords={admins.length}
          page={page}
          onPageChange={setPage}
          recordsPerPage={pageSize}
          onRecordsPerPageChange={setPageSize}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          recordsPerPageOptions={[10, 20, 50, 100]}
        />
      </div>
      <CreateAdminModal
  isOpen={openModal}
  closeModal={() => setOpenModal(false)}
  onSuccess={fetchAdmins}
/>
    </div>
  );
};

export default AdminTable;
