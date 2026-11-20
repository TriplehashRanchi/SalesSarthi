'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from 'mantine-datatable';
import { Autocomplete, ActionIcon, Avatar, Button, Loader, Menu, Select, Text, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
  IconArrowLeft, IconDotsVertical, IconDownload, IconEye, IconFolder, IconFolderMinus, IconPencil, IconPlus, IconSearch, IconUpload,
  IconSettings, IconFolders,
} from '@tabler/icons-react';
import CsvCustomersUpload from '@/components/CsvUpload/CsvCustomerUpload';
import CustomerExportModal from '@/components/customers/CustomerExportModal';
import CustomerCategoryManager from '@/components/customers/CustomerCategoryManager';
import ToolbarButton from './ToolbarButton';
import { fetchFolderCustomers, removeFromFolder, saveFolderResponse, useCustomerFolders } from './customerFolderApi';
import { useFolderList } from './personalFolderApi';
import FolderLayoutManager from './FolderLayoutManager';
import PersonalFolderView from './PersonalFolderView';
import ProductLineSummary from './ProductLineSummary';

const RESPONSE_SUGGESTIONS = ['Interested', 'Not Interested', 'Call Back', 'Purchased', 'Renewal Due', 'Documents Pending'];
const AVATAR_COLORS = ['blue', 'blue', 'orange', 'teal', 'pink', 'green'];
const PAGE_SIZES = [10, 20, 30, 50, 100];

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();
const avatarColor = (initial) => AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// Shows the response as text. Admin clicks it to edit; saves on Enter / leaving the field / picking a suggestion.
function ResponseField({ row, folderId, editable, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.response || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(row.response || ''), [row.response]);

  const save = async (next = value) => {
    const text = String(next).trim();
    setEditing(false);
    if (text === (row.response || '')) return;
    setSaving(true);
    try {
      const { response } = await saveFolderResponse(folderId, row.id, text);
      onSaved(row.id, response);
    } catch (err) {
      showNotification({ title: 'Error', message: err.response?.data?.message || 'Could not save response', color: 'red' });
      setValue(row.response || '');
    } finally {
      setSaving(false);
    }
  };

  if (saving) return <Loader size="xs" />;

  if (editable && editing) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[220px]">
        <Autocomplete
          size="xs"
          autoFocus
          placeholder="Type a response"
          data={RESPONSE_SUGGESTIONS}
          value={value}
          onChange={setValue}
          onItemSubmit={(item) => save(item.value)}
          onBlur={() => save()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setValue(row.response || '');
              setEditing(false);
            }
          }}
          maxLength={255}
          withinPortal
        />
      </div>
    );
  }

  if (!editable) {
    return row.response ? <Text size="sm">{row.response}</Text> : <Text size="sm" color="dimmed">—</Text>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`group inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-md text-sm ${
        row.response ? 'text-gray-800 dark:text-white-light' : 'text-blue-600'
      }`}
    >
      {row.response ? (
        <>
          <span className="truncate">{row.response}</span>
          <IconPencil size={14} className="shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </>
      ) : (
        <>
          <IconPlus size={14} /> Add response
        </>
      )}
    </button>
  );
}

const FolderContext = createContext(null);

// "All Customers / Life Insurance (3) / My folder (2) ..." dropdown, in the person's own order (#11).
// Works anywhere inside <CustomerFolders>; renders nothing outside it.
export function CustomerFolderSelect({ className = '', ...rest }) {
  const ctx = useContext(FolderContext);
  const [manage, setManage] = useState(false);
  if (!ctx) return null;
  const { items, activeKey, setActiveKey, isAdmin, openLayout } = ctx;
  const data = [
    { value: 'all', label: 'All Customers' },
    ...items.map((f) => ({ value: f.key, label: `${f.type === 'personal' ? '📁 ' : ''}${f.name} (${f.customer_count})` })),
  ];
  const btnSize = rest.size === 'md' ? 'xl' : 'lg';
  return (
    <>
    <Select
      aria-label="Customer folder"
      data={data}
      value={activeKey || 'all'}
      onChange={(v) => setActiveKey(!v || v === 'all' ? null : v)}
      icon={<IconFolder size={16} />}
      radius="md"
      withinPortal
      // List can be wider than the small input (phone); it opens aligned to the right edge so it stays on screen,
      // and every option stays on one line.
      dropdownPosition="bottom-end"
      styles={{
        dropdown: { minWidth: 230 },
        item: { whiteSpace: 'nowrap' },
      }}
      className={className}
      {...rest}
    />
    {isAdmin ? (
      <>
        {/* One button (keeps the phone toolbar roomy): my folders + the admin's category settings. */}
        <Menu withinPortal shadow="md" width={210} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="light" color="blue" size={btnSize} radius={rest.radius || 'md'} aria-label="Folder settings" title="Folder settings" className="shrink-0">
              <IconSettings size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item icon={<IconFolders size={16} />} onClick={openLayout}>My folders &amp; order</Menu.Item>
            <Menu.Item icon={<IconSettings size={16} />} onClick={() => setManage(true)}>Manage categories</Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <CustomerCategoryManager opened={manage} onClose={() => setManage(false)} />
      </>
    ) : (
      <ActionIcon variant="light" color="blue" size={btnSize} radius={rest.radius || 'md'} onClick={openLayout} aria-label="My folders" title="My folders: create and arrange" className="shrink-0">
        <IconFolders size={18} />
      </ActionIcon>
    )}
    </>
  );
}

