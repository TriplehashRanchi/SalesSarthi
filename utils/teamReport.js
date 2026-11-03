import { getAuth } from 'firebase/auth';
import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const presetRange = (key) => {
  const to = new Date();
  const from = new Date();
  if (key === 'today') return { from: iso(to), to: iso(to) };
  if (key === '7d') from.setDate(to.getDate() - 6);
  else if (key === '30d') from.setDate(to.getDate() - 29);
  else if (key === 'month') from.setDate(1);
  return { from: iso(from), to: iso(to) };
};

// 3725 -> "1h 02m", 252 -> "4m 12s", 0 -> "0s"
export const fmtDuration = (sec) => {
  const s = Math.round(Number(sec) || 0);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(r).padStart(2, '0')}s`;
};

export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

// GET with the signed-in admin/manager's token.
export const reportGet = async (path, params) => {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const { data } = await axios.get(`${API_URL}/api/team-reports${path}`, { params, headers: { Authorization: `Bearer ${token}` } });
  return data;
};

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Stop spreadsheet apps from running a cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// columns: [[header, row => value], ...]
export const downloadCsv = (filename, columns, rows) => {
  const lines = [columns.map(([h]) => csvCell(h)).join(',')];
  rows.forEach((r) => lines.push(columns.map(([, get]) => csvCell(get(r))).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const mmss = (sec) => fmtDuration(sec);

export const MIS_FILES = {
  summary: {
    label: 'Team summary',
    build: (d) => [
      [
        ['Team Member', (r) => r.name], ['Role', (r) => r.role], ['Leads Assigned', (r) => r.leads_assigned],
        ['New Leads (period)', (r) => r.leads_new], ['Leads Called', (r) => r.leads_called], ['Calls', (r) => r.calls],
        ['Connected', (r) => r.connected], ['Connect %', (r) => r.connect_rate], ['Talk Time', (r) => mmss(r.talk_seconds)],
        ['Avg Talk / Connected Call', (r) => mmss(r.avg_talk_seconds)], ['Follow-ups Pending', (r) => r.followups_pending],
        ['Follow-ups Overdue', (r) => r.followups_overdue], ['Follow-ups Completed (period)', (r) => r.followups_completed],
      ],
      d.summary,
    ],
  },
  calls: {
    label: 'Call log',
    build: (d) => [
      [
        ['Date & Time', (r) => fmtDateTime(r.called_at)], ['Team Member', (r) => r.team_member], ['Lead', (r) => r.lead_name],
        ['Phone', (r) => r.phone_number], ['Campaign / Data', (r) => r.campaign], ['Folder', (r) => r.folder],
        ['Lead Status', (r) => r.lead_status], ['Call Outcome', (r) => r.outcome], ['Talk Time', (r) => mmss(r.duration_seconds)],
        ['Notes', (r) => r.notes],
      ],
      d.calls,
    ],
  },
  followups: {
    label: 'Follow-ups',
    build: (d) => [
      [
        ['Team Member', (r) => r.team_member], ['Lead', (r) => r.lead_name], ['Phone', (r) => r.phone_number],
        ['Follow-up Date', (r) => fmtDateTime(r.follow_up_date)], ['Status', (r) => r.status], ['Overdue', (r) => r.overdue],
        ['Purpose', (r) => r.purpose], ['Notes', (r) => r.notes],
      ],
      d.followups,
    ],
  },
};
