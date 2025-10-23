'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
// replace Drawer import with Modal
import { Menu, Button, Modal, ScrollArea, Text, Divider, Badge, Checkbox, Group, FileInput, Paper, ActionIcon } from '@mantine/core';
import IconPencil from '../icon/icon-pencil';
import IconTrash from '../icon/icon-trash-lines';
// import IconUpload from '../icon/icon-upload-cloud';
import AppointmentDrawer from './AppointmentDrawer';
import IconMailDot from '../icon/icon-mail-dot';
import { getAuth } from 'firebase/auth';
import { IconDotsVertical, IconFileExport, IconUpload } from '@tabler/icons-react';
import CsvCustomersUpload from '@/components/CsvUpload/CsvCustomerUpload';
import { Pagination } from '@mantine/core';
import IconCashBanknotes from '../icon/icon-cash-banknotes';
import IconListCheck from '../icon/icon-list-check';
import IconHeart from '../icon/icon-heart';

const CustomerTable = ({ profile }) => {
  /* ─────────── existing state ─────────── */
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [recordsData, setRecordsData] = useState(customers);
  const [search, setSearch] = useState('');
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: 'full_name',
    direction: 'asc',
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);

  /* ─────────── NEW state ─────────── */
  const [selectedIds, setSelectedIds] = useState([]); // checkbox picks
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const fileRef = useRef(null);

  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /* ─────────── helpers ─────────── */
  const fetchCustomers = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert('You must be logged in!');
        return;
      }
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/customers`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleManageAppointments = (customer) => {
    setSelectedCustomer(customer);
    setOpenDrawer(true);
  };

  const handleEditCustomer = (customer) => {
    router.push(`/edit-customer/${customer.id}`);
  };

  const handleExportData = () => {
    const dataToExport = customers; // Exports ALL customers from your 'customers' state

    if (dataToExport.length === 0) {
      alert('No data to export.'); // Replace with Mantine Notification if desired
      return;
    }

    // 1. DEFINE YOUR HEADERS - Based on your database schema
    const headers = [
      'Customer ID',       // id
      'Admin ID',          // admin_id (Consider if this is needed for end-user export)
      'User ID',           // user_id (Consider if this is needed for end-user export)
      'Full Name',         // full_name
      'Email',             // email
      'Phone Number',      // phone_number
      'Gender',            // gender
      'Date of Birth',     // date_of_birth
      'Anniversary',       // anniversary
      'Address',           // address
      'Company Name',      // company_name
      'Product Name',      // product_name
      'Policy Number',     // policy_number
      'Premium',           // premium
      'Coverage Amount',   // coverage_amount
      'Renewal Date',      // renewal_date
      'Status',            // status
      'Source',            // source
      'Referrer',          // referrer
      'Notes',             // notes
      'Created At',        // created_at
      'Updated At',        // updated_at
      'Next Appointment Date', // Derived from customer.appointments if available
      // Add more custom/derived headers if needed
    ];

    // Helper to safely format CSV cell content (remains the same)
    const formatCsvCell = (value) => {
      const stringValue = String(value ?? ''); // Handle null/undefined by converting to empty string
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Helper to format dates (YYYY-MM-DD) or return empty if invalid/null
    const formatDateForCsv = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return '';
        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return ''; // Return empty string if parsing fails
      }
    };

    // Helper to format timestamps (YYYY-MM-DD HH:MM:SS) or return empty if invalid/null
    const formatTimestampForCsv = (timestampString) => {
      if (!timestampString) return '';
      try {
        const date = new Date(timestampString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString(); // Or a more specific format if needed
      } catch (e) {
        return '';
      }
    };


    // Start with the header row
    const csvRows = [
      headers.map(formatCsvCell).join(','),
    ];

    // Add data rows
    dataToExport.forEach(customer => {
      // Assuming getNextAppointment is a helper you have that processes `customer.appointments`
      const nextAppt = getNextAppointment(customer.appointments);
      const nextAppointmentDate = nextAppt ? formatDateForCsv(nextAppt.appointment_date) : '';

      const row = [
        customer.id,
        customer.admin_id || '',
        customer.user_id || '',
        customer.full_name || '',
        customer.email || '',
        customer.phone_number || '',
        customer.gender || '',
        formatDateForCsv(customer.date_of_birth),
        formatDateForCsv(customer.anniversary),
        customer.address || '',
        customer.company_name || '',
        customer.product_name || '',
        customer.policy_number || '',
        customer.premium || '',         // Decimals will be converted to string by formatCsvCell
        customer.coverage_amount || '', // Decimals will be converted to string by formatCsvCell
        formatDateForCsv(customer.renewal_date),
        customer.status || '',
        customer.source || '',
        customer.referrer || '',
        customer.notes || '',
        formatTimestampForCsv(customer.created_at),
        formatTimestampForCsv(customer.updated_at),
        nextAppointmentDate,
        // Ensure the order here matches the order in `headers`
      ].map(formatCsvCell);
      csvRows.push(row.join(','));
    });

    // Join all rows with a newline character (remains the same)
    const csvString = csvRows.join('\n');

    // Create a Blob and trigger download (remains the same)
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      link.setAttribute('download', `customers_export_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      alert('CSV export is not supported in your browser.');
    }
  };

  /* ─────────── NEW delete helpers ─────────── */
  const deleteCustomer = async (id) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      await axios.delete(`${API_URL}/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    // simple confirm – replace with modal/snackbar if you like
    if (!window.confirm(`Delete ${selectedIds.length} customers?`)) return;

    await Promise.all(selectedIds.map((id) => deleteCustomer(id)));
  };

  /* ─────────── NEW checkbox helpers ─────────── */
  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () => {
    const pageIds = recordsData.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
  };

  /* ─────────── effects (unchanged + updated) ─────────── */
  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(
      (item) =>
        item.full_name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        item.phone_number.toLowerCase().includes(search.toLowerCase()),
    );

    const sorted = sortBy(filtered, sortStatus.columnAccessor);
    const finalSorted = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

    setRecordsData(finalSorted);
    setPage(1);
  }, [search, customers, sortStatus]);

  useEffect(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecordsData(customers.slice(from, to));
  }, [page, pageSize, customers]);

  const getNextAppointment = (appointments) => {
    if (!appointments || appointments.length === 0) return null;
    const upcoming = appointments.filter((appt) => new Date(appt.appointment_date) > new Date()).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    return upcoming.length ? upcoming[0] : null;
  };

  /* ─────────── JSX ─────────── */
  return (
    <div className="panel mt-6">
      {/* ⬇︎ Header / toolbar */}
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center">
        <h5 className="text-lg font-semibold dark:text-white-light">Customer Table</h5>

        <input type="text" className="form-input w-auto md:ml-4" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="hidden md:flex ml-auto gap-2">
          <Button size="sm" color="red" disabled={!selectedIds.length} leftSection={<IconTrash />} onClick={deleteSelected}>
            Delete&nbsp;Selected&nbsp;({selectedIds.length})
          </Button>

          <Button onClick={() => setCsvModalOpen(true)}>
            <IconUpload size={16} />
            CSV Bulk Upload
          </Button>
          {/* ⬇︎⬇︎⬇︎ ADD THIS BUTTON ⬇︎⬇︎⬇︎ */}
          <Button onClick={handleExportData}>
            Export Data  <IconFileExport size={16} />
          </Button>
          {/* ⬆︎⬆︎⬆︎ END OF ADDED BUTTON ⬆︎⬆︎⬆︎ */}
        </div>
      </div>

      {/* ⬇︎ DataTable */}
      <div className="datatables hidden md:block">
        <DataTable
          highlightOnHover
          className="table-hover whitespace-nowrap"
          records={recordsData}
          columns={[
            /* NEW checkbox column */
            {
              accessor: 'select',
              title: (
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < recordsData.length}
                  checked={recordsData.length > 0 && recordsData.every((r) => selectedIds.includes(r.id))}
                  onChange={toggleSelectAll}
                />
              ),
              render: (record) => <Checkbox checked={selectedIds.includes(record.id)} onChange={() => toggleSelect(record.id)} />,
              width: 48,
            },
            { accessor: 'full_name', title: 'Name', sortable: true },
            { accessor: 'email', title: 'Email', sortable: true },
            { accessor: 'phone_number', title: 'Phone', sortable: true },
            {
              accessor: 'next_appointment',
              title: 'Next Appointment',
              render: (record) => {
                const nextAppt = getNextAppointment(record.appointments);
                return nextAppt ? (
                  <Badge color="blue">
                    {new Date(nextAppt.appointment_date).toLocaleString()} - {nextAppt.appointment_type}
                  </Badge>
                ) : (
                  <Text>No Upcoming Appointment</Text>
                );
              },
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (record) => (
                <Menu withinPortal shadow="md" width={200}>
                  <Menu.Target>
                    <Button variant="transparent" compact>
                      <IconPencil />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => handleEditCustomer(record)}>
                      <Group gap={6}>
                        <IconPencil /> Edit Customer
                      </Group>
                    </Menu.Item>
                    <Menu.Item onClick={() => handleManageAppointments(record)}>
                      <Group gap={6}>
                        <IconMailDot /> Appointments
                      </Group>
                    </Menu.Item>
                    {/* 👇 3. ADD THE NEW MENU ITEMS FOR DESKTOP */}
                    <Menu.Divider />
                    <Menu.Item onClick={() => {
                      const qs = new URLSearchParams({
                        id: record.id,
                        type: 'customer', // Use 'customer' type
                        name: record.full_name,
                        phone: record.phone_number,
                        email: record.email,
                        doctor: profile?.name || ''
                      }).toString();
                      router.push(`/fincalc?${qs}`);
                    }}>
                      <Group gap={6}><IconCashBanknotes />Fin-Health Checkup</Group>
                    </Menu.Item>
                    <Menu.Item onClick={() => {
                      const qs = new URLSearchParams({
                        clientId: record.id,
                        clientType: 'customer',
                        clientName: record.full_name
                      }).toString();
                      router.push(`/fhclog?${qs}`);
                    }}>
                      <Group gap={6}><IconListCheck /> Checkup History</Group>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" onClick={() => deleteCustomer(record.id)}>
                      <Group gap={6}>
                        <IconTrash /> Delete
                      </Group>
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ),
            },
          ]}
          totalRecords={customers.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={PAGE_SIZES}
          onRecordsPerPageChange={setPageSize}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
        />
      </div>
      {/* ─── Mobile Customer List ─── */}
      <div className="block md:hidden">
        {/* Bulk toolbar (delete + export) */}
        <Group className="px-3 py-2" position="apart" noWrap>
          <Button
            size="xs"
            color="red"
            disabled={!selectedIds.length}
            leftSection={<IconTrash size={14} />}
            onClick={deleteSelected}
          >
            Delete ({selectedIds.length})
          </Button>
          <Button size="xs" onClick={handleExportData} leftSection={<IconFileExport size={14} />}>
            Export
          </Button>
          <Button size="xs" onClick={() => setCsvModalOpen(true)} leftSection={<IconFileExport size={14} />}>
            Upload CSV
          </Button>
        </Group>

        <ScrollArea style={{ height: 'calc(100vh - 160px)' }} px="xs" scrollbarSize={0}>
          {recordsData.map((cust) => {
            const isSel = selectedIds.includes(cust.id);
            const nextAppt = getNextAppointment(cust.appointments);
            return (
              <Paper
                key={cust.id}
                p="xs"
                withBorder
                shadow="xs"
                mb="xs"
                className="flex items-start justify-between"
              >
                {/* Main info */}
                <div className="flex-1 mr-2">
                  <Group position="apart" noWrap>
                    <Text weight={500} lineClamp={1}>{cust.full_name}</Text>
                    <Checkbox checked={isSel} onChange={() => toggleSelect(cust.id)} />
                  </Group>
                  <Text size="xs" color="dimmed">{cust.phone_number}</Text>
                  {nextAppt && (
                    <Badge size="xs" color="blue" variant="light" mt="xs">
                      {new Date(nextAppt.appointment_date).toLocaleDateString()} @ {new Date(nextAppt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                </div>

                {/* Actions menu */}
                <Menu shadow="md" withinPortal>
                  <Menu.Target>
                    <ActionIcon size="sm" variant="subtle">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item icon={<IconPencil size={14} />} onClick={() => handleEditCustomer(cust)}>
                      Edit
                    </Menu.Item>
                    <Menu.Item icon={<IconMailDot size={14} />} onClick={() => handleManageAppointments(cust)}>
                      Appointments
                    </Menu.Item>
                    {/* 👇 4. ADD THE NEW MENU ITEMS FOR MOBILE */}
                    <Menu.Divider />
                    <Menu.Item icon={<IconCashBanknotes size={14} />} onClick={() => {
                      const qs = new URLSearchParams({
                        id: cust.id,
                        type: 'customer',
                        name: cust.full_name,
                        phone: cust.phone_number,
                        email: cust.email,
                        doctor: profile?.name || ''
                      }).toString();
                      router.push(`/fincalc?${qs}`);
                    }}>
                     Fin-Health Checkup
                    </Menu.Item>
                    <Menu.Item icon={<IconListCheck size={14} />} onClick={() => {
                      const qs = new URLSearchParams({
                        clientId: cust.id,
                        clientType: 'customer',
                        clientName: cust.full_name
                      }).toString();
                      router.push(`/fhclog?${qs}`);
                    }}>
                      Checkup History
                    </Menu.Item>
                    <Menu.Divider />
                    {/* 👆 END OF NEW ITEMS */}
                    <Menu.Item
                      icon={<IconTrash size={14} />}
                      color="red"
                      onClick={() => deleteCustomer(cust.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Paper>
            );
          })}

        </ScrollArea>
        <Group position="center" spacing="xs" my="xs">
          <Pagination
            page={page}
            onChange={setPage}
            total={Math.ceil(customers.length / pageSize)}
            size="xs"
          />
        </Group>
      </div>


      {/* ⬇︎ Existing appointment drawer */}
      <AppointmentDrawer customer={selectedCustomer} opened={openDrawer} onClose={() => setOpenDrawer(false)} />

      <CsvCustomersUpload
        opened={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={fetchCustomers} // refresh after import
      />
    </div>
  );
};

export default CustomerTable;
