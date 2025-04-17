'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import { Menu, Button, Drawer, Timeline, Divider, Text, ScrollArea, Badge, Checkbox, Select, LoadingOverlay, Alert } from '@mantine/core'; // Added LoadingOverlay, Alert
import IconMessage from '../icon/icon-message';
import FollowupForm from '@/components/forms/followupform'; // Ensure path is correct
import IconPhoneCall from '../icon/icon-phone-call';
import IconListCheck from '../icon/icon-list-check';
import IconChatDot from '../icon/icon-chat-dot';
import IconPencil from '../icon/icon-pencil';
import { getAuth } from 'firebase/auth'; // 🔹 Firebase Auth
import { IconAlertCircle } from '@tabler/icons-react'; // For error alert
import { showNotification } from '@mantine/notifications';

const LeadTable = ({ userId }) => {
    const [leads, setLeads] = useState([]); // Raw fetched leads
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [recordsData, setRecordsData] = useState([]); // Paginated data for the table
    const [totalFilteredRecords, setTotalFilteredRecords] = useState(0); // ** NEW: Total after filtering **
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState({
        columnAccessor: 'full_name',
        direction: 'asc',
    });

    // Drawer and selection states
    const [showDrawer, setShowDrawer] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [followupHistory, setFollowupHistory] = useState([]);
    const [existingFollowUp, setExistingFollowUp] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [selectedTeamMember, setSelectedTeamMember] = useState(null);

    // Filtering state
    const [statusFilter, setStatusFilter] = useState('');

    // Loading/Error state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // --- Add these lines ---
    const [isPolling, setIsPolling] = useState(false);
    const [hasPolledInitially, setHasPolledInitially] = useState(false);
    // --- End of addition ---

    const statusOptions = [
        { value: 'Cold Lead', label: 'Cold Lead' },
        { value: 'Hot Lead', label: 'Hot Lead' },
        { value: 'Qualified Lead', label: 'Qualified Lead' },
        { value: 'Lost Lead', label: 'Lost Lead' },
        { value: 'Follow-up', label: 'Follow-up' },
        // Add other potential statuses if needed
    ];

    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // --- Data Fetching ---
    // const fetchLeads = async () => {
    //     setLoading(true);
    //     setError(null);
    //     try {
    //         const auth = getAuth();
    //         const user = auth.currentUser;
    //         if (!user) throw new Error('User not authenticated.');
    //         const token = await user.getIdToken();
    //         const response = await axios.get(`${API_URL}/api/leads/all`, {
    //             // Assuming admin view, adjust if user-specific
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         });
    //         setLeads(response.data || []);
    //     } catch (err) {
    //         console.error('Error fetching leads:', err);
    //         setError(err.message || 'Failed to load leads.');
    //         setLeads([]); // Clear leads on error
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const fetchFollowupHistory = async (leadId) => {
        // No changes needed here
        try {
            const auth = getAuth(); // Added auth check
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken(); // Added token

            const response = await axios.get(`${API_URL}/api/followups/${leadId}`, {
                // Use correct leadId
                headers: {
                    // Add headers
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            setFollowupHistory(response.data || []);

            // Update latest followup info (optional, seems complex and might be better handled differently)
            // const latestFollowup = response.data[0];
            // setLeads((prevLeads) => ... ); // This local update might cause inconsistencies
        } catch (error) {
            console.error('Error fetching follow-up history:', error);
            setFollowupHistory([]); // Clear on error
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

            await axios.put(
                `${API_URL}/api/leads/${lead.id}`,
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

    const fetchTeamMembers = async () => {
        // No changes needed here, added try/catch just in case
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const response = await fetch(`${API_URL}/api/admin/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch users.');
            const data = await response.json();
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
            setTeamMembers([]); // Clear on error
        }
    };

    const assignLeads = async () => {
        // No changes needed here
        if (!selectedTeamMember) {
            alert('Please select a team member.');
            return;
        }
        if (!selectedLeads || selectedLeads.length === 0) {
            alert('No leads selected.');
            return;
        }
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const response = await fetch(`${API_URL}/api/admin/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ user_id: selectedTeamMember, leads: selectedLeads }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to assign leads.');
            }
            showNotification({ title: 'Success', message: 'Leads assigned successfully', color: 'green' });
            setSelectedLeads([]);
            setSelectedTeamMember(null);
            fetchLeads(); // Refresh leads to show updated assignments
        } catch (error) {
            console.error('Error assigning leads:', error);
            showNotification({ title: 'Error', message: error.message || 'Failed to assign leads', color: 'red' });
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
            await axios.post(
                `${API_URL}/api/leads/${lead.id}/convert`,
                {},
                {
                    // Added empty body and headers
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            alert(`${lead.full_name} converted successfully!`);
            // Remove locally AND refetch for consistency
            setLeads((prevLeads) => prevLeads.filter((l) => l.id !== lead.id));
            // Consider a full fetchLeads() might be safer depending on backend logic
        } catch (error) {
            console.error('Error converting lead to customer:', error);
            alert(error.response?.data?.message || error.message || 'Failed to convert lead.');
        }
    };

// --- Data Fetching Functions ---

const fetchLeads = async (showLoading = true) => { // Added showLoading parameter
  if (showLoading) setLoading(true); // Control main loading overlay
  // setError(null); // Decide if you want to clear errors on every fetch
  try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/leads/all`, { // Adjust endpoint if needed (e.g., user-specific)
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
          },
      });
      setLeads(response.data || []); // Update the main leads state
  } catch (err) {
      console.error('Error fetching leads:', err);
      // Only set error if this was an explicit, user-facing load attempt
      if (showLoading) {
          setError(err.message || 'Failed to load leads.');
          setLeads([]); // Clear leads on explicit fetch error
      }
      // Don't clear leads or set error if it's a background refresh failing
  } finally {
      // Only stop main loading overlay if it was started by this call
      if (showLoading) setLoading(false);
  }
};

const pollFacebookLeads = async (manualTrigger = false) => {
  // Prevent polling if already in progress
  if (isPolling) {
      console.log("Polling already in progress, skipping.");
      return false; // Indicate poll didn't run
  }

  setIsPolling(true); // Set polling specific loading state
  if (manualTrigger) {
      // Show starting notification only if user clicked the button
      notifications.show({
          id: 'fb-poll-start',
          title: 'Polling Facebook Leads',
          message: 'Checking for new leads from Facebook...',
          loading: true,
          autoClose: false, // Keep open until updated
          withCloseButton: false,
      });
  }

  try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');
      const token = await user.getIdToken();

      // Call the backend endpoint to trigger the poll
      const response = await axios.post(`${API_URL}/api/fb/leads/poll`, {}, {
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
          }
      });

      const newLeadsCount = response.data?.newLeadsCount ?? 0; // Default to 0 if undefined

      // ** CRUCIAL: Fetch the updated leads list AFTER the poll is successful **
      // Pass `false` to fetchLeads so it doesn't trigger the main loading overlay again
      await fetchLeads(false);

      // Update/Show notification on success
      // Only show full success message if manually triggered OR if new leads were found
      if (manualTrigger || newLeadsCount > 0) {
           // Use update if manualTrigger, otherwise use show for automatic poll finding leads
           const notificationMethod = manualTrigger ? notifications.update : notifications.show;
           notificationMethod({
               id: 'fb-poll-start', // Use same ID for update, or a new one for show
               title: 'Polling Complete',
               message: newLeadsCount > 0
                   ? `Successfully fetched ${newLeadsCount} new lead(s). Table refreshed.`
                   : 'No new leads found this time.', // Slightly different message if manual but 0 found
               color: 'green',
               icon: <IconListCheck size={16} />, // Optional success icon
               loading: false,
               autoClose: 5000,
               withCloseButton: true,
           });
      }
      return true; // Indicate polling success

  } catch (error) {
      console.error('Error polling Facebook leads:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to poll Facebook leads.';

      // Show error notification regardless of trigger
      notifications.show({
          id: 'fb-poll-error-' + Date.now(), // Unique ID for error notification
          title: 'Polling Failed',
          message: errorMsg,
          color: 'red',
          icon: <IconAlertCircle size={16} />, // Optional error icon
          autoClose: 7000, // Keep error visible longer
      });
      return false; // Indicate polling failure
  } finally {
      setIsPolling(false); // Always reset polling state
  }
};

// ⬇️ inside LeadTable – replace the whole initializeTable useEffect
useEffect(() => {
    let isMounted = true;                     // avoid setting state after unmount
  
    const initializeTable = async () => {
      setLoading(true);
      setError(null);
  
      try {
        // 1️⃣ ALWAYS get team list (needed for the “Assigned To” column)
        await fetchTeamMembers();
  
        // 2️⃣ Get whatever is already in your DB FIRST
        await fetchLeads(false);              // no extra overlay – we already have one
  
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load leads');
      } finally {
        if (isMounted) setLoading(false);     // let the table render ASAP
      }
  
      // 3️⃣ Kick off FB polling *after* the UI is visible
      //    We don't await it – the user can start working instantly.
      pollFacebookLeads(false)
        .then((success) => {
          if (success && isMounted) {
            // Poll found new leads → refresh silently
            fetchLeads(false);
          }
        })
        .catch((err) => {
          console.error('FB poll error:', err);
          // Nice‑to‑have: non‑blocking yellow toast
          notifications.show({
            title: 'Facebook sync skipped',
            message: err.message,
            color: 'yellow',
          });
        });
    };
  
    initializeTable();
  
    // cleanup
    return () => { isMounted = false; };
  }, []);         // run once on mount
  

    // ** REVISED useEffect for Filtering, Sorting, Pagination **
    useEffect(() => {
        let filteredData = leads;

        // Filter by userId (if applicable)
        if (userId) {
            filteredData = filteredData.filter((item) => item.user_id === userId);
        }

        // Filter out 'Customer' status
        filteredData = filteredData.filter((item) => item.lead_status?.toLowerCase() !== 'customer');

        // Filter by search term
        if (search) {
            const lowerSearch = search.toLowerCase();
            filteredData = filteredData.filter(
                (item) =>
                    item.full_name?.toLowerCase().includes(lowerSearch) ||
                    item.email?.toLowerCase().includes(lowerSearch) ||
                    item.phone_number?.toLowerCase().includes(lowerSearch) ||
                    item.lead_status?.toLowerCase().includes(lowerSearch) || // Also search status
                    item.source?.toLowerCase().includes(lowerSearch), // Also search source
            );
        }

        // Filter by selected status
        if (statusFilter) {
            filteredData = filteredData.filter((item) => item.lead_status === statusFilter);
        }

        // Sorting
        if (sortStatus.columnAccessor) {
            filteredData = sortBy(filteredData, sortStatus.columnAccessor);
            if (sortStatus.direction === 'desc') {
                filteredData.reverse();
            }
        }

        // ** Set the total count AFTER filtering **
        setTotalFilteredRecords(filteredData.length);

        // Apply pagination to the filtered and sorted data
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(filteredData.slice(from, to));
    }, [search, statusFilter, userId, sortStatus, page, pageSize, leads]); // Dependencies

    // ** NEW useEffect to correct page number if it becomes invalid **
    useEffect(() => {
        const totalPages = Math.ceil(totalFilteredRecords / pageSize);
        // If current page is greater than the new total pages, reset to the last valid page
        if (page > totalPages && totalPages > 0) {
            setPage(totalPages);
        }
        // If filters result in no pages, but page is not 1, reset to 1
        else if (totalPages === 0 && page !== 1) {
            setPage(1);
        }
        // Ensure page is at least 1 if there are records and page somehow became 0
        else if (page < 1 && totalFilteredRecords > 0) {
            setPage(1);
        }
    }, [totalFilteredRecords, pageSize, page]); // Watch these

    // --- Other Event Handlers ---
    const openFollowupDrawer = (lead) => {
        setSelectedLead(lead);
        fetchFollowupHistory(lead.id); // Fetch history when opening
        setShowDrawer(true);
    };

    const closeFollowupDrawer = () => {
        setShowDrawer(false);
        setSelectedLead(null);
        setFollowupHistory([]);
        setExistingFollowUp(null);
    };

    const handleEditLead = (lead) => {
        if (lead && lead.id) {
            router.push(`/editlead/${lead.id}`);
        }
    };

    const sendWhatsappMessage = (phoneNumber) => {
        if (!phoneNumber) {
            alert('Phone number not available.');
            return;
        }
        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber; // Remove leading + if present
        // Basic Indian number check (adjust if needed)
        if (!/^[6-9]\d{9}$/.test(formattedPhoneNumber.replace(/^91/, ''))) {
            alert('Invalid Indian phone number format.');
            return;
        }
        const finalPhoneNumber = formattedPhoneNumber.startsWith('91') ? formattedPhoneNumber : `91${formattedPhoneNumber}`;
        const message = encodeURIComponent('Hello, '); // Customize message
        const link = `https://wa.me/${finalPhoneNumber}?text=${message}`;
        window.open(link, '_blank');
    };

    const handleEditFollowup = (followup) => {
        setExistingFollowUp(followup);
    };

    const toggleLeadSelection = (leadId) => {
        setSelectedLeads((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]));
    };

    const toggleSelectAll = (checked) => {
        // Select only the IDs currently visible in recordsData after filtering/pagination
        const currentRecordIds = recordsData.map((lead) => lead.id);
        if (checked) {
            // Add only the current page's leads to the selection, avoiding duplicates
            setSelectedLeads((prev) => [...new Set([...prev, ...currentRecordIds])]);
        } else {
            // Remove the current page's leads from the selection
            setSelectedLeads((prev) => prev.filter((id) => !currentRecordIds.includes(id)));
        }
    };

    // Calculate checked/indeterminate state for the header checkbox based on *current page*
    const currentRecordIds = recordsData.map((lead) => lead.id);
    const allCurrentPageSelected = currentRecordIds.length > 0 && currentRecordIds.every((id) => selectedLeads.includes(id));
    const someCurrentPageSelected = currentRecordIds.length > 0 && currentRecordIds.some((id) => selectedLeads.includes(id));

    return (
        <div className="panel mt-6 relative">
            {/* Loading Overlay */}
            <LoadingOverlay visible={loading || isPolling} overlayBlur={2} />

            {/* Error Alert */}
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                    {error}
                </Alert>
            )}

            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                <h5 className="text-lg font-semibold dark:text-white-light">Lead Management</h5>
                {/* Search and Filter */}
                <div className="ltr:ml-auto rtl:mr-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <input
                        type="text"
                        className="form-input w-auto"
                        placeholder="Search Name, Email, Phone..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }} // Reset page on search
                    />
                    <Select
                        data={statusOptions}
                        placeholder="Filter by Status"
                        value={statusFilter}
                        onChange={(value) => {
                            setStatusFilter(value);
                            setPage(1);
                        }} // Reset page on filter change
                        clearable
                        searchable
                    />
                </div>
            </div>
            {/* Assignment Controls (only if team members exist) */}
            {teamMembers.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
                    <Select
                        data={teamMembers.map((tm) => ({ value: tm.id.toString(), label: `${tm.username} (${tm.role}) ` }))} // Ensure value is string if needed by Select
                        value={selectedTeamMember}
                        onChange={setSelectedTeamMember}
                        placeholder="Assign selected to..."
                        searchable
                        clearable
                        style={{ minWidth: '200px' }}
                    />
                    <Button onClick={assignLeads} disabled={!selectedTeamMember || selectedLeads.length === 0}>
                        Assign ({selectedLeads.length})
                    </Button>
                </div>
            )}

            {/* Optional: Poll Button */}
            {/* <Button onClick={pollFacebookLeads} className="mb-4" variant="outline">
                 Poll Facebook Leads
             </Button> */}

            <div className="datatables">
                <DataTable
                    withBorder // Mantine style prop
                    borderRadius="sm" // Mantine style prop
                    striped // Mantine style prop
                    highlightOnHover
                    className="table-hover whitespace-nowrap" // Keep existing class if needed
                    records={recordsData} // Use paginated data
                    columns={[
                        {
                            accessor: 'select',
                            width: '5%', // Adjust width
                            title: (
                                <Checkbox
                                    // Logic based on current page's selection state
                                    checked={allCurrentPageSelected}
                                    indeterminate={someCurrentPageSelected && !allCurrentPageSelected}
                                    onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                                    aria-label="Select all leads on current page"
                                />
                            ),
                            render: (record) => <Checkbox aria-label={`Select lead ${record.full_name}`} checked={selectedLeads.includes(record.id)} onChange={() => toggleLeadSelection(record.id)} />,
                            textAlign: 'center',
                        },
                        { accessor: 'full_name', title: 'Name', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone_number', title: 'Phone', sortable: true },
                        {
                            accessor: 'lead_status',
                            title: 'Status',
                            sortable: true, // Make status sortable
                            render: (record) => (
                                <Menu withinPortal shadow="md" position="bottom-start">
                                    <Menu.Target>
                                        <Badge
                                            style={{ cursor: 'pointer', minWidth: '100px' }} // Ensure badge is clickable
                                            color={
                                                record.lead_status === 'Hot Lead'
                                                    ? 'red'
                                                    : record.lead_status === 'Cold Lead'
                                                      ? 'blue'
                                                      : record.lead_status === 'Qualified Lead'
                                                        ? 'green'
                                                        : record.lead_status === 'Lost Lead'
                                                          ? 'gray'
                                                          : 'orange'
                                            }
                                            variant="light" // Or 'filled' or 'outline'
                                        >
                                            {record.lead_status || 'Select Status'}
                                        </Badge>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        {statusOptions.map((option) => (
                                            <Menu.Item key={option.value} onClick={() => updateLeadStatus(record, option.value)}>
                                                {option.label}
                                            </Menu.Item>
                                        ))}
                                    </Menu.Dropdown>
                                </Menu>
                            ),
                        },
                        {
                            accessor: 'source',
                            title: 'Source',
                            sortable: true, // Make source sortable
                            render: (record) =>
                                record.source === 'facebook' ? (
                                    <Badge color="blue" variant="light">
                                        FB/Meta
                                    </Badge>
                                ) : (
                                    <Badge color="green" variant="light">
                                        {record.source || 'Manual'}
                                    </Badge> // Show actual source or default
                                ),
                        },
                        {
                            accessor: 'user_id', // Sort based on user_id
                            title: 'Assigned To',
                            sortable: true, // Make Assigned To sortable
                            render: ({ user_id }) => {
                                const assignedUser = teamMembers.find((user) => user.id === user_id);
                                return <div>{assignedUser ? assignedUser.username : <Text color="dimmed">Unassigned</Text>}</div>;
                            },
                        },
                        {
                            accessor: 'actions',
                            title: 'Actions',
                            textAlign: 'right',
                            render: (record) => (
                                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <Button variant="light" size="xs" compact>
                                            {' '}
                                            {/* Use Mantine button */}
                                            <IconListCheck size={16} />
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item onClick={() => handleEditLead(record)} icon={<IconPencil size={14} />}>
                                            Edit Lead
                                        </Menu.Item>
                                        <Menu.Item onClick={() => sendWhatsappMessage(record.phone_number)} icon={<IconChatDot size={14} />}>
                                            Send WhatsApp
                                        </Menu.Item>
                                        {/* Show Follow-up only if needed - uncomment columns if re-adding */}
                                        <Menu.Item onClick={() => openFollowupDrawer(record)} icon={<IconPhoneCall size={14} />}>
                                            Follow-ups
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item color="teal" onClick={() => convertLeadToCustomer(record)} icon={<IconListCheck size={14} />}>
                                            Convert to Customer
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            ),
                        },
                    ]}
                    // ** Pass the correct total records count **
                    totalRecords={totalFilteredRecords}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage} // Directly use setPage
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setPage(1); // Reset page to 1 when page size changes
                    }}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    minHeight={200} // Prevent collapse when empty
                    noRecordsText="No leads found matching your criteria"
                    fetching={loading || isPolling} // < // Show loading state on the table itself
                    paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} leads`}
                />
            </div>

            {/* Follow-up Drawer */}
            <Drawer
                opened={showDrawer}
                onClose={closeFollowupDrawer}
                title={`Follow-ups for ${selectedLead?.full_name || 'Lead'}`}
                position="right"
                size="lg"
                padding="md"
                shadow="md"
                styles={{
                    header: { backgroundColor: '#f8f9fa', padding: '1rem', borderBottom: '1px solid #dee2e6' },
                    body: { padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }, // Adjust height based on header
                }}
            >
                {selectedLead ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Timeline Area */}
                        <ScrollArea style={{ flexGrow: 1, padding: '1rem' }}>
                            {' '}
                            {/* Let this area grow */}
                            <Text size="lg" weight={600} mb="md">
                                Follow-up Timeline
                            </Text>
                            {followupHistory.length > 0 ? (
                                <Timeline active={followupHistory.length} bulletSize={24} lineWidth={2}>
                                    {followupHistory.map((followup, index) => (
                                        <Timeline.Item
                                            key={followup.id || index} // Use followup.id if available
                                            bullet={<IconMessage size={14} />}
                                            title={followup.purpose || 'Follow-up'}
                                        >
                                            <Text size="xs" color="dimmed">
                                                {followup.follow_up_date ? new Date(followup.follow_up_date).toLocaleString() : 'No Date'}
                                            </Text>
                                            <Badge color={followup.status === 'Pending' ? 'yellow' : 'green'} size="sm" mt={4}>
                                                {followup.status || 'N/A'}
                                            </Badge>
                                            <Text size="sm" mt={4}>
                                                {followup.notes || '-'}
                                            </Text>
                                            {/* Add Edit button for follow-up */}
                                            {/* <Button size="xs" variant="light" mt="xs" onClick={() => handleEditFollowup(followup)}>Edit</Button> */}
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            ) : (
                                <Text color="dimmed" align="center" mt="xl">
                                    No follow-up history found.
                                </Text>
                            )}
                        </ScrollArea>

                        {/* Form Area */}
                        <Divider />
                        <div style={{ padding: '1rem', borderTop: '1px solid #dee2e6', flexShrink: 0 }}>
                            {' '}
                            {/* Prevent shrinking */}
                            <FollowupForm
                                leadId={selectedLead.id}
                                existingFollowUp={existingFollowUp}
                                onFollowupChange={() => {
                                    fetchFollowupHistory(selectedLead.id); // Refresh history
                                    setExistingFollowUp(null); // Clear edit state after submit/update
                                }}
                                onCancel={() => setExistingFollowUp(null)} // Allow cancelling edit
                            />
                        </div>
                    </div>
                ) : (
                    <Text align="center" mt="xl" color="dimmed">
                        Select a lead to view follow-ups.
                    </Text>
                )}
            </Drawer>
        </div>
    );
};

export default LeadTable;