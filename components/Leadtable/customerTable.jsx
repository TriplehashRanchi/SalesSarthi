'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
// replace Drawer import with Modal
import { Menu, Button, Modal, ScrollArea, Text, Divider, Badge, Checkbox, Group, FileInput } from '@mantine/core';
import IconPencil from '../icon/icon-pencil';
import IconTrash from '../icon/icon-trash-lines';
// import IconUpload from '../icon/icon-upload-cloud';
import AppointmentDrawer from './AppointmentDrawer';
import IconMailDot from '../icon/icon-mail-dot';
import { getAuth } from 'firebase/auth';
import { IconUpload } from '@tabler/icons-react';
import CsvCustomersUpload from '@/components/CsvUpload/CsvCustomerUpload';

const CustomerTable = () => {
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
    router.push(`/editcustomer/${customer.id}`);
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
  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () => {
    const pageIds = recordsData.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
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
    const finalSorted =
      sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

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
    const upcoming = appointments
      .filter((appt) => new Date(appt.appointment_date) > new Date())
      .sort(
        (a, b) =>
          new Date(a.appointment_date) - new Date(b.appointment_date),
      );
    return upcoming.length ? upcoming[0] : null;
  };

  /* ─────────── JSX ─────────── */
  return (
      <div className="panel mt-6">
          {/* ⬇︎ Header / toolbar */}
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center">
              <h5 className="text-lg font-semibold dark:text-white-light">Customer Table</h5>

              <input type="text" className="form-input w-auto md:ml-4" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />

              <div className="ml-auto flex gap-2">
                  <Button size="sm" color="red" disabled={!selectedIds.length} leftSection={<IconTrash />} onClick={deleteSelected}>
                      Delete&nbsp;Selected&nbsp;({selectedIds.length})
                  </Button>

                  <Button onClick={() => setCsvModalOpen(true)}><IconUpload/>CSV Bulk Upload</Button>
              </div>
          </div>

          {/* ⬇︎ DataTable */}
          <div className="datatables">
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

          {/* ⬇︎ Existing appointment drawer */}
          <AppointmentDrawer customer={selectedCustomer} opened={openDrawer} onClose={() => setOpenDrawer(false)} />

          <CsvCustomersUpload
  opened={csvModalOpen}
  onClose={() => setCsvModalOpen(false)}
  onSuccess={fetchCustomers}   // refresh after import
/>

      </div>
  );
};

export default CustomerTable;
