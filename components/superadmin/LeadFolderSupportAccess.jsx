'use client';
// Super admin: support access to an account's personal lead folders.
// Hidden by default. Opening needs a written reason, shows only folder names + lead counts (read only),
// and every opening is saved in the audit log shown below.
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Group, Loader, Text, Textarea, Title } from '@mantine/core';
import { IconLock, IconShieldCheck } from '@tabler/icons-react';
import superAdminAxios from '@/utils/superAdminAxios';
import { userMessage } from '@/utils/userMessage';
import { ACTIVITY, changeText } from '@/components/Leadtable/FolderActivityHistory';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const msg = userMessage;

// bare: no card / title (used inside the admin drawer, which has its own section heading).
const LeadFolderSupportAccess = ({ adminId, bare = false }) => {
    const [reason, setReason] = useState('');
    const [data, setData] = useState(null);
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadAudit = async () => {
        try {
            const res = await superAdminAxios.get(`/api/superadmin/admins/${adminId}/lead-folders/audit`);
            setAudit(res.data || []);
        } catch (err) {
            console.error('Audit log failed:', err.message);
            setAudit([]);
        }
    };

    useEffect(() => {
        if (adminId) loadAudit();
    }, [adminId]);

    const openAccess = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await superAdminAxios.post(`/api/superadmin/admins/${adminId}/lead-folders/access`, { reason });
            setData(res.data);
            setReason('');
            loadAudit();
        } catch (err) {
            setError(msg(err, 'Could not open folders.'));
        } finally {
            setLoading(false);
        }
    };

    const ownerName = (f) => {
        if (Number(f.owner_user_id) === 0) return `${data.admin.name} (Admin)`;
        const u = data.users.find((x) => Number(x.id) === Number(f.owner_user_id));
        return u ? u.username : `User #${f.owner_user_id}`;
    };

    const content = (
        <>
            <Group position="apart" align="flex-start" mb="sm" noWrap>
                <Text size="xs" color="dimmed">
                    Personal folders are private. Open only for a support request – every access is recorded.
                </Text>
                <Badge color="red" variant="light" leftSection={<IconLock size={12} />} className="shrink-0">Restricted</Badge>
            </Group>

            {!data ? (
                <div className="flex flex-col gap-2">
                    <Textarea
                        label="Support reason"
                        placeholder="e.g. Ticket #123 – user cannot see their Kanyadaan folder"
                        value={reason}
                        onChange={(e) => setReason(e.currentTarget.value)}
                        autosize
                        minRows={2}
                        maxLength={500}
                        error={error}
                        size="sm"
                    />
                    <Button
                        color="red"
                        variant="light"
                        size="xs"
                        leftIcon={<IconShieldCheck size={15} />}
                        onClick={openAccess}
                        loading={loading}
                        disabled={reason.trim().length < 10}
                        className="self-end"
                    >
                        Open folders (logged)
                    </Button>
                </div>
            ) : (
                <div>
                    <Group position="apart" mb="xs">
                        <Text size="sm" weight={600}>Read only · {data.folders.length} folders</Text>
                        <Button size="xs" variant="default" onClick={() => setData(null)}>Close</Button>
                    </Group>
                    <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                        {data.folders.map((f) => (
                            <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <div className="min-w-0">
                                    <div className="truncate font-medium">
                                        {f.name}
                                        {f.is_system ? <Badge size="xs" ml={6}>System</Badge> : null}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">{ownerName(f)} · {fmt(f.created_at)}</div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-semibold">{f.lead_count}</div>
                                    <div className="text-xs text-gray-500">leads</div>
                                </div>
                            </div>
                        ))}
                        {!data.folders.length && <Text size="sm" color="dimmed" align="center" py="sm">No folders yet.</Text>}
                    </div>

                    {/* Folder activity: visible only inside this audited support access */}
                    <Text size="xs" weight={600} transform="uppercase" color="dimmed" mt="md" mb={6}>
                        Folder activity (latest {data.activity?.length || 0})
                    </Text>
                    {data.activity?.length ? (
                        <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                            {data.activity.map((a) => (
                                <div key={a.id} className="px-3 py-2 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate">
                                            <Badge size="xs" color={ACTIVITY[a.activity_type]?.color || 'gray'} variant="light" mr={6}>{ACTIVITY[a.activity_type]?.label || a.activity_type}</Badge>
                                            <b>{a.folder_name || '—'}</b>{a.lead_name ? ` · ${a.lead_name}` : ''}
                                        </span>
                                        <span className="shrink-0 text-xs text-gray-500">{fmt(a.created_at)}</span>
                                    </div>
                                    <div className="truncate text-xs text-gray-500">
                                        {changeText(a)}{changeText(a) ? ' · ' : ''}{ownerName(a)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Text size="xs" color="dimmed">No folder activity yet.</Text>
                    )}
                </div>
            )}

            <Text size="xs" weight={600} transform="uppercase" color="dimmed" mt="md" mb={6}>Access log</Text>
            {audit === null ? (
                <Loader size="sm" />
            ) : audit.length ? (
                <div className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                    {audit.map((a) => (
                        <div key={a.id} className="px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium">{a.accessed_by}</span>
                                <span className="shrink-0 text-xs text-gray-500">{fmt(a.accessed_at)}</span>
                            </div>
                            <div className="break-words text-xs text-gray-600 dark:text-gray-300">{a.reason}</div>
                            {a.ip && <div className="text-[11px] text-gray-400">IP {a.ip}</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <Text size="xs" color="dimmed">No one has opened this account's folders.</Text>
            )}
        </>
    );

    if (bare) return content;
    return (
        <Card withBorder shadow="sm" padding="lg">
            <Title order={5} mb="xs">Lead Folders – Support Access</Title>
            {content}
        </Card>
    );
};

export default LeadFolderSupportAccess;
