// Small helpers for lead folders (the folders themselves live in the API: /api/lead-folders).
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { userMessage } from '@/utils/userMessage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const config = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    const token = await user.getIdToken();
    return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
};

export const fetchFolders = async () => (await axios.get(`${API_URL}/api/lead-folders`, await config())).data;
export const createFolder = async (name) => (await axios.post(`${API_URL}/api/lead-folders`, { name }, await config())).data;
export const renameFolder = async (id, name) => (await axios.put(`${API_URL}/api/lead-folders/${id}`, { name }, await config())).data;
// A folder with leads needs targetFolderId: its leads move there first, then the folder is deleted.
export const deleteFolder = async (id, targetFolderId) =>
    (await axios.delete(`${API_URL}/api/lead-folders/${id}`, { ...(await config()), params: targetFolderId ? { target_folder_id: targetFolderId } : {} })).data;
export const reorderFolders = async (folderIds) => (await axios.put(`${API_URL}/api/lead-folders/order`, { folder_ids: folderIds }, await config())).data;
// source 'lead_edit' marks a move made from the Edit Lead form (shown in Folder Activity History).
export const moveLeads = async (leadIds, folderId, source) =>
    (await axios.post(`${API_URL}/api/lead-folders/move`, { lead_ids: leadIds, folder_id: folderId, ...(source ? { source } : {}) }, await config())).data;

// After a bulk move (2+ leads) finishes: one "Leads moved" notification for the whole move.
export const sendMoveSummary = async (folderId, moved, failed) => {
    if (moved + failed < 2) return;
    try {
        await axios.post(`${API_URL}/api/lead-folders/move-summary`, { folder_id: folderId, moved, failed }, await config());
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-notifications-changed'));
    } catch {
        /* the move itself already succeeded */
    }
};

// Moves in batches so one network / server error does not lose the whole move.
// Returns { total, movedIds, failed: [{ id, reason }] } — the screen shows it and can retry the failed ones.
export const moveLeadsWithReport = async (leadIds, folderId, batchSize = 100) => {
    const movedIds = [];
    const failed = [];
    for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        try {
            const res = await moveLeads(batch, folderId);
            movedIds.push(...(res.moved_ids || []));
            failed.push(...(res.failed || []));
        } catch (err) {
            const reason = err?.response?.data?.message || (err?.response ? 'Server error' : 'Network error – check your internet');
            failed.push(...batch.map((id) => ({ id, reason })));
        }
    }
    if (leadIds.length > 1) await sendMoveSummary(folderId, movedIds.length, failed.length);
    return { total: leadIds.length, movedIds, failed };
};

export const errorMessage = userMessage; // plain-language message for the person using the CRM

// Admin's folder for a lead (no folder = only in All Leads).
export const folderIdOf = (lead) => lead.folder_id || null;

// Team member only: [{ lead_id, folder_id }] for their own leads (admins get []).
export const fetchFolderAssignments = async () => (await axios.get(`${API_URL}/api/lead-folders/assignments`, await config())).data;

// Bulk CSV import (see sarthiapi/controllers/leadImportController.js)
export const importCheck = async (rows) => (await axios.post(`${API_URL}/api/lead-import/check`, { rows }, await config())).data;
export const importCommit = async (payload) => (await axios.post(`${API_URL}/api/lead-import/commit`, payload, await config())).data;
