'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@mantine/hooks';
import { getAuth } from 'firebase/auth';
import { ActionIcon, Badge, Box, Button, Card, Group, Loader, Modal, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowLeft, IconBell, IconCake, IconCalendarEvent, IconHeartHandshake, IconPencil, IconPlus, IconRefresh, IconSeedling, IconTrash } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import MessageBubble from './MessageBubble';
import ReminderTypeForm from './ReminderTypeForm';

// Back and Add share one fixed height so the bordered and filled buttons line up exactly.
const HEADER_BUTTON_HEIGHT = 38;

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
    <Box p="md">
      <Group position="apart" align="center" mb={4}>
        <Title order={2}>Reminder Types</Title>
        <Group spacing="xs" noWrap>
          <Button size="sm" variant="default" style={{ height: HEADER_BUTTON_HEIGHT, boxSizing: 'border-box' }} leftIcon={<IconArrowLeft size={16} />} onClick={goBack}>
            Back
          </Button>
          <Button size="sm" style={{ height: HEADER_BUTTON_HEIGHT, boxSizing: 'border-box' }} leftIcon={<IconPlus size={16} />} onClick={openAdd}>
            Add reminder type
          </Button>
        </Group>
      </Group>
      <Text color="dimmed" size="xs" mb="lg">
        Create the reminders your team sends, each with its own message and timing. Edit or delete any of them, including the starter ones.
      </Text>

      {loading ? (
        <Loader />
      ) : types.length === 0 ? (
        <Stack align="center" spacing="xs" mt="xl">
          <Text color="dimmed">You have no reminder types yet.</Text>
          <Button leftIcon={<IconPlus size={16} />} onClick={openAdd}>Add your first reminder type</Button>
        </Stack>
      ) : (
        <SimpleGrid cols={3} spacing="lg" breakpoints={[{ maxWidth: 1400, cols: 2 }, { maxWidth: 'sm', cols: 1 }]}>
          {types.map((type) => {
            const { Icon, color } = lookOf(type);
            return (
              <Card key={type.id} withBorder shadow="sm" radius="md" p="lg" sx={{ display: 'flex', flexDirection: 'column' }}>
                <Group position="apart" align="flex-start" noWrap mb="md">
                  <Group noWrap spacing="sm">
                    <ThemeIcon size={44} radius="md" variant="light" color={color}>
                      <Icon size={24} />
                    </ThemeIcon>
                    <div>
                      <Text weight={600}>{type.name}</Text>
                      <Text size="xs" color="dimmed">{type.description || 'No description'}</Text>
                    </div>
                  </Group>
                </Group>

                <Badge variant="light" color={color} mb="sm" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                  {describeRule(type, dateFields)}
                </Badge>

                <Box sx={{ flex: 1 }}>
                  <MessageBubble message={type.template_message} clamp={5} />
                </Box>

                <Group mt="md" noWrap spacing="xs">
                  <Button fullWidth variant="light" color={color} leftIcon={<IconPencil size={16} />} onClick={() => openEdit(type)}>
                    Edit
                  </Button>
                  <ActionIcon size={36} variant="light" color="red" aria-label={`Delete ${type.name}`} title="Delete" onClick={() => setToDelete(type)}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={<Text weight={600}>{editing ? `Edit: ${editing.name}` : 'Add reminder type'}</Text>} size="lg" fullScreen={isMobile} centered={!isMobile}>
        {formOpen && <ReminderTypeForm key={editing?.id || 'new'} type={editing} dateFields={dateFields} onSave={handleSaved} apiUrl={API_URL} token={token} />}
      </Modal>

      <Modal opened={!!toDelete} onClose={() => !deleting && setToDelete(null)} title={<Text weight={600}>Delete reminder type?</Text>} centered size="sm">
        <Text size="sm">
          "{toDelete?.name}" will be removed from your Reminders page and its message will be lost. Reminders already sent stay in your history.
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
