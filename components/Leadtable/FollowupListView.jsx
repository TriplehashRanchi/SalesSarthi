'use client';
// List view of ALL follow-ups (not just one week): Overdue, Today, Tomorrow, later days, then Completed.
// events = the calendar events from /api/followups/view/calendar; onOpen(event) opens the details popup.
import { useMemo, useState } from 'react';
import { Badge, Text, TextInput } from '@mantine/core';
import { IconCalendarOff, IconSearch } from '@tabler/icons-react';

const dayStart = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};
const dayDiff = (d) => Math.round((dayStart(d) - dayStart(new Date())) / 86400000);
const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const isDone = (e) => e.extendedProps?.status === 'Completed';

// "Today" / "Tomorrow" / "in 3 days" / "2 days overdue"
export const relativeLabel = (e) => {
    const n = dayDiff(e.start);
    if (isDone(e)) return 'Done';
    if (n === 0) return new Date(e.start) < new Date() ? 'Due now' : 'Today';
    if (n === 1) return 'Tomorrow';
    if (n > 1) return `in ${n} days`;
    return `${-n} day${n === -1 ? '' : 's'} overdue`;
};

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
];

const FollowupRow = ({ e, onOpen, tone }) => {
    const done = isDone(e);
    const rel = relativeLabel(e);
    const relColor = done ? 'text-green-600' : tone === 'overdue' ? 'text-red-600' : tone === 'today' ? 'text-blue-600' : 'text-gray-500';
    return (
        <button
            type="button"
            onClick={() => onOpen(e)}
            className="flex w-full items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-500"
        >
            <span className="w-1 flex-shrink-0 rounded-full" style={{ background: e.backgroundColor || '#7c3aed' }} />
            <div className="w-[68px] flex-shrink-0 sm:w-[84px]">
                <div className="text-sm font-bold tabular-nums">{fmtTime(e.start)}</div>
                <div className="text-xs text-gray-500">{fmtDay(e.start)}</div>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`min-w-0 truncate text-sm font-semibold ${done ? 'text-gray-500 line-through decoration-gray-300' : ''}`}>{e.title}</span>
                    <Badge size="xs" color={done ? 'green' : 'orange'} variant="light">{e.extendedProps?.status || 'Pending'}</Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    <span className={`font-medium ${relColor}`}>{rel}</span>
                    {e.extendedProps?.creatorName && <span>· by {e.extendedProps.creatorName}</span>}
                </div>
                {e.extendedProps?.notes && <div className="mt-1 line-clamp-1 text-xs text-gray-500">{e.extendedProps.notes}</div>}
            </div>
        </button>
    );
};

export default function FollowupListView({ events, onOpen }) {
    const [filter, setFilter] = useState('today'); // opens on today's follow-ups
    const [search, setSearch] = useState('');

    const groups = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = (events || []).filter((e) => !q || `${e.title} ${e.extendedProps?.creatorName || ''} ${e.extendedProps?.notes || ''}`.toLowerCase().includes(q));
        const overdue = [];
        const byDay = new Map(); // pending today and later
        const completed = [];
        list.forEach((e) => {
            if (isDone(e)) return completed.push(e);
            const n = dayDiff(e.start);
            if (n < 0) return overdue.push(e);
            const k = dayStart(e.start).toISOString();
            if (!byDay.has(k)) byDay.set(k, []);
            byDay.get(k).push(e);
        });
        const asc = (a, b) => new Date(a.start) - new Date(b.start);
        overdue.sort(asc);
        completed.sort((a, b) => new Date(b.start) - new Date(a.start));
        const days = [...byDay.entries()].sort(([a], [b]) => new Date(a) - new Date(b)).map(([k, rows]) => {
            const n = dayDiff(k);
            return { id: k, title: n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : new Date(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }), kind: n === 0 ? 'today' : 'upcoming', rows: rows.sort(asc) };
        });
        return { overdue, days, completed, today: days.filter((d) => d.kind === 'today'), upcoming: days.filter((d) => d.kind === 'upcoming') };
    }, [events, search]);

    const counts = {
        all: groups.overdue.length + groups.days.reduce((s, d) => s + d.rows.length, 0) + groups.completed.length,
        overdue: groups.overdue.length,
        today: groups.today.reduce((s, d) => s + d.rows.length, 0),
        upcoming: groups.upcoming.reduce((s, d) => s + d.rows.length, 0),
        completed: groups.completed.length,
    };

    const sections = [];
    if ((filter === 'all' || filter === 'overdue') && groups.overdue.length) sections.push({ id: 'overdue', title: 'Overdue', tone: 'overdue', rows: groups.overdue });
    if (filter === 'all' || filter === 'today') groups.today.forEach((d) => sections.push({ ...d, tone: 'today' }));
    if (filter === 'all' || filter === 'upcoming') groups.upcoming.forEach((d) => sections.push({ ...d, tone: 'upcoming' }));
    if ((filter === 'all' || filter === 'completed') && groups.completed.length) sections.push({ id: 'completed', title: 'Completed', tone: 'done', rows: groups.completed });

    const titleColor = { overdue: 'text-red-600', today: 'text-blue-600', upcoming: 'text-gray-700 dark:text-gray-200', done: 'text-green-700' };

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                aria-pressed={active}
                                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                                    active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                {f.label}
                                <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/25' : f.key === 'overdue' && counts.overdue ? 'bg-red-100 text-red-600' : 'bg-white text-gray-500 dark:bg-gray-700'}`}>{counts[f.key]}</span>
                            </button>
                        );
                    })}
                </div>
                <TextInput className="md:w-72" radius="xl" placeholder="Search follow-ups" icon={<IconSearch size={16} />} value={search} onChange={(ev) => setSearch(ev.currentTarget.value)} />
            </div>

            {sections.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 py-14 text-center dark:border-gray-700">
                    <IconCalendarOff size={34} className="text-gray-400" />
                    <Text weight={600}>{search ? 'No follow-ups match your search' : filter === 'today' ? 'Nothing due today' : 'No follow-ups here'}</Text>
                    <Text size="sm" color="dimmed">{search ? 'Try a different name or word.' : filter === 'today' ? 'Check Upcoming or Overdue, or tap “Add Follow-up” to plan one.' : 'Tap “Add Follow-up” to plan one.'}</Text>
                </div>
            ) : (
                <div className="space-y-5">
                    {sections.map((s) => (
                        <section key={s.id}>
                            <div className="mb-2 flex items-center gap-2">
                                <h3 className={`text-sm font-bold uppercase tracking-wide ${titleColor[s.tone]}`}>{s.title}</h3>
                                <span className="text-xs text-gray-400">{s.rows.length}</span>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                                {s.rows.map((e) => <FollowupRow key={e.id} e={e} onOpen={onOpen} tone={s.tone} />)}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
