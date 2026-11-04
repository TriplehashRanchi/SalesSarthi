// Customer folders (product lines) — calls for the admin and team-member side.
// The folder list itself is managed by the Super Admin at /superadmin/customer-folders.
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { authHeaders } from '@/utils/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const base = `${API_URL}/api/customer-folders`;

export const fetchCustomerFolders = async () => (await axios.get(base, { headers: await authHeaders() })).data;

export const fetchFolderCustomers = async (folderId) =>
  (await axios.get(`${base}/${folderId}/customers`, { headers: await authHeaders() })).data;

export const saveFolderResponse = async (folderId, customerId, response) =>
  (await axios.put(`${base}/${folderId}/customers/${customerId}`, { response }, { headers: await authHeaders() })).data;

export const removeFromFolder = async (folderId, customerId) =>
  (await axios.delete(`${base}/${folderId}/customers/${customerId}`, { headers: await authHeaders() })).data;

// [{ id, name, customer_count }] plus a reload function.
export const useCustomerFolders = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setFolders(await fetchCustomerFolders());
    } catch (err) {
      // warn, not error: the page still works without folders, so no dev error overlay for this.
      console.warn('Could not load customer folders:', err.response?.data?.message || err.message);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { folders, loading, reload };
};
