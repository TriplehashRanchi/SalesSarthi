'use client';
// #11 "My folders": create / rename / delete your own folders, and arrange categories + your folders
// (drag and drop, or the arrows) with a preview before saving. The arrangement is only yours.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, TextInput, ActionIcon, Badge, Text, Loader, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  IconArrowDown, IconArrowUp, IconCheck, IconFolder, IconFolderPlus, IconGripVertical, IconLock, IconPencil, IconTrash, IconX,
} from '@tabler/icons-react';
import { notifyFoldersChanged } from './customerFolderApi';
import {
  createPersonalFolder, deletePersonalFolder, fetchFolderList, renamePersonalFolder, resetFolderLayout, saveFolderLayout,
} from './personalFolderApi';

const errText = (err, fallback) => err?.response?.data?.message || fallback;

// Keeps the person's unsaved order, adds new items at the end, drops removed ones; names/counts refresh.
export const mergeOrder = (current, fresh) => {
  const byKey = new Map(fresh.map((i) => [i.key, i]));
  const kept = current.filter((i) => byKey.has(i.key)).map((i) => byKey.get(i.key));
  const keys = new Set(kept.map((i) => i.key));
  return [...kept, ...fresh.filter((i) => !keys.has(i.key))];
};
export const moveItem = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
};

function ItemRow({ item, index, total, onMove, onRename, onDelete, busy, dragHandleProps }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);
  const personal = item.type === 'personal';

  const save = async () => {
    const text = name.trim();
    if (!text || text === item.name) return setEditing(false);
    if (await onRename(item, text)) setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-[#1b2e4b]" data-testid={`layout-item-${item.key}`}>
      <span {...dragHandleProps} className="cursor-grab touch-none text-gray-400" aria-label={`Drag ${item.name}`}>
        <IconGripVertical size={18} />
      </span>
      {personal ? <IconFolder size={16} className="shrink-0 text-blue-500" /> : <IconLock size={14} className="shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        {editing ? (
          <TextInput
            size="xs"
            autoFocus
            value={name}
            maxLength={60}
            aria-label="Folder name"
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') { setName(item.name); setEditing(false); }
            }}
          />
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{item.name}</span>
            <span className="text-xs text-gray-500">({item.customer_count})</span>
            {personal ? (
              <Badge size="xs" color="blue" variant="light">My folder</Badge>
            ) : (
              <Badge size="xs" color="gray" variant="light">{item.is_default ? 'Default' : 'Category'}</Badge>
            )}
          </div>
        )}
      </div>
      {editing ? (
        <>
          <ActionIcon size="sm" color="green" onClick={save} disabled={busy} aria-label="Save name"><IconCheck size={16} /></ActionIcon>
          <ActionIcon size="sm" onClick={() => { setName(item.name); setEditing(false); }} aria-label="Cancel"><IconX size={16} /></ActionIcon>
        </>
      ) : (
        <>
          <ActionIcon size="sm" variant="subtle" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${item.name} up`}><IconArrowUp size={16} /></ActionIcon>
          <ActionIcon size="sm" variant="subtle" disabled={index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${item.name} down`}><IconArrowDown size={16} /></ActionIcon>
          {personal ? (
            <>
              <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => setEditing(true)} disabled={busy} aria-label={`Rename ${item.name}`}><IconPencil size={16} /></ActionIcon>
              <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDelete(item)} disabled={busy} aria-label={`Delete ${item.name}`}><IconTrash size={16} /></ActionIcon>
            </>
          ) : (
            <Tooltip label="Categories can't be renamed or deleted here" withinPortal>
              <span className="inline-flex w-[52px] justify-center text-gray-300"><IconLock size={14} /></span>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}

