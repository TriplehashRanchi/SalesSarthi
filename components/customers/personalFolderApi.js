// Personal folders (#11 / #12): the person's own folders, their arrangement of categories + folders, and
// manual / rule-based contents. Every call is for the signed-in person only.
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { authHeaders } from '@/utils/authHeaders';
import { FOLDERS_CHANGED } from './customerFolderApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const base = `${API_URL}/api/personal-folders`;
const h = async () => ({ headers: await authHeaders() });

export const fetchFolderList = async () => (await axios.get(base, await h())).data;
export const saveFolderLayout = async (items) => (await axios.put(`${base}/layout`, { items }, await h())).data;
export const resetFolderLayout = async () => (await axios.delete(`${base}/layout`, await h())).data;
export const createPersonalFolder = async (name) => (await axios.post(base, { name }, await h())).data;
export const renamePersonalFolder = async (id, name) => (await axios.put(`${base}/${id}`, { name }, await h())).data;
export const deletePersonalFolder = async (id) => (await axios.delete(`${base}/${id}`, await h())).data;
export const fetchPersonalFolder = async (id) => (await axios.get(`${base}/${id}/customers`, await h())).data;
export const searchCandidates = async (id, q) => (await axios.get(`${base}/${id}/candidates`, { ...(await h()), params: { q } })).data;
export const addToPersonalFolder = async (id, customerIds) => (await axios.post(`${base}/${id}/customers`, { customer_ids: customerIds }, await h())).data;
export const removeFromPersonalFolder = async (id, customerId) => (await axios.delete(`${base}/${id}/customers/${customerId}`, await h())).data;
export const fetchKeptOut = async (id) => (await axios.get(`${base}/${id}/excluded`, await h())).data;
export const letBackIn = async (id, customerId) => (await axios.delete(`${base}/${id}/excluded/${customerId}`, await h())).data;
export const fetchRuleOptions = async () => (await axios.get(`${base}/rule-options`, await h())).data;
export const previewRule = async (criteria) => (await axios.post(`${base}/rules/preview`, criteria, await h())).data;
export const addRule = async (id, criteria) => (await axios.post(`${base}/${id}/rules`, criteria, await h())).data;
export const updateRule = async (id, ruleId, criteria) => (await axios.put(`${base}/${id}/rules/${ruleId}`, criteria, await h())).data;
export const deleteRule = async (id, ruleId) => (await axios.delete(`${base}/${id}/rules/${ruleId}`, await h())).data;

// The person's ordered list of categories + personal folders ({ items, arranged }); reloads after any change.
export const useFolderList = () => {
  const [data, setData] = useState({ items: [], arranged: false });
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await fetchFolderList());
    } catch (err) {
      console.warn('Could not load folders:', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
    const on = () => reload();
    window.addEventListener(FOLDERS_CHANGED, on);
    return () => window.removeEventListener(FOLDERS_CHANGED, on);
  }, [reload]);
  return { ...data, loading, reload };
};

// "Facebook or Website · Active · renewal in 30 days" — a rule in words.
export const describeRule = (c, opts = {}) => {
  const parts = [];
  const name = (list, id) => list?.find((x) => String(x.id) === String(id))?.name || list?.find((x) => String(x.id) === String(id))?.username;
  if (c.category_ids?.length) parts.push(`Category: ${c.category_ids.map((id) => name(opts.categories, id) || `#${id}`).join(' or ')}`);
  if (c.staff_ids?.length) parts.push(`Staff: ${c.staff_ids.map((id) => (id === 'unassigned' ? 'Not assigned' : name(opts.staff, id) || `#${id}`)).join(' or ')}`);
  if (c.statuses?.length) parts.push(`Status: ${c.statuses.join(' or ')}`);
  if (c.sources?.length) parts.push(`Source: ${c.sources.join(' or ')}`);
  if (c.renewal_within_days) parts.push(`Renewal within ${c.renewal_within_days} days`);
  if (c.product_text) parts.push(`Product contains "${c.product_text}"`);
  return parts.join(' · ');
};
