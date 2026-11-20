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
import { CustomerFolderSelect } from '@/components/customers/CustomerFolders';
import { IconEye, IconPlus, IconCalendarPlus, IconArrowLeft, IconSearch, IconDownload, IconGitMerge, IconColumns } from '@tabler/icons-react';
import CustomerStatusBadge from '@/components/customers/CustomerStatusBadge';
import { useProductExpansion, productsSummary } from '@/components/customers/CustomerProductsRow';
import AssignCustomersModal from '@/components/customers/AssignCustomersModal';
import ToolbarButton from '@/components/customers/ToolbarButton';
import CustomerExportModal from '@/components/customers/CustomerExportModal';
import { buildCustomerColumns, CustomerColumnsModal, useCustomerColumns } from '@/components/customers/CustomerColumns';
import { useCustomerFolders } from '@/components/customers/customerFolderApi';
import { IconUserCheck } from '@tabler/icons-react';

const AVATAR_COLORS = ['blue', 'cyan', 'orange', 'teal', 'pink', 'green'];

const CustomerTable = ({ profile }) => {
  /* ─────────── existing state ─────────── */
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [recordsData, setRecordsData] = useState(customers);
  const [search, setSearch] = useState('');
  // Newest first: a customer just added, converted from a lead or merged shows at the top.
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: 'recent_at',
    direction: 'desc',
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const handleViewCustomer = (customer) => {
    router.push(`/view-customer/${customer.id}`);
  };

  /* ─────────── NEW state ─────────── */
  const [selectedIds, setSelectedIds] = useState([]); // checkbox picks
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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

  // Search + sort once; desktop pages through it, mobile scrolls through it.
  const sortedCustomers = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = customers.filter(
      (item) => (item.full_name || '').toLowerCase().includes(q) || (item.email || '').toLowerCase().includes(q) || (item.phone_number || '').toLowerCase().includes(q),
    );
    const sorted = sortBy(filtered, (c) => {
      const v = c[sortStatus.columnAccessor];
      return typeof v === 'string' ? v.toLowerCase() : v;
    });
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [customers, search, sortStatus]);

  useEffect(() => {
    setPage(1);
  }, [search, sortStatus]);

  useEffect(() => {
    const from = (page - 1) * pageSize;
    setRecordsData(sortedCustomers.slice(from, from + pageSize));
  }, [page, pageSize, sortedCustomers]);

  /* ─────────── mobile infinite scroll ─────────── */
  const MOBILE_BATCH = 10;
  const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
  const sentinelRef = useRef(null);

  const mobileList = sortedCustomers;

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

  const productRows = useProductExpansion();
  const { config: columnConfig, setConfig: setColumnConfig, view: columnView } = useCustomerColumns();
  const [columnsOpen, setColumnsOpen] = useState(false);
  const { folders: allFolders } = useCustomerFolders();
  const folderName = Object.fromEntries((allFolders || []).map((f) => [f.id, f.name]));

  /* ─────────── JSX ─────────── */
  return (
    <div className="panel mt-0 md:!px-3 md:!pb-3 md:!pt-4 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      {/* ⬇︎ Header / toolbar */}
      {/* One line on every desktop/tablet width: search takes the free space; on smaller screens the secondary
          buttons become icons (name on hover) so nothing wraps to a second line. */}
      <div className="mb-3 hidden flex-nowrap items-center gap-2 md:flex xl:gap-3">
        <TextInput
          icon={<IconSearch size={16} />}
          placeholder="Search by name, email or phone"
          radius="xl"
          className="min-w-[140px] max-w-md flex-1"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
          {selectedIds.length > 0 && (
            <ToolbarButton icon={<IconUserCheck size={16} />} label={`Assign (${selectedIds.length})`} onClick={() => setAssignOpen(true)} showFrom="lg" />
          )}
          {selectedIds.length > 0 && (
            <ToolbarButton color="red" icon={<IconTrash size={16} />} label={`Delete (${selectedIds.length})`} onClick={deleteSelected} showFrom="lg" />
          )}
          <CustomerFolderSelect className="w-40 xl:w-52" />
          <ToolbarButton icon={<IconUpload size={16} />} label="Upload CSV" onClick={() => setCsvModalOpen(true)} />
          <ToolbarButton icon={<IconDownload size={16} />} label="Export" onClick={() => setExportOpen(true)} />
          <ToolbarButton icon={<IconColumns size={16} />} label="Columns" onClick={() => setColumnsOpen(true)} />
          <ToolbarButton icon={<IconGitMerge size={16} />} label="Duplicates" onClick={() => router.push('/customer-duplicates')} />
          <ToolbarButton variant="filled" icon={<IconPlus size={16} />} label="Add Customer" onClick={() => router.push('/create-customer')} showFrom="lg" />
        </div>
      </div>

      {/* ⬇︎ DataTable */}
      <div className="datatables hidden md:block">
        <DataTable
          highlightOnHover
          verticalSpacing="sm"
          horizontalSpacing="xs"
          onRowClick={(record) => router.push(`/view-customer/${record.id}`)}
          rowStyle={() => ({ cursor: 'pointer' })}
          className="table-hover whitespace-nowrap"
          records={recordsData}
          rowExpansion={productRows.rowExpansion}
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
            // The person's chosen columns (#10), in their order.
            ...buildCustomerColumns(columnView, { productRows, folderName, getNextAppointment, onAppointment: handleManageAppointments }),
            {
              accessor: 'actions',
              title: '',
              width: 44,
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
          totalRecords={sortedCustomers.length}
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
        {/* Search + folder dropdown in one line */}
        <div className="mb-2 flex items-center gap-2">
          <TextInput
            icon={<IconSearch size={18} />}
            placeholder="Search"
            radius="xl"
            size="md"
            className="min-w-0 flex-1"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <CustomerFolderSelect size="md" radius="xl" className="w-[44%] max-w-[190px] shrink-0" />
        </div>

        {selectionMode ? (
          <Group className="px-1 py-2" position="apart" noWrap>
            <Text size="sm" weight={500}>{selectedIds.length} selected</Text>
            <Group spacing="xs" noWrap>
              <Button size="xs" color="blue" variant="light" leftIcon={<IconUserCheck size={14} />} onClick={() => setAssignOpen(true)}>
                Assign
              </Button>
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
            <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconPlus size={18} />} onClick={() => router.push('/create-customer')}>
              Add
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconUpload size={18} />} onClick={() => setCsvModalOpen(true)}>
              Upload CSV
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconDownload size={18} />} onClick={() => setExportOpen(true)}>
              Export
            </Button>
          </div>
        )}
        {!selectionMode && (
          <button type="button" onClick={() => router.push('/customer-duplicates')} className="mb-2 flex w-full items-center justify-center gap-1.5 py-1 text-sm text-blue-600">
            <IconGitMerge size={16} /> Find duplicate customers
          </button>
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
                  <div className="flex min-w-0 items-center gap-2">
                    <Text size="xs" color="dimmed">{cust.phone_number}</Text>
                    <CustomerStatusBadge status={cust.status} size="xs" />
                  </div>
                  {cust.products?.length > 0 && <Text size="xs" color="dimmed" lineClamp={1}>{productsSummary(cust.products)}</Text>}
                  {cust.assigned_to_name && <Text size="xs" color="dimmed" lineClamp={1}>Assigned to {cust.assigned_to_name}</Text>}
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
            color="blue"
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

      <CustomerExportModal opened={exportOpen} onClose={() => setExportOpen(false)} selectedIds={selectedIds} />
      <CustomerColumnsModal opened={columnsOpen} onClose={() => setColumnsOpen(false)} config={columnConfig} onSaved={setColumnConfig} />

      <AssignCustomersModal
        opened={assignOpen}
        customers={customers.filter((c) => selectedIds.includes(c.id))}
        onClose={() => setAssignOpen(false)}
        onDone={() => {
          setSelectedIds([]);
          setSelectionMode(false);
          fetchCustomers();
        }}
      />
    </div>
  );
};

export default CustomerTable;
