'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import {
  Menu, Button, Drawer, Timeline, Divider, Text, ScrollArea,
  Badge, Checkbox, Select, LoadingOverlay, Alert,
} from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconAlertCircle, IconListCheck } from '@tabler/icons-react';

import IconMessage   from '../icon/icon-message';
import IconPhoneCall from '../icon/icon-phone-call';
import IconChatDot   from '../icon/icon-chat-dot';
import IconFacebook  from '@/components/icon/icon-facebook';
import IconPencil    from '../icon/icon-pencil';

import FollowupForm  from '@/components/forms/followupform';
import CsvBulkUpload from '@/components/CsvUpload/CsvBulkUpload';

import { getAuth } from 'firebase/auth';

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

  const [isPolling, setIsPolling]               = useState(false);
  const [hasPolledInitially, setHasPolledInit]  = useState(false);

  const router   = useRouter();
  const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const statusOptions = [
    { value: 'Cold Lead',      label: 'Cold Lead' },
    { value: 'Hot Lead',       label: 'Hot Lead' },
    { value: 'Qualified Lead', label: 'Qualified Lead' },
    { value: 'Lost Lead',      label: 'Lost Lead' },
    { value: 'Follow-up',      label: 'Follow-up' },
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
    } catch (error) {
        console.error('Error updating lead status:', error);
        alert(error.response?.data?.message || error.message || 'Failed to update status.');
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

  

  /* ───────────────────── render ───────────────────── */
  const currentIds = recordsData.map(l => l.id);
  const allSel  = currentIds.length && currentIds.every(id => selectedLeads.includes(id));
  const someSel = currentIds.length && currentIds.some(id => selectedLeads.includes(id));

  return (
    <div className="panel mt-6 relative">
      <LoadingOverlay visible={loading || isPolling} overlayBlur={2} />

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error!"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
          mb="md"
        >
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <Select
            data={statusOptions}
            placeholder="Filter by Status"
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            clearable searchable
          />
        </div>

        {/* facebook + csv buttons */}
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          onClick={() => pollFacebookLeads(true)}
          disabled={isPolling}
        >
          <span className="flex gap-2 items-center">
            <IconFacebook /> Import from Facebook
          </span>
        </button>

        <button
          onClick={() => setCsvOpen(true)}
          className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white rounded-lg"
        >
          CSV Bulk Upload
        </button>
      </div>

      {/* assign dropdown */}
      {teamMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
          <Select
            data={teamMembers.map(u => ({ value:u.id.toString(), label:`${u.username} (${u.role})` }))}
            value={selectedTeamMember}
            onChange={setSelectedTM}
            placeholder="Assign selected to..."
            searchable clearable style={{ minWidth:'200px' }}
          />
          <Button onClick={/* assignLeads */ () => assignLeads()} disabled={!selectedTeamMember || !selectedLeads.length}>
            Assign ({selectedLeads.length})
          </Button>
          <Button
             color="red"
             variant="outline"
             onClick={deleteLeads}
             disabled={!selectedLeads.length}
           >
             Delete ({selectedLeads.length})
           </Button>
        </div>
      )}

      {/* table */}
      <div className="datatables">
        <DataTable
          withBorder striped highlightOnHover borderRadius="sm"
          className="table-hover whitespace-nowrap"
          records={recordsData}
          columns={[
            {
              accessor:'select', width:'5%',
              title: (
                <Checkbox
                  checked={allSel}
                  indeterminate={someSel && !allSel}
                  onChange={e => {
                    const checked = e.currentTarget.checked;
                    setSelectedLeads(prev =>
                      checked
                        ? [...new Set([...prev, ...currentIds])]
                        : prev.filter(id => !currentIds.includes(id))
                    );
                  }}
                  aria-label="Select all"
                />
              ),
              render: r => (
                <Checkbox
                  aria-label={`Select ${r.full_name}`}
                  checked={selectedLeads.includes(r.id)}
                  onChange={() =>
                    setSelectedLeads(prev =>
                      prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                    )
                  }
                />
              ),
              textAlign:'center',
            },
            { accessor:'full_name',    title:'Name',  sortable:true },
            { accessor:'email',        title:'Email', sortable:true },
            { accessor:'phone_number', title:'Phone', sortable:true },
            {
              accessor:'lead_status', title:'Status', sortable:true,
              render: record => (
                <Menu withinPortal shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Badge
                      style={{ cursor:'pointer', minWidth:'100px' }}
                      color={
                        record.lead_status === 'Hot Lead'      ? 'red'
                      : record.lead_status === 'Cold Lead'     ? 'blue'
                      : record.lead_status === 'Qualified Lead'? 'green'
                      : record.lead_status === 'Lost Lead'     ? 'gray'
                      : 'orange'
                      }
                      variant="light"
                    >
                      {record.lead_status || 'Select Status'}
                    </Badge>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {statusOptions.map(o => (
                      <Menu.Item key={o.value} onClick={() => updateLeadStatus(record,o.value)}>
                        {o.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              ),
            },
            {
              accessor:'source', title:'Source', sortable:true,
              render: r =>
                r.source === 'facebook' ? (
                  <Badge color="blue"  variant="light">FB/Meta</Badge>
                ) : (
                  <Badge color="green" variant="light">{r.source || 'Manual'}</Badge>
                ),
            },
            {
              accessor:'user_id', title:'Assigned To', sortable:true,
              render: ({ user_id }) => {
                const u = teamMembers.find(t => t.id === user_id);
                return u ? u.username : <Text color="dimmed">Unassigned</Text>;
              },
            },
            {
              accessor:'actions', title:'Actions', textAlign:'right',
              render: record => (
                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Button variant="light" size="xs" compact><IconListCheck size={16}/></Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => router.push(`/editlead/${record.id}`)} icon={<IconPencil size={14}/>}>
                      Edit Lead
                    </Menu.Item>
                    <Menu.Item onClick={() => {
                      /* sendWhatsApp */
                      const num = record.phone_number || '';
                      if (/^[6-9]\d{9}$/.test(num.replace(/^91/,''))) {
                        window.open(`https://wa.me/${num.startsWith('91')?num:'91'+num}?text=Hello,`, '_blank');
                      } else alert('Invalid phone number');
                    }} icon={<IconChatDot size={14}/>}>
                      Send WhatsApp
                    </Menu.Item>
                    {/* <Menu.Item onClick={() => { setSelectedLead(record); setShowDrawer(true); fetchFollowupHistory(record.id); }} icon={<IconPhoneCall size={14}/>}>
                      Follow‑ups
                    </Menu.Item> */}
                    <Menu.Divider/>
                    <Menu.Item color="teal" onClick={() => convertLeadToCustomer(record)} icon={<IconListCheck size={14}/>}>
                      Convert to Customer
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
          onRecordsPerPageChange={size => { setPageSize(size); setPage(1); }}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          minHeight={200}
          noRecordsText="No leads found"
          fetching={loading || isPolling}
          paginationText={({from,to,totalRecords}) => `Showing ${from} to ${to} of ${totalRecords} leads`}
        />
      </div>

      {/* follow up drawer */}
      <Drawer
        opened={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedLead(null); setFollowupHistory([]); setExisting(null); }}
        title={`Follow‑ups for ${selectedLead?.full_name}`}
        position="right" size="lg" padding="md" shadow="md"
        styles={{ header:{background:'#f8f9fa',borderBottom:'1px solid #dee2e6'} }}
      >
        {selectedLead ? (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            <ScrollArea style={{ flexGrow:1, padding:'1rem' }}>
              <Text size="lg" weight={600} mb="md">Follow‑up Timeline</Text>
              {followupHistory.length ? (
                <Timeline active={followupHistory.length} bulletSize={24} lineWidth={2}>
                  {followupHistory.map((f,i) => (
                    <Timeline.Item key={f.id || i} bullet={<IconMessage size={14}/>} title={f.purpose || 'Follow‑up'}>
                      <Text size="xs" color="dimmed">
                        {f.follow_up_date ? new Date(f.follow_up_date).toLocaleString() : 'No Date'}
                      </Text>
                      <Badge color={f.status==='Pending'?'yellow':'green'} size="sm" mt={4}>
                        {f.status || 'N/A'}
                      </Badge>
                      <Text size="sm" mt={4}>{f.notes || '-'}</Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text align="center" color="dimmed" mt="xl">No follow‑up history found.</Text>
              )}
            </ScrollArea>

            <Divider/>
            <div style={{ padding:'1rem', borderTop:'1px solid #dee2e6', flexShrink:0 }}>
              <FollowupForm
                leadId={selectedLead.id}
                existingFollowUp={existingFollowUp}
                onFollowupChange={() => { fetchFollowupHistory(selectedLead.id); setExisting(null); }}
                onCancel   ={() => setExisting(null)}
              />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* csv modal */}
      <CsvBulkUpload
        opened={csvOpen}
        onClose={() => setCsvOpen(false)}
        onSuccess={() => { setCsvOpen(false); fetchLeads(); }}
      />
    </div>
  );
};

export default LeadTable;
