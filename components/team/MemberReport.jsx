'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import useTeamRoles from '@/hooks/useTeamRoles';
import Link from 'next/link';
import { IconArrowLeft, IconPhone, IconBrandWhatsapp, IconMail, IconPencil } from '@tabler/icons-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { API_URL, presetRange, reportGet, fmtDuration, fmtDateTime, fmtDate } from '@/utils/teamReport';
import DateRangeBar from './DateRangeBar';
import MisMenu from './MisMenu';
import EditMemberModal from './EditMemberModal';

const OUTCOME_STYLE = {
  Connected: 'bg-emerald-100 text-emerald-700',
  'Not Answered': 'bg-gray-100 text-gray-600',
  Busy: 'bg-amber-100 text-amber-700',
  'Switched Off': 'bg-slate-100 text-slate-600',
  'Wrong Number': 'bg-red-100 text-red-700',
  'Call Back': 'bg-blue-100 text-blue-700',
};
const OUTCOME_BAR = {
  Connected: 'bg-emerald-500', 'Not Answered': 'bg-gray-400', Busy: 'bg-amber-500',
  'Switched Off': 'bg-slate-400', 'Wrong Number': 'bg-red-500', 'Call Back': 'bg-blue-500',
};

const Panel = ({ title, hint, children, className = '' }) => (
  <section className={`border-t border-gray-200 pt-5 dark:border-gray-700 ${className}`}>
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
    {children}
  </section>
);

