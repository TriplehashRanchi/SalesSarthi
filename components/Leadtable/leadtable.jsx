'use client';

import { DataTable } from 'mantine-datatable';
import ConvertLeadModal from '@/components/customers/ConvertLeadModal';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import {
    Menu,
    Button,
    Drawer,
    Timeline,
    Divider,
    Text,
    ScrollArea,
    Badge,
    Checkbox,
    Select,
    LoadingOverlay,
    Alert,
    Modal,
    Textarea,
    Group,
    ActionIcon,
    useMantineTheme,
    Title,
    Avatar,
    Stack,
    TextInput,
    Loader,
} from '@mantine/core';
import Papa from 'papaparse';
import { List } from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconFolder, IconAlertCircle, IconArrowLeft, IconBrandFacebook, IconBrandWhatsapp, IconCalculator, IconDownload, IconHistory, IconListCheck, IconMenu4, IconPhoneCall, IconSearch, IconUpload, IconUserCheck } from '@tabler/icons-react';
import IconChatDot from '../icon/icon-chat-dot';
import IconFacebook from '@/components/icon/icon-facebook';
import IconPencil from '../icon/icon-pencil';

import FollowupForm from '@/components/forms/followupform';
import LeadImportModal from '@/components/CsvUpload/LeadImportModal';
import { DeleteFolderModal, EmptyFolderState, FolderNameModal, FolderTabs, MoveReportModal, ReorderFoldersModal } from './FolderUI';
import LeadDetailView from './LeadDetailView';
import { FolderKpis } from './LeadKpis';
import { useLeadList, useDebounced, fetchLeadExport } from './useLeadList';
import { fetchFolders, createFolder, renameFolder, deleteFolder, reorderFolders, moveLeadsWithReport, folderIdOf } from './leadFolders';

import { getAuth } from 'firebase/auth';
import IconX from '../icon/icon-x';
import IconChecks from '../icon/icon-checks';
import IconClock from '../icon/icon-clock';
import IconPhone from '../icon/icon-phone';

