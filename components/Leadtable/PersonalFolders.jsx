'use client';
// Personal lead folders for a team member (private: the API only returns the signed-in person's own folders).
// The UI pieces are shared with the admin lead table (FolderUI.jsx).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFolder } from '@tabler/icons-react';
import { fetchFolders, createFolder, renameFolder, deleteFolder, reorderFolders, moveLeadsWithReport, errorMessage } from './leadFolders';
import { DeleteFolderModal, FolderNameModal, FolderTabs, MoveReportModal, ReorderFoldersModal } from './FolderUI';

// State + actions. activeFolder: 'all' or a folder id.
// Folder counts come from the server; a lead's folder is row.my_folder_id (from /api/lead-list).
// onLeadsChanged() is called after leads move / a folder is deleted, so the page can reload its rows.
export const usePersonalFolders = ({ onLeadsChanged } = {}) => {
    const [folders, setFolders] = useState([]);
    const [activeFolder, setActiveFolder] = useState('all');
    const [report, setReport] = useState(null);

    const reload = useCallback(async () => {
        try {
            setFolders(await fetchFolders());
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    }, []);

    useEffect(() => {
        // ?folder=<id> (e.g. from a notification) opens that folder, if it still exists
        const wanted = Number(new URLSearchParams(window.location.search).get('folder'));
        fetchFolders()
            .then((list) => {
                setFolders(list);
                if (list.some((f) => f.id === wanted)) setActiveFolder(wanted);
            })
            .catch((err) => console.error('Failed to load folders:', err));
    }, []);

    const folderOf = useCallback((lead) => lead?.my_folder_id ?? null, []);
    const changed = () => {
        reload();
        onLeadsChanged?.();
    };

    // Moves in batches; a partial failure opens the report (with Retry). Returns the ids that moved.
    const moveTo = async (ids, folderId) => {
        if (!ids.length) return [];
        const folderName = folders.find((f) => f.id === folderId)?.name || 'folder';
        const res = await moveLeadsWithReport(ids, folderId);
        if (res.movedIds.length) changed();
        if (res.failed.length) setReport({ ...res, folderId, folderName });
        else showNotification({ title: 'Moved', message: `${res.movedIds.length} lead${res.movedIds.length === 1 ? '' : 's'} moved to ${folderName}`, color: 'green' });
        return res.movedIds;
    };
    const retry = async (ids) => {
        const r = report;
        setReport(null);
        await moveTo(ids, r.folderId);
    };

    const saveFolder = async (folder, name) => {
        if (folder) {
            const updated = await renameFolder(folder.id, name);
            setFolders((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
            return updated;
        }
        const created = await createFolder(name);
        setFolders((prev) => [...prev, created]);
        return created;
    };

    const removeFolder = async (folder, targetId) => {
        await deleteFolder(folder.id, targetId);
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        if (activeFolder === folder.id) setActiveFolder(targetId || 'all');
        changed();
        showNotification({ title: 'Folder deleted', message: `“${folder.name}” deleted.`, color: 'green' });
    };

    const saveOrder = async (ids) => {
        const list = await reorderFolders(ids);
        setFolders(list);
    };

    return { folders, activeFolder, setActiveFolder, folderOf, moveTo, retry, report, setReport, saveFolder, removeFolder, saveOrder, reload };
};

// Tabs + every folder popup for the team member's lead table. allCount = leads under "All Leads".
export const PersonalFolderBar = ({ pf, allCount, onChange }) => {
    const router = useRouter();
    const [nameModal, setNameModal] = useState({ open: false, folder: null });
    const [toDelete, setToDelete] = useState(null);
    const [reorderOpen, setReorderOpen] = useState(false);
    const { folders, activeFolder, setActiveFolder } = pf;
    const counts = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f.lead_count || 0])), [folders]);

    return (
        <>
            <FolderTabs
                folders={folders}
                counts={counts}
                allCount={allCount}
                active={activeFolder}
                onSelect={(id) => {
                    setActiveFolder(id);
                    onChange?.();
                }}
                onCreate={() => setNameModal({ open: true, folder: null })}
                onRename={(f) => setNameModal({ open: true, folder: f })}
                onDelete={setToDelete}
                onReorder={() => setReorderOpen(true)}
                onActivity={(f) => router.push(`/userleadtable/folder-activity${f ? `?folder=${encodeURIComponent(f.name)}` : ''}`)}
            />
            <FolderNameModal state={nameModal} onClose={() => setNameModal({ open: false, folder: null })} onSave={pf.saveFolder} />
            <DeleteFolderModal
                folder={toDelete}
                folders={folders}
                count={toDelete ? counts[toDelete.id] || 0 : 0}
                onClose={() => setToDelete(null)}
                onConfirm={(targetId) => pf.removeFolder(toDelete, targetId)}
            />
            <ReorderFoldersModal opened={reorderOpen} folders={folders} onClose={() => setReorderOpen(false)} onSave={pf.saveOrder} />
            <MoveReportModal report={pf.report} onClose={() => pf.setReport(null)} onRetry={pf.retry} />
        </>
    );
};

// Menu entries for one lead: every folder except the one it is already in.
export const MoveToFolderItems = ({ pf, lead }) => {
    const others = pf.folders.filter((f) => f.id !== pf.folderOf(lead));
    if (!others.length) return null;
    return (
        <>
            <Menu.Divider />
            <Menu.Label>Move to folder</Menu.Label>
            {others.map((f) => (
                <Menu.Item key={f.id} icon={<IconFolder size={14} />} onClick={() => pf.moveTo([lead.id], f.id)}>
                    <Text size="xs" className="truncate">{f.name}</Text>
                </Menu.Item>
            ))}
        </>
    );
};

export { errorMessage };
