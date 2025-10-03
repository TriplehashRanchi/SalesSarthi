'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Grid, Text, Title, Badge, Menu, TextInput, Select } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { DataTable } from 'mantine-datatable';
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

  // 🔍 filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(null);
  const [plan, setPlan] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [dateField, setDateField] = useState('created_at'); // created_at or expires_at

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
    let filtered = admins;

    // 🔍 text search
    if (search) {
      filtered = filtered.filter((item) =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.email?.toLowerCase().includes(search.toLowerCase()) ||
        item.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🎯 status filter
    if (status) {
      filtered = filtered.filter((item) => item.subscription_status === status);
    }

    // 🎯 plan filter
    if (plan) {
      filtered = filtered.filter((item) => (item.subscription_plan || 'Basic') === plan);
    }

    // 📅 date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter((item) => {
        const dateValue = new Date(item[dateField]);
        if (fromDate && dateValue < new Date(fromDate)) return false;
        if (toDate && dateValue > new Date(toDate)) return false;
        return true;
      });
    }

    // 🔢 sort + pagination
    const sorted = sortBy(filtered, sortStatus.columnAccessor);
    const paginated = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecordsData(paginated.slice(from, to));
  }, [admins, search, status, plan, fromDate, toDate, dateField, sortStatus, page, pageSize]);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

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
        const color =
          subscription_status === 'Active' ? 'green' :
          subscription_status === 'Expired' ? 'red' : 'yellow';
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
  ];

  return (
    <div className="panel mt-6 space-y-6">
      {/* Header + Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title order={3}>Customer Management</Title>
          <Text size="sm" color="dimmed">Monitor, search, and analyze all your platform admins</Text>
        </div>
         
        <div className="flex gap-3">
          <Button onClick={() => setOpenModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
            + Create Admin
          </Button>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="flex flex-wrap gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
        <TextInput
          placeholder="Search by name, email, or phone"
          value={search}
          label="Search"
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="w-[250px]"
        />
        <Select
          placeholder="Filter by Status"
          data={['Active', 'Expired', 'Pending']}
          value={status}
          onChange={setStatus}
          clearable
          label="Status"
          className="w-[200px]"
        />
        <Select
          placeholder="Filter by Plan"
          data={['Basic', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']}
          value={plan}
          onChange={setPlan}
          label="Plan"
          clearable
          className="w-[200px]"
        />
        <Select
          placeholder="Date Field"
          data={[
            { value: 'created_at', label: 'Created Date' },
            { value: 'expires_at', label: 'Expiry Date' },
          ]}
          value={dateField}
          label="Date Field"
          onChange={setDateField}
          className="w-[200px]"
        />
        <DatePicker
          label="From"
          value={fromDate}
          onChange={setFromDate}
          className="w-[200px]"
        />
        <DatePicker
          label="To"
          value={toDate}
          onChange={setToDate}
          className="w-[200px]"
        />
      </div>

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

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={openModal}
        closeModal={() => setOpenModal(false)}
        onSuccess={fetchAdmins}
      />
    </div>
  );
};

export default AdminTable;
