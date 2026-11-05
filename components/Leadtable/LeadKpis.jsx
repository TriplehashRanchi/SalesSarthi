'use client';

// Lead KPIs, worked out from the leads already loaded on the page.
// <FolderKpis> : KPIs for one folder (or All), as cards or as a status column chart.
import { useEffect, useMemo, useState } from 'react';
import { IconChartBar, IconChevronDown, IconChevronUp, IconLayoutGrid } from '@tabler/icons-react';

const RANGES = [
    { value: 'all', label: 'All time' },
    { value: '30', label: '30 days' },
    { value: '7', label: '7 days' },
    { value: '1', label: 'Today' },
];

const inRange = (lead, range) => {
    if (range === 'all') return true;
    if (!lead.created_at) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (Number(range) - 1));
    return new Date(lead.created_at) >= start;
};

const st = (l) => (l.lead_status || '').trim().toLowerCase();
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const computeKpis = (leads) => {
    const k = { total: leads.length, hot: 0, qualified: 0, followup: 0, cold: 0, lost: 0, converted: 0, untouched: 0, unassigned: 0 };
    leads.forEach((l) => {
        const s = st(l);
        if (s === 'hot lead') k.hot++;
        else if (s === 'qualified lead' || s === 'fin health checkup done') k.qualified++;
        else if (s === 'follow-up') k.followup++;
        else if (s === 'cold lead') k.cold++;
        else if (s === 'lost lead' || s === 'request deletion') k.lost++;
        else if (s === 'customer') k.converted++;
        else k.untouched++; // empty / New / anything not worked yet
        if (!l.user_id) k.unassigned++;
    });
    k.conversion = pct(k.converted, k.total);
    k.qualifiedRate = pct(k.qualified + k.converted, k.total);
    k.contacted = pct(k.total - k.untouched, k.total);
    return k;
};

// Status segments in funnel order. Colours were run through the dataviz palette
// validator (light + dark) in this adjacent order, so keep the order if you edit.
const SEGMENTS = [
    { key: 'untouched', label: 'Untouched', cls: 'bg-[#c3c2b7] dark:bg-[#52514e]' },
    { key: 'cold', label: 'Cold', cls: 'bg-[#2a78d6] dark:bg-[#3987e5]' },
    { key: 'hot', label: 'Hot', cls: 'bg-[#eb6834] dark:bg-[#d95926]' },
    { key: 'followup', label: 'Follow-up', cls: 'bg-[#1baf7a] dark:bg-[#199e70]' },
    { key: 'qualified', label: 'Qualified', cls: 'bg-[#eda100] dark:bg-[#c98500]' },
    { key: 'converted', label: 'Converted', cls: 'bg-[#008300]' },
    { key: 'lost', label: 'Lost', cls: 'bg-[#e87ba4] dark:bg-[#d55181]' },
];

// Round the axis top up to a friendly number (5, 10, 20, 25, 50, 100 ...).
const niceMax = (v) => {
    if (v <= 4) return 4;
    const step = 10 ** Math.floor(Math.log10(v));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
    return 10 * step;
};

