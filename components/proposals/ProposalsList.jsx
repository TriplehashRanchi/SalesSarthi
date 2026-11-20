'use client';
// All proposals the signed-in person may see, newest activity first, filtered by status.
// New proposals are started from a Financial Health Check or a Financial Kundli result.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Loader, Pagination, SegmentedControl } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconChartCandle, IconFileText, IconHeartbeat } from '@tabler/icons-react';
import { listProposals } from './proposalsApi';
import { inr, shortDate, SOURCE_LABEL, STATUS } from './proposalUi';
import { userMessage } from '@/utils/userMessage';

const PAGE_SIZE = 20;
const FILTERS = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'shared', label: 'Shared' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
];

const StartButtons = ({ size = 'sm' }) => (
    <div className="flex flex-wrap gap-2">
        <Button component={Link} href="/fhclog" size={size} variant="light" leftIcon={<IconHeartbeat size={16} />}>
            From a Health Check
        </Button>
        <Button component={Link} href="/financehistory" size={size} variant="light" color="teal" leftIcon={<IconChartCandle size={16} />}>
            From a Financial Kundli
        </Button>
    </div>
);

export default function ProposalsList() {
    const router = useRouter();
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ rows: [], total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let live = true;
        setLoading(true);
        listProposals({ status: status || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
            .then((d) => live && setData(d))
            .catch((err) => showNotification({ title: 'Could not load proposals', message: userMessage(err), color: 'red' }))
            .finally(() => live && setLoading(false));
        return () => {
            live = false;
        };
    }, [status, page]);

    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    const open = (p) => router.push(`/proposals/${p.id}`);

    return (
        <div className="pb-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proposals</h1>
                    <p className="text-sm text-gray-500">One-page plans for your clients, made from a Health Check or Financial Kundli.</p>
                </div>
                <StartButtons />
            </div>

            <div className="mb-4 overflow-x-auto">
                <SegmentedControl
                    data={FILTERS}
                    value={status}
                    onChange={(v) => {
                        setStatus(v);
                        setPage(1);
                    }}
                    radius="xl"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader />
                    </div>
                ) : data.rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <IconFileText className="mx-auto mb-3 text-gray-300" size={44} />
                        <p className="font-semibold text-gray-700 dark:text-gray-200">{status ? `No ${STATUS[status].label.toLowerCase()} proposals` : 'No proposals yet'}</p>
                        <p className="mx-auto mb-5 mt-1 max-w-md text-sm text-gray-500">
                            Open a client’s Health Check or Financial Kundli result and tap <b>Create Proposal</b>. DG Sarthi suggests plans from the gaps it finds.
                        </p>
                        {!status && (
                            <div className="flex justify-center">
                                <StartButtons />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* desktop */}
                        <table className="hidden w-full text-sm md:table">
                            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-[#1b2e4b]/40">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Client</th>
                                    <th className="px-4 py-3 font-semibold">From</th>
                                    <th className="px-4 py-3 text-right font-semibold">Plans</th>
                                    <th className="px-4 py-3 text-right font-semibold">Per year</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-[#1b2e4b]">
                                {data.rows.map((p) => (
                                    <tr key={p.id} onClick={() => open(p)} className="cursor-pointer transition hover:bg-primary/5">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900 dark:text-white">{p.client_name || '—'}</p>
                                            <p className="text-xs text-gray-400">Version {p.version}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                            {SOURCE_LABEL[p.source_type]} <span className="text-gray-400">#{p.source_id}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">{p.item_count}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{inr(p.total_yearly)}</td>
                                        <td className="px-4 py-3">
                                            <Badge color={STATUS[p.status]?.color} variant="light">
                                                {STATUS[p.status]?.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{shortDate(p.updated_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* phone */}
                        <ul className="divide-y divide-gray-100 dark:divide-[#1b2e4b] md:hidden">
                            {data.rows.map((p) => (
                                <li key={p.id}>
                                    <button type="button" onClick={() => open(p)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-primary/5">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-gray-900 dark:text-white">{p.client_name || '—'}</p>
                                            <p className="text-xs text-gray-500">
                                                {p.item_count} plan{p.item_count === 1 ? '' : 's'} · v{p.version} · {shortDate(p.updated_at)}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-semibold">{inr(p.total_yearly)}</p>
                                            <Badge size="xs" color={STATUS[p.status]?.color} variant="light">
                                                {STATUS[p.status]?.label}
                                            </Badge>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {pages > 1 && (
                <div className="mt-4 flex justify-center">
                    <Pagination page={page} onChange={setPage} total={pages} />
                </div>
            )}
        </div>
    );
}
