'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
// replace Drawer import with Modal
import { Menu, Button, Modal, ScrollArea, Text, Divider, Badge, Checkbox, Group, FileInput, Paper, ActionIcon } from '@mantine/core';
import IconPencil from '../icon/icon-pencil';
import IconTrash from '../icon/icon-trash-lines';
// import IconUpload from '../icon/icon-upload-cloud';
import AppointmentDrawer from './AppointmentDrawer';
import { getAuth } from 'firebase/auth';
import { IconDotsVertical, IconFileExport, IconUpload } from '@tabler/icons-react';
import CsvCustomersUpload from '@/components/CsvUpload/CsvCustomerUpload';
import { Loader, Avatar, TextInput } from '@mantine/core';
import IconCashBanknotes from '../icon/icon-cash-banknotes';
import IconListCheck from '../icon/icon-list-check';
import IconHeart from '../icon/icon-heart';
import CustomerQuickActions from '@/components/common/CustomerQuickActions';
import { IconEye, IconPlus, IconCalendarPlus, IconArrowLeft, IconSearch, IconDownload } from '@tabler/icons-react';

const AVATAR_COLORS = ['violet', 'blue', 'orange', 'teal', 'pink', 'green'];

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
  const handleViewCustomer = (customer) => {
    router.push(`/view-customer/${customer.id}`);
  };

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

  const openFinCheckup = (c) => {
    const qs = new URLSearchParams({
      id: c.id,
      type: 'customer',
      name: c.full_name,
      phone: c.phone_number,
      email: c.email,
      doctor: profile?.name || '',
    }).toString();
    router.push(`/fincalc?${qs}`);
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

  /* ─────────── mobile infinite scroll ─────────── */
  const MOBILE_BATCH = 10;
  const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
  const sentinelRef = useRef(null);

  const mobileList = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = customers.filter(
      (item) => (item.full_name || '').toLowerCase().includes(q) || (item.email || '').toLowerCase().includes(q) || (item.phone_number || '').toLowerCase().includes(q),
    );
    const sorted = sortBy(filtered, sortStatus.columnAccessor);
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [customers, search, sortStatus]);

  const hasMore = mobileCount < mobileList.length;

  useEffect(() => {
    setMobileCount(MOBILE_BATCH);
  }, [search, sortStatus]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setMobileCount((c) => c + MOBILE_BATCH);
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, mobileCount]);

  /* ─────────── mobile long-press selection ─────────── */
  const [selectionMode, setSelectionMode] = useState(false);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);

  const cancelLongPress = () => clearTimeout(pressTimer.current);

  const startLongPress = (id) => {
    longPressed.current = false;
    cancelLongPress();
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, 500);
  };

  const handleCardClick = (id) => {
    if (longPressed.current) {
      longPressed.current = false; // the click that ends a long press
      return;
    }
    if (selectionMode) toggleSelect(id);
    else router.push(`/view-customer/${id}`);
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  useEffect(() => {
    if (selectionMode && selectedIds.length === 0) setSelectionMode(false);
  }, [selectionMode, selectedIds]);

  const getNextAppointment = (appointments) => {
    if (!appointments || appointments.length === 0) return null;
    const upcoming = appointments.filter((appt) => new Date(appt.appointment_date) > new Date()).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    return upcoming.length ? upcoming[0] : null;
  };

  /* ─────────── JSX ─────────── */
  return (
    <div className="panel mt-0 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      {/* ⬇︎ Header / toolbar */}
      <div className="mb-5 hidden flex-wrap items-center gap-4 md:flex">
        <div className="mr-2">
          <h5 className="text-xl font-semibold leading-tight dark:text-white-light">Customers</h5>
          <div className="text-sm text-gray-500">{customers.length} {customers.length === 1 ? 'Customer' : 'Customers'}</div>
        </div>

        <TextInput
          icon={<IconSearch size={16} />}
          placeholder="Search by name, email or phone"
          radius="xl"
          className="w-full max-w-xs flex-1"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {selectedIds.length > 0 && (
            <Button color="red" variant="light" leftIcon={<IconTrash size={16} />} onClick={deleteSelected}>
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="light" color="violet" leftIcon={<IconUpload size={16} />} onClick={() => setCsvModalOpen(true)}>
            Upload CSV
          </Button>
          <Button variant="light" color="violet" leftIcon={<IconDownload size={16} />} onClick={handleExportData}>
            Export
          </Button>
          <Button color="violet" leftIcon={<IconPlus size={16} />} onClick={() => router.push('/create-customer')}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* ⬇︎ DataTable */}
      <div className="datatables hidden md:block">
        <DataTable
          highlightOnHover
          verticalSpacing="sm"
          onRowClick={(record) => router.push(`/view-customer/${record.id}`)}
          rowStyle={() => ({ cursor: 'pointer' })}
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
              render: (record) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.includes(record.id)} onChange={() => toggleSelect(record.id)} />
                </div>
              ),
              width: 48,
            },
            {
              accessor: 'full_name',
              title: 'Name',
              sortable: true,
              render: (record) => {
                const initial = (record.full_name || '?').trim().charAt(0).toUpperCase();
                return (
                  <div className="flex items-center gap-3">
                    <Avatar color={AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length]} variant="light" radius="xl" size="md" src={record.avatar_url || record.image_url || record.photo_url || null}>
                      {initial}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium">{record.full_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.phone_number}</div>
                    </div>
                  </div>
                );
              },
            },
            { accessor: 'email', title: 'Email', sortable: true },
            {
              accessor: 'next_appointment',
              title: 'Next Appointment',
              render: (record) => {
                const nextAppt = getNextAppointment(record.appointments);
                return nextAppt ? (
                  <Badge color="violet" variant="light">
                    {new Date(nextAppt.appointment_date).toLocaleString()} - {nextAppt.appointment_type}
                  </Badge>
                ) : (
                  <Text color="dimmed" size="sm">—</Text>
                );
              },
            },
            {
              accessor: 'quick_actions',
              title: 'Quick Actions',
              render: (record) => <CustomerQuickActions customer={record} onAppointment={handleManageAppointments} size="lg" plain />,
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (record) => (
                <div onClick={(e) => e.stopPropagation()}>
                <Menu withinPortal shadow="md" width={200}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" aria-label="More actions">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item icon={<IconEye size={16} />} onClick={() => handleViewCustomer(record)}>
                      View
                    </Menu.Item>
                    <Menu.Item icon={<IconPencil />} onClick={() => handleEditCustomer(record)}>
                      Edit Customer
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item icon={<IconCashBanknotes />} onClick={() => openFinCheckup(record)}>
                      Fin-Health Checkup
                    </Menu.Item>
                    <Menu.Item
                      icon={<IconListCheck />}
                      onClick={() => {
                        const qs = new URLSearchParams({ clientId: record.id, clientType: 'customer', clientName: record.full_name }).toString();
                        router.push(`/fhclog?${qs}`);
                      }}
                    >
                      Checkup History
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" icon={<IconTrash />} onClick={() => deleteCustomer(record.id)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                </div>
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
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <ActionIcon variant="subtle" color="dark" onClick={() => router.back()} aria-label="Back">
            <IconArrowLeft size={22} />
          </ActionIcon>
          <div>
            <div className="text-xl font-semibold leading-tight dark:text-white-light">Customers</div>
            <div className="text-sm text-gray-500">{customers.length} {customers.length === 1 ? 'Customer' : 'Customers'}</div>
          </div>
        </div>

        {/* Search */}
        <TextInput
          icon={<IconSearch size={18} />}
          placeholder="Search by name or phone"
          radius="xl"
          size="md"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="sm"
        />

        {selectionMode ? (
          <Group className="px-1 py-2" position="apart" noWrap>
            <Text size="sm" weight={500}>{selectedIds.length} selected</Text>
            <Group spacing="xs" noWrap>
              <Button size="xs" color="red" leftIcon={<IconTrash size={14} />} onClick={deleteSelected}>
                Delete
              </Button>
              <Button size="xs" variant="default" onClick={exitSelection}>
                Cancel
              </Button>
            </Group>
          </Group>
        ) : (
          <div className="flex items-center py-2 mb-2">
            <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconPlus size={18} />} onClick={() => router.push('/create-customer')}>
              Add
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconUpload size={18} />} onClick={() => setCsvModalOpen(true)}>
              Upload CSV
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconDownload size={18} />} onClick={handleExportData}>
              Export
            </Button>
          </div>
        )}

        <div className="px-1">
          {mobileList.slice(0, mobileCount).map((cust) => {
            const isSel = selectedIds.includes(cust.id);
            const photo = cust.avatar_url || cust.image_url || cust.photo_url || null;
            const initial = (cust.full_name || '?').trim().charAt(0).toUpperCase();
            return (
              <div
                key={cust.id}
                className={`flex cursor-pointer items-center gap-3 select-none py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${isSel ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
                style={{ WebkitTouchCallout: 'none' }}
                onTouchStart={() => startLongPress(cust.id)}
                onTouchMove={cancelLongPress}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => handleCardClick(cust.id)}
              >
                {selectionMode ? (
                  <Checkbox checked={isSel} onChange={() => toggleSelect(cust.id)} onClick={(e) => e.stopPropagation()} />
                ) : (
                  <Avatar color={AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length]} variant="light" radius="xl" size="lg" src={photo}>{initial}</Avatar>
                )}

                <div className="flex-1 min-w-0">
                  <Text weight={500} lineClamp={1}>{cust.full_name}</Text>
                  <Text size="xs" color="dimmed">{cust.phone_number}</Text>
                </div>

                {!selectionMode && (
                  <>
                    <CustomerQuickActions customer={cust} onAppointment={handleManageAppointments} size="xl" hideAppointment plain />
                    <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                      <Menu shadow="md" withinPortal>
                        <Menu.Target>
                          <ActionIcon size="sm" variant="subtle">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item icon={<IconEye size={14} />} onClick={() => handleViewCustomer(cust)}>
                View
              </Menu.Item>
              <Menu.Item icon={<IconPencil size={14} />} onClick={() => handleEditCustomer(cust)}>
                Edit
              </Menu.Item>
                    <Menu.Item icon={<IconCalendarPlus size={14} />} onClick={() => handleManageAppointments(cust)}>
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
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader size="sm" />
            </div>
          )}
        </div>

        {!selectionMode && (
          <ActionIcon
            size={56}
            radius="xl"
            variant="filled"
            color="violet"
            className="shadow-lg"
            style={{ position: 'fixed', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(80px + env(safe-area-inset-bottom))', zIndex: 50 }}
            onClick={() => router.push('/create-customer')}
            aria-label="Add customer"
          >
            <IconPlus size={28} />
          </ActionIcon>
        )}
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