export default function FolderLayoutManager({ opened, onClose }) {
  const [saved, setSaved] = useState([]); // order as stored on the server
  const [order, setOrder] = useState([]); // order being arranged
  const [arranged, setArranged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [step, setStep] = useState('arrange'); // 'arrange' | 'preview'

  const load = async (keepOrder) => {
    try {
      const data = await fetchFolderList();
      const items = data.items || [];
      setSaved(items);
      setArranged(!!data.arranged);
      setOrder((cur) => (keepOrder ? mergeOrder(cur, items) : items));
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not load', message: errText(err, 'Could not load your folders. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setStep('arrange');
    setNewName('');
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const changed = useMemo(() => order.map((i) => i.key).join('|') !== saved.map((i) => i.key).join('|'), [order, saved]);
  const movedKeys = useMemo(() => {
    const pos = new Map(saved.map((i, n) => [i.key, n]));
    return new Set(order.filter((i, n) => pos.get(i.key) !== n).map((i) => i.key));
  }, [order, saved]);

  const onMove = (from, to) => setOrder((cur) => moveItem(cur, from, to));
  const onDragEnd = (r) => {
    if (r.destination) onMove(r.source.index, r.destination.index);
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createPersonalFolder(name);
      setNewName('');
      await load(true);
      notifyFoldersChanged();
      showNotification({ color: 'green', title: 'Folder created', message: `"${name}" was added at the end of your list.` });
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not create', message: errText(err, 'Could not create the folder. Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const rename = async (item, name) => {
    setBusy(true);
    try {
      await renamePersonalFolder(item.id, name);
      await load(true);
      notifyFoldersChanged();
      return true;
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not rename', message: errText(err, 'Could not rename the folder. Please try again.') });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete your folder "${item.name}"? The customers in it will NOT be deleted — only this folder and its rules.`)) return;
    setBusy(true);
    try {
      await deletePersonalFolder(item.id);
      await load(true);
      notifyFoldersChanged();
      showNotification({ color: 'green', title: 'Folder deleted', message: `"${item.name}" was deleted. No customer was removed.` });
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not delete', message: errText(err, 'Could not delete the folder. Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const data = await saveFolderLayout(order.map((i) => i.key));
      setSaved(data.items || []);
      setOrder(data.items || []);
      setArranged(true);
      notifyFoldersChanged();
      showNotification({ color: 'green', title: 'Saved', message: 'Your folder arrangement was saved.' });
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not save', message: errText(err, 'Could not save the arrangement. Please try again.') });
      if (err?.response?.status === 400) load(true);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Go back to the standard order? Your folders stay; only the arrangement is reset.')) return;
    setBusy(true);
    try {
      const data = await resetFolderLayout();
      setSaved(data.items || []);
      setOrder(data.items || []);
      setArranged(false);
      setStep('arrange');
      notifyFoldersChanged();
      showNotification({ color: 'green', title: 'Reset', message: 'The standard order is back.' });
    } catch (err) {
      showNotification({ color: 'red', title: 'Could not reset', message: errText(err, 'Could not reset the arrangement. Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (changed && !window.confirm('You have not saved the new arrangement. Close anyway?')) return;
    onClose();
  };

  return (
    <Modal opened={opened} onClose={close} title={<Text weight={600}>My folders</Text>} size="lg" fullScreen={typeof window !== 'undefined' && window.innerWidth < 640} centered>
      {loading ? (
        <div className="flex justify-center py-10"><Loader size="sm" /></div>
      ) : step === 'preview' ? (
        <div>
          <Text size="sm" color="dimmed" mb="sm">This is how your folder list will look. Nothing is saved yet.</Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Text size="xs" weight={600} color="dimmed" mb={4}>NOW</Text>
              <ol className="space-y-1 rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700" data-testid="preview-before">
                <li className="text-gray-500">All Customers</li>
                {saved.map((i) => <li key={i.key}>{i.name} <span className="text-gray-400">({i.customer_count})</span></li>)}
              </ol>
            </div>
            <div>
              <Text size="xs" weight={600} color="blue" mb={4}>AFTER SAVING</Text>
              <ol className="space-y-1 rounded-md border border-blue-300 p-2 text-sm dark:border-blue-700" data-testid="preview-after">
                <li className="text-gray-500">All Customers</li>
                {order.map((i) => (
                  <li key={i.key} className={movedKeys.has(i.key) ? 'font-semibold text-blue-600' : ''}>
                    {i.name} <span className="text-gray-400">({i.customer_count})</span>
                    {movedKeys.has(i.key) && <span className="ml-1 text-xs">• moved</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="default" onClick={() => setStep('arrange')} disabled={busy}>Back</Button>
            <Button onClick={save} loading={busy}>Save arrangement</Button>
          </div>
        </div>
      ) : (
        <div>
          <Text size="sm" color="dimmed" mb="sm">
            Drag the folders (or use the arrows) to put them in the order you like. Only you see this order. Categories <IconLock size={12} className="inline" /> can be moved but not renamed or deleted.
          </Text>

          <div className="mb-3 flex gap-2">
            <TextInput
              className="flex-1"
              placeholder="New folder name, e.g. Hot prospects"
              value={newName}
              maxLength={60}
              aria-label="New folder name"
              onChange={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <Button leftIcon={<IconFolderPlus size={16} />} onClick={create} disabled={!newName.trim()} loading={busy && !!newName.trim()}>
              Create
            </Button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="folder-layout">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {order.map((item, index) => (
                    <Draggable key={item.key} draggableId={item.key} index={index}>
                      {(p) => (
                        <div ref={p.innerRef} {...p.draggableProps}>
                          <ItemRow
                            item={item}
                            index={index}
                            total={order.length}
                            onMove={onMove}
                            onRename={rename}
                            onDelete={remove}
                            busy={busy}
                            dragHandleProps={p.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {!order.length && <Text size="sm" color="dimmed" align="center" py="md">No folders yet. Create your first one above.</Text>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button variant="subtle" color="gray" onClick={reset} disabled={busy || (!arranged && !changed)}>
              Reset to standard order
            </Button>
            <div className="flex gap-2">
              <Button variant="default" onClick={close} disabled={busy}>Close</Button>
              <Button onClick={() => setStep('preview')} disabled={!changed || busy}>Preview &amp; save</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
