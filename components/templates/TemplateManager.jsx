'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@mantine/hooks';
import { getAuth } from 'firebase/auth';
import { ActionIcon, Box, Button, Group, Loader, Modal, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconBell, IconCake, IconCalendarEvent, IconHeartHandshake, IconPencil, IconPlus, IconRefresh, IconSeedling, IconTrash } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import ReminderTypeForm from './ReminderTypeForm';

// Message preview as plain text: {variables} are highlighted instead of boxed.
const MessagePreview = ({ message }) => (
  <p className="mt-1.5 line-clamp-2 whitespace-pre-line break-words text-sm text-gray-600 dark:text-gray-300">
    {String(message || '').split(/(\{[a-z_]+\})/g).map((part, i) =>
      /^\{[a-z_]+\}$/.test(part) ? (
        <span key={i} className="font-medium text-blue-600 dark:text-blue-400">{part.slice(1, -1).replace(/_/g, ' ')}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    )}
  </p>
);

// Icon and colour follow the type's date rule, so custom types look right too.
const LOOK_BY_DATE_FIELD = {
  created_at: { Icon: IconSeedling, color: 'teal' },
  date_of_birth: { Icon: IconCake, color: 'pink' },
  anniversary: { Icon: IconHeartHandshake, color: 'grape' },
  renewal_date: { Icon: IconRefresh, color: 'orange' },
};
const lookOf = (type) => LOOK_BY_DATE_FIELD[type.date_field] || { Icon: type.type_key === 'appointment' ? IconCalendarEvent : IconBell, color: 'blue' };

// "Customers · Birthday · 2 days before" / "Leads · Manual"
const describeRule = (type, dateFields) => {
  const who = type.audience === 'lead' ? 'Leads' : 'Customers';
  const rule = type.date_field ? dateFields?.[type.audience]?.[type.date_field] : null;
  if (!rule) return `${who} · Manual`;
  const days = `${type.window_days} day${type.window_days === 1 ? '' : 's'}`;
  return rule.mode === 'recent' ? `${who} · ${rule.label} · last ${days}` : `${who} · ${rule.label} · ${days} before`;
};

const TemplateManagementPage = () => {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 640px)'); // the editor takes the whole screen on phones
  const [types, setTypes] = useState([]);
  const [dateFields, setDateFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [editing, setEditing] = useState(null); // the type being edited, or null when adding
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const load = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) {
          showNotification({ title: 'Error', message: 'You must be logged in.', color: 'red' });
          return;
        }
        const idToken = await user.getIdToken();
        setToken(idToken);
        const res = await axios.get(`${API_URL}/api/reminder-types`, { headers: { Authorization: `Bearer ${idToken}` } });
        setTypes(res.data.types);
        setDateFields(res.data.dateFields);
      } catch (error) {
        console.error('Error fetching reminder types:', error);
        showNotification({ title: 'Error', message: 'Failed to load reminder types.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_URL]);

  // Go to the page the admin came from; if this page was opened directly, fall back to Reminders.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/reminders');
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    setFormOpen(true);
  };

  const handleSaved = (saved, wasEditing) => {
    setTypes((prev) => (wasEditing ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]));
    showNotification({ title: 'Saved', message: `"${saved.name}" ${wasEditing ? 'updated' : 'added'}.`, color: 'green' });
    setFormOpen(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/reminder-types/${toDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTypes((prev) => prev.filter((t) => t.id !== toDelete.id));
      showNotification({ title: 'Deleted', message: `"${toDelete.name}" was deleted.`, color: 'green' });
      setToDelete(null);
    } catch (error) {
      showNotification({ title: 'Error', message: error.response?.data?.message || 'Failed to delete.', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box className="px-1 py-2 md:p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <ActionIcon className="md:hidden" variant="subtle" color="dark" onClick={goBack} aria-label="Back">
          <IconArrowLeft size={22} />
        </ActionIcon>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Reminder Types</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Your message and timing for each reminder' : `${types.length} ${types.length === 1 ? 'type' : 'types'} · message and timing for each`}
          </p>
        </div>
        <Button color="blue" radius="xl" leftIcon={<IconPlus size={16} />} onClick={openAdd}>
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add reminder type</span>
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center"><Loader /></div>
      ) : types.length === 0 ? (
        <Stack align="center" spacing="xs" mt={56}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl dark:bg-gray-700">🔔</div>
          <Text weight={600}>No reminder types yet</Text>
          <Text size="sm" color="dimmed">Create one to start sending timely WhatsApp reminders.</Text>
          <Button color="blue" radius="xl" leftIcon={<IconPlus size={16} />} onClick={openAdd}>Add your first reminder type</Button>
        </Stack>
      ) : (
        <div className="max-w-4xl divide-y divide-gray-200 dark:divide-gray-700">
          {types.map((type) => {
            const { Icon, color } = lookOf(type);
            return (
              <div key={type.id} className="flex items-start gap-3 py-4">
                <ThemeIcon size={44} radius="xl" variant="light" color={color} className="flex-shrink-0">
                  <Icon size={22} />
                </ThemeIcon>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-tight">{type.name}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{describeRule(type, dateFields)}</div>
                  <MessagePreview message={type.template_message} />
                </div>

                <Group spacing={4} noWrap className="flex-shrink-0">
                  <ActionIcon size="lg" variant="subtle" color="gray" aria-label={`Edit ${type.name}`} title="Edit" onClick={() => openEdit(type)}>
                    <IconPencil size={18} />
                  </ActionIcon>
                  <ActionIcon size="lg" variant="subtle" color="red" aria-label={`Delete ${type.name}`} title="Delete" onClick={() => setToDelete(type)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </div>
            );
          })}
        </div>
      )}

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={<Text weight={600}>{editing ? `Edit: ${editing.name}` : 'Add reminder type'}</Text>} size="lg" fullScreen={isMobile} centered={!isMobile}>
        {formOpen && <ReminderTypeForm key={editing?.id || 'new'} type={editing} dateFields={dateFields} onSave={handleSaved} apiUrl={API_URL} token={token} />}
      </Modal>

      <Modal opened={!!toDelete} onClose={() => !deleting && setToDelete(null)} title={<Text weight={600}>Delete reminder type?</Text>} centered size="sm">
        <Text size="sm">
          &quot;{toDelete?.name}&quot; will be removed from your Reminders page and its message will be lost. Reminders already sent stay in your history.
        </Text>
        <Group position="right" mt="lg">
          <Button variant="default" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
          <Button color="red" loading={deleting} onClick={confirmDelete}>Delete</Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default TemplateManagementPage;