// Flat number: label, big value, small note.
const Stat = ({ label, value, sub, tone }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${tone === 'red' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    {sub && <p className="mt-0.5 truncate text-xs text-gray-400">{sub}</p>}
  </div>
);

const Empty = ({ children }) => <p className="py-6 text-center text-sm text-gray-400">{children}</p>;

const Detail = ({ label, value }) =>
  value ? (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="break-words text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  ) : null;

const TABS = [['overview', 'Overview'], ['calls', 'Calls'], ['followups', 'Follow-ups'], ['profile', 'Profile']];

// Admin only: pick a new role for this member (asks for confirmation first).
function RoleChanger({ member, onChanged }) {
  const roles = useTeamRoles([member.role]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = async (role) => {
    if (role === member.role) return setOpen(false);
    if (!window.confirm(`Are you sure you want to change ${member.username}'s role from ${member.role} to ${role}?`)) return;
    setSaving(true);
    try {
      const token = await getAuth().currentUser.getIdToken();
      await axios.patch(`${API_URL}/api/admin/users/${member.id}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Role updated');
      onChanged(role);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2.5 pr-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        {member.role}
        <button type="button" onClick={() => setOpen(true)} aria-label="Change role"
          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-primary/10 hover:text-primary">
          <IconPencil size={13} />
        </button>
      </span>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => !saving && setOpen(false)}>
          <div className="w-full rounded-t-2xl bg-white p-5 dark:bg-[#0e1726] sm:max-w-sm sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Change role</h3>
            <p className="mb-3 text-xs text-gray-500">{member.username}</p>
            <div className="space-y-2">
              {roles.map((r) => (
                <button key={r} type="button" disabled={saving} onClick={() => pick(r)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium ${r === member.role ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-200'}`}>
                  {r} {r === member.role && <span className="text-xs">Current</span>}
                </button>
              ))}
            </div>
            <button type="button" className="mt-4 w-full rounded-xl py-2.5 text-sm text-gray-500" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function MemberReport({ id, backHref }) {
  const { user } = useAuth();
  const [range, setRange] = useState(presetRange('30d'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) return;
    let off = false;
    setLoading(true);
    reportGet(`/members/${id}`, range)
      .then((d) => !off && setData(d))
      .catch((e) => !off && toast.error(e.response?.data?.message || 'Could not load member report'))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [user, id, range, reload]);

  if (loading && !data) return <p className="py-16 text-center text-sm text-gray-400">Loading...</p>;
  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">Team member not found.</p>
        <Link href={backHref} className="mt-3 inline-block text-sm text-primary">Back to team</Link>
      </div>
    );
  }

  const { profile: p, overview: o } = data;
  const phone = (p.phone || '').replace(/\D/g, '');
  const totalOutcomeCalls = data.outcomes.reduce((a, x) => a + x.count, 0);
  const maxLead = Math.max(1, ...data.lead_status.map((s) => s.count));
  const chartData = data.daily.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
        <IconArrowLeft size={16} /> Team
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {p.username.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{p.username}</h2>
            <p className="truncate text-sm text-gray-500">{p.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              {data.viewer === 'admin' ? (
                <RoleChanger member={{ id: p.id, username: p.username, role: p.role }} onChanged={(role) => setData((d) => ({ ...d, profile: { ...d.profile, role } }))} />
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">{p.role}</span>
              )}
              <span>Last active: {p.last_active_date ? fmtDate(p.last_active_date) : 'never'}</span>
              {p.manager_name && <span>Reports to: {p.manager_name}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {phone && (
            <>
              <a href={`tel:${p.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:text-primary dark:border-gray-700" aria-label="Call"><IconPhone size={16} /></a>
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:text-emerald-600 dark:border-gray-700" aria-label="WhatsApp"><IconBrandWhatsapp size={16} /></a>
            </>
          )}
          <a href={`mailto:${p.email}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:text-primary dark:border-gray-700" aria-label="Email"><IconMail size={16} /></a>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateRangeBar range={range} onChange={setRange} />
        <div className="flex gap-2">
          {data.viewer === 'admin' && (
            <button type="button" onClick={() => setEditOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-200 sm:flex-none">
              <IconPencil size={16} /> Edit details
            </button>
          )}
          <div className="flex-1 sm:flex-none"><MisMenu range={range} userId={id} label="Download MIS" variant="outline" /></div>
        </div>
      </div>
      {editOpen && <EditMemberModal profile={p} onClose={() => setEditOpen(false)} onSaved={() => setReload((n) => n + 1)} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-y border-gray-200 py-5 dark:border-gray-700 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Calls made" value={o.calls} sub={`${o.leads_called} leads called`} />
        <Stat label="Connected" value={o.connected} sub={`${o.connect_rate}% connect rate`} />
        <Stat label="Talk time" value={fmtDuration(o.talk_seconds)} sub={`${fmtDuration(o.avg_talk_seconds)} avg / call`} />
        <Stat label="Leads" value={o.leads_assigned} sub={`${o.leads_new} new in period`} />
        <Stat label="Follow-ups pending" value={o.followups_pending} sub={`${o.followups_completed} done in period`} />
        <Stat label="Overdue" value={o.followups_overdue} tone={o.followups_overdue ? 'red' : undefined} sub="follow-ups" />
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === k ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Calls per day" hint="Total calls vs connected calls" className="lg:col-span-2">
            {o.calls === 0 ? <Empty>No calls logged in this period.</Empty> : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l, pl) => pl?.[0]?.payload?.day || l} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="calls" name="Calls" fill="#4361ee" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="connected" name="Connected" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="Call outcomes" hint="What happened on each call">
            {totalOutcomeCalls === 0 ? <Empty>No calls yet.</Empty> : (
              <div className="space-y-3">
                {data.outcomes.map((x) => (
                  <div key={x.outcome}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{x.outcome}</span>
                      <span className="text-gray-500">{x.count} · {Math.round((x.count / totalOutcomeCalls) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-full rounded-full ${OUTCOME_BAR[x.outcome]}`} style={{ width: `${(x.count / totalOutcomeCalls) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Lead status" hint="All leads assigned to this member">
            {data.lead_status.length === 0 ? <Empty>No leads assigned.</Empty> : (
              <div className="space-y-3">
                {data.lead_status.map((s) => (
                  <div key={s.status}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{s.status.trim()}</span>
                      <span className="text-gray-500">{s.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / maxLead) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Data / campaign called" hint="Which lead source or campaign the calls were made on" className="lg:col-span-2">
            {data.campaigns.length === 0 ? <Empty>No calls in this period.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr><th className="py-2 pr-3 font-medium">Campaign / data</th><th className="px-3 text-right font-medium">Leads</th><th className="px-3 text-right font-medium">Calls</th><th className="px-3 text-right font-medium">Connected</th><th className="pl-3 text-right font-medium">Talk time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.campaigns.map((c) => (
                      <tr key={c.campaign}>
                        <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-white">{c.campaign}</td>
                        <td className="px-3 text-right">{c.leads_called}</td>
                        <td className="px-3 text-right">{c.calls}</td>
                        <td className="px-3 text-right">{c.connected}</td>
                        <td className="pl-3 text-right">{fmtDuration(c.talk_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'calls' && (
        <Panel title="Call log" hint={`Latest ${data.recent_calls.length} calls in this period · talk time per call`}>
          {data.recent_calls.length === 0 ? <Empty>No calls logged in this period.</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.recent_calls.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.full_name || 'Lead'} <span className="font-normal text-gray-500">· {c.phone_number}</span></p>
                    <p className="text-xs text-gray-500">{c.campaign} · {fmtDateTime(c.called_at)}{c.lead_status ? ` · ${c.lead_status.trim()}` : ''}</p>
                    {c.notes && <p className="mt-0.5 text-xs italic text-gray-500">“{c.notes}”</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_STYLE[c.outcome]}`}>{c.outcome}</span>
                    <span className="w-16 text-right text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">{c.duration_seconds ? fmtDuration(c.duration_seconds) : '-'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'followups' && (
        <Panel title="Pending follow-ups" hint={`${o.followups_pending} pending · ${o.followups_overdue} overdue · ${o.followups_completed} completed in period`}>
          {data.pending_followups.length === 0 ? <Empty>No pending follow-ups. 🎉</Empty> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.pending_followups.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{f.full_name || 'Customer'} {f.phone_number && <span className="font-normal text-gray-500">· {f.phone_number}</span>}</p>
                    <p className="text-xs text-gray-500">{f.purpose}{f.notes ? ` · ${f.notes}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-gray-500">{fmtDateTime(f.follow_up_date)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 font-medium ${f.overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.overdue ? 'Overdue' : 'Pending'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'profile' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Personal">
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Father's name" value={p.fathers_name} />
              <Detail label="Birthday" value={p.date_of_birth && fmtDate(p.date_of_birth)} />
              <Detail label="Anniversary" value={p.anniversary_date && fmtDate(p.anniversary_date)} />
              <Detail label="Blood group" value={p.blood_group} />
              <Detail label="PAN" value={p.pan} />
              <Detail label="Joined" value={fmtDate(p.created_at)} />
              <div className="col-span-2"><Detail label="Address" value={p.address} /></div>
            </div>
          </Panel>
          <Panel title="Emergency contact">
            {p.emergency_contact_name || p.emergency_contact_phone ? (
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Name" value={p.emergency_contact_name} />
                <Detail label="Phone" value={p.emergency_contact_phone} />
              </div>
            ) : <Empty>Not added.</Empty>}
          </Panel>
          {p.bank_account_number !== undefined && (
            <Panel title="Bank account" className="lg:col-span-2">
              {p.bank_account_number || p.bank_name ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Detail label="Account holder" value={p.bank_account_holder} />
                  <Detail label="Bank" value={p.bank_name} />
                  <Detail label="Account number" value={p.bank_account_number} />
                  <Detail label="IFSC" value={p.bank_ifsc} />
                </div>
              ) : <Empty>Not added.</Empty>}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