// Column chart: one column per status, in funnel order, with a value on top and the label below.
const StatusChart = ({ k }) => {
    const [hover, setHover] = useState(null);
    const [grown, setGrown] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setGrown(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const max = niceMax(Math.max(1, ...SEGMENTS.map((s) => k[s.key])));
    const ticks = [max, max / 2, 0];

    return (
        <div className="flex gap-2">
            {/* y axis */}
            <div className="relative h-40 w-6 flex-shrink-0 text-right text-[10px] tabular-nums text-gray-400">
                {ticks.map((t, i) => (
                    <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 2) * 100}%` }}>
                        {Number.isInteger(t) ? t : t.toFixed(1)}
                    </span>
                ))}
            </div>

            <div className="min-w-0 flex-1">
                {/* plot */}
                <div className="relative h-40" onMouseLeave={() => setHover(null)}>
                    {ticks.map((t, i) => (
                        <div
                            key={i}
                            className={`absolute inset-x-0 ${i === 2 ? 'border-t border-gray-300 dark:border-gray-600' : 'border-t border-dashed border-gray-200 dark:border-gray-700/70'}`}
                            style={{ top: `${(i / 2) * 100}%` }}
                        />
                    ))}
                    <div className="absolute inset-0 flex items-end gap-1.5 px-1 sm:gap-3 sm:px-2">
                        {SEGMENTS.map((s) => {
                            const v = k[s.key];
                            const h = (v / max) * 100;
                            const dim = hover && hover !== s.key;
                            return (
                                <div
                                    key={s.key}
                                    className="group relative flex h-full flex-1 cursor-pointer items-end justify-center"
                                    onMouseEnter={() => setHover(s.key)}
                                    onClick={() => setHover((x) => (x === s.key ? null : s.key))}
                                    role="img"
                                    aria-label={`${s.label}: ${v} leads (${pct(v, k.total)}%)`}
                                >
                                    {/* hover column wash */}
                                    <div className={`absolute inset-x-0 bottom-0 top-0 rounded-md bg-violet-100/50 transition-opacity dark:bg-white/5 ${hover === s.key ? 'opacity-100' : 'opacity-0'}`} />
                                    <div
                                        className={`relative w-full max-w-[44px] rounded-t-[4px] transition-all duration-700 ease-out ${s.cls} ${dim ? 'opacity-30' : ''}`}
                                        style={{ height: grown ? `${v ? Math.max(h, 2) : 0}%` : '0%' }}
                                    >
                                        <span className="absolute inset-x-0 -top-5 text-center text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">{v}</span>
                                    </div>
                                    {hover === s.key && (
                                        <div
                                            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
                                            style={{ bottom: `calc(${v ? Math.max(h, 2) : 0}% + 24px)` }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className={`h-2 w-2 rounded-full ${s.cls}`} />
                                                <b>{s.label}</b>
                                            </div>
                                            <div className="tabular-nums opacity-80">
                                                {v} leads · {pct(v, k.total)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* x labels */}
                <div className="mt-1.5 flex gap-1.5 px-1 sm:gap-3 sm:px-2">
                    {SEGMENTS.map((s) => (
                        <div key={s.key} className={`flex-1 text-center text-[10px] leading-tight sm:text-xs ${hover === s.key ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {s.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Stat = ({ label, value, sub, warn }) => (
    <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
        <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold leading-tight tabular-nums ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
            {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
    </div>
);

const Card = ({ label, value, sub, tone = 'gray' }) => {
    const tones = {
        gray: 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        violet: 'bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
        red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200',
        green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    };
    return (
        <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
            <div className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-xl font-bold leading-tight sm:text-2xl">{value}</div>
            {sub != null && <div className="text-[11px] opacity-70">{sub}</div>}
        </div>
    );
};

// Cards <-> Graph switch, sits beside the time range.
const VIEWS = [
    { value: 'cards', label: 'Cards', Icon: IconLayoutGrid },
    { value: 'graph', label: 'Graph', Icon: IconChartBar },
];
const ViewToggle = ({ value, onChange }) => (
    <div role="radiogroup" aria-label="View" className="inline-flex flex-shrink-0 gap-1 rounded-full bg-violet-50 p-1 dark:bg-gray-800">
        {VIEWS.map(({ value: v, label, Icon }) => {
            const active = value === v;
            return (
                <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={label}
                    onClick={() => onChange(v)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:text-[13px] ${
                        active ? 'bg-violet-600 text-white shadow-sm shadow-violet-300 dark:shadow-none' : 'text-violet-700/70 hover:bg-white hover:text-violet-700 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            );
        })}
    </div>
);

const RangePicker = ({ value, onChange }) => (
    <div role="radiogroup" aria-label="Time range" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-violet-50 p-1 dark:bg-gray-800" style={{ scrollbarWidth: 'none' }}>
        {RANGES.map((r) => {
            const active = value === r.value;
            return (
                <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(r.value)}
                    className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-3.5 sm:text-[13px] ${
                        active ? 'bg-violet-600 text-white shadow-sm shadow-violet-300 dark:shadow-none' : 'text-violet-700/70 hover:bg-white hover:text-violet-700 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                >
                    {r.label}
                </button>
            );
        })}
    </div>
);

/* ───────── one folder ───────── */
export const FolderKpis = ({ leads, title }) => {
    const [open, setOpen] = useState(true);
    const [range, setRange] = useState('all');
    const [view, setView] = useState('cards');

    // remember the Cards / Graph choice
    useEffect(() => {
        const saved = typeof window !== 'undefined' && window.localStorage.getItem('leadKpiView');
        if (saved === 'cards' || saved === 'graph') setView(saved);
    }, []);
    const changeView = (v) => {
        setView(v);
        try {
            window.localStorage.setItem('leadKpiView', v);
        } catch {}
    };

    const scoped = useMemo(() => leads.filter((l) => inRange(l, range)), [leads, range]);
    const k = useMemo(() => computeKpis(scoped), [scoped]);

    return (
        <div className="mb-4 rounded-2xl border border-gray-200 p-3 dark:border-gray-700 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                    {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    {title} KPIs
                    {!open && <span className="font-normal text-gray-500">· {k.total} leads · {k.conversion}% converted</span>}
                </button>
                {open && (
                    <div className="flex max-w-full items-center gap-2">
                        <RangePicker value={range} onChange={setRange} />
                        <ViewToggle value={view} onChange={changeView} />
                    </div>
                )}
            </div>

            {open && view === 'cards' && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                    <Card label="Total leads" value={k.total} tone="violet" />
                    <Card label="Untouched" value={k.untouched} sub={`${pct(k.untouched, k.total)}% not worked`} tone="amber" />
                    <Card label="Hot" value={k.hot} sub={`${pct(k.hot, k.total)}%`} tone="red" />
                    <Card label="Qualified" value={k.qualified} sub={`${pct(k.qualified, k.total)}%`} tone="blue" />
                    <Card label="Follow-up" value={k.followup} sub={`${pct(k.followup, k.total)}%`} />
                    <Card label="Lost" value={k.lost} sub={`${pct(k.lost, k.total)}%`} />
                    <Card label="Converted" value={k.converted} sub={`${k.conversion}% conversion`} tone="green" />
                    <Card label="Unassigned" value={k.unassigned} sub={`${pct(k.unassigned, k.total)}% of leads`} tone={k.unassigned ? 'amber' : 'gray'} />
                </div>
            )}

            {open && view === 'graph' && (
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
                    <div className="grid flex-shrink-0 grid-cols-3 gap-3 lg:w-44 lg:grid-cols-1 lg:content-center lg:gap-4 lg:border-r lg:border-gray-200 lg:pr-6 lg:dark:border-gray-700">
                        <Stat label="Leads" value={k.total} />
                        <Stat label="Converted" value={`${k.conversion}%`} sub={`${k.converted} leads`} />
                        <Stat label="Unassigned" value={k.unassigned} warn={k.unassigned > 0} />
                    </div>
                    <div className="min-w-0 flex-1 pt-4">
                        <StatusChart key={range} k={k} />
                    </div>
                </div>
            )}
        </div>
    );
};
