'use client';
// Notifications page: an inbox of new notifications (grouped by day; they leave the list once read)
// and Settings (on/off per notification group, push on this device, test).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionIcon, Badge, Button, Loader, Pagination, Switch, Tabs, Text, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
    IconArrowLeft,
    IconBell,
    IconBellOff,
    IconBellRinging,
    IconCheck,
    IconChecks,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconSend,
    IconSettings,
} from '@tabler/icons-react';
import {
    announceChange,
    getSettings,
    listDevices,
    listNotifications,
    markRead,
    NOTIFICATIONS_CHANGED,
    saveSettings,
    sendTest,
} from './notificationsApi';
import { dayGroup, fullTime, NotificationIcon, SEVERITY_LABEL, timeAgo } from './notificationUi';
import { userMessage } from '@/utils/userMessage';
import { disablePush, enablePush, isPushOnHere, pushErrorMessage, pushPermission, pushPlatform, pushSupport } from '@/utils/push';

const errMsg = userMessage; // plain-language message (never the raw technical error)
const PAGE_SIZE = 20;

const SETTING_HELP = {
    bulk_move: 'When several leads are moved to another folder at once.',
    folder_delete: 'When a folder is deleted after its leads were moved.',
    bulk_import: 'When a CSV import finishes, partly finishes or fails.',
    import_files: '3 days before stored import files are deleted, and after they are deleted.',
};

/* ───────────────────────── list ───────────────────────── */

