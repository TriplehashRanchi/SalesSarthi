'use client';
// Shared look of notifications: icon + colour per type / severity, "5 min ago", day groups.
import { IconAlertTriangle, IconArrowsExchange, IconBell, IconCircleCheck, IconCircleX, IconFileImport, IconFileTime, IconTrash } from '@tabler/icons-react';

export const TYPE_META = {
    bulk_move: { label: 'Bulk lead movement', icon: IconArrowsExchange },
    folder_deleted: { label: 'Folder deletion', icon: IconTrash },
    import_completed: { label: 'Bulk lead import', icon: IconFileImport },
    import_partial: { label: 'Bulk lead import', icon: IconFileImport },
    import_failed: { label: 'Bulk lead import', icon: IconCircleX },
    import_files_expiring: { label: 'Import files', icon: IconFileTime },
    import_files_deleted: { label: 'Import files', icon: IconFileTime },
    test: { label: 'Test', icon: IconBell },
};

// Filter options on the Notifications page (groups match the server's settings groups).
export const TYPE_FILTERS = [
    { value: 'bulk_move', label: 'Bulk lead movement' },
    { value: 'folder_delete', label: 'Folder deletion' },
    { value: 'bulk_import', label: 'Bulk lead import' },
    { value: 'import_files', label: 'Import files' },
];

const TONE = {
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};
export const SEVERITY_TOAST = { success: 'green', warning: 'orange', error: 'red', info: 'blue' };
export const SEVERITY_LABEL = { success: 'Success', warning: 'Needs attention', error: 'Failed', info: 'Info' };

const SEVERITY_ICON = { success: IconCircleCheck, warning: IconAlertTriangle, error: IconCircleX };

export const NotificationIcon = ({ n, size = 36 }) => {
    const Icon = TYPE_META[n.type]?.icon || SEVERITY_ICON[n.severity] || IconBell;
    return (
        <span className={`flex flex-shrink-0 items-center justify-center rounded-full ${TONE[n.severity] || TONE.info}`} style={{ width: size, height: size }}>
            <Icon size={Math.round(size * 0.5)} stroke={1.8} />
        </span>
    );
};

export const timeAgo = (d) => {
    const t = new Date(d).getTime();
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'Just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
    const days = Math.round(h / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fullTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// 'Today' | 'Yesterday' | 'Earlier this week' | 'Earlier'
export const dayGroup = (d) => {
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return 'Earlier this week';
    return 'Earlier';
};
