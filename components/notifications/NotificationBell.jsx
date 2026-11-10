'use client';
// Header bell: unread count, latest 10 notifications, mark all read, links to the page and settings.
// Refreshes every 60 s, when the tab comes back, and the moment a push arrives while the CRM is open.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ActionIcon, Loader, Popover, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconBell, IconChecks, IconSettings } from '@tabler/icons-react';
import { listNotifications, markRead, NOTIFICATIONS_CHANGED, unreadCount } from './notificationsApi';
import { NotificationIcon, timeAgo, SEVERITY_TOAST } from './notificationUi';
import { clearDeliveredNotifications, initPush } from '@/utils/push';

// pageHref: this person's Notifications page ('/notifications' or '/usernotifications').
const NotificationBell = ({ pageHref = '/notifications' }) => {
    const router = useRouter();
    const isPhone = useMediaQuery('(max-width: 639px)');
    const [opened, setOpened] = useState(false);
    const [count, setCount] = useState(0);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const openedRef = useRef(false);
    openedRef.current = opened;

    const refreshCount = useCallback(() => unreadCount().then(setCount).catch(() => {}), []);
    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const d = await listNotifications({ filter: 'unread', page: 1, page_size: 10 });
            setItems(d.rows);
            setCount(d.unread);
        } catch {
            /* keep what we have */
        } finally {
            setLoading(false);
        }
    }, []);

    // Everything read (here, or on another device) -> clear the phone's notification shade and icon badge too.
    useEffect(() => {
        if (ready && count === 0) clearDeliveredNotifications();
    }, [ready, count]);

    // wait for Firebase auth before calling the API
    useEffect(() => onAuthStateChanged(getAuth(), (u) => setReady(!!u)), []);

    useEffect(() => {
        if (!ready) return undefined;
        refreshCount();
        const t = setInterval(refreshCount, 60000);
        const onFocus = () => document.visibilityState === 'visible' && refreshCount();
        const onChange = () => (openedRef.current ? loadList() : refreshCount());
        document.addEventListener('visibilitychange', onFocus);
        window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
        initPush({
            onForeground: (n) =>
                showNotification({
                    title: n.title,
                    message: n.body,
                    color: SEVERITY_TOAST[n.severity] || 'blue',
                    autoClose: 7000,
                    onClick: () => n.link && router.push(n.link),
                    style: { cursor: n.link ? 'pointer' : 'default' },
                }),
            onOpen: (link) => router.push(link),
        }).catch(() => {});
        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', onFocus);
            window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
        };
    }, [ready, refreshCount, loadList, router]);

    useEffect(() => {
        if (opened) loadList();
    }, [opened, loadList]);

    const openItem = async (n) => {
        setOpened(false);
        // read notifications leave the list
        setItems((p) => p.filter((x) => x.id !== n.id));
        setCount((c) => Math.max(0, c - 1));
        markRead([n.id]).catch(() => {});
        if (n.link) router.push(n.link);
    };

    const readAll = async () => {
        setItems([]);
        setCount(0);
        await markRead('all').catch(() => {});
    };

    const badge = count > 9 ? '9+' : String(count);

    return (
        <Popover opened={opened} onChange={setOpened} position="bottom-end" width={isPhone ? 'calc(100vw - 16px)' : 380} shadow="lg" radius="lg" withinPortal offset={10} zIndex={1200}>
            <Popover.Target>
                <Tooltip label="Notifications" withinPortal disabled={opened}>
                    <UnstyledButton
                        onClick={() => setOpened((o) => !o)}
                        aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
                        className="relative block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"
                    >
                        <IconBell size={20} stroke={1.6} />
                        {count > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900">
                                {badge}
                            </span>
                        )}
                    </UnstyledButton>
                </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p={0}>
                {/* header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Text weight={700}>Notifications</Text>
                        {count > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{count} new</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Tooltip label="Mark all as read" withinPortal>
                            <ActionIcon variant="subtle" radius="xl" onClick={readAll} disabled={!count} aria-label="Mark all as read">
                                <IconChecks size={17} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Notification settings" withinPortal>
                            <ActionIcon
                                variant="subtle"
                                radius="xl"
                                onClick={() => {
                                    setOpened(false);
                                    router.push(`${pageHref}?tab=settings`);
                                }}
                                aria-label="Notification settings"
                            >
                                <IconSettings size={17} />
                            </ActionIcon>
                        </Tooltip>
                    </div>
                </div>

                {/* list */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading && !items.length ? (
                        <div className="flex justify-center py-8"><Loader size="sm" /></div>
                    ) : items.length ? (
                        items.map((n) => (
                            <UnstyledButton
                                key={n.id}
                                onClick={() => openItem(n)}
                                className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60 ${n.is_read ? '' : 'bg-blue-50/60 dark:bg-blue-900/10'}`}
                            >
                                <NotificationIcon n={n} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className={`text-sm leading-snug ${n.is_read ? 'font-medium text-gray-700 dark:text-gray-200' : 'font-semibold text-gray-900 dark:text-white'}`}>{n.title}</span>
                                        {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{n.message}</p>
                                    <span className="mt-1 block text-[11px] text-gray-400">{timeAgo(n.created_at)}</span>
                                </div>
                            </UnstyledButton>
                        ))
                    ) : (
                        <div className="flex flex-col items-center px-6 py-10 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800"><IconBell size={24} /></div>
                            <Text weight={600} size="sm">You are all caught up</Text>
                            <Text size="xs" color="dimmed">Imports, bulk moves and folder changes will show here.</Text>
                        </div>
                    )}
                </div>

                {/* footer */}
                <UnstyledButton
                    onClick={() => {
                        setOpened(false);
                        router.push(pageHref);
                    }}
                    className="block w-full border-t border-gray-100 py-2.5 text-center text-sm font-semibold text-blue-600 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                >
                    View all notifications
                </UnstyledButton>
            </Popover.Dropdown>
        </Popover>
    );
};

export default NotificationBell;
