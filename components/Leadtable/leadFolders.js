// Small helpers for lead folders (the folders themselves live in the API: /api/lead-folders).
import axios from 'axios';
import { getAuth } from 'firebase/auth';

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
export const deleteFolder = async (id) => (await axios.delete(`${API_URL}/api/lead-folders/${id}`, await config())).data;
export const moveLeads = async (leadIds, folderId) => (await axios.post(`${API_URL}/api/lead-folders/move`, { lead_ids: leadIds, folder_id: folderId }, await config())).data;

export const errorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

// A lead with no folder picked sits in Facebook (if it came from Facebook) or Default.
export const folderIdOf = (lead, folders) => {
    if (lead.folder_id) return lead.folder_id;
    const fallbackName = lead.source === 'facebook' ? 'Facebook' : 'Default';
    return folders.find((f) => f.is_system && f.name === fallbackName)?.id ?? null;
};