// Same layout as the "All Customers" table (header, search, buttons, table, mobile list); only the data differs.
function FolderCustomerList({ folder, isAdmin, onChanged }) {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFolderCustomers(folder.id);
      setRows(data.customers || []);
    } catch (err) {
      showNotification({ title: 'Error', message: 'Could not load customers in this folder', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [search, pageSize]);

  const openCustomer = (id) => router.push(isAdmin ? `/view-customer/${id}` : `/usereditcustomer/${id}`);
  const addCustomer = () => router.push(isAdmin ? '/create-customer' : '/useraddcustomer');
  const onSaved = (id, response) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, response } : r)));

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.full_name} from "${folder.name}"? The customer will not be deleted.`)) return;
    try {
      await removeFromFolder(folder.id, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onChanged();
      showNotification({ title: 'Removed', message: `${row.full_name} removed from ${folder.name}`, color: 'green' });
    } catch (err) {
      showNotification({ title: 'Error', message: err.response?.data?.message || 'Could not remove', color: 'red' });
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.full_name, r.phone_number, r.email, r.response].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);


  const actionsMenu = (row, size = 18) => (
    <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <Menu withinPortal shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" aria-label="More actions">
            <IconDotsVertical size={size} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item icon={<IconEye size={16} />} onClick={() => openCustomer(row.id)}>
            View
          </Menu.Item>
          {isAdmin && (
            <>
              <Menu.Divider />
              <Menu.Item color="red" icon={<IconFolderMinus size={16} />} onClick={() => remove(row)}>
                Remove from folder
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </div>
  );

  const countText = `${rows.length} ${rows.length === 1 ? 'Customer' : 'Customers'}`;

  return (
    <div className="panel mt-0 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      {/* Header / toolbar — same as All Customers */}
      <div className="mb-5 hidden flex-nowrap items-center gap-2 md:flex xl:gap-3">
        <div className="mr-1 min-w-0 max-w-[220px] shrink-0">
          <h5 className="truncate text-xl font-semibold leading-tight dark:text-white-light">{folder.name}</h5>
          <div className="whitespace-nowrap text-sm text-gray-500">{countText}</div>
        </div>

        <TextInput
          icon={<IconSearch size={16} />}
          placeholder="Search by name, phone or response"
          radius="xl"
          className="min-w-[140px] max-w-md flex-1"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
          <CustomerFolderSelect className="w-40 xl:w-52" />
          {isAdmin && <ToolbarButton icon={<IconUpload size={16} />} label="Upload CSV" onClick={() => setCsvOpen(true)} />}
          <ToolbarButton icon={<IconDownload size={16} />} label="Export" onClick={() => setExportOpen(true)} />
          <ToolbarButton variant="filled" icon={<IconPlus size={16} />} label="Add Customer" onClick={addCustomer} showFrom="lg" />
        </div>
      </div>

      {/* Desktop table — same style as All Customers */}
      <div className="datatables hidden md:block">
        <DataTable
          highlightOnHover
          verticalSpacing="sm"
          className="table-hover whitespace-nowrap"
          minHeight={loading || !visible.length ? 180 : undefined}
          fetching={loading}
          noRecordsText={rows.length ? 'No match for your search' : `No customers in ${folder.name} yet`}
          onRowClick={(record) => openCustomer(record.id)}
          rowStyle={() => ({ cursor: 'pointer' })}
          records={pageRows}
          columns={[
            {
              accessor: 'full_name',
              title: 'Name',
              render: (record) => {
                const initial = initialOf(record.full_name);
                return (
                  <div className="flex items-center gap-3">
                    <Avatar color={avatarColor(initial)} variant="light" radius="xl" size="md">{initial}</Avatar>
                    <div className="min-w-0">
                      <div className="font-medium">{record.full_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.phone_number}</div>
                    </div>
                  </div>
                );
              },
            },
            { accessor: 'email', title: 'Email', render: (r) => r.email || <Text color="dimmed" size="sm">—</Text> },
            {
              accessor: 'response',
              title: 'Response',
              render: (record) => <ResponseField row={record} folderId={folder.id} editable={isAdmin} onSaved={onSaved} />,
            },
            { accessor: 'added_at', title: 'Added', render: (r) => <span className="text-sm text-gray-500">{formatDate(r.added_at)}</span> },
            { accessor: 'actions', title: 'Actions', render: (record) => actionsMenu(record) },
          ]}
          totalRecords={visible.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          recordsPerPageOptions={PAGE_SIZES}
          onRecordsPerPageChange={setPageSize}
        />
      </div>

      {/* Mobile — same as All Customers */}
      <div className="block md:hidden">
        <div className="flex items-center gap-3 pb-2">
          <ActionIcon variant="subtle" color="dark" onClick={() => router.back()} aria-label="Back">
            <IconArrowLeft size={22} />
          </ActionIcon>
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold leading-tight dark:text-white-light">{folder.name}</div>
            <div className="text-sm text-gray-500">{countText}</div>
          </div>
        </div>

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

        <div className="mb-2 flex items-center py-2">
          <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconPlus size={18} />} onClick={addCustomer}>
            Add
          </Button>
          {isAdmin && (
            <>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconUpload size={18} />} onClick={() => setCsvOpen(true)}>
                Upload CSV
              </Button>
            </>
          )}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <Button className="flex-1" variant="subtle" color="blue" leftIcon={<IconDownload size={18} />} onClick={() => setExportOpen(true)}>
            Export
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader size="sm" />
          </div>
        ) : visible.length === 0 ? (
          <Text size="sm" color="dimmed" align="center" py="xl">
            {rows.length ? 'No match for your search' : `No customers in ${folder.name} yet`}
          </Text>
        ) : (
          <div className="px-1">
            {visible.map((row) => {
              const initial = initialOf(row.full_name);
              return (
                <div
                  key={row.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-200 py-2.5 last:border-b-0 dark:border-gray-700"
                  onClick={() => openCustomer(row.id)}
                >
                  <Avatar color={avatarColor(initial)} variant="light" radius="xl" size="lg">{initial}</Avatar>
                  <div className="min-w-0 flex-1">
                    <Text weight={500} lineClamp={1}>{row.full_name}</Text>
                    <Text size="xs" color="dimmed">{row.phone_number}</Text>
                    <div className="mt-0.5">
                      <ResponseField row={row} folderId={folder.id} editable={isAdmin} onSaved={onSaved} />
                    </div>
                  </div>
                  {actionsMenu(row)}
                </div>
              );
            })}
          </div>
        )}

        <ActionIcon
          size={56}
          radius="xl"
          variant="filled"
          color="blue"
          className="shadow-lg"
          style={{ position: 'fixed', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(80px + env(safe-area-inset-bottom))', zIndex: 50 }}
          onClick={addCustomer}
          aria-label="Add customer"
        >
          <IconPlus size={28} />
        </ActionIcon>
      </div>

      <CustomerExportModal opened={exportOpen} onClose={() => setExportOpen(false)} defaultFolderIds={[folder.id]} />

      {isAdmin && (
        <CsvCustomersUpload
          opened={csvOpen}
          onClose={() => setCsvOpen(false)}
          defaultFolderIds={[folder.id]}
          onSuccess={() => {
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// Wraps the customers page. "All Customers" shows the normal table (children); a category shows the customers
// in that product line with their response; a personal folder (#11/#12) shows the person's own list.
// Folders appear in the order the person arranged (categories and their own folders mixed).
export default function CustomerFolders({ isAdmin = false, children }) {
  const { folders, reload } = useCustomerFolders();
  const list = useFolderList();
  const [activeKey, setActiveKey] = useState(null);
  const [layoutOpen, setLayoutOpen] = useState(false);

  // If the personal-folder list could not load, fall back to the plain category list.
  const items = useMemo(() => {
    if (list.items.length) return list.items;
    return folders.map((f) => ({ type: 'category', id: f.id, key: `c:${f.id}`, name: f.name, customer_count: f.customer_count }));
  }, [list.items, folders]);
  const active = items.find((i) => i.key === activeKey) || null;
  const category = active?.type === 'category' ? folders.find((f) => f.id === active.id) || active : null;

  // A folder deleted (by the Super Admin, or by the person in "My folders") while open → back to all customers.
  useEffect(() => {
    if (activeKey && !list.loading && items.length && !active) setActiveKey(null);
  }, [items, activeKey, active, list.loading]);

  const onChanged = () => { reload(); list.reload(); };

  let body = children;
  if (active?.type === 'personal') {
    body = (
      <PersonalFolderView
        key={active.key}
        folder={active}
        isAdmin={isAdmin}
        folderSelect={<CustomerFolderSelect className="w-52" />}
      />
    );
  } else if (category) {
    body = <FolderCustomerList key={active.key} folder={category} isAdmin={isAdmin} onChanged={onChanged} />;
  }

  // The dropdown (CustomerFolderSelect) sits in the customers table toolbar and in the folder view header.
  return (
    <FolderContext.Provider value={{ items, activeKey, setActiveKey, isAdmin, openLayout: () => setLayoutOpen(true) }}>
      <ProductLineSummary items={items} activeKey={activeKey} onSelect={setActiveKey} />
      {body}
      <FolderLayoutManager opened={layoutOpen} onClose={() => setLayoutOpen(false)} />
    </FolderContext.Provider>
  );
}
