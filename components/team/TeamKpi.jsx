'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconPhoneCall, IconPhoneCheck, IconClock, IconCalendarDue, IconSearch } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { presetRange, reportGet, fmtDuration } from '@/utils/teamReport';
import DateRangeBar from './DateRangeBar';
import MisMenu from './MisMenu';
import StatCard from './StatCard';

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const rateTone = (r) => (r >= 50 ? 'text-emerald-600' : r >= 25 ? 'text-amber-600' : 'text-red-500');

// basePath: where a member's detail page lives, e.g. /view-user or /team-kpi
export default function TeamKpi({ basePath }) {
  const router = useRouter();
  const { user } = useAuth();
  const [range, setRange] = useState(presetRange('30d'));
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    let off = false;
    setLoading(true);
    reportGet('/overview', range)
      .then((d) => !off && setMembers(d.members))
      .catch((e) => !off && toast.error(e.response?.data?.message || 'Could not load team report'))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [user, range]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return members
      .filter((m) => !s || `${m.name} ${m.email} ${m.role}`.toLowerCase().includes(s))
      .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));
  }, [members, search]);

  const total = useMemo(() => {
    const t = members.reduce((a, m) => ({
      calls: a.calls + m.calls, connected: a.connected + m.connected, talk: a.talk + m.talk_seconds,
      pending: a.pending + m.followups_pending, overdue: a.overdue + m.followups_overdue,
    }), { calls: 0, connected: 0, talk: 0, pending: 0, overdue: 0 });
    return { ...t, rate: t.calls ? Math.round((t.connected / t.calls) * 100) : 0, avg: t.connected ? t.talk / t.connected : 0 };
  }, [members]);

  const open = (id) => router.push(`${basePath}/${id}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeBar range={range} onChange={setRange} />
        <MisMenu range={range} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Calls made" value={total.calls} sub={`${members.length} team members`} tone="blue" icon={<IconPhoneCall size={18} />} />
        <StatCard label="Connected" value={total.connected} sub={`${total.rate}% connect rate`} tone="green" icon={<IconPhoneCheck size={18} />} />
        <StatCard label="Talk time" value={fmtDuration(total.talk)} sub={`${fmtDuration(total.avg)} avg / connected`} tone="violet" icon={<IconClock size={18} />} />
        <StatCard label="Follow-ups pending" value={total.pending} sub={`${total.overdue} overdue`} tone={total.overdue ? 'red' : 'amber'} icon={<IconCalendarDue size={18} />} />
      </div>

      <div className="relative">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="form-input pl-9" placeholder="Search team member..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading team report...</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No team members found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#0e1726] md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60">
                <tr>
                  {['Team member', 'Leads', 'Calls', 'Connected', 'Talk time', 'Avg talk', 'Follow-ups pending', 'Overdue'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-medium ${i ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((m) => (
                  <tr key={m.id} onClick={() => open(m.id)} className="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(m.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-white">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{m.leads_assigned}</td>
                    <td className="px-4 py-3 text-right font-medium">{m.calls}</td>
                    <td className="px-4 py-3 text-right">{m.connected} <span className={`text-xs ${rateTone(m.connect_rate)}`}>({m.connect_rate}%)</span></td>
                    <td className="px-4 py-3 text-right">{fmtDuration(m.talk_seconds)}</td>
                    <td className="px-4 py-3 text-right">{fmtDuration(m.avg_talk_seconds)}</td>
                    <td className="px-4 py-3 text-right">{m.followups_pending}</td>
                    <td className={`px-4 py-3 text-right ${m.followups_overdue ? 'font-medium text-red-500' : 'text-gray-400'}`}>{m.followups_overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((m) => (
              <button key={m.id} type="button" onClick={() => open(m.id)}
                className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm active:bg-gray-50 dark:border-gray-700 dark:bg-[#0e1726]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(m.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.role}</p>
                  </div>
                  <span className={`text-sm font-semibold ${rateTone(m.connect_rate)}`}>{m.connect_rate}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[['Calls', m.calls], ['Connected', m.connected], ['Talk', fmtDuration(m.talk_seconds)], ['Leads', m.leads_assigned], ['Pending FU', m.followups_pending], ['Overdue', m.followups_overdue]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-gray-50 py-2 dark:bg-gray-800/60">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{v}</p>
                      <p className="text-[11px] text-gray-500">{l}</p>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