// A simple inbox: whatever arrives shows up here. Opening a notification, tapping its ✓, or
// "Mark all as read" removes it from the list; until then it stays. (Nothing to filter or switch.)
const NotificationList = () => {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ rows: [], total: 0, unread: 0 });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setData(await listNotifications({ filter: 'unread', page, page_size: PAGE_SIZE }));
        } catch (err) {
            showNotification({ title: 'Could not load notifications', message: errMsg(err, 'Please try again.'), color: 'red' });
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        window.addEventListener(NOTIFICATIONS_CHANGED, load);
        return () => window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    }, [load]);
    // the last item of a later page was read -> step back one page
    useEffect(() => {
        if (!loading && page > 1 && data.rows.length === 0) setPage((p) => p - 1);
    }, [loading, page, data.rows.length]);

    const groups = useMemo(() => {
        const out = [];
        data.rows.forEach((n) => {
            const g = dayGroup(n.created_at);
            if (!out.length || out[out.length - 1].label !== g) out.push({ label: g, items: [] });
            out[out.length - 1].items.push(n);
        });
        return out;
    }, [data.rows]);

    // Remove from the screen at once, then tell the server (and the bell).
    const removeFromList = (ids) =>
        setData((d) => ({ ...d, rows: d.rows.filter((n) => !ids.includes(n.id)), total: Math.max(0, d.total - ids.length), unread: Math.max(0, d.unread - ids.length) }));

    const readOne = async (n) => {
        removeFromList([n.id]);
        try {
            await markRead([n.id]);
            announceChange();
        } catch (err) {
            showNotification({ title: 'Could not update the notification', message: errMsg(err, 'Please try again.'), color: 'red' });
            load();
        }
    };

    const open = (n) => {
        removeFromList([n.id]);
        markRead([n.id]).then(announceChange).catch(() => {});
        if (n.link) router.push(n.link);
    };

    const readAll = async () => {
        setBusy(true);
        try {
            await markRead('all');
            setData({ rows: [], total: 0, unread: 0 });
            setPage(1);
            announceChange();
        } catch (err) {
            showNotification({ title: 'Could not clear notifications', message: errMsg(err, 'Please try again.'), color: 'red' });
        } finally {
            setBusy(false);
        }
    };

    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

    return (
        <>
            {data.total > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <Text size="sm" weight={600}>
                        {data.total} new notification{data.total === 1 ? '' : 's'}
                    </Text>
                    <Button size="xs" radius="xl" variant="light" color="violet" leftIcon={<IconChecks size={15} />} loading={busy} onClick={readAll}>
                        Mark all as read
                    </Button>
                </div>
            )}

            {loading && !data.rows.length ? (
                <div className="flex justify-center py-16"><Loader /></div>
            ) : data.rows.length ? (
                <div className="flex flex-col gap-4">
                    {groups.map((g) => (
                        <div key={g.label}>
                            <Text size="xs" weight={700} color="dimmed" transform="uppercase" mb={6} className="tracking-wide">{g.label}</Text>
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                {g.items.map((n) => (
                                    <div key={n.id} className="group flex items-start gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0 dark:border-gray-800 sm:px-4">
                                        <button type="button" onClick={() => open(n)} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                                            <NotificationIcon n={n} size={40} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</span>
                                                    {n.severity !== 'info' && n.severity !== 'success' && (
                                                        <Badge size="xs" variant="light" color={n.severity === 'error' ? 'red' : 'orange'}>{SEVERITY_LABEL[n.severity]}</Badge>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                                                <Tooltip label={fullTime(n.created_at)} withinPortal>
                                                    <span className="mt-1 inline-block text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                                                </Tooltip>
                                            </div>
                                        </button>
                                        <Tooltip label="Mark as read" withinPortal>
                                            <ActionIcon variant="subtle" color="violet" radius="xl" onClick={() => readOne(n)} aria-label="Mark as read" className="mt-1 flex-shrink-0">
                                                <IconCheck size={17} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center dark:border-gray-700">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/20"><IconChecks size={28} /></div>
                    <Text weight={700}>You are all caught up</Text>
                    <Text size="sm" color="dimmed" className="max-w-sm">New notifications will show up here when a CSV import finishes, leads are moved in bulk, a folder is deleted, or import files are about to be deleted.</Text>
                </div>
            )}

            {data.total > PAGE_SIZE && (
                <div className="mt-4 flex justify-center">
                    <Pagination size="sm" page={page} onChange={setPage} total={pages} siblings={1} />
                </div>
            )}
            <Text size="xs" color="dimmed" align="center" mt="md">A notification disappears once you open it or mark it as read. Your Folder Activity and Import History keep the full record.</Text>
        </>
    );
};

/* ───────────────────────── settings ───────────────────────── */

const NotificationSettings = () => {
    const [settings, setSettings] = useState(null);
    const [labels, setLabels] = useState({});
    const [saving, setSaving] = useState(null);
    const [push, setPush] = useState({ checking: true, support: null, on: false, permission: 'default', busy: false });
    const [devices, setDevices] = useState([]);
    const [testing, setTesting] = useState(false);

    const loadDevices = () => listDevices().then(setDevices).catch(() => {});
    useEffect(() => {
        getSettings()
            .then((d) => {
                setSettings(d.settings);
                setLabels(d.labels);
            })
            .catch((err) => showNotification({ title: 'Error', message: errMsg(err, 'Could not load settings'), color: 'red' }));
        loadDevices();
        (async () => {
            const support = await pushSupport();
            const permission = support.ok ? await pushPermission().catch(() => 'default') : 'default';
            setPush({ checking: false, support, on: support.ok && isPushOnHere() && permission === 'granted', permission, busy: false });
        })();
    }, []);

    const toggle = async (key, value) => {
        setSaving(key);
        setSettings((s) => ({ ...s, [key]: value }));
        try {
            setSettings(await saveSettings({ [key]: value }));
            showNotification({ message: `${labels[key] || key} notifications ${value ? 'on' : 'off'}`, color: 'green', autoClose: 2500 });
        } catch (err) {
            setSettings((s) => ({ ...s, [key]: !value }));
            showNotification({ title: 'Not saved', message: errMsg(err, 'Could not save'), color: 'red' });
        } finally {
            setSaving(null);
        }
    };

    const togglePush = async (on) => {
        setPush((p) => ({ ...p, busy: true }));
        try {
            if (on) {
                await enablePush();
                showNotification({ title: 'Push notifications on', message: 'This device will now get CRM notifications.', color: 'green' });
            } else {
                await disablePush();
                showNotification({ message: 'Push notifications turned off for this device.', color: 'gray' });
            }
            const permission = await pushPermission().catch(() => 'default');
            setPush((p) => ({ ...p, on, permission, busy: false }));
            loadDevices();
        } catch (err) {
            const permission = await pushPermission().catch(() => 'default');
            setPush((p) => ({ ...p, busy: false, permission }));
            showNotification({ title: on ? 'Could not turn on notifications' : 'Could not turn off notifications', message: pushErrorMessage(err), color: 'red', autoClose: 9000 });
        }
    };

    const test = async () => {
        setTesting(true);
        try {
            const r = await sendTest();
            announceChange();
            showNotification({
                title: 'Test sent',
                message: r.devices ? `Check the bell and your ${r.devices} device${r.devices === 1 ? '' : 's'} with push on.` : 'Check the bell. Turn on push to also get it on this device.',
                color: 'green',
            });
        } catch (err) {
            showNotification({ title: 'Error', message: errMsg(err, 'Could not send'), color: 'red' });
        } finally {
            setTesting(false);
        }
    };

    if (!settings) return <div className="flex justify-center py-16"><Loader /></div>;

    const platform = pushPlatform();
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* which notifications */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                <Text weight={700}>What to notify me about</Text>
                <Text size="sm" color="dimmed" mb="md">Turning one off stops new notifications of that kind (bell and push). Folder Activity and Import History keep recording everything.</Text>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Object.keys(settings).map((key) => (
                        <div key={key} className="flex items-center justify-between gap-4 py-3">
                            <div className="min-w-0">
                                <Text size="sm" weight={600}>{labels[key] || key}</Text>
                                <Text size="xs" color="dimmed">{SETTING_HELP[key]}</Text>
                            </div>
                            <Switch size="md" color="violet" checked={!!settings[key]} disabled={saving === key} onChange={(e) => toggle(key, e.currentTarget.checked)} aria-label={labels[key] || key} />
                        </div>
                    ))}
                </div>
                <Text size="xs" color="dimmed" mt="sm">Creating or renaming a folder and adding or moving a single lead never send notifications – they appear in Folder Activity.</Text>
            </section>

            {/* push */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Text weight={700} className="flex items-center gap-2">
                            {platform === 'web' ? <IconDeviceDesktop size={18} /> : <IconDeviceMobile size={18} />} Push on this {platform === 'web' ? 'browser' : 'phone'}
                        </Text>
                        <Text size="sm" color="dimmed">Get notifications even when DG Sarthi is closed.</Text>
                    </div>
                    {push.checking ? (
                        <Loader size="sm" />
                    ) : (
                        <Switch size="md" color="violet" checked={push.on} disabled={!push.support?.ok || push.busy} onChange={(e) => togglePush(e.currentTarget.checked)} aria-label="Push notifications on this device" />
                    )}
                </div>
                {!push.checking && !push.support?.ok && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        <IconBellOff size={18} className="mt-0.5 flex-shrink-0" /> {push.support?.reason}
                    </div>
                )}
                {!push.checking && push.support?.ok && push.permission === 'denied' && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        <IconBellOff size={18} className="mt-0.5 flex-shrink-0" /> Notifications are blocked. Allow them for this {platform === 'web' ? 'site in the browser' : 'app in the phone'} settings, then turn this on.
                    </div>
                )}
                {push.on && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                        <IconBellRinging size={18} /> Push is on for this {platform === 'web' ? 'browser' : 'phone'}.
                    </div>
                )}

                <Button mt="md" size="sm" radius="xl" variant="default" leftIcon={<IconSend size={15} />} loading={testing} onClick={test}>
                    Send a test notification
                </Button>

                <Text size="sm" weight={600} mt="lg" mb={6}>Devices with push on ({devices.length})</Text>
                {devices.length ? (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                        {devices.map((d) => (
                            <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                {d.platform === 'web' ? <IconDeviceDesktop size={16} className="text-gray-400" /> : <IconDeviceMobile size={16} className="text-gray-400" />}
                                <span className="min-w-0 flex-1 truncate">{d.label || d.platform}</span>
                                <span className="text-xs text-gray-400">{d.last_seen_at ? timeAgo(d.last_seen_at) : ''}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Text size="xs" color="dimmed">None yet. Turn push on above, on each browser or phone where you want notifications.</Text>
                )}
            </section>
        </div>
    );
};

/* ───────────────────────── page ───────────────────────── */

const NotificationsCenter = () => {
    const router = useRouter();
    const [tab, setTab] = useState('all');
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('tab') === 'settings') setTab('settings');
    }, []);

    return (
        <div className="panel mt-0 p-3 md:mt-6 md:!p-5 max-md:!border-0 max-md:!bg-transparent max-md:!shadow-none">
            <div className="mb-4 flex items-center gap-2">
                <ActionIcon variant="subtle" color="dark" onClick={() => router.back()} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
                        <IconBell size={22} className="text-violet-600" /> Notifications
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your latest updates</p>
                </div>
            </div>
            <Tabs value={tab} onTabChange={setTab} color="violet" keepMounted={false}>
                <Tabs.List mb="md">
                    <Tabs.Tab value="all" icon={<IconBell size={15} />}>Notifications</Tabs.Tab>
                    <Tabs.Tab value="settings" icon={<IconSettings size={15} />}>Settings</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="all"><NotificationList /></Tabs.Panel>
                <Tabs.Panel value="settings"><NotificationSettings /></Tabs.Panel>
            </Tabs>
        </div>
    );
};

export default NotificationsCenter;
