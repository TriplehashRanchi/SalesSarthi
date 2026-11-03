'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconSearch, IconTrash, IconEye } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/utils/authHeaders';
import { API_URL, fmtDateTime } from '@/utils/teamReport';

const PAGE = 40;

// A Manager's view of the team's leads: filter by member, reassign inside the team, delete.
export default function TeamLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState('');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const [l, t] = await Promise.all([
        axios.get(`${API_URL}/api/leads/team`, { headers }),
        axios.get(`${API_URL}/api/users/team`, { headers }),
      ]);
      setLeads(l.data);
      setTeam(t.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load team leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) =>
      (!member || String(l.user_id) === member) &&
      (!s || `${l.full_name} ${l.phone_number} ${l.email} ${l.lead_status}`.toLowerCase().includes(s)));
  }, [leads, member, search]);

  const reassign = async (lead, userId) => {
    if (String(userId) === String(lead.user_id)) return;
    const to = team.find((t) => String(t.id) === String(userId));
    if (!window.confirm(`Assign ${lead.full_name} to ${to?.username}?`)) return;
    try {
      await axios.post(`${API_URL}/api/admin/assign`, { user_id: Number(userId), leads: [lead.id] }, { headers: await authHeaders() });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, user_id: Number(userId), assigned_to: to?.username } : l)));
      toast.success('Lead reassigned');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reassign');
    }
  };

  const remove = async (lead) => {
    if (!window.confirm(`Delete ${lead.full_name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/api/leads/${lead.id}`, { headers: await authHeaders() });
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      toast.success('Lead deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  const assignSelect = (lead) => (
    <select className="form-select h-9 w-full py-0 text-sm sm:w-44" value={lead.user_id} onChange={(e) => reassign(lead, e.target.value)}>
      {!team.some((t) => t.id === lead.user_id) && <option value={lead.user_id}>{lead.assigned_to || 'Unassigned'}</option>}
      {team.map((t) => <option key={t.id} value={t.id}>{t.username}</option>)}
    </select>
  );

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Team Leads
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{rows.length}</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">Leads held by you and your team. Reassign a lead within your team from the “Assigned to” list.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input rounded-xl pl-9" placeholder="Search lead" value={search} onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }} />
          </div>
          <select className="form-select w-[140px] shrink-0 rounded-xl sm:w-44" value={member} onChange={(e) => { setMember(e.target.value); setShown(PAGE); }}>
            <option value="">All members</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.username}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">No leads found.</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#0e1726] md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Next follow-up</th>
                  <th className="px-3 py-3 font-medium">Assigned to</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.slice(0, shown).map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{l.full_name}</p>
                      <p className="text-xs text-gray-500">{l.phone_number}</p>
                    </td>
                    <td className="px-3 py-3">{(l.lead_status || '-').trim()}</td>
                    <td className="px-3 py-3 text-gray-500">{l.form_name || l.source || '-'}</td>
                    <td className="px-3 py-3 text-gray-500">{l.next_follow_up_date ? fmtDateTime(l.next_follow_up_date) : '-'}</td>
                    <td className="px-3 py-3">{assignSelect(l)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/userleadtable/${l.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="View"><IconEye size={18} /></Link>
                        <button type="button" onClick={() => remove(l)} className="rounded-lg p-2 text-red-500 opacity-60 hover:bg-red-50 hover:opacity-100" aria-label="Delete"><IconTrash size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {rows.slice(0, shown).map((l) => (
              <div key={l.id} className="border-b border-gray-200 px-1 py-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/userleadtable/${l.id}`} className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{l.full_name}</p>
                    <p className="text-xs text-gray-500">{l.phone_number} · {(l.lead_status || '-').trim()}</p>
                  </Link>
                  <button type="button" onClick={() => remove(l)} className="p-1 text-red-400" aria-label="Delete"><IconTrash size={18} /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="shrink-0 text-xs text-gray-500">Assigned to</span>
                  {assignSelect(l)}
                </div>
              </div>
            ))}
          </div>

          {shown < rows.length && (
            <div className="py-5 text-center">
              <button type="button" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-200" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({rows.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
