// API helpers for /api/proposals (one-pager proposals made from a Financial Health Check or Financial Kundli).
import axios from 'axios';
import { authHeaders } from '@/utils/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const url = (p = '') => `${API_URL}/api/proposals${p}`;
const opts = async (extra = {}) => ({ headers: await authHeaders(), ...extra });

export const prefillProposal = async (sourceType, sourceId) => (await axios.get(url('/prefill'), await opts({ params: { source_type: sourceType, source_id: sourceId } }))).data;
export const listProposals = async (params) => (await axios.get(url(), await opts({ params }))).data;
export const listForSource = async (type, id) => (await axios.get(url(`/source/${type}/${id}`), await opts())).data;
export const listForClient = async (type, id) => (await axios.get(url(`/client/${type}/${id}`), await opts())).data;
export const getProposal = async (id) => (await axios.get(url(`/${id}`), await opts())).data;
export const createProposal = async (body) => (await axios.post(url(), body, await opts())).data;
export const updateProposal = async (id, body) => (await axios.put(url(`/${id}`), body, await opts())).data;
export const reviseProposal = async (id) => (await axios.post(url(`/${id}/revise`), {}, await opts())).data;
export const setProposalStatus = async (id, status, extra = {}) => (await axios.post(url(`/${id}/status`), { status, ...extra }, await opts())).data;
export const deleteProposal = async (id) => (await axios.delete(url(`/${id}`), await opts())).data;
// → proposal + share_url (marks a draft shared; the link stays the same afterwards)
export const shareProposal = async (id) => (await axios.post(url(`/${id}/share`), {}, await opts())).data;

// → { blob, fileName }
export const fetchProposalPdf = async (id) => {
    const res = await axios.get(url(`/${id}/pdf`), await opts({ responseType: 'blob', timeout: 90000 }));
    const match = /filename="?([^";]+)"?/i.exec(res.headers['content-disposition'] || '');
    return { blob: res.data, fileName: match ? match[1] : `Proposal_${id}.pdf` };
};
