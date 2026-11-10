'use client';
// Shared lead-folder UI used by the admin lead table and the team member lead table:
//   FolderTabs          – "+ Create Folder", folder search, tabs with counts + ⋮ menu, ‹ › scroll arrows
//   FolderNameModal     – create / rename (shows "Folder name already exists..." etc. under the box)
//   DeleteFolderModal   – pick the folder its leads move to, then delete
//   ReorderFoldersModal – drag & drop order (works with touch too)
//   MoveReportModal     – moved / failed counts + retry for a partial move
//   EmptyFolderState    – "No leads in this folder yet." + Add Lead / Import Leads
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Menu, Modal, Select, Text, TextInput, Tooltip } from '@mantine/core';
import {
    IconArrowsSort,
    IconChevronLeft,
    IconChevronRight,
    IconDotsVertical,
    IconFolder,
    IconFolderPlus,
    IconGripVertical,
    IconPencil,
    IconPlus,
    IconSearch,
    IconTimeline,
    IconTrash,
    IconUpload,
    IconX,
} from '@tabler/icons-react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { errorMessage } from './leadFolders';

/* ───────────────────────── tabs ───────────────────────── */

// counts: { [folderId]: n }. tabProps(folder) lets the admin table add drag-a-lead-onto-a-folder handlers.
// onActivity(folder | null): open Folder Activity History (for one folder, or all).
export const FolderTabs = ({ folders, counts, allCount, active, onSelect, onCreate, onRename, onDelete, onReorder, onActivity, tabProps, highlightId }) => {
    const [query, setQuery] = useState('');
    const scroller = useRef(null);
    const [edges, setEdges] = useState({ left: false, right: false });

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders;
    }, [folders, query]);

    const updateEdges = () => {
        const el = scroller.current;
        if (!el) return;
        setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    };
    useEffect(() => {
        updateEdges();
        const el = scroller.current;
        if (!el) return undefined;
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null;
        ro?.observe(el);
        return () => ro?.disconnect();
    }, [shown.length]);

    const scrollBy = (dir) => scroller.current?.scrollBy({ left: dir * Math.max(200, (scroller.current.clientWidth || 400) * 0.7), behavior: 'smooth' });

    // Pill tabs on a soft track; the open folder is a solid blue pill.
    const chip = (isActive, isOver) =>
        `group flex h-8 flex-shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full py-1 pl-3 text-sm font-medium transition ${
            isOver
                ? 'scale-105 bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                : isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-blue-300 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700'
        }`;
    const countBadge = (isActive) =>
        `rounded-full px-1.5 text-[11px] font-semibold leading-5 ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`;

    const arrow = (dir) => (
        <ActionIcon
            className="hidden flex-shrink-0 md:flex"
            variant="subtle"
            radius="xl"
            size="md"
            onClick={() => scrollBy(dir)}
            disabled={dir < 0 ? !edges.left : !edges.right}
            aria-label={dir < 0 ? 'Scroll folders left' : 'Scroll folders right'}
        >
            {dir < 0 ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
        </ActionIcon>
    );

    // Phone: [search ........][+ Create] on top, tabs below.
    // Desktop: one toolbar – [‹ tabs ›] | [Find folder][+ Create Folder]
    return (
        <div className="mb-4 flex min-w-0 flex-col gap-2 rounded-2xl bg-gray-50 p-2 dark:bg-gray-800/60 md:flex-row md:items-center md:gap-3">
            {/* tabs */}
            <div className="order-2 flex min-w-0 flex-1 items-center gap-1 md:order-1">
                {arrow(-1)}
                <div ref={scroller} onScroll={updateEdges} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth px-0.5 py-0.5" style={{ scrollbarWidth: 'none' }}>
                    {!query && (
                        <div role="button" tabIndex={0} onClick={() => onSelect('all')} onKeyDown={(e) => e.key === 'Enter' && onSelect('all')} className={`${chip(active === 'all', false)} pr-2`}>
                            All Leads <span className={countBadge(active === 'all')}>{allCount}</span>
                        </div>
                    )}
                    {shown.map((f) => {
                        const isActive = active === f.id;
                        return (
                            <div
                                key={f.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelect(f.id)}
                                onKeyDown={(e) => e.key === 'Enter' && onSelect(f.id)}
                                className={`${chip(isActive, highlightId === f.id)} pr-0.5`}
                                {...(tabProps ? tabProps(f) : {})}
                            >
                                <IconFolder size={15} className="flex-shrink-0 opacity-80" />
                                <span className="max-w-[160px] truncate lg:max-w-[200px]">{f.name}</span>
                                <span className={countBadge(isActive)}>{counts[f.id] ?? 0}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Menu withinPortal shadow="md" position="bottom-end">
                                        <Menu.Target>
                                            <ActionIcon
                                                size="sm"
                                                radius="xl"
                                                variant="transparent"
                                                className={isActive ? '!text-white/80 hover:!text-white' : '!text-gray-400 hover:!text-gray-700'}
                                                aria-label={`Options for ${f.name}`}
                                            >
                                                <IconDotsVertical size={14} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item icon={<IconPencil size={14} />} onClick={() => onRename(f)}>Rename folder</Menu.Item>
                                            <Menu.Item icon={<IconArrowsSort size={14} />} onClick={onReorder}>Reorder folders</Menu.Item>
                                            {onActivity && <Menu.Item icon={<IconTimeline size={14} />} onClick={() => onActivity(f)}>View activity</Menu.Item>}
                                            <Menu.Divider />
                                            <Menu.Item color="red" icon={<IconTrash size={14} />} onClick={() => onDelete(f)}>Delete folder</Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </div>
                            </div>
                        );
                    })}
                    {query && !shown.length && <Text size="sm" color="dimmed" className="whitespace-nowrap px-2">No folder named “{query}”.</Text>}
                </div>
                {arrow(1)}
            </div>

            {/* folder search + create, side by side */}
            <div className="order-1 flex items-center gap-2 md:order-2 md:flex-shrink-0 md:border-l md:border-gray-200 md:pl-3 dark:md:border-gray-700">
                <TextInput
                    className="min-w-0 flex-1 md:w-44 md:flex-none"
                    size="xs"
                    radius="xl"
                    icon={<IconSearch size={14} />}
                    placeholder="Find folder"
                    aria-label="Find folder"
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    rightSection={
                        query ? (
                            <ActionIcon size="xs" onClick={() => setQuery('')} aria-label="Clear folder search">
                                <IconX size={12} />
                            </ActionIcon>
                        ) : null
                    }
                />
                {onActivity && (
                    <Tooltip label="Folder activity history" withinPortal>
                        <ActionIcon variant="default" radius="xl" size="md" className="flex-shrink-0" onClick={() => onActivity(null)} aria-label="Folder activity history">
                            <IconTimeline size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
                <Button size="xs" color="blue" radius="xl" className="flex-shrink-0" leftIcon={<IconFolderPlus size={15} />} onClick={onCreate}>
                    Create Folder
                </Button>
            </div>
        </div>
    );
};

/* ───────────────────────── create / rename ───────────────────────── */

// state: { open, folder }  (folder = null -> create). onSave(folder, name) must throw on API error.
export const FolderNameModal = ({ state, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (state.open) {
            setName(state.folder?.name || '');
            setError(null);
            setSaving(false);
        }
    }, [state]);

    const submit = async () => {
        const clean = name.trim();
        if (!clean) return setError('Folder name cannot be blank.');
        setSaving(true);
        try {
            await onSave(state.folder, clean);
            onClose();
        } catch (err) {
            setError(errorMessage(err, 'Could not save the folder.'));
            setSaving(false);
        }
    };

    return (
        <Modal opened={state.open} onClose={() => !saving && onClose()} title={<Text weight={700} size="lg">{state.folder ? 'Rename folder' : 'Create Folder'}</Text>} centered radius="lg" size="sm">
            <TextInput
                label="Folder name"
                placeholder="e.g. Kanyadaan Leads, Delhi Leads"
                value={name}
                onChange={(e) => {
                    setName(e.currentTarget.value);
                    setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                maxLength={255}
                error={error}
                data-autofocus
            />
            <Group position="right" mt="lg">
                <Button variant="default" radius="xl" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button color="blue" radius="xl" onClick={submit} loading={saving} disabled={!name.trim()}>
                    {state.folder ? 'Save' : 'Create'}
                </Button>
            </Group>
        </Modal>
    );
};

/* ───────────────────────── delete ───────────────────────── */

// folder = the one to delete (with lead_count), folders = all of the owner's folders.
// onConfirm(targetId | null) must throw on API error.
export const DeleteFolderModal = ({ folder, folders, count, onClose, onConfirm }) => {
    const [target, setTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [serverCount, setServerCount] = useState(0); // the API may know of leads the screen does not show (e.g. customers)

    useEffect(() => {
        setTarget(null);
        setSaving(false);
        setError(null);
        setServerCount(0);
    }, [folder]);

    if (!folder) return null;
    const others = folders.filter((f) => f.id !== folder.id);
    count = Math.max(count || 0, serverCount);
    const needsTarget = count > 0;
    const targetName = others.find((f) => String(f.id) === target)?.name;

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            await onConfirm(needsTarget ? Number(target) : null);
            onClose();
        } catch (err) {
            const n = err?.response?.data?.lead_count;
            if (n) setServerCount(n);
            else setError(errorMessage(err, 'Could not delete the folder.'));
            setSaving(false);
        }
    };

    return (
        <Modal opened={!!folder} onClose={() => !saving && onClose()} title={<Text weight={700} size="lg">Delete “{folder.name}”?</Text>} centered radius="lg" size="sm">
            {needsTarget ? (
                others.length ? (
                    <>
                        <Text size="sm" mb="sm">
                            This folder has <b>{count}</b> lead{count === 1 ? '' : 's'}. Choose the folder they should move to. The folder is deleted only after the leads have moved. No lead is deleted.
                        </Text>
                        <Select
                            label="Move leads to"
                            placeholder="Select a folder"
                            data={others.map((f) => ({ value: String(f.id), label: f.name }))}
                            value={target}
                            onChange={setTarget}
                            searchable
                            withinPortal
                            required
                        />
                        {targetName && (
                            <Text size="xs" color="dimmed" mt="xs">
                                {folder.name} ({count}) → {targetName} → delete {folder.name}
                            </Text>
                        )}
                    </>
                ) : (
                    <Text size="sm">
                        This folder has <b>{count}</b> lead{count === 1 ? '' : 's'}. Create another folder first so its leads have somewhere to go.
                    </Text>
                )
            ) : (
                <Text size="sm">This folder is empty. It will be deleted.</Text>
            )}
            {error && <Text size="sm" color="red" mt="sm">{error}</Text>}
            <Group position="right" mt="lg">
                <Button variant="default" radius="xl" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button color="red" radius="xl" onClick={submit} loading={saving} disabled={needsTarget && !target}>
                    {needsTarget ? 'Move leads & delete' : 'Delete folder'}
                </Button>
            </Group>
        </Modal>
    );
};

/* ───────────────────────── reorder ───────────────────────── */

// onSave(orderedIds) must throw on API error.
export const ReorderFoldersModal = ({ opened, folders, onClose, onSave }) => {
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (opened) {
            setItems(folders);
            setSaving(false);
            setError(null);
        }
    }, [opened, folders]);

    const onDragEnd = ({ source, destination }) => {
        if (!destination || destination.index === source.index) return;
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(source.index, 1);
            next.splice(destination.index, 0, moved);
            return next;
        });
    };

    const submit = async () => {
        setSaving(true);
        try {
            await onSave(items.map((f) => f.id));
            onClose();
        } catch (err) {
            setError(errorMessage(err, 'Could not save the order.'));
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={() => !saving && onClose()} title={<Text weight={700} size="lg">Reorder folders</Text>} centered radius="lg" size="sm">
            <Text size="xs" color="dimmed" mb="sm">Drag folders to put the important ones first. Only you see this order.</Text>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="lead-folders">
                    {(drop) => (
                        <div ref={drop.innerRef} {...drop.droppableProps} className="max-h-[55vh] overflow-y-auto">
                            {items.map((f, i) => (
                                <Draggable key={f.id} draggableId={String(f.id)} index={i}>
                                    {(drag, snap) => (
                                        <div
                                            ref={drag.innerRef}
                                            {...drag.draggableProps}
                                            {...drag.dragHandleProps}
                                            className={`mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                                snap.isDragging ? 'border-blue-400 bg-blue-50 shadow-md dark:bg-gray-800' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                            }`}
                                        >
                                            <IconGripVertical size={16} className="flex-shrink-0 text-gray-400" />
                                            <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {drop.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            {error && <Text size="sm" color="red" mt="sm">{error}</Text>}
            <Group position="right" mt="lg">
                <Button variant="default" radius="xl" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button color="blue" radius="xl" onClick={submit} loading={saving}>Save order</Button>
            </Group>
        </Modal>
    );
};

/* ───────────────────────── partial move report ───────────────────────── */

// report = { total, movedIds, failed: [{ id, reason }], folderName }
export const MoveReportModal = ({ report, onClose, onRetry }) => {
    const [retrying, setRetrying] = useState(false);
    if (!report) return null;
    const reasons = report.failed.reduce((acc, f) => ({ ...acc, [f.reason]: (acc[f.reason] || 0) + 1 }), {});
    const row = (label, value, color) => (
        <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-b-0 dark:border-gray-800">
            <span>{label}</span>
            <span className={`font-semibold ${color || ''}`}>{value}</span>
        </div>
    );
    return (
        <Modal opened={!!report} onClose={onClose} title={<Text weight={700} size="lg">Move to {report.folderName}</Text>} centered radius="lg" size="sm">
            <div className="mb-3 rounded-lg border border-gray-200 px-3 dark:border-gray-700">
                {row('Successfully moved', report.movedIds.length, 'text-green-600')}
                {row('Failed', report.failed.length, report.failed.length ? 'text-red-600' : '')}
                {row('Total selected', report.total)}
            </div>
            {report.failed.length > 0 && (
                <>
                    <Text size="xs" weight={600} mb={4}>Why they failed</Text>
                    {Object.entries(reasons).map(([reason, n]) => (
                        <Text key={reason} size="xs" color="dimmed">• {reason} ({n})</Text>
                    ))}
                    <Text size="xs" color="dimmed" mt="xs">Failed leads stay in their old folder. Nothing was duplicated.</Text>
                </>
            )}
            <Group position="right" mt="lg">
                <Button variant="default" radius="xl" onClick={onClose}>Close</Button>
                {report.failed.length > 0 && (
                    <Button
                        color="blue"
                        radius="xl"
                        loading={retrying}
                        onClick={async () => {
                            setRetrying(true);
                            await onRetry(report.failed.map((f) => f.id));
                            setRetrying(false);
                        }}
                    >
                        Retry {report.failed.length} failed
                    </Button>
                )}
            </Group>
        </Modal>
    );
};

/* ───────────────────────── empty folder ───────────────────────── */

export const EmptyFolderState = ({ folderName, onAddLead, onImport }) => (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-gray-800">
            <IconFolder size={28} />
        </div>
        <Text weight={700} size="lg" className="break-words">{folderName}</Text>
        <Text size="sm" color="dimmed">0 Leads</Text>
        <Text size="sm" mt="sm" weight={600}>No leads in this folder yet.</Text>
        <Text size="sm" color="dimmed" mb="md" className="max-w-sm">Start organizing your leads by adding individual leads or importing a CSV file.</Text>
        <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
            <Button color="blue" radius="xl" leftIcon={<IconPlus size={16} />} onClick={onAddLead}>Add Lead</Button>
            <Button variant="default" radius="xl" leftIcon={<IconUpload size={16} />} onClick={onImport}>Import Leads</Button>
        </div>
    </div>
);
