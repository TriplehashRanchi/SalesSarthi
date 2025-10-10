'use client';

import { useState, useMemo } from 'react';
import {
  Button, Modal, TextInput, Select, Group, Title, Divider, Text,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconDownload, IconFilter } from '@tabler/icons-react';
import { CSVLink } from 'react-csv';
import Swal from 'sweetalert2';

export default function ExportCsvModal({ allAdmins = [] }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: null,
    plan: null,
    fromDate: null,
    toDate: null,
    dateField: 'created_at',
  });

  // 🔍 Filtering logic
  const filteredAdmins = useMemo(() => {
    let filtered = [...allAdmins];
    const { search, status, plan, fromDate, toDate, dateField } = filters;

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.email?.toLowerCase().includes(search.toLowerCase()) ||
          item.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (status) filtered = filtered.filter((i) => i.subscription_status === status);
    if (plan) filtered = filtered.filter((i) => (i.subscription_plan || 'Basic') === plan);

    if (fromDate || toDate) {
      filtered = filtered.filter((i) => {
        const dateValue = new Date(i[dateField]);
        if (fromDate && dateValue < new Date(fromDate)) return false;
        if (toDate && dateValue > new Date(toDate)) return false;
        return true;
      });
    }
    return filtered;
  }, [filters, allAdmins]);

  // 🧾 CSV setup
  const csvHeaders = [
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Plan', key: 'subscription_plan' },
    { label: 'Status', key: 'subscription_status' },
    { label: 'Users', key: 'user_count' },
    { label: 'Leads', key: 'lead_count' },
    { label: 'Created Date', key: 'created_at' },
    { label: 'Expiry Date', key: 'expires_at' },
  ];

  const csvData = filteredAdmins.map((item) => ({
    name: item.name || '',
    email: item.email || '',
    phone: item.phone || '',
    subscription_plan: item.subscription_plan || 'Basic',
    subscription_status: item.subscription_status || 'Pending',
    user_count: item.user_count || 0,
    lead_count: item.lead_count || 0,
    created_at: item.created_at
      ? new Date(item.created_at).toLocaleDateString('en-IN')
      : '',
    expires_at: item.expires_at
      ? new Date(item.expires_at).toLocaleDateString('en-IN')
      : '',
  }));

  const handleDownload = () => {
    if (filteredAdmins.length === 0) {
      Swal.fire('No Records', 'No data found for selected filters.', 'info');
      return;
    }
    Swal.fire('✅ Ready', 'Your filtered CSV is ready for download.', 'success');
  };

  return (
    <>
      {/* 🔘 Export Button */}
      <Button
        variant="filled"
        color="blue"
        leftSection={<IconDownload size={16} />}
        onClick={() => setOpen(true)}
      >
        Export CSV
      </Button>

      {/* 📦 Modal */}
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={<Title order={4}>Export Customer Data</Title>}
        centered
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <div className="space-y-6">
          <Text size="sm" color="dimmed">
            Apply filters below and click “Download CSV” to export data.
          </Text>

          <Divider label="Filter Options" />

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              placeholder="Search by name, email, or phone"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
              label="Search"
            />
            <Select
              placeholder="Filter by Status"
              data={['Active', 'Expired', 'Pending']}
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val })}
              clearable
              label="Status"
            />
            <Select
              placeholder="Filter by Plan"
              data={['Basic', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']}
              value={filters.plan}
              onChange={(val) => setFilters({ ...filters, plan: val })}
              clearable
              label="Plan"
            />
            <Select
              label="Date Field"
              data={[
                { value: 'created_at', label: 'Created Date' },
                { value: 'expires_at', label: 'Expiry Date' },
              ]}
              value={filters.dateField}
              onChange={(val) => setFilters({ ...filters, dateField: val })}
            />
            <DatePicker
              label="From Date"
              value={filters.fromDate}
              onChange={(val) => setFilters({ ...filters, fromDate: val })}
            />
            <DatePicker
              label="To Date"
              value={filters.toDate}
              onChange={(val) => setFilters({ ...filters, toDate: val })}
            />
          </div>

          <Divider label="Actions" />

          {/* Buttons */}
          <Group justify="space-between">
            <Button
              variant="light"
              color="gray"
              leftSection={<IconFilter size={16} />}
              onClick={() => setFilters({
                search: '',
                status: null,
                plan: null,
                fromDate: null,
                toDate: null,
                dateField: 'created_at',
              })}
            >
              Reset Filters
            </Button>

            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={`filtered_customers_${new Date().toISOString().slice(0, 10)}.csv`}
              onClick={handleDownload}
            >
              <Button color="blue" leftSection={<IconDownload size={16} />}>
                Download CSV ({filteredAdmins.length} Records)
              </Button>
            </CSVLink>
          </Group>
        </div>
      </Modal>
    </>
  );
}
