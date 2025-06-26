'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import {
  Menu, Button, Drawer, Timeline, Divider, Text, ScrollArea,
  Badge, Checkbox, Select, LoadingOverlay, Alert,
  Modal,
  Textarea,
  Group,
  ActionIcon,
  Title,
  Stack,
  Avatar,
} from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconAlertCircle, IconBrandWhatsapp, IconCalculator, IconDots, IconDotsVertical, IconHistory, IconListCheck, IconMenu2, IconMenu3, IconMenu4, IconUserCheck } from '@tabler/icons-react';
import IconPencil    from '../icon/icon-pencil';

import FollowupForm  from '@/components/forms/followupform';
import CsvBulkUpload from '@/components/CsvUpload/CsvBulkUploadUser';

import { getAuth } from 'firebase/auth';
import IconChecks from '../icon/icon-checks';
import IconClock from '../icon/icon-clock';
import IconX from '../icon/icon-x';
import IconMenu from '../icon/icon-menu';

const LeadTable = ({ userId }) => {
  /* ───────────────────── state ───────────────────── */
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZES      = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [recordsData, setRecordsData]         = useState([]);
  const [totalFilteredRecords, setTotalCount] = useState(0);
  const [search, setSearch]                   = useState('');
  const [sortStatus, setSortStatus]           = useState({ columnAccessor: 'created_at', direction: 'desc' });

  const [showDrawer, setShowDrawer]       = useState(false);
  const [selectedLead, setSelectedLead]   = useState(null);
  const [followupHistory, setFollowupHistory] = useState([]);
  const [existingFollowUp, setExisting]   = useState(null);

  const [teamMembers, setTeamMembers]         = useState([]);
  const [selectedLeads, setSelectedLeads]     = useState([]);
  const [selectedTeamMember, setSelectedTM]   = useState(null);

  const [csvOpen, setCsvOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState(null);


  const [noteEditor, setNoteEditor] = useState({
    open : false,
    lead   : null,     // whole lead object
    text : '',       // working text
  });
  

  const router   = useRouter();
  const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const statusOptions = [
    { value: 'Cold Lead',      label: 'Cold Lead' },
    { value: 'Hot Lead',       label: 'Hot Lead' },
    { value: 'Qualified Lead', label: 'Qualified Lead' },
    { value: 'Lost Lead',      label: 'Lost Lead' },
    { value: 'Follow-up',      label: 'Follow-up' },
    {value: 'Request deletion', label: 'Request deletion' },
    { value:'Fin Health Checkup Done', label:'Fin Health Checkup Done' },
  ];

  const fetchLeads = async (showOverlay = true) => {
    if (showOverlay) setLoading(true);
    try {
      const auth = getAuth(); const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      const { data } = await axios.get(`${API_URL}/api/users/leads`, {
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      });
      const sorted = (data || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setLeads(sorted);
    } catch (err) {
      console.error(err);
      if (showOverlay) { setError(err.message || 'Failed to load leads.'); setLeads([]); }
    } finally { if (showOverlay) setLoading(false); }
  };


  /* ───────────────────── initial load ───────────────────── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        await fetchLeads(false);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []); // once

  /* ───────────────────── filter / sort / paginate ───────────────────── */
  useEffect(() => {
    let data = leads;
    if (userId) data = data.filter(l => l.user_id === userId);
    data = data.filter(l => l.lead_status?.toLowerCase() !== 'customer');

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        l =>
          l.full_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone_number?.toLowerCase().includes(q) ||
          l.lead_status?.toLowerCase().includes(q) ||
          l.source?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) data = data.filter(l => l.lead_status === statusFilter);

    if (sortStatus.columnAccessor) {
      data = sortBy(data, sortStatus.columnAccessor);
      if (sortStatus.direction === 'desc') data.reverse();
    }

    setTotalCount(data.length);
    const from = (page-1)*pageSize, to = from + pageSize;
    setRecordsData(data.slice(from,to));
  }, [leads, search, statusFilter, sortStatus, page, pageSize, userId]);

  /* pagination safety */
  useEffect(() => {
    const pages = Math.ceil(totalFilteredRecords / pageSize);
    if (page > pages && pages > 0) setPage(pages);
    else if (pages === 0 && page !== 1) setPage(1);
  }, [totalFilteredRecords, pageSize, page]);

  // place this just after fetchTeamMembers (or anywhere before return)

  const updateLeadStatus = async (lead, newStatus) => {
    // No changes needed here
    if (!lead || !lead.id) return; // Basic validation
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated.');
        const token = await user.getIdToken();

        await axios.put(`
            ${API_URL}/api/leads/${lead.id}`,
            { lead_status: newStatus },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        // Update local state immediately
        setLeads((prevLeads) => prevLeads.map((l) => (l.id === lead.id ? { ...l, lead_status: newStatus } : l)));
        showNotification({ title:'Success', message:'Lead status updated successfully', color:'green' });
    } catch (error) {
        console.error('Error updating lead status:', error);
        alert(error.response?.data?.message || error.message || 'Failed to update status.');
    }
};


// ───────── helpers ─────────
const updateLeadNotes = async (lead, newNote) => {
    if (!lead?.id) return;
    try {
      const token = await getAuth().currentUser.getIdToken();
      await axios.put(`${API_URL}/api/leads/${lead.id}`,       // ⬅ same endpoint
        { notes: newNote },
        { headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json'} }
      );
      setLeads(prev =>
        prev.map(l => (l.id === lead.id ? { ...l, notes: newNote } : l))
      );
      showNotification({ title:'Success', message:'Notes updated successfully', color:'green' });
    } catch (err) {
      console.error(err);
      showNotification({ title:'Error', message: err.message, color:'red' });
    }
  };
  



  // ───────── delete selected leads ─────────
const deleteLeads = async () => {
  if (!selectedLeads.length) {
    alert('No leads selected.');
    return;
  }
  if (!confirm(`Delete ${selectedLeads.length} selected lead(s)?`)) return;

  try {
    const user  = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    const token = await user.getIdToken();

    await axios.post(
      `${API_URL}/api/leads/bulk-delete`,           // ← create this backend route
      { lead_ids: selectedLeads },
      { headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` } }
    );

    showNotification({ title:'Deleted', message:'Selected leads removed', color:'green' });
    setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
    setSelectedLeads([]);
  } catch (err) {
    showNotification({ title:'Error', message: err.message, color:'red' });
  }
};


  // ───────── get timeline for a lead ─────────
const fetchFollowupHistory = async (leadId) => {
    if (!leadId) return;
  
    try {
      const auth  = getAuth();
      const user  = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();
  
      const { data } = await axios.get(`${API_URL}/api/followups/${leadId}`, {
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      });
  
      setFollowupHistory(data || []);
    } catch (err) {
      console.error(err);
      setFollowupHistory([]);
      showNotification({
        title:'Follow‑up fetch failed',
        message: err.message,
        color:'yellow',
      });
    }
  };

  const convertLeadToCustomer = async (lead) => {
    // No changes needed here
    if (!lead || !lead.id) return;
    if (!confirm(`Are you sure you want to convert ${lead.full_name} to a customer? This lead will be removed from this table.`)) return;

    try {
        const auth = getAuth(); // Added auth check
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated.');
        const token = await user.getIdToken(); // Added token

        // IMPORTANT: Ensure your backend handles the conversion logic appropriately
        await axios.post(`
            ${API_URL}/api/leads/${lead.id}/convert`,
            {},
            {
                // Added empty body and headers
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        showNotification( { title:'success', message: `${lead.full_name} converted successfully!`, color:'green' });
        // Remove locally AND refetch for consistency
        setLeads((prevLeads) => prevLeads.filter((l) => l.id !== lead.id));
        // Consider a full fetchLeads() might be safer depending on backend logic
    } catch (error) {
        console.error('Error converting lead to customer:', error);
        showNotification( { title:'Error', message:error.response?.data?.message || error.message || 'Failed to convert lead.', color:'red' });
    }
};



// Helper function to format the date as "26th June 2025"
function formatDateWithOrdinal(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    // Function to get the ordinal suffix (st, nd, rd, th)
    const getOrdinal = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    };

    return `${day}${getOrdinal(day)} ${month} ${year}`;
}

  

  /* ───────────────────── render ───────────────────── */
  const currentIds = recordsData.map(l => l.id);
  const allSel  = currentIds.length && currentIds.every(id => selectedLeads.includes(id));
  const someSel = currentIds.length && currentIds.some(id => selectedLeads.includes(id));

  return (
      <div className="panel mt-6 relative">
          {error && (
              <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                  {error}
              </Alert>
          )}

          {/* top controls */}
          <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
              <h5 className="text-lg font-semibold dark:text-white-light">Lead Management</h5>

              {/* search + filter */}
              <div className="ltr:ml-auto rtl:mr-auto flex flex-col sm:flex-row gap-4">
                  <input
                      className="form-input w-auto"
                      placeholder="Search Name, Email, Phone..."
                      value={search}
                      onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                      }}
                  />
                  <Select
                      data={statusOptions}
                      placeholder="Filter by Status"
                      value={statusFilter}
                      onChange={(v) => {
                          setStatusFilter(v);
                          setPage(1);
                      }}
                      clearable
                      searchable
                  />
              </div>

              <button onClick={() => setCsvOpen(true)} className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white rounded-lg">
                  CSV Bulk Upload
              </button>
          </div>

          {/* assign dropdown */}
          {teamMembers.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
                  <Select
                      data={teamMembers.map((u) => ({ value: u.id.toString(), label: `${u.username} (${u.role})` }))}
                      value={selectedTeamMember}
                      onChange={setSelectedTM}
                      placeholder="Assign selected to..."
                      searchable
                      clearable
                      style={{ minWidth: '200px' }}
                  />
                  <Button onClick={/* assignLeads */ () => assignLeads()} disabled={!selectedTeamMember || !selectedLeads.length}>
                      Assign ({selectedLeads.length})
                  </Button>
                  <Button color="red" variant="outline" onClick={deleteLeads} disabled={!selectedLeads.length}>
                      Delete ({selectedLeads.length})
                  </Button>
              </div>
          )}

          {/* table */}
          <div className="datatables">
              <DataTable
                  withBorder
                  striped
                  highlightOnHover
                  borderRadius="sm"
                  className="table-hover whitespace-nowrap"
                  records={recordsData}
                  columns={[
                      {
                          accessor: 'select',
                          width: '5%',
                          title: (
                              <Checkbox
                                  checked={allSel}
                                  indeterminate={someSel && !allSel}
                                  onChange={(e) => {
                                      const checked = e.currentTarget.checked;
                                      setSelectedLeads((prev) => (checked ? [...new Set([...prev, ...currentIds])] : prev.filter((id) => !currentIds.includes(id))));
                                  }}
                                  aria-label="Select all"
                              />
                          ),
                          render: (r) => (
                              <Checkbox
                                  aria-label={`Select ${r.full_name}`}
                                  checked={selectedLeads.includes(r.id)}
                                  onChange={() => setSelectedLeads((prev) => (prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]))}
                              />
                          ),
                          textAlign: 'center',
                      },
                      { accessor: 'full_name', title: 'Name', sortable: true },
                      { accessor: 'email', title: 'Email', sortable: true },
                      { accessor: 'phone_number', title: 'Phone', sortable: true },
                      {
                          accessor: 'lead_status',
                          title: 'Status',
                          sortable: true,
                          render: (record) => (
                              <Menu withinPortal shadow="md" position="bottom-start">
                                  <Menu.Target>
                                      <Badge
                                          style={{ cursor: 'pointer', minWidth: '100px' }}
                                          color={
                                              record.lead_status === 'Hot Lead'
                                                  ? 'red'
                                                  : record.lead_status === 'Cold Lead'
                                                    ? 'blue'
                                                    : record.lead_status === 'Qualified Lead'
                                                      ? 'green'
                                                      : record.lead_status === 'Lost Lead'
                                                        ? 'gray'
                                                        : record.lead_status === 'Follow-up'
                                                          ? 'lime'
                                                          : record.lead_status === 'Fin Health Checkup Done'
                                                            ? 'teal'
                                                            : 'orange'
                                          }
                                          variant="light"
                                      >
                                          {record.lead_status || 'Select Status'}
                                      </Badge>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                      {statusOptions.map((o) => (
                                          <Menu.Item key={o.value} onClick={() => updateLeadStatus(record, o.value)}>
                                              {o.label}
                                          </Menu.Item>
                                      ))}
                                  </Menu.Dropdown>
                              </Menu>
                          ),
                      },
                      {
                          accessor: 'source',
                          title: 'Source',
                          sortable: true,
                          render: (r) =>
                              r.source === 'facebook' ? (
                                  <Badge color="blue" variant="light">
                                      FB/Meta
                                  </Badge>
                              ) : (
                                  <Badge color="green" variant="light">
                                      {r.source || 'Manual'}
                                  </Badge>
                              ),
                      },
                      {
                          accessor: 'notes',
                          title: 'Notes',
                          width: '10%',
                          render: (record) => (
                              <Button variant="subtle" size="xs" onClick={() => setNoteEditor({ open: true, lead: record, text: record.notes || '' })}>
                                  {/* show up to 15 chars as preview, or “Add” if empty */}
                                  {record.notes ? `${record.notes.slice(0, 15)}…` : 'Add'}
                              </Button>
                          ),
                      },
                      //   {
                      //       accessor: 'user_id',
                      //       title: 'Assigned To',
                      //       sortable: true,
                      //       render: ({ user_id }) => {
                      //           const u = teamMembers.find((t) => t.id === user_id);
                      //           return u ? u.username : <Text color="dimmed">Unassigned</Text>;
                      //       },
                      //   },
                      {
                          accessor: 'actions',
                          title: 'Actions',
                          textAlign: 'right',
                          render: (record) => (
                             <Menu withinPortal shadow="md" width={200} position="bottom-end">
    <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
            <IconMenu4 size={16} />
        </ActionIcon>
    </Menu.Target>

    <Menu.Dropdown>
        {/* All items are now in a single, clean list */}
        
        <Menu.Item
            icon={<IconPencil size={14} />}
            onClick={() => router.push(`/usereditlead/${record.id}`)}
        >
            {/* Using smaller text for a more compact feel */}
            <Text size="xs">Edit Lead</Text>
        </Menu.Item>

        <Menu.Item
            icon={<IconHistory size={14} />}
            onClick={() => {
                setSelectedLead(record);
                setShowDrawer(true);
                fetchFollowupHistory(record.id);
            }}
        >
            <Text size="xs">Follow-ups</Text>
        </Menu.Item>

        <Menu.Item
            icon={<IconBrandWhatsapp size={14} color="green" />}
            onClick={() => {
                const rawPhoneNumber = record.phone_number || '';
                // ... (robust phone number parsing logic here)
                if (!rawPhoneNumber.trim()) {
                    alert('Phone number is empty.');
                    return;
                }
                let digitsOnly = rawPhoneNumber.replace(/\D/g, '');
                let tenDigitNumber;
                if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
                    tenDigitNumber = digitsOnly.substring(2);
                } else if (digitsOnly.length === 10) {
                    tenDigitNumber = digitsOnly;
                } else {
                    alert('Invalid phone number length.');
                    return;
                }
                if (/^[6-9]\d{9}$/.test(tenDigitNumber)) {
                    const whatsAppLink = `https://wa.me/91${tenDigitNumber}?text=Hello ${record.full_name},`;
                    window.open(whatsAppLink, '_blank');
                } else {
                    alert('Invalid Indian mobile number format.');
                }
            }}
        >
            <Text size="xs">Send WhatsApp</Text>
        </Menu.Item>

        <Menu.Item
            icon={<IconCalculator size={14} />}
            onClick={() => {
                const qs = new URLSearchParams({ id: record.id, name: record.full_name, phone: record.phone_number, email: record.email }).toString();
                router.push(`/calc?${qs}`);
            }}
        >
            <Text size="xs">Health Check-up</Text>
        </Menu.Item>
        
        {/* To create a subtle visual break without a hard line, we can add a divider with very low opacity or just rely on spacing */}
        {/* For true minimalism, we omit the divider entirely */}

        <Menu.Item
            color="teal"
            icon={<IconUserCheck size={14} />}
            onClick={() => convertLeadToCustomer(record)}
        >
            <Text size="xs">Convert to Customer</Text>
        </Menu.Item>

    </Menu.Dropdown>
</Menu>
                          ),
                      },
                  ]}
                  totalRecords={totalFilteredRecords}
                  recordsPerPage={pageSize}
                  page={page}
                  onPageChange={setPage}
                  recordsPerPageOptions={PAGE_SIZES}
                  onRecordsPerPageChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                  }}
                  sortStatus={sortStatus}
                  onSortStatusChange={setSortStatus}
                  minHeight={200}
                  noRecordsText="No leads found"
                  fetching={loading}
                  paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} leads`}
              />
          </div>

          {/* follow up drawer */}
          <Drawer
              opened={showDrawer}
              onClose={() => {
                  setShowDrawer(false);
                  setSelectedLead(null);
                  setFollowupHistory([]);
                  setExisting(null);
              }}
              // The title is now part of our custom layout, not a prop
              withCloseButton={false} // We will render our own close button
              position="right"
              size="lg"
              padding="lg"
              shadow="md"
              zIndex={1001}
          >
              {selectedLead ? (
                  // THE LAYOUT CONTAINER: Fills the entire screen height
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                      {/* PART 1: THE FIXED HEADER */}
                      <Group
                          position="apart"
                          style={{
                              borderBottom: '1px solid var(--mantine-color-gray-2)',
                              flexShrink: 0, // Prevent shrinking
                          }}
                      >
                          <Title className="mb-2 -mt-4" order={5}>
                              Follow‑ups for {selectedLead.full_name}
                          </Title>
                          <ActionIcon className="mb-2 -mt-4" onClick={() => setShowDrawer(false)}>
                              <IconX size={18} />
                          </ActionIcon>
                      </Group>

                      {/* PART 2: THE SCROLLABLE TIMELINE */}
                      {/* `flex: 1` allows this area to grow and shrink, consuming all available space */}
                      <ScrollArea style={{ flex: 1, padding: 'var(--mantine-spacing-lg)' }}>
                          {followupHistory.length ? (
                              <Timeline className="mt-4" active={-1} bulletSize={32} lineWidth={2}>
                                  {followupHistory.map((f) => (
                                      <Timeline.Item
                                          key={f.id}
                                          style={{ paddingBottom: 'var(--mantine-spacing-md)' }} // Adds space between items
                                          bullet={
                                              <Avatar size={24} radius="xl" color={f.status === 'Completed' ? 'green' : 'orange'} variant="light">
                                                  {f.status === 'Completed' ? <IconChecks size={16} /> : <IconClock size={16} />}
                                              </Avatar>
                                          }
                                          title={
                                              // BOLD AND LARGER FONT FOR THE DATE/TIME HEADER
                                              <Group position="apart" align="center">
                                                  <Text weight={600} size="md">
                                                      {new Date(f.follow_up_date).toLocaleTimeString(undefined, {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })}{' '}
                                                      on {formatDateWithOrdinal(f.follow_up_date)}
                                                  </Text>

                                                  <ActionIcon size="sm" variant="subtle" onClick={() => setExisting(f)}>
                                                      <IconPencil size={16} />
                                                  </ActionIcon>
                                              </Group>
                                          }
                                      >
                                          <Stack spacing={4} mt={2}>
                                              {/* MEDIUM WEIGHT FOR THE PURPOSE/SUBHEADING */}
                                              <Text weight={500} size="md">
                                                  {f.purpose || 'Follow-up'}
                                              </Text>

                                              {/* Notes are clearly distinct */}
                                              {f.notes && (
                                                  <Text color="blue" size="sm" mt="none">
                                                      {f.notes}
                                                  </Text>
                                              )}

                                              {/* Final metadata line */}
                                              <Text color="dimmed" size="xs" mt="0">
                                                  Created by: <strong>{f.creator_name || 'System'}</strong>
                                              </Text>
                                          </Stack>
                                      </Timeline.Item>
                                  ))}
                              </Timeline>
                          ) : (
                              <Text align="center" color="dimmed" mt="xl">
                                  No follow-up history found.
                              </Text>
                          )}
                      </ScrollArea>

                      {/* PART 3: THE FIXED FORM AT THE BOTTOM */}
                      <div
                          className="mb-8"
                          style={{
                              padding: 'var(--mantine-spacing-md)',
                              borderTop: '1px solid var(--mantine-color-gray-2)',
                              backgroundColor: 'var(--mantine-color-body)',
                              flexShrink: 0, // Prevent shrinking
                          }}
                      >
                          <FollowupForm
                              leadId={selectedLead.id}
                              existingFollowUp={existingFollowUp}
                              onFollowupChange={() => {
                                  fetchFollowupHistory(selectedLead.id);
                                  setExisting(null);
                              }}
                              onCancel={() => setExisting(null)}
                          />
                      </div>
                  </div>
              ) : null}
          </Drawer>

          {/* csv modal */}
          <CsvBulkUpload
              opened={csvOpen}
              onClose={() => setCsvOpen(false)}
              onSuccess={() => {
                  setCsvOpen(false);
                  fetchLeads();
              }}
          />

          {/* ───────── Notes Modal ───────── */}
          <Modal opened={noteEditor.open} onClose={() => setNoteEditor({ open: false, lead: null, text: '' })} title={`Notes – ${noteEditor.lead?.full_name || ''}`} centered size="md">
              <Textarea minRows={4} autosize placeholder="Type your note…" value={noteEditor.text} onChange={(e) => setNoteEditor((prev) => ({ ...prev, text: e.target.value }))} />

              <Group position="right" mt="md">
                  <Button
                      onClick={() => {
                          updateLeadNotes(noteEditor.lead, noteEditor.text.trim());
                          setNoteEditor({ open: false, lead: null, text: '' });
                      }}
                  >
                      Save
                  </Button>
              </Group>
          </Modal>
      </div>
  );
};

export default LeadTable;
