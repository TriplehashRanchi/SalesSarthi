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
  useMantineTheme,
  Title,
  Avatar,
  Stack,
} from '@mantine/core';
import { List } from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconAlertCircle, IconBrandWhatsapp, IconCalculator, IconHistory, IconListCheck, IconMenu4, IconUserCheck } from '@tabler/icons-react';
import IconChatDot   from '../icon/icon-chat-dot';
import IconFacebook  from '@/components/icon/icon-facebook';
import IconPencil    from '../icon/icon-pencil';

import FollowupForm  from '@/components/forms/followupform';
import CsvBulkUpload from '@/components/CsvUpload/CsvBulkUpload';

import { getAuth } from 'firebase/auth';
import IconX from '../icon/icon-x';
import IconChecks from '../icon/icon-checks';
import IconClock from '../icon/icon-clock';
import IconPhone from '../icon/icon-phone';

const LeadTable = ({ profile }) => {
  console.log('profile in leadtable', profile);
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
  // In LeadTable.js, with your other useState hooks
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState(null);

  const [isPolling, setIsPolling]               = useState(false);
  const [hasPolledInitially, setHasPolledInit]  = useState(false);

  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);
  const [filteredLeads, setFilteredLeads] = useState([]);

  const handleLoadMore = () => {
    // Increase the count by another 20 items
    setMobileVisibleCount(prevCount => prevCount + 20); 
};

  const [noteEditor, setNoteEditor] = useState({
    open : false,
    lead   : null,     // whole lead object
    text : '',       // working text
  });

  const theme = useMantineTheme(); // Get the theme
  

  const router   = useRouter();
  const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const statusOptions = [
    { value: 'Cold Lead',      label: 'Cold Lead' },
    { value: 'Hot Lead',       label: 'Hot Lead' },
    { value: 'Qualified Lead', label: 'Qualified Lead' },
    { value: 'Lost Lead',      label: 'Lost Lead' },
    { value: 'Follow-up',      label: 'Follow-up' },
    {value: 'Request deletion', label: 'Request deletion' } ,
    { value:'Fin Health Checkup Done', label:'Fin Health Checkup Done' },
  ];

  /* ───────────────────── helpers ───────────────────── */
  const fetchTeamMembers = async () => {
    try {
      const auth = getAuth(); const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users.');
      setTeamMembers(await res.json());
    } catch (err) {
      console.error(err); setTeamMembers([]);
    }
  };

  const fetchLeads = async (showOverlay = true) => {
    if (showOverlay) setLoading(true);
    try {
      const auth = getAuth(); const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      const { data } = await axios.get(`${API_URL}/api/leads/all`, {
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      });
      const sorted = (data || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setLeads(sorted);
    } catch (err) {
      console.error(err);
      if (showOverlay) { setError(err.message || 'Failed to load leads.'); setLeads([]); }
    } finally { if (showOverlay) setLoading(false); }
  };

  const pollFacebookLeads = async (manual = false) => {
    if (isPolling) return false;
    setIsPolling(true);

    if (manual) {
      showNotification({
        id:'fb-poll', title:'Polling Facebook Leads',
        message:'Checking for new leads from Facebook…',
        loading:true, autoClose:false, withCloseButton:false,
      });
    }

    try {
      const auth = getAuth(); const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      const { data } = await axios.post(`${API_URL}/api/fb/leads/poll`, {}, {
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      });
      const newCount = data?.newLeadsCount ?? 0;
      await fetchLeads(false);

      const notify = manual ? updateNotification : showNotification;
      notify({
        id:'fb-poll',
        title:'Polling Complete',
        message: newCount ? `Fetched ${newCount} new lead(s).` : 'No new leads this time.',
        color:'green', icon:<IconListCheck size={16}/>, loading:false, autoClose:5000,
      });
      return true;
    } catch (err) {
      console.error(err);
      showNotification({
        id:`fb-poll-error-${Date.now()}`, title:'Polling Failed',
        message: err.response?.data?.message || err.message,
        color:'red', icon:<IconAlertCircle size={16}/>, autoClose:7000,
      });
      return false;
    } finally {
      setIsPolling(false);
    }
  };

  // ───────── raw‑payload viewer ─────────
const [payloadViewer, setPayloadViewer] = useState({
  open : false,
  json : null,      // pretty‑string
  title: '',
});
function payloadToSections(raw = {}) {
  // convert string → object if necessary

  /* ---------- Payload ---------- */
  const payload =
    typeof raw === 'string' ? JSON.parse(raw) : raw;
console.log(payload);
  /* ---------- Answers ---------- */
  const answers = (payload.field_data || []).map((f) => ({
    label: f.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    value: f.values?.[0] || '—',
  }));


  /* ---------- Campaign / ad meta ---------- */
  const meta = [
    { label: 'Campaign ID', value: payload.campaign_id },
    { label: 'Adset ID',    value: payload.adgroup_id },
    { label: 'Ad ID',       value: payload.ad_id },
  ].filter((r) => r.value);

  return { answers, meta };
}



  /* ───────────────────── initial load ───────────────────── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        await fetchTeamMembers();
        await fetchLeads(false);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }

      if (!hasPolledInitially) {
        pollFacebookLeads(false).then(() => {
          setHasPolledInit(true);
        });
      }
    })();
    return () => { mounted = false; };
  }, []); // once

  /* ───────────────────── filter / sort / paginate ───────────────────── */
  useEffect(() => {
    let data = [...leads];
    // if (userId) data = data.filter(l => l.user_id === userId);
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
    setFilteredLeads(data);
    // const from = (page-1)*pageSize, to = from + pageSize;
    // setRecordsData(data.slice(from,to));
    
  }, [leads, search, statusFilter, sortStatus, ]);

  useEffect(() => {
    // This effect only runs when the full list or the page/pageSize changes.
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecordsData(filteredLeads.slice(from, to)); // Slices the full list for the desktop table

}, [filteredLeads, page, pageSize]);

  /* pagination safety */
  useEffect(() => {
    const pages = Math.ceil(totalFilteredRecords / pageSize);
    if (page > pages && pages > 0) setPage(pages);
    else if (pages === 0 && page !== 1) setPage(1);
  }, [totalFilteredRecords, pageSize, page]);

  // place this just after fetchTeamMembers (or anywhere before return)
  // ───────── assign selected leads to a team member ─────────
  const assignLeads = async () => {
    if (!selectedTeamMember) {
      alert('Please select a team member.');
      return;
    }
    if (!selectedLeads.length) {
      alert('No leads selected.');
      return;
    }

    try {
      const auth  = getAuth();
      const user  = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/admin/assign`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body   : JSON.stringify({ user_id: selectedTeamMember, leads: selectedLeads }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to assign leads.');
      }

      showNotification({ title:'Success', message:'Leads assigned successfully', color:'green' });
      setSelectedLeads([]);
      setSelectedTM(null);
      fetchLeads(false);                    // refresh list silently
    } catch (err) {
      console.error(err);
      showNotification({ title:'Error', message:err.message, color:'red' });
    }
  };

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
      <div className="panel p-2 mt-6 relative">
          {/* <LoadingOverlay visible={loading || isPolling} overlayBlur={2} /> */}

          {error && (
              <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                  {error}
              </Alert>
          )}

          {/* top controls */}
          <div className="mb-5 hidden md:flex flex-col gap-5 md:flex-row md:items-center">
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
                      theme="dark"
                      searchable
                  />
              </div>

              {/* facebook + csv buttons */}
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50" onClick={() => pollFacebookLeads(true)} disabled={isPolling}>
                  <span className="flex gap-2 items-center">
                      <IconFacebook /> Import from Facebook
                  </span>
              </button>

              <button onClick={() => setCsvOpen(true)} className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white rounded-lg">
                  CSV Bulk Upload
              </button>
          </div>
          <div className="hidden md:flex flex-col sm:flex-row gap-4 mb-4 items-center">
              {/* assign dropdown */}
              {teamMembers.length > 0 && (
                  <>
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
                  </>
              )}

              <Button color="red" variant="outline" onClick={deleteLeads} disabled={!selectedLeads.length}>
                  Delete ({selectedLeads.length})
              </Button>
          </div>

          {/* Mobile Controls */}
<div className="md:hidden flex flex-col gap-3 mb-5">
    {/* Line 1: Search */}
    <input
        className="form-input w-full text-sm"
        placeholder="Search Name, Email, Phone..."
        value={search}
        onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
        }}
    />

    {/* Line 2: Filter + Facebook + CSV */}
    <div className="flex gap-2 items-center">
        <div className="flex-1">
            <Select
                data={statusOptions}
                placeholder="Status"
                value={statusFilter}
                onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                }}
                clearable
                searchable
                theme="dark"
            />
        </div>

        <button
            className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
            onClick={() => pollFacebookLeads(true)}
            disabled={isPolling}
        >
            <IconFacebook className="inline w-4 h-4" />
        </button>

        <button
            onClick={() => setCsvOpen(true)}
            className="bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
        >
            CSV
        </button>
    </div>

    <div className="flex gap-2 items-center">
        {/* Assign dropdown */}
        {teamMembers.length > 0 && (
            <>
                <div className="flex-1 min-w-[140px]">
                    <Select
                        data={teamMembers.map((u) => ({
                            value: u.id.toString(),
                            label: `${u.username} (${u.role})`,
                        }))}
                        value={selectedTeamMember}
                        onChange={setSelectedTM}
                        placeholder="Assign selected to..."
                        searchable
                        clearable
                        className="w-full"
                    />
                </div>

                {/* Assign button */}
                <button
                    onClick={assignLeads}
                    disabled={!selectedTeamMember || !selectedLeads.length}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs disabled:opacity-50"
                >
                    Assign ({selectedLeads.length})
                </button>
            </>
        )}

        {/* Delete button */}
        <button
            onClick={deleteLeads}
            disabled={!selectedLeads.length}
            className="bg-red-500 text-white px-3 py-1 rounded-md text-xs disabled:opacity-50"
        >
            Delete ({selectedLeads.length})
        </button>
    </div>
</div>


          {/* table */}
          <div className="hidden md:block datatables dark:bg-gray-800 dark:text-gray-200">
              <DataTable
                  // className="dark:bg-gray-800 dark:text-gray-100"
                  withBorder
                  striped
                  highlightOnHover
                  borderRadius="sm"
                  records={recordsData}
                  columns={[
                      {
                          accessor: 'select',
                          width: '2%',
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
                      { accessor: 'full_name', title: 'Name', sortable: true  },
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
                          accessor: 'form_name',
                          title: 'Form',
                          width: '15%',
                          render: (r) => (
                              <Button
                                  variant="subtle"
                                  size="xs"
                                  onClick={() =>
                                      setPayloadViewer({
                                          open: true,
                                          data: payloadToSections(r.raw_payload), // ← parsed sections
                                          title: r.form_name || 'Unknown Form',
                                      })
                                  }
                              >
                                  {r.form_name || '—'}
                              </Button>
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
                      {
                          accessor: 'user_id',
                          title: 'Assigned To',
                          sortable: true,
                          render: ({ user_id }) => {
                              const u = teamMembers.find((t) => t.id === user_id);
                              return u ? u.username : <Text color="dimmed">Unassigned</Text>;
                          },
                      },
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
            onClick={() => router.push(`/editlead/${record.id}`)}
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
                const qs = new URLSearchParams({ id: record.id, name: record.full_name, phone: record.phone_number, email: record.email, doctor : profile.name  }).toString();
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
                  fetching={loading || isPolling}
                  paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} leads`}
                  styles={(currentTheme) => {
                      // Only apply these overrides if in dark mode to avoid breaking light mode
                      if (currentTheme.colorScheme === 'light') {
                          return {}; // Let Mantine handle light mode defaults
                      }

                      // Define your desired dark mode row colors
                      const darkEvenRowBg = currentTheme.colors.dark[7]; // Example: for even rows
                      const darkOddRowBg = currentTheme.colors.dark[6]; // Example: for striped (odd) rows
                      const darkHoverRowBg = currentTheme.colors.dark[5]; // Example: for hovered rows
                      const darkTextColor = currentTheme.colors.dark[0];
                      const darkBorderColor = currentTheme.colors.dark[4];

                      return {
                          // Target the root of the table if needed for overall context
                          root: {
                              // backgroundColor: currentTheme.colors.dark[8], // Overall table area, if not handled by parent
                          },
                          // Target table header cells
                          th: {
                              backgroundColor: `${currentTheme.colors.dark[7]} !important`, // Header background
                              color: `${darkTextColor} !important`,
                              borderColor: `${darkBorderColor} !important`,
                          },
                          // Target table body rows (tr)
                          tr: {
                              // Base background for ALL rows in dark mode (will be overridden by :nth-of-type for stripes)
                              backgroundColor: `${darkEvenRowBg} !important`,
                              color: `${darkTextColor} !important`, // Ensure text color
                              borderColor: `${darkBorderColor} !important`, // Ensure border color

                              // Override for striped (odd) rows in dark mode
                              '&:nth-of-type(odd)': {
                                  backgroundColor: `${darkOddRowBg} !important`,
                              },

                              // Override for hovered rows in dark mode
                              // This targets rows that have the data-hover attribute,
                              // which mantine-datatable should add if highlightOnHover is true.
                              '&[data-hover="true"]:hover, &:hover': {
                                  // Covering both general hover and mantine's specific
                                  backgroundColor: `${darkHoverRowBg} !important`,
                              },
                          },
                          // Target table data cells (td)
                          td: {
                              color: `${darkTextColor} !important`, // Ensure text color in cells
                              borderColor: `${darkBorderColor} !important`,
                              // Cells should be transparent to let <tr> background show
                              backgroundColor: 'transparent !important',
                          },
                      };
                  }}
              />
          </div>
          <div className="block md:hidden">
    <div className="md:hidden flex flex-col gap-4">
      {filteredLeads.slice(0, mobileVisibleCount).map((record) => {
        const isSelected = selectedLeads.includes(record.id);
        const u = teamMembers.find((t) => t.id === record.user_id);

        return (
           <div
            key={record.id}
            className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-2 text-sm flex flex-col gap-1 border"
              onClick={() => router.push(`/leadtable/${record.id}`)}
          >
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between">
              <span className="font-medium truncate text-sm max-w-[80%]">{record.full_name}</span>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() =>
                  setSelectedLeads((prev) =>
                    isSelected ? prev.filter((id) => id !== record.id) : [...prev, record.id]
                  )
                }
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>📞 {record.phone_number}</span>
              <Menu withinPortal shadow="md" position="bottom-start">
                <Menu.Target>
                  <Badge
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer px-1 text-[10px]"
                    color="blue"
                    variant="light"
                  >
                    {record.lead_status || 'Select'}
                  </Badge>
                </Menu.Target>
                <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                  {statusOptions.map((o) => (
                    <Menu.Item
                      key={o.value}
                      onClick={() => updateLeadStatus(record, o.value)}
                    >
                      {o.label}
                    </Menu.Item>
                    
                  ))}
                </Menu.Dropdown>
              </Menu>
            </div>

            <div className="text-xs text-gray-500">Assigned to: {u ? u.username : '—'}</div>

            <div onClick={(e) => e.stopPropagation()} className="flex justify-start flex-wrap gap-1 mt-1">
              <Button size="xs" compact variant="transparent" onClick={() => router.push(`/editlead/${record.id}`)}>
                <IconPencil size={12} />
              </Button>
              <Button
                size="xs"
                compact
                variant="transparent"
                onClick={() => {
                  const digits = (record.phone_number || '').replace(/\D/g, '');
                  const tenDigitNumber = digits.length === 12 && digits.startsWith('91')
                    ? digits.slice(2)
                    : digits.length === 10
                    ? digits
                    : null;

                  if (tenDigitNumber && /^[6-9]\d{9}$/.test(tenDigitNumber)) {
                    window.open(`https://wa.me/91${tenDigitNumber}?text=Hello ${record.full_name},`, '_blank');
                  } else {
                    alert('Invalid phone number');
                  }
                }}
              >
                <IconChatDot size={12} />
              </Button>
              <Button
                size="xs"
                compact
                variant="transparent"
                onClick={() => {
                  setSelectedLead(record);
                  setShowDrawer(true);
                  fetchFollowupHistory(record.id);
                }}
              >
                <IconHistory size={16} />
              </Button>
              <Button
                size="xs"
                compact
                variant="transparent"
                onClick={() => convertLeadToCustomer(record)}
              >
                Convert
              </Button>
              <Button
                size="xs"
                compact
                variant="transparent"
                onClick={() => {
                const qs = new URLSearchParams({ id: record.id, name: record.full_name, phone: record.phone_number, email: record.email }).toString();
                router.push(`/calc?${qs}`);
            }}
              >
                <IconCalculator size={12} />
              </Button>
              <Button
  size="xs"
  compact
  variant="light"
  onClick={() => {
    const digits = (record.phone_number || '').replace(/\D/g, '');
    const tel = digits.length ? `tel:${digits}` : '';
    if (tel) {
      window.open(tel, '_self');
    } else {
      alert('Phone number invalid');
    }
  }}
>
  <IconPhone size={12} />
</Button>

            </div>
          </div>
        );
      })}

      {mobileVisibleCount < filteredLeads.length && (
        <div className="mt-6 text-center">
            <Button
                variant="default"
                onClick={handleLoadMore}
            >
                Load More
            </Button>
        </div>
    )}

     
    </div>
</div>
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
          <Modal opened={payloadViewer.open} onClose={() => setPayloadViewer({ open: false, data: null, title: '' })} title={`Lead Details – ${payloadViewer.title}`} centered size="lg">
              {payloadViewer.data && (
                  <ScrollArea.Autosize mah={450}>
                      {/* Answers timeline */}
                      <Text weight={600} mb="xs">
                          Form Answers
                      </Text>
                      <Timeline active={payloadViewer.data.answers.length} bulletSize={16} lineWidth={2}>
                          {payloadViewer.data.answers.map((a, i) => (
                              <Timeline.Item key={i} title={a.label}>
                                  <Text size="sm" color="dimmed">
                                      {a.value}
                                  </Text>
                              </Timeline.Item>
                          ))}
                      </Timeline>

                      {/* Meta list */}
                      {payloadViewer.data.meta.length > 0 && (
                          <>
                              <Text weight={600} mt="md" mb="xs">
                                  Ad / Campaign
                              </Text>
                              <List spacing="xs" size="sm" withPadding>
                                  {payloadViewer.data.meta.map((m) => (
                                      <List.Item key={m.label}>
                                          <b>{m.label}:</b> {m.value}
                                      </List.Item>
                                  ))}
                              </List>
                          </>
                      )}
                  </ScrollArea.Autosize>
              )}
          </Modal>
      </div>
  );
};

export default LeadTable;