const LeadTable = ({ profile, userId }) => {
    console.log('profile in leadtable', profile);
    /* ───────────────────── state ───────────────────── */
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState({ columnAccessor: 'created_at', direction: 'desc' });

    const [showDrawer, setShowDrawer] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [followupHistory, setFollowupHistory] = useState([]);
    const [existingFollowUp, setExisting] = useState(null);

    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [selectedTeamMember, setSelectedTM] = useState(null);

    const [csvOpen, setCsvOpen] = useState(false);
    // In LeadTable.js, with your other useState hooks
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [statusFilter, setStatusFilter] = useState('');
    const [error, setError] = useState(null);

    const [isPolling, setIsPolling] = useState(false);
    const [hasPolledInitially, setHasPolledInit] = useState(false);


    const [assignedUserFilter, setAssignedUserFilter] = useState(null);

    /* ───────── folders ───────── */
    const [folders, setFolders] = useState([]);
    const [activeFolder, setActiveFolder] = useState('all'); // 'all' or a folder id
    const [folderModal, setFolderModal] = useState({ open: false, folder: null });
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [reorderOpen, setReorderOpen] = useState(false);
    const [moveReport, setMoveReport] = useState(null);
    const [dragIds, setDragIds] = useState([]); // leads being dragged
    const [dragOverId, setDragOverId] = useState(null);
    const FACEBOOK_POLL_SETUP_ERRORS = new Set([
        'Admin ID missing',
        'Facebook token not found for admin',
        'No Facebook page selections found',
    ]);


    const [noteEditor, setNoteEditor] = useState({
        open: false,
        lead: null, // whole lead object
        text: '', // working text
    });

    const theme = useMantineTheme(); // Get the theme

    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const statusOptions = [
        { value: 'Cold Lead', label: 'Cold Lead' },
        { value: 'Hot Lead', label: 'Hot Lead' },
        { value: 'Qualified Lead', label: 'Qualified Lead' },
        { value: 'Lost Lead', label: 'Lost Lead' },
        { value: 'Follow-up', label: 'Follow-up' },
        { value: 'Request deletion', label: 'Request deletion' },
        { value: 'Fin Health Checkup Done', label: 'Fin Health Checkup Done' },
    ];

    /* ───────────────────── helpers ───────────────────── */
    const fetchTeamMembers = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch users.');
            setTeamMembers(await res.json());
        } catch (err) {
            console.error(err);
            setTeamMembers([]);
        }
    };

    /* ───────── server-side list: only the rows on screen are loaded ───────── */
    const isPhone = useMediaQuery('(max-width: 767px)');
    const debouncedSearch = useDebounced(search.trim(), 300);
    const listFilters = useMemo(
        () => ({
            folder: userId ? 'all' : activeFolder,
            q: debouncedSearch,
            status: statusFilter || '',
            assigned: !userId && assignedUserFilter ? assignedUserFilter : '',
            userId: userId || '',
            sort: sortStatus.columnAccessor,
            dir: sortStatus.direction,
        }),
        [userId, activeFolder, debouncedSearch, statusFilter, assignedUserFilter, sortStatus]
    );
    const desktopList = useLeadList({ filters: listFilters, page, pageSize, mode: 'page', enabled: isPhone === false });
    const phoneList = useLeadList({ filters: listFilters, pageSize: 20, mode: 'append', enabled: isPhone === true });
    const list = isPhone ? phoneList : desktopList;
    const recordsData = desktopList.rows;
    const totalFilteredRecords = list.total;
    const loading = list.loading;
    const [kpiKey, setKpiKey] = useState(0);
    const refreshFolders = () => fetchFolders().then(setFolders).catch((err) => console.error('Failed to load folders:', err));

    // Anything that changes which leads exist / where they are: reload the page, counts and KPIs.
    const fetchLeads = () => {
        list.reload();
        refreshFolders();
        setKpiKey((k) => k + 1);
    };
    const patchLead = (id, patch) => {
        desktopList.patchRow(id, patch);
        phoneList.patchRow(id, patch);
    };

    useEffect(() => {
        if (list.error) setError(list.error);
    }, [list.error]);

    // Search / filter / sort change -> back to page 1.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, assignedUserFilter, sortStatus]);

    const pollFacebookLeads = async (manual = false) => {
        if (isPolling) return false;
        setIsPolling(true);

        if (manual) {
            showNotification({
                id: 'fb-poll',
                title: 'Polling Facebook Leads',
                message: 'Checking for new leads from Facebook…',
                loading: true,
                autoClose: false,
                withCloseButton: false,
            });
        }

        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const { data } = await axios.post(
                `${API_URL}/api/fb/leads/poll`,
                {},
                {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                },
            );
            const newCount = data?.newLeadsCount ?? data?.newLeads ?? 0;
            fetchLeads();

            const notify = manual ? updateNotification : showNotification;
            notify({
                id: 'fb-poll',
                title: 'Polling Complete',
                message: newCount ? `Fetched ${newCount} new lead(s).` : 'No new leads this time.',
                color: 'green',
                icon: <IconListCheck size={16} />,
                loading: false,
                autoClose: 5000,
            });
            return true;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Polling failed';
            const isSetupError = err.response?.status === 400 && FACEBOOK_POLL_SETUP_ERRORS.has(message);

            if (!isSetupError) {
                console.error(err);
            }

            if (manual || !isSetupError) {
                showNotification({
                    id: `fb-poll-error-${Date.now()}`,
                    title: isSetupError ? 'Facebook Leads Not Configured' : 'Polling Failed',
                    message: isSetupError ? 'Connect Facebook pages in Facebook Leads before polling.' : message,
                    color: isSetupError ? 'yellow' : 'red',
                    icon: <IconAlertCircle size={16} />,
                    autoClose: 7000,
                });
            }
            return false;
        } finally {
            setIsPolling(false);
        }
    };

    // ───────── raw‑payload viewer ─────────
    const [payloadViewer, setPayloadViewer] = useState({
        open: false,
        json: null, // pretty‑string
        title: '',
    });
    function payloadToSections(raw = {}) {
        // convert string → object if necessary

        /* ---------- Payload ---------- */
        const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        console.log(payload);
        /* ---------- Answers ---------- */
        const answers = (payload.field_data || []).map((f) => ({
            label: f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: f.values?.[0] || '—',
        }));

        /* ---------- Campaign / ad meta ---------- */
        const meta = [
            { label: 'Campaign ID', value: payload.campaign_id },
            { label: 'Adset ID', value: payload.adgroup_id },
            { label: 'Ad ID', value: payload.ad_id },
        ].filter((r) => r.value);

        return { answers, meta };
    }

    useEffect(() => {
        // ?folder=<id> (e.g. from a notification) opens that folder, if it still exists
        const wanted = Number(new URLSearchParams(window.location.search).get('folder'));
        fetchFolders()
            .then((list) => {
                setFolders(list);
                if (!userId && list.some((f) => f.id === wanted)) setActiveFolder(wanted);
            })
            .catch((err) => console.error('Failed to load folders:', err));
    }, []);

    /* ───────────────────── initial load ───────────────────── */
    useEffect(() => {
        let mounted = true;
        (async () => {
            setError(null);
            try {
                await fetchTeamMembers();
            } catch (err) {
                if (mounted) setError(err.message);
            }

            if (!hasPolledInitially) {
                setHasPolledInit(true);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [hasPolledInitially]); // once

    /* pagination safety */
    useEffect(() => {
        const pages = Math.ceil(totalFilteredRecords / pageSize);
        if (page > pages && pages > 0) setPage(pages);
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
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const res = await fetch(`${API_URL}/api/admin/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ user_id: selectedTeamMember, leads: selectedLeads }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to assign leads.');
            }

            showNotification({ title: 'Success', message: 'Leads assigned successfully', color: 'green' });
            setSelectedLeads([]);
            setSelectedTM(null);
            fetchLeads(); // refresh list silently
        } catch (err) {
            console.error(err);
            showNotification({ title: 'Error', message: err.message, color: 'red' });
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
                `
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
            patchLead(lead.id, { lead_status: newStatus });
            setKpiKey((k) => k + 1);
            showNotification({ title: 'Success', message: 'Lead status updated successfully', color: 'green' });
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
            await axios.put(
                `${API_URL}/api/leads/${lead.id}`, // ⬅ same endpoint
                { notes: newNote },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
            );
            patchLead(lead.id, { notes: newNote });
            showNotification({ title: 'Success', message: 'Notes updated successfully', color: 'green' });
        } catch (err) {
            console.error(err);
            showNotification({ title: 'Error', message: err.message, color: 'red' });
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
            const user = getAuth().currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            await axios.post(
                `${API_URL}/api/leads/bulk-delete`, // ← create this backend route
                { lead_ids: selectedLeads },
                { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
            );

            showNotification({ title: 'Deleted', message: 'Selected leads removed', color: 'green' });
            setSelectedLeads([]);
            fetchLeads();
        } catch (err) {
            showNotification({ title: 'Error', message: err.message, color: 'red' });
        }
    };

    // ───────── get timeline for a lead ─────────
    const fetchFollowupHistory = async (leadId) => {
        if (!leadId) return;

        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated.');
            const token = await user.getIdToken();

            const { data } = await axios.get(`${API_URL}/api/followups/${leadId}`, {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });

            setFollowupHistory(data || []);
        } catch (err) {
            console.error(err);
            setFollowupHistory([]);
            showNotification({
                title: 'Follow‑up fetch failed',
                message: err.message,
                color: 'yellow',
            });
        }
    };

    // Opens the "Convert to Customer" modal (details + product line). The modal does the API call.
    const [convertLead, setConvertLead] = useState(null);
    const convertLeadToCustomer = (lead) => {
        if (lead?.id) setConvertLead(lead);
    };
    const handleLeadConverted = (lead) => {
        fetchLeads();
    };

    // Every lead matching the current folder / search / filters (fetched from the server, not just this page).
    const exportCSV = async () => {
        let filteredLeads = [];
        try {
            filteredLeads = await fetchLeadExport(listFilters);
        } catch (err) {
            showNotification({ title: 'Export failed', message: err?.response?.data?.message || err.message, color: 'red' });
            return;
        }
        if (!filteredLeads.length) {
            showNotification({
                title: 'No data',
                message: 'No leads available to export.',
                color: 'yellow',
            });
            return;
        }

        // Clean + format data
        const exportData = filteredLeads.map((l) => ({
            Name: l.full_name,
            Email: l.email,
            Phone: l.phone_number,
            Status: l.lead_status,
            Source: l.source,
            AssignedTo: teamMembers.find((u) => u.id === l.user_id)?.username || '',
            Notes: l.notes || '',
            CreatedAt: l.created_at ? new Date(l.created_at).toLocaleString() : '',
        }));

        const csv = Papa.unparse(exportData);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads-export-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                case 1:
                    return 'st';
                case 2:
                    return 'nd';
                case 3:
                    return 'rd';
                default:
                    return 'th';
            }
        };

        return `${day}${getOrdinal(day)} ${month} ${year}`;
    }

    /* ───────────────────── render ───────────────────── */
    const currentIds = recordsData.map((l) => l.id);
    const allSel = currentIds.length && currentIds.every((id) => selectedLeads.includes(id));
    const someSel = currentIds.length && currentIds.some((id) => selectedLeads.includes(id));

    /* ───────── folder helpers ───────── */
    // Lead counts per folder come from the server (refreshed after every change).
    const folderCounts = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f.lead_count || 0])), [folders]);
    const currentFolder = typeof activeFolder === 'number' ? folders.find((f) => f.id === activeFolder) : null;
    const folderTitle = activeFolder === 'all' ? 'All Leads' : currentFolder?.name || 'Leads';
    const folderIsEmpty = !userId && !!currentFolder && !loading && !(folderCounts[currentFolder.id] > 0) && !debouncedSearch && !statusFilter && !assignedUserFilter;
    const openFolder = (id) => {
        setActiveFolder(id);
        setPage(1);
        setSelectedLeads([]);
        setSelectionMode(false);
    };
    const handleBack = () => router.back();

    // Moves in batches; if some fail they stay where they were and a report (with Retry) opens.
    const moveTo = async (ids, folderId) => {
        if (!ids.length) return;
        const folderName = folders.find((f) => f.id === folderId)?.name || 'folder';
        const res = await moveLeadsWithReport(ids, folderId);
        const moved = new Set(res.movedIds.map(Number));
        if (moved.size) {
            setSelectedLeads((prev) => prev.filter((id) => !moved.has(Number(id))));
            fetchLeads();
        }
        if (res.failed.length) setMoveReport({ ...res, folderId, folderName });
        else showNotification({ title: 'Moved', message: `${moved.size} lead${moved.size === 1 ? '' : 's'} moved to ${folderName}`, color: 'green' });
    };

    // Drag a lead (or all selected leads) onto a folder chip.
    const startDrag = (e, lead) => {
        const ids = selectedLeads.includes(lead.id) && selectedLeads.length > 1 ? selectedLeads : [lead.id];
        setDragIds(ids);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(ids));
    };
    const endDrag = () => {
        setDragIds([]);
        setDragOverId(null);
    };
    const dropOn = (e, folderId) => {
        e.preventDefault();
        const ids = dragIds;
        endDrag();
        moveTo(ids, folderId);
    };

    const openCreateFolder = () => setFolderModal({ open: true, folder: null });
    const openRenameFolder = (folder) => setFolderModal({ open: true, folder });
    // Throws on API error so the popup can show it (e.g. "Folder name already exists...").
    const saveFolder = async (folder, name) => {
        if (folder) {
            const updated = await renameFolder(folder.id, name);
            setFolders((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
        } else {
            const created = await createFolder(name);
            setFolders((prev) => [...prev, created]);
        }
    };
    // Leads move to targetId first (server, one transaction), then the folder is deleted.
    const removeFolder = async (folder, targetId) => {
        await deleteFolder(folder.id, targetId);
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        if (activeFolder === folder.id) setActiveFolder(targetId || 'all');
        fetchLeads();
        showNotification({ title: 'Folder deleted', message: `“${folder.name}” deleted.`, color: 'green' });
    };
    const saveFolderOrder = async (ids) => setFolders(await reorderFolders(ids));

    // "Move to folder" entries for a lead's menu (every folder except the one it is already in).
    const moveMenuItems = (record) => (
        <>
            <Menu.Divider />
            <Menu.Label>Move to folder</Menu.Label>
            {folders
                .filter((f) => f.id !== (record.my_folder_id ?? folderIdOf(record)))
                .map((f) => (
                    <Menu.Item key={f.id} icon={<IconFolder size={14} />} onClick={() => moveTo([record.id], f.id)}>
                        <Text size="xs">{f.name}</Text>
                    </Menu.Item>
                ))}
        </>
    );

    /* ───────── mobile: long-press selection + infinite scroll ───────── */
    const [viewLeadId, setViewLeadId] = useState(null); // desktop: lead shown in the side panel
    const [selectionMode, setSelectionMode] = useState(false);
    const pressTimer = useRef(null);
    const longPressed = useRef(false);
    const sentinelRef = useRef(null);
    const AVATAR_COLORS = ['violet', 'blue', 'orange', 'teal', 'pink', 'green'];
    const colorFor = (name) => AVATAR_COLORS[((name || '?').trim().charCodeAt(0) || 0) % AVATAR_COLORS.length];
    const statusColor = (st) =>
        st === 'Hot Lead' ? 'red' : st === 'Cold Lead' ? 'blue' : st === 'Qualified Lead' ? 'green' : st === 'Lost Lead' ? 'gray' : st === 'Follow-up' ? 'lime' : st === 'Fin Health Checkup Done' ? 'teal' : 'orange';

    const cancelLongPress = () => clearTimeout(pressTimer.current);
    const startLongPress = (id) => {
        longPressed.current = false;
        cancelLongPress();
        pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            if (navigator.vibrate) navigator.vibrate(30);
            setSelectionMode(true);
            setSelectedLeads((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }, 500);
    };
    const toggleLead = (id) => setSelectedLeads((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const handleRowClick = (id) => {
        if (longPressed.current) {
            longPressed.current = false;
            return;
        }
        if (selectionMode) toggleLead(id);
        else router.push(`/leadtable/${id}`);
    };
    const exitSelection = () => {
        setSelectionMode(false);
        setSelectedLeads([]);
    };

    useEffect(() => {
        if (selectionMode && selectedLeads.length === 0) setSelectionMode(false);
    }, [selectionMode, selectedLeads]);

    // Phone: next 20 leads are fetched when the bottom comes into view.
    const hasMoreMobile = phoneList.hasMore;
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMoreMobile) return;
        const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && phoneList.loadMore(), { rootMargin: '300px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMoreMobile, phoneList.rows.length, phoneList.loadMore]);

    const openWhatsApp = (record) => {
        const digits = (record.phone_number || '').replace(/\D/g, '');
        const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : null;
        if (ten && /^[6-9]\d{9}$/.test(ten)) window.open(`https://wa.me/91${ten}?text=Hello ${record.full_name},`, '_blank');
        else alert('Invalid phone number');
    };
    const callLead = (record) => {
        const digits = (record.phone_number || '').replace(/[^\d+]/g, '');
        if (digits) window.open(`tel:${digits}`, '_self');
        else alert('Phone number invalid');
    };

    const bulkBar = (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 dark:bg-gray-800">
            <Text size="sm" weight={600}>{selectedLeads.length} selected</Text>
            {teamMembers.length > 0 && (
                <>
                    <Select
                        data={teamMembers.map((u) => ({ value: u.id.toString(), label: `${u.username} (${u.role})` }))}
                        value={selectedTeamMember}
                        onChange={setSelectedTM}
                        placeholder="Assign to..."
                        searchable
                        clearable
                        size="xs"
                        radius="xl"
                        style={{ minWidth: 170 }}
                    />
                    <Button size="xs" radius="xl" color="violet" onClick={() => assignLeads()} disabled={!selectedTeamMember || !selectedLeads.length}>
                        Assign
                    </Button>
                </>
            )}
            {folders.length > 0 && (
                <Select
                    data={folders.map((f) => ({ value: String(f.id), label: f.name }))}
                    value={null}
                    onChange={(v) => v && moveTo(selectedLeads, Number(v))}
                    placeholder="Move to folder..."
                    size="xs"
                    radius="xl"
                    style={{ minWidth: 150 }}
                />
            )}
            <Button size="xs" radius="xl" color="red" variant="light" onClick={deleteLeads} disabled={!selectedLeads.length}>
                Delete
            </Button>
            <Button size="xs" radius="xl" variant="default" className="ml-auto" onClick={exitSelection}>
                Clear
            </Button>
        </div>
    );

    return (
        <div className="panel relative mt-0 p-2 md:!p-5 max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent md:mt-6">
            {/* <LoadingOverlay visible={loading || isPolling} overlayBlur={2} /> */}

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" withCloseButton onClose={() => setError(null)} mb="md">
                    {error}
                </Alert>
            )}

                <>
            {/* header */}
            <div className="mb-4 flex items-center gap-2">
                <ActionIcon className={userId ? 'md:hidden' : ''} variant="subtle" color="dark" onClick={handleBack} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">{folderTitle}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {totalFilteredRecords} {totalFilteredRecords === 1 ? 'Lead' : 'Leads'}
                        {totalFilteredRecords !== list.allCount && activeFolder === 'all' ? ` of ${list.allCount}` : ''}
                    </p>
                </div>
            </div>

            {/* folder tabs: switch folder, or drop dragged leads on one to move them */}
            {!userId && (
                <>
                    <FolderTabs
                        folders={folders}
                        counts={folderCounts}
                        allCount={list.allCount}
                        active={activeFolder}
                        onSelect={openFolder}
                        onCreate={openCreateFolder}
                        onRename={openRenameFolder}
                        onDelete={setFolderToDelete}
                        onReorder={() => setReorderOpen(true)}
                        onActivity={(f) => router.push(`/leadtable/folder-activity${f ? `?folder=${encodeURIComponent(f.name)}` : ''}`)}
                        highlightId={dragOverId}
                        tabProps={(f) => ({
                            onDragOver: (e) => {
                                if (!dragIds.length) return;
                                e.preventDefault();
                                setDragOverId(f.id);
                            },
                            onDragLeave: () => setDragOverId(null),
                            onDrop: (e) => dropOn(e, f.id),
                        })}
                    />
                    {dragIds.length > 0 && (
                        <p className="-mt-2 mb-3 text-xs font-medium text-violet-600">Drop on a folder to move {dragIds.length} lead{dragIds.length === 1 ? '' : 's'}</p>
                    )}
                </>
            )}

            {!userId && <FolderKpis key={String(activeFolder)} folder={activeFolder} reloadKey={kpiKey} title={folderTitle} />}

            {/* desktop controls */}
            <div className="mb-4 hidden flex-wrap items-center gap-3 md:flex">
                <TextInput
                    icon={<IconSearch size={16} />}
                    placeholder="Search name, email or phone"
                    radius="xl"
                    className="w-full max-w-xs flex-1"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value);
                        setPage(1);
                    }}
                />
                <Select
                    data={statusOptions}
                    placeholder="All statuses"
                    radius="xl"
                    value={statusFilter}
                    onChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                    clearable
                    searchable
                    style={{ minWidth: 170 }}
                />
                {!userId && (
                    <Select
                        data={[
                            { value: 'unassigned', label: 'Unassigned' },
                            ...teamMembers.map((u) => ({
                                value: u.id.toString(),
                                label: `${u.username} (${u.role})`,
                            })),
                        ]}
                        placeholder="Assigned to"
                        radius="xl"
                        value={assignedUserFilter}
                        onChange={(v) => {
                            setAssignedUserFilter(v);
                            setPage(1);
                        }}
                        clearable
                        searchable
                        style={{ minWidth: 200 }}
                    />
                )}
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="light" color="violet" radius="xl" leftIcon={<IconUpload size={16} />} onClick={() => setCsvOpen(true)}>
                        Upload CSV
                    </Button>
                    <Button variant="subtle" color="violet" radius="xl" leftIcon={<IconHistory size={16} />} onClick={() => router.push('/leadtable/import-history')}>
                        Import History
                    </Button>
                    <Button variant="light" color="violet" radius="xl" leftIcon={<IconDownload size={16} />} onClick={exportCSV}>
                        Export
                    </Button>
                </div>
            </div>

            {/* Bulk actions: only while something is selected */}
            {selectedLeads.length > 0 && bulkBar}

            {/* mobile controls */}
            <div className="mb-3 md:hidden">
                <TextInput
                    icon={<IconSearch size={18} />}
                    placeholder="Search name, email or phone"
                    radius="xl"
                    size="md"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value);
                        setPage(1);
                    }}
                    mb="sm"
                />
                <div className="mb-2 grid grid-cols-2 gap-2">
                    <Select
                        data={statusOptions}
                        placeholder="Status"
                        radius="xl"
                        value={statusFilter}
                        onChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                        }}
                        clearable
                        searchable
                    />
                    {!userId && (
                        <Select
                            data={[
                                { value: 'unassigned', label: 'Unassigned' },
                                ...teamMembers.map((u) => ({
                                    value: u.id.toString(),
                                    label: `${u.username} (${u.role})`,
                                })),
                            ]}
                            placeholder="Assigned to"
                            radius="xl"
                            value={assignedUserFilter}
                            onChange={(v) => {
                                setAssignedUserFilter(v);
                                setPage(1);
                            }}
                            clearable
                            searchable
                        />
                    )}
                </div>
                <div className="flex items-center py-1">
                    <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconBrandFacebook size={18} />} onClick={() => pollFacebookLeads(true)} disabled={isPolling}>
                        Facebook
                    </Button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconUpload size={18} />} onClick={() => setCsvOpen(true)}>
                        Upload CSV
                    </Button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconHistory size={18} />} onClick={() => router.push('/leadtable/import-history')}>
                        History
                    </Button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    <Button className="flex-1" variant="subtle" color="violet" leftIcon={<IconDownload size={18} />} onClick={exportCSV}>
                        Export
                    </Button>
                </div>
            </div>

            {folderIsEmpty && (
                <EmptyFolderState folderName={currentFolder.name} onAddLead={() => router.push(`/addlead?folder=${currentFolder.id}`)} onImport={() => setCsvOpen(true)} />
            )}

            {/* table */}
            <div className={`datatables hidden dark:bg-gray-800 dark:text-gray-200 ${folderIsEmpty ? '' : 'md:block'} [&_table]:!w-full [&_table]:!min-w-0 [&_table]:table-fixed [&_thead]:!bg-transparent [&_th]:!border-b [&_th]:!border-gray-200 [&_th]:!bg-transparent [&_th]:!py-3 [&_th]:!text-xs [&_th]:!font-semibold [&_th]:!uppercase [&_th]:!tracking-wide [&_th]:!text-gray-500 [&_td]:!border-gray-100 [&_tbody_tr:hover]:!bg-violet-50/60 [&_tbody_tr]:!bg-transparent`}>
                <DataTable
                    // className="dark:bg-gray-800 dark:text-gray-100"
                    highlightOnHover
                    verticalSpacing="sm"
                    fontSize="sm"
                    className="whitespace-nowrap"
                    onRowClick={(record) => setViewLeadId(record.id)}
                    rowStyle={() => ({ cursor: 'pointer' })}
                    paginationColor="violet"
                    records={recordsData}
                    columns={[
                        {
                            accessor: 'select',
                            width: '4%',
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
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        aria-label={`Select ${r.full_name}`}
                                        checked={selectedLeads.includes(r.id)}
                                        onChange={() => toggleLead(r.id)}
                                    />
                                </div>
                            ),
                            textAlign: 'center',
                        },
                        {
                            accessor: 'full_name',
                            title: 'Lead',
                            sortable: true,
                            width: '25%',
                            render: (r) => (
                                <div
                                    className="flex min-w-0 cursor-grab items-center gap-3 active:cursor-grabbing"
                                    draggable={!userId}
                                    onDragStart={(e) => startDrag(e, r)}
                                    onDragEnd={endDrag}
                                    title={userId ? undefined : 'Drag onto a folder to move'}
                                >
                                    <Avatar color={colorFor(r.full_name)} variant="light" radius="xl" size="md" className="flex-shrink-0">
                                        {(r.full_name || '?').trim().charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="truncate font-medium">{r.full_name}</div>
                                        <div className="truncate text-xs text-gray-500">{r.email || '—'}</div>
                                    </div>
                                </div>
                            ),
                        },
                        { accessor: 'phone_number', title: 'Phone', sortable: true, width: '12%', ellipsis: true },
                        {
                            accessor: 'lead_status',
                            title: 'Status',
                            sortable: true,
                            width: '14%',
                            render: (record) => (
                                <div onClick={(e) => e.stopPropagation()} className="inline-block">
                                <Menu withinPortal shadow="md" position="bottom-start">
                                    <Menu.Target>
                                        <Badge
                                            style={{ cursor: 'pointer' }}
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
                                </div>
                            ),
                        },
                        {
                            accessor: 'source',
                            title: 'Source',
                            sortable: true,
                            width: '14%',
                            render: (r) => (
                                <div className="min-w-0">
                                    {r.source === 'facebook' ? (
                                        <Badge color="blue" variant="light">
                                            FB/Meta
                                        </Badge>
                                    ) : (
                                        <Badge color="green" variant="light">
                                            {r.source || 'Manual'}
                                        </Badge>
                                    )}
                                    {r.form_name && (
                                        <button
                                            type="button"
                                            className="mt-0.5 block max-w-full truncate text-xs text-blue-600 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPayloadViewer({
                                                    open: true,
                                                    data: payloadToSections(r.raw_payload), // ← parsed sections
                                                    title: r.form_name || 'Unknown Form',
                                                });
                                            }}
                                        >
                                            {r.form_name}
                                        </button>
                                    )}
                                </div>
                            ),
                        },
                        {
                            accessor: 'notes',
                            title: 'Notes',
                            width: '12%',
                            render: (record) => (
                                <Button variant="subtle" size="xs" onClick={(e) => { e.stopPropagation(); setNoteEditor({ open: true, lead: record, text: record.notes || '' }); }}>
                                    {/* show up to 15 chars as preview, or “Add” if empty */}
                                    {record.notes ? `${record.notes.slice(0, 15)}…` : 'Add'}
                                </Button>
                            ),
                        },
                        {
                            accessor: 'user_id',
                            title: 'Assigned To',
                            sortable: true,
                            width: '12%',
                            ellipsis: true,
                            render: ({ user_id }) => {
                                const u = teamMembers.find((t) => t.id === user_id);
                                return u ? u.username : <Text color="dimmed">Unassigned</Text>;
                            },
                        },
                        {
                            accessor: 'actions',
                            title: 'Actions',
                            textAlign: 'right',
                            width: '7%',
                            render: (record) => (
                                <div onClick={(e) => e.stopPropagation()}>
                                <Menu withinPortal shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray">
                                            <IconMenu4 size={16} />
                                        </ActionIcon>
                                    </Menu.Target>

                                    <Menu.Dropdown>
                                        {/* All items are now in a single, clean list */}

                                        <Menu.Item icon={<IconPencil size={14} />} onClick={() => router.push(`/editlead/${record.id}`)}>
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
                                                const qs = new URLSearchParams({
                                                    id: record.id,
                                                    type: 'lead',
                                                    name: record.full_name,
                                                    phone: record.phone_number,
                                                    email: record.email,
                                                    doctor: profile.name,
                                                }).toString();
                                                router.push(`/fincalc?${qs}`);
                                            }}
                                        >
                                            <Text size="xs">Health Check-up</Text>
                                        </Menu.Item>
                                        <Menu.Item
                                            icon={<IconListCheck size={14} color={theme.colors.blue[6]} />}
                                            onClick={() => {
                                                // This navigates to the HISTORY page, pre-filtered for this lead
                                                const qs = new URLSearchParams({
                                                    clientId: record.id,
                                                    clientType: 'lead',
                                                    clientName: record.full_name,
                                                }).toString();
                                                router.push(`/fhclog?${qs}`); // Assuming '/fhclog' is your history page route
                                            }}
                                        >
                                            <Text size="xs">View Checkup History</Text>
                                        </Menu.Item>

                                        {/* To create a subtle visual break without a hard line, we can add a divider with very low opacity or just rely on spacing */}
                                        {/* For true minimalism, we omit the divider entirely */}

                                        <Menu.Item color="teal" icon={<IconUserCheck size={14} />} onClick={() => convertLeadToCustomer(record)}>
                                            <Text size="xs">Convert to Customer</Text>
                                        </Menu.Item>
                                        {!userId && moveMenuItems(record)}
                                    </Menu.Dropdown>
                                </Menu>
                                </div>
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
                    minHeight={120}
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
            <div className={folderIsEmpty ? 'hidden' : 'block md:hidden'}>
                {selectionMode && (
                    <div className="mb-2 flex items-center justify-between">
                        <Text size="sm" weight={600}>{selectedLeads.length} selected</Text>
                        <Button size="xs" radius="xl" variant="default" onClick={exitSelection}>Cancel</Button>
                    </div>
                )}
                {phoneList.rows.map((record) => {
                    const isSelected = selectedLeads.includes(record.id);
                    const u = teamMembers.find((t) => t.id === record.user_id);
                    return (
                        <div
                            key={record.id}
                            className={`flex cursor-pointer select-none items-center gap-3 border-b border-gray-200 py-2.5 last:border-b-0 dark:border-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
                            style={{ WebkitTouchCallout: 'none' }}
                            onTouchStart={() => startLongPress(record.id)}
                            onTouchMove={cancelLongPress}
                            onTouchEnd={cancelLongPress}
                            onTouchCancel={cancelLongPress}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => handleRowClick(record.id)}
                        >
                            {selectionMode ? (
                                <Checkbox checked={isSelected} onChange={() => toggleLead(record.id)} onClick={(e) => e.stopPropagation()} />
                            ) : (
                                <Avatar color={colorFor(record.full_name)} variant="light" radius="xl" size="lg">
                                    {(record.full_name || '?').trim().charAt(0).toUpperCase()}
                                </Avatar>
                            )}

                            <div className="min-w-0 flex-1">
                                <Text weight={500} lineClamp={1}>{record.full_name}</Text>
                                <Text size="xs" color="dimmed" lineClamp={1}>
                                    {record.phone_number}
                                    {u ? ` · ${u.username}` : ''}
                                </Text>
                                <div className="mt-1 flex min-w-0 items-center gap-2" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                    <Menu withinPortal shadow="md" position="bottom-start">
                                        <Menu.Target>
                                            <Badge size="sm" className="cursor-pointer" color={statusColor(record.lead_status)} variant="light">
                                                {record.lead_status || 'Select status'}
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
                                    {/* Which ad / form the lead came from (tap to see the full form answers) */}
                                    {record.form_name && (
                                        <button
                                            type="button"
                                            className="min-w-0 truncate text-xs text-blue-600"
                                            onClick={() =>
                                                setPayloadViewer({
                                                    open: true,
                                                    data: payloadToSections(record.raw_payload),
                                                    title: record.form_name || 'Unknown Form',
                                                })
                                            }
                                        >
                                            {record.form_name}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!selectionMode && (
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                    <ActionIcon size="xl" variant="subtle" color="violet" aria-label="Call" onClick={() => callLead(record)}>
                                        <IconPhoneCall size={24} />
                                    </ActionIcon>
                                    <ActionIcon size="xl" variant="subtle" color="green" aria-label="WhatsApp" onClick={() => openWhatsApp(record)}>
                                        <IconBrandWhatsapp size={24} />
                                    </ActionIcon>
                                    <Menu withinPortal shadow="md" position="bottom-end" width={200}>
                                        <Menu.Target>
                                            <ActionIcon size="sm" variant="subtle" color="gray" aria-label="More">
                                                <IconMenu4 size={18} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item icon={<IconPencil size={14} />} onClick={() => router.push(`/editlead/${record.id}`)}>
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
                                                icon={<IconCalculator size={14} />}
                                                onClick={() => {
                                                    const qs = new URLSearchParams({ id: record.id, name: record.full_name, phone: record.phone_number, email: record.email }).toString();
                                                    router.push(`/calc?${qs}`);
                                                }}
                                            >
                                                <Text size="xs">Health Check-up</Text>
                                            </Menu.Item>
                                            <Menu.Item color="teal" icon={<IconUserCheck size={14} />} onClick={() => convertLeadToCustomer(record)}>
                                                <Text size="xs">Convert to Customer</Text>
                                            </Menu.Item>
                                            {!userId && moveMenuItems(record)}
                                        </Menu.Dropdown>
                                    </Menu>
                                </div>
                            )}
                        </div>
                    );
                })}

                {phoneList.rows.length === 0 && !loading && (
                    <Text align="center" color="dimmed" py={40}>No leads found</Text>
                )}

                {hasMoreMobile && (
                    <div ref={sentinelRef} className="flex justify-center py-4">
                        <Loader size="sm" />
                    </div>
                )}
            </div>
                </>

            {/* Desktop: click a lead to see it in a side panel */}
            <Drawer opened={viewLeadId !== null} onClose={() => setViewLeadId(null)} position="right" size={460} padding={0} withCloseButton={false} shadow="md" zIndex={1000}>
                {viewLeadId !== null && <LeadDetailView key={viewLeadId} leadId={viewLeadId} onClose={() => setViewLeadId(null)} />}
            </Drawer>

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
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '2rem 0' }}>
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
                    </div>
                ) : null}
            </Drawer>

            {/* folder popups */}
            <FolderNameModal state={folderModal} onClose={() => setFolderModal({ open: false, folder: null })} onSave={saveFolder} />
            <DeleteFolderModal
                folder={folderToDelete}
                folders={folders}
                count={folderToDelete ? folderCounts[folderToDelete.id] || 0 : 0}
                onClose={() => setFolderToDelete(null)}
                onConfirm={(targetId) => removeFolder(folderToDelete, targetId)}
            />
            <ReorderFoldersModal opened={reorderOpen} folders={folders} onClose={() => setReorderOpen(false)} onSave={saveFolderOrder} />
            <MoveReportModal
                report={moveReport}
                onClose={() => setMoveReport(null)}
                onRetry={async (ids) => {
                    const folderId = moveReport.folderId;
                    setMoveReport(null);
                    await moveTo(ids, folderId);
                }}
            />

            {/* csv import */}
            <LeadImportModal
                opened={csvOpen}
                onClose={() => setCsvOpen(false)}
                folders={folders}
                defaultFolderId={typeof activeFolder === 'number' ? activeFolder : null}
                historyHref="/leadtable/import-history"
                onDone={() => {
                    fetchLeads();
                    fetchFolders().then(setFolders).catch(() => {});
                }}
            />

            {/* ───────── Notes Modal ───────── */}
            <Modal opened={noteEditor.open} onClose={() => setNoteEditor({ open: false, lead: null, text: '' })} title={`Notes – ${noteEditor.lead?.full_name || ''}`} centered size="md">
                <Textarea minRows={4} autosize placeholder="Type your note…" value={noteEditor.text} onChange={(e) => { const text = e.currentTarget.value; setNoteEditor((prev) => ({ ...prev, text })); }} />

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
            <ConvertLeadModal lead={convertLead} onClose={() => setConvertLead(null)} onConverted={handleLeadConverted} />
        </div>
    );
};

export default LeadTable;
